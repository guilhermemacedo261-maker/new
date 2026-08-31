import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type { Season, Week } from '@/types/database';

export async function getActiveSeason(): Promise<Season | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('seasons').select('*').eq('status', 'active').maybeSingle();
  if (error) throw error;
  return (data as Season) ?? null;
}

/** A "semana atual" e a semana mais recente da temporada ativa (aberta, ou a ultima criada). */
export async function getCurrentWeek(): Promise<Week | null> {
  const supabase = getSupabaseAdmin();
  const season = await getActiveSeason();
  if (!season) return null;

  const { data, error } = await supabase
    .from('weeks')
    .select('*')
    .eq('season_id', season.id)
    .order('week_number', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as Week) ?? null;
}

export async function getWeekById(weekId: string): Promise<Week | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('weeks').select('*').eq('id', weekId).maybeSingle();
  if (error) throw error;
  return (data as Week) ?? null;
}

export async function listSeasonWeeks(seasonId: string): Promise<Week[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('weeks')
    .select('*')
    .eq('season_id', seasonId)
    .order('week_number', { ascending: false });
  if (error) throw error;
  return (data as Week[]) ?? [];
}

/** Encerra a rodada manualmente (bloqueia novos palpites) - usado pelo cron de quinta e pelo admin. */
export async function closeWeek(weekId: string): Promise<Week> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('weeks')
    .update({ status: 'closed' })
    .eq('id', weekId)
    .select('*')
    .single();
  if (error) throw error;
  return data as Week;
}

/** Reabre a rodada manualmente (secao 11 - "reabrir rodada manualmente"). */
export async function reopenWeek(weekId: string): Promise<Week> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('weeks')
    .update({ status: 'open' })
    .eq('id', weekId)
    .select('*')
    .single();
  if (error) throw error;
  return data as Week;
}
