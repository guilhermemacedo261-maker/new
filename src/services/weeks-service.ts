import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type { Season, Week } from '@/types/database';

export async function listSeasons(): Promise<Season[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('seasons').select('*').order('year', { ascending: false });
  if (error) throw error;
  return (data as Season[]) ?? [];
}

/** Define as fotos comemorativas do campeao/bobo daquela temporada, exibidas no Hall da Fama. */
export async function updateSeasonPhotos(
  seasonId: string,
  patch: { champion_photo_url?: string | null; lanterna_photo_url?: string | null; group_photo_url?: string | null }
): Promise<Season> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('seasons').update(patch).eq('id', seasonId).select('*').single();
  if (error) throw error;
  return data as Season;
}

export async function getActiveSeason(): Promise<Season | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('seasons').select('*').eq('status', 'active').maybeSingle();
  if (error) throw error;
  return (data as Season) ?? null;
}

/**
 * A "semana atual" e a semana aberta (se houver); se nenhuma estiver
 * aberta, e a mais recente ja encerrada/finalizada. Semanas "upcoming"
 * (preparadas com antecedencia mas que ainda nao chegou a vez) nunca
 * contam como atual, mesmo tendo numero maior - senao preparar a
 * temporada inteira faria o site pular direto pra semana 18.
 */
export async function getCurrentWeek(): Promise<Week | null> {
  const supabase = getSupabaseAdmin();
  const season = await getActiveSeason();
  if (!season) return null;

  const { data: openWeek, error: openError } = await supabase
    .from('weeks')
    .select('*')
    .eq('season_id', season.id)
    .eq('status', 'open')
    .order('week_number', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (openError) throw openError;
  if (openWeek) return openWeek as Week;

  const { data, error } = await supabase
    .from('weeks')
    .select('*')
    .eq('season_id', season.id)
    .neq('status', 'upcoming')
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

/** Ajusta manualmente quando a semana abre e/ou fecha para palpites. */
export async function updateWeekSchedule(
  weekId: string,
  patch: { picks_open_at?: string; picks_close_at?: string }
): Promise<Week> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('weeks').update(patch).eq('id', weekId).select('*').single();
  if (error) throw error;
  return data as Week;
}
