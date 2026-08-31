import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type { Achievement, Participant, ParticipantAchievement, SeasonResult, WeeklyResult } from '@/types/database';

export interface PlayerWeeklyPoint {
  weekNumber: number;
  correct: number;
  total: number;
}

export interface PlayerProfile {
  participant: Participant;
  seasonResult: SeasonResult | null;
  weeklyPoints: PlayerWeeklyPoint[];
  bestWeek: PlayerWeeklyPoint | null;
  worstWeek: PlayerWeeklyPoint | null;
  weeksWon: number;
  achievements: (ParticipantAchievement & { achievement: Achievement })[];
}

export async function getPlayerProfile(participantId: string, seasonId: string): Promise<PlayerProfile | null> {
  const supabase = getSupabaseAdmin();

  const { data: participant, error: pError } = await supabase
    .from('participants')
    .select('*')
    .eq('id', participantId)
    .maybeSingle();
  if (pError) throw pError;
  if (!participant) return null;

  const { data: seasonResult } = await supabase
    .from('season_results')
    .select('*')
    .eq('season_id', seasonId)
    .eq('participant_id', participantId)
    .maybeSingle();

  const { data: seasonWeeks } = await supabase.from('weeks').select('id, week_number').eq('season_id', seasonId);
  const weekIds = (seasonWeeks ?? []).map((w) => w.id);

  const { data: weeklyResults } = weekIds.length
    ? await supabase.from('weekly_results').select('*').eq('participant_id', participantId).in('week_id', weekIds)
    : { data: [] as WeeklyResult[] };

  const weekNumberById = new Map((seasonWeeks ?? []).map((w) => [w.id, w.week_number]));

  const weeklyPoints: PlayerWeeklyPoint[] = ((weeklyResults as WeeklyResult[]) ?? [])
    .filter((r) => r.total_picks > 0)
    .map((r) => ({
      weekNumber: weekNumberById.get(r.week_id) ?? 0,
      correct: r.correct_picks,
      total: r.total_picks,
    }))
    .sort((a, b) => a.weekNumber - b.weekNumber);

  const bestWeek = weeklyPoints.length
    ? weeklyPoints.reduce((best, p) => (p.correct > best.correct ? p : best))
    : null;
  const worstWeek = weeklyPoints.length
    ? weeklyPoints.reduce((worst, p) => (p.correct < worst.correct ? p : worst))
    : null;

  const { data: achievements } = await supabase
    .from('participant_achievements')
    .select('*, achievement:achievements(*)')
    .eq('participant_id', participantId)
    .order('earned_at', { ascending: false });

  return {
    participant: participant as Participant,
    seasonResult: (seasonResult as SeasonResult) ?? null,
    weeklyPoints,
    bestWeek,
    worstWeek,
    weeksWon: seasonResult?.weekly_wins ?? 0,
    achievements: (achievements as unknown as (ParticipantAchievement & { achievement: Achievement })[]) ?? [],
  };
}
