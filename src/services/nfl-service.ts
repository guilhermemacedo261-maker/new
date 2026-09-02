import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { fetchNflWeek } from '@/lib/nfl/espn';
import type { NflGame } from '@/lib/nfl/types';
import { nextThursday16h, thursday16hOfWeekContaining } from '@/lib/utils/timezone';
import type { Season, Week, WeekStatus } from '@/types/database';

async function ensureSeason(year: number): Promise<Season> {
  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase.from('seasons').select('*').eq('year', year).maybeSingle();
  if (existing) return existing as Season;

  const { data: created, error } = await supabase
    .from('seasons')
    .insert({ year, name: `Temporada ${year}`, status: 'active' })
    .select('*')
    .single();
  if (error) throw error;
  return created as Season;
}

async function ensureWeek(
  seasonId: string,
  weekNumber: number,
  opts: { picksCloseAt: Date; initialStatus: WeekStatus }
): Promise<Week> {
  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase
    .from('weeks')
    .select('*')
    .eq('season_id', seasonId)
    .eq('week_number', weekNumber)
    .maybeSingle();

  if (existing) {
    // idempotente: se a semana ja existe e ainda esta "upcoming" (preparada
    // com antecedencia), promove para "open" quando chega a vez dela.
    // Nunca sobrescreve picks_close_at de uma semana ja existente - isso
    // preserva ajustes manuais feitos pelo admin em /admin/weeks.
    if (existing.status === 'upcoming' && opts.initialStatus === 'open') {
      const { data: updated, error } = await supabase
        .from('weeks')
        .update({ status: 'open' })
        .eq('id', existing.id)
        .select('*')
        .single();
      if (error) throw error;
      return updated as Week;
    }
    return existing as Week;
  }

  const now = new Date();
  const { data: created, error } = await supabase
    .from('weeks')
    .insert({
      season_id: seasonId,
      week_number: weekNumber,
      status: opts.initialStatus,
      picks_open_at: now.toISOString(),
      picks_close_at: opts.picksCloseAt.toISOString(),
    })
    .select('*')
    .single();
  if (error) throw error;
  return created as Week;
}

async function upsertGames(weekId: string, games: NflGame[]) {
  if (games.length === 0) return;
  const supabase = getSupabaseAdmin();

  // Jogos que o admin corrigiu manualmente nunca sao sobrescritos pela
  // busca automatica - a API da NFL pode demorar a atualizar ou errar,
  // e a correcao do admin tem que "grudar" ate ele mudar de novo.
  const { data: lockedRows } = await supabase
    .from('games')
    .select('external_id')
    .eq('week_id', weekId)
    .eq('manually_corrected', true);
  const lockedExternalIds = new Set((lockedRows ?? []).map((g) => g.external_id));

  const rows = games
    .filter((g) => !lockedExternalIds.has(g.externalId))
    .map((g) => ({
      week_id: weekId,
      external_id: g.externalId,
      away_team: g.awayTeam,
      away_team_abbreviation: g.awayTeamAbbreviation,
      away_team_logo: g.awayTeamLogo,
      home_team: g.homeTeam,
      home_team_abbreviation: g.homeTeamAbbreviation,
      home_team_logo: g.homeTeamLogo,
      game_date: g.gameDate,
      game_time: g.gameTime,
      venue: g.venue,
      status: g.status,
      away_score: g.awayScore,
      home_score: g.homeScore,
      winner: g.status === 'final' ? computeWinner(g) : null,
    }));

  if (rows.length === 0) return;

  // upsert por (week_id, external_id) - Regra 8: nunca duplica jogo.
  const { error } = await supabase.from('games').upsert(rows, { onConflict: 'week_id,external_id' });
  if (error) throw error;
}

function computeWinner(g: NflGame): 'home' | 'away' | 'tie' | null {
  if (g.homeScore === null || g.awayScore === null) return null;
  if (g.homeScore > g.awayScore) return 'home';
  if (g.awayScore > g.homeScore) return 'away';
  return 'tie';
}

async function archivePastWeeks(seasonId: string, currentWeekNumber: number) {
  const supabase = getSupabaseAdmin();
  await supabase
    .from('weeks')
    .update({ status: 'closed' })
    .eq('season_id', seasonId)
    .lt('week_number', currentWeekNumber)
    .eq('status', 'open');
}

export interface SyncResult {
  season: Season;
  week: Week;
  gamesCount: number;
}

/**
 * Busca a semana atual/proxima da NFL na API e sincroniza jogos + rodada
 * no banco. Chamada pelo cron de terca-feira e pelo botao "Atualizar jogos
 * agora" do admin. Idempotente: pode rodar varias vezes sem duplicar nada.
 */
export async function syncNflWeek(params: { season?: number; week?: number } = {}): Promise<SyncResult> {
  const { info, games } = await fetchNflWeek(params);
  const season = await ensureSeason(info.season);
  const week = await ensureWeek(season.id, info.weekNumber, {
    picksCloseAt: nextThursday16h(new Date()),
    initialStatus: 'open',
  });
  await upsertGames(week.id, games);
  await archivePastWeeks(season.id, info.weekNumber);

  return { season, week, gamesCount: games.length };
}

/**
 * Cria de uma vez todas as semanas de 1 a `toWeek` da temporada regular,
 * ja com os jogos e o prazo de palpites calculado (quinta-feira 16h da
 * semana de cada jogo - nao "a proxima quinta", que so faz sentido pra
 * semana atual). Ficam com status "upcoming" (o admin pode editar as
 * datas antes de cada uma abrir) - a rotina normal de terca-feira e que
 * promove cada uma para "open" quando chega a vez dela.
 */
export async function prepareSeasonWeeks(
  params: { season?: number; fromWeek?: number; toWeek?: number } = {}
): Promise<{ weeks: SyncResult[] }> {
  const fromWeek = params.fromWeek ?? 1;
  const toWeek = params.toWeek ?? 18;
  const results: SyncResult[] = [];

  for (let weekNumber = fromWeek; weekNumber <= toWeek; weekNumber++) {
    // eslint-disable-next-line no-await-in-loop
    const { info, games } = await fetchNflWeek({ season: params.season, week: weekNumber });
    // eslint-disable-next-line no-await-in-loop
    const season = await ensureSeason(info.season);

    const earliestGameTime =
      games.length > 0 ? Math.min(...games.map((g) => new Date(g.gameTime).getTime())) : Date.now();
    const picksCloseAt = thursday16hOfWeekContaining(new Date(earliestGameTime));

    // eslint-disable-next-line no-await-in-loop
    const week = await ensureWeek(season.id, info.weekNumber, { picksCloseAt, initialStatus: 'upcoming' });
    // eslint-disable-next-line no-await-in-loop
    await upsertGames(week.id, games);

    results.push({ season, week, gamesCount: games.length });
  }

  return { weeks: results };
}

/**
 * Atualiza placares/status dos jogos de uma semana especifica sem alterar
 * o prazo de palpites - usado apos os jogos acontecerem, para alimentar o
 * calculo de resultados (ranking-service). Informa o ano da temporada
 * explicitamente para a ESPN - sem isso, a API assume o ano corrente, o
 * que da errado para jogos de janeiro/fevereiro de uma temporada que
 * comecou no ano anterior (playoffs viram a virada do ano).
 */
export async function refreshGameResults(week: Week): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data: season } = await supabase.from('seasons').select('year').eq('id', week.season_id).maybeSingle();

  const { games } = await fetchNflWeek({ season: season?.year, week: week.week_number });
  await upsertGames(week.id, games);
}
