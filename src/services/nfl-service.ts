import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { fetchNflWeek } from '@/lib/nfl/espn';
import type { NflGame } from '@/lib/nfl/types';
import { nextThursday16h } from '@/lib/utils/timezone';
import type { Season, Week } from '@/types/database';

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

async function ensureWeek(seasonId: string, weekNumber: number): Promise<Week> {
  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase
    .from('weeks')
    .select('*')
    .eq('season_id', seasonId)
    .eq('week_number', weekNumber)
    .maybeSingle();

  if (existing) {
    // idempotente: se a semana ja existe e ainda esta "upcoming", promove para "open".
    // Nao altera picks_close_at para nao mudar o prazo depois de ja ter sido aberto.
    if (existing.status === 'upcoming') {
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
      status: 'open',
      picks_open_at: now.toISOString(),
      picks_close_at: nextThursday16h(now).toISOString(),
    })
    .select('*')
    .single();
  if (error) throw error;
  return created as Week;
}

async function upsertGames(weekId: string, games: NflGame[]) {
  if (games.length === 0) return;
  const supabase = getSupabaseAdmin();

  const rows = games.map((g) => ({
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
  const week = await ensureWeek(season.id, info.weekNumber);
  await upsertGames(week.id, games);
  await archivePastWeeks(season.id, info.weekNumber);

  return { season, week, gamesCount: games.length };
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
