import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type { Game, Participant, Pick, PublicParticipant, SeasonResult, Week, WeeklyResult } from '@/types/database';
import { checkAchievementsForWeek } from './achievements-service';
import { toPublicParticipant } from './participants-service';

interface RankRow {
  participantId: string;
  correct: number;
  wrong: number;
  total: number;
  accuracy: number;
  weeklyWins: number;
}

/** Ranking padrao do sistema (secao 38): acertos desc, aproveitamento desc, semanas vencidas desc. */
function assignPositions<T extends RankRow>(rows: T[]): (T & { position: number })[] {
  const sorted = [...rows].sort((a, b) => {
    if (b.correct !== a.correct) return b.correct - a.correct;
    if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
    return b.weeklyWins - a.weeklyWins;
  });

  let lastPosition = 0;
  let lastKey = '';
  return sorted.map((row, index) => {
    const key = `${row.correct}-${row.accuracy}-${row.weeklyWins}`;
    if (key !== lastKey) {
      lastPosition = index + 1;
      lastKey = key;
    }
    return { ...row, position: lastPosition };
  });
}

/**
 * Recalcula os resultados de uma semana a partir do zero (idempotente -
 * secao 39: rodar duas vezes nao duplica nada, pois sempre substitui os
 * valores agregados em vez de incrementar contadores).
 */
export async function processWeekResults(weekId: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { data: week, error: weekError } = await supabase.from('weeks').select('*').eq('id', weekId).single();
  if (weekError) throw weekError;

  const { data: games, error: gamesError } = await supabase.from('games').select('*').eq('week_id', weekId);
  if (gamesError) throw gamesError;

  const finalGames = (games as Game[]).filter((g) => g.status === 'final' && g.winner);

  for (const game of finalGames) {
    const { data: picksForGame, error: picksError } = await supabase
      .from('picks')
      .select('*')
      .eq('game_id', game.id);
    if (picksError) throw picksError;

    const updated = (picksForGame as Pick[]).map((pick) => ({
      ...pick,
      is_correct: game.winner !== 'tie' && pick.selected_team === game.winner,
    }));

    if (updated.length > 0) {
      const { error } = await supabase.from('picks').upsert(updated, { onConflict: 'game_id,participant_id' });
      if (error) throw error;
    }

    if (!game.results_processed) {
      await supabase.from('games').update({ results_processed: true }).eq('id', game.id);
    }
  }

  await recomputeWeeklyResults(week as Week, games as Game[]);
  await recomputeSeasonResults(week.season_id);
  await checkAchievementsForWeek(weekId, week.season_id);
}

async function recomputeWeeklyResults(week: Week, games: Game[]): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { data: participants, error: pError } = await supabase
    .from('participants')
    .select('*')
    .eq('active', true);
  if (pError) throw pError;

  const { data: picks, error: picksError } = await supabase.from('picks').select('*').eq('week_id', week.id);
  if (picksError) throw picksError;

  const finalGameIds = new Set(games.filter((g) => g.status === 'final' && g.winner).map((g) => g.id));

  const rows: RankRow[] = (participants as Participant[]).map((participant) => {
    const myPicks = (picks as Pick[]).filter((p) => p.participant_id === participant.id && finalGameIds.has(p.game_id));
    const correct = myPicks.filter((p) => p.is_correct === true).length;
    const wrong = myPicks.filter((p) => p.is_correct === false).length;
    const total = correct + wrong;
    return {
      participantId: participant.id,
      correct,
      wrong,
      total,
      accuracy: total > 0 ? Number(((correct / total) * 100).toFixed(2)) : 0,
      weeklyWins: 0, // nao se aplica dentro da propria semana
    };
  });

  const ranked = assignPositions(rows);

  const upsertRows = ranked.map((r) => ({
    week_id: week.id,
    participant_id: r.participantId,
    correct_picks: r.correct,
    wrong_picks: r.wrong,
    total_picks: r.total,
    accuracy_percentage: r.accuracy,
    weekly_position: r.total > 0 ? r.position : null,
  }));

  const { error } = await supabase.from('weekly_results').upsert(upsertRows, { onConflict: 'week_id,participant_id' });
  if (error) throw error;
}

async function recomputeSeasonResults(seasonId: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { data: seasonWeeks, error: weeksError } = await supabase.from('weeks').select('id').eq('season_id', seasonId);
  if (weeksError) throw weeksError;
  const weekIds = (seasonWeeks ?? []).map((w) => w.id);
  if (weekIds.length === 0) return;

  const { data: participants, error: pError } = await supabase.from('participants').select('*').eq('active', true);
  if (pError) throw pError;

  const { data: allWeeklyResults, error: wrError } = await supabase
    .from('weekly_results')
    .select('*')
    .in('week_id', weekIds);
  if (wrError) throw wrError;

  const rows: RankRow[] = (participants as Participant[]).map((participant) => {
    const mine = (allWeeklyResults as WeeklyResult[]).filter((r) => r.participant_id === participant.id);
    const correct = mine.reduce((sum, r) => sum + r.correct_picks, 0);
    const wrong = mine.reduce((sum, r) => sum + r.wrong_picks, 0);
    const total = correct + wrong;
    const weeklyWins = mine.filter((r) => r.weekly_position === 1).length;
    return {
      participantId: participant.id,
      correct,
      wrong,
      total,
      accuracy: total > 0 ? Number(((correct / total) * 100).toFixed(2)) : 0,
      weeklyWins,
    };
  });

  const ranked = assignPositions(rows);

  const upsertRows = ranked.map((r) => ({
    season_id: seasonId,
    participant_id: r.participantId,
    correct_picks: r.correct,
    wrong_picks: r.wrong,
    total_picks: r.total,
    accuracy_percentage: r.accuracy,
    weekly_wins: r.weeklyWins,
    current_position: r.total > 0 ? r.position : null,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('season_results')
    .upsert(upsertRows, { onConflict: 'season_id,participant_id' });
  if (error) throw error;
}

export async function getSeasonRanking(seasonId: string): Promise<(SeasonResult & { participant: PublicParticipant })[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('season_results')
    .select('*, participant:participants(*)')
    .eq('season_id', seasonId)
    .order('current_position', { ascending: true, nullsFirst: false });
  if (error) throw error;
  const rows = data as unknown as (SeasonResult & { participant: Participant })[];
  return rows.map((r) => ({ ...r, participant: toPublicParticipant(r.participant) }));
}

export async function getWeeklyRanking(weekId: string): Promise<(WeeklyResult & { participant: PublicParticipant })[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('weekly_results')
    .select('*, participant:participants(*)')
    .eq('week_id', weekId)
    .order('weekly_position', { ascending: true, nullsFirst: false });
  if (error) throw error;
  const rows = data as unknown as (WeeklyResult & { participant: Participant })[];
  return rows.map((r) => ({ ...r, participant: toPublicParticipant(r.participant) }));
}
