import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type { Achievement, WeeklyResult } from '@/types/database';

async function getAchievementIds(): Promise<Record<string, string>> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('achievements').select('*');
  if (error) throw error;
  return (data as Achievement[]).reduce<Record<string, string>>((acc, a) => {
    acc[a.code] = a.id;
    return acc;
  }, {});
}

interface Grant {
  participant_id: string;
  achievement_id: string;
  week_id: string | null;
  season_id: string | null;
}

async function grantAll(grants: Grant[]): Promise<void> {
  if (grants.length === 0) return;
  const supabase = getSupabaseAdmin();
  // ignoreDuplicates: idempotente com a unique constraint (participant_id, achievement_id, week_id) -
  // rodar de novo nao cria conquista duplicada (secao 39).
  const { error } = await supabase
    .from('participant_achievements')
    .upsert(grants.map((g) => ({ ...g, earned_at: new Date().toISOString() })), {
      onConflict: 'participant_id,achievement_id,week_id',
      ignoreDuplicates: true,
    });
  if (error) throw error;
}

/**
 * Verifica e concede conquistas semanais (secao 34) apos o processamento
 * de resultados de uma rodada. Chamada por ranking-service.processWeekResults.
 */
export async function checkAchievementsForWeek(weekId: string, seasonId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const codes = await getAchievementIds();

  const { data: games, error: gamesError } = await supabase.from('games').select('id, status').eq('week_id', weekId);
  if (gamesError) throw gamesError;
  const totalGamesInWeek = games?.length ?? 0;
  const allGamesFinished = totalGamesInWeek > 0 && games!.every((g) => g.status === 'final');

  const { data: weeklyResults, error: wrError } = await supabase
    .from('weekly_results')
    .select('*')
    .eq('week_id', weekId);
  if (wrError) throw wrError;

  const grants: Grant[] = [];

  for (const result of weeklyResults as WeeklyResult[]) {
    if (result.total_picks === 0) continue;

    if (result.correct_picks >= 10) {
      grants.push({ participant_id: result.participant_id, achievement_id: codes.hot_hand, week_id: weekId, season_id: null });
    }
    if (result.accuracy_percentage > 80) {
      grants.push({ participant_id: result.participant_id, achievement_id: codes.precisao, week_id: weekId, season_id: null });
    }
    if (result.weekly_position === 1) {
      grants.push({ participant_id: result.participant_id, achievement_id: codes.campeao_semana, week_id: weekId, season_id: null });
    }
    if (allGamesFinished && result.wrong_picks === 0 && result.total_picks === totalGamesInWeek) {
      grants.push({ participant_id: result.participant_id, achievement_id: codes.perfeito, week_id: weekId, season_id: null });
    }
  }

  const { data: leader } = await supabase
    .from('season_results')
    .select('participant_id')
    .eq('season_id', seasonId)
    .eq('current_position', 1)
    .maybeSingle();

  if (leader) {
    grants.push({ participant_id: leader.participant_id, achievement_id: codes.lider, week_id: weekId, season_id: null });
  }

  await grantAll(grants);
}

/** Concede o titulo de GOAT (secao 34) ao campeao quando a temporada e encerrada pelo admin. */
export async function checkSeasonChampion(seasonId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const codes = await getAchievementIds();

  const { data: champion } = await supabase
    .from('season_results')
    .select('participant_id')
    .eq('season_id', seasonId)
    .eq('current_position', 1)
    .maybeSingle();

  if (!champion) return;

  await grantAll([
    { participant_id: champion.participant_id, achievement_id: codes.goat, week_id: null, season_id: seasonId },
  ]);
}
