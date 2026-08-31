import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { refreshGameResults } from './nfl-service';
import { processWeekResults } from './ranking-service';
import type { Week } from '@/types/database';

/**
 * Busca placares atualizados na API da NFL para as semanas ainda em
 * andamento (nao "finished") e recalcula picks/ranking. Chamada pelo
 * cron diario e pelo botao "Atualizar resultados agora" do admin.
 * Idempotente - pode rodar quantas vezes for preciso.
 */
export async function refreshResultsForActiveWeeks(): Promise<{ processed: string[] }> {
  const supabase = getSupabaseAdmin();
  const { data: weeks, error } = await supabase.from('weeks').select('*').in('status', ['open', 'closed']);
  if (error) throw error;

  const processed: string[] = [];

  for (const week of (weeks as Week[]) ?? []) {
    await refreshGameResults(week);
    await processWeekResults(week.id);

    const { data: games } = await supabase.from('games').select('status').eq('week_id', week.id);
    const allFinal = (games ?? []).length > 0 && (games ?? []).every((g) => g.status === 'final');

    if (allFinal && week.status === 'closed') {
      await supabase.from('weeks').update({ status: 'finished' }).eq('id', week.id);
    }

    processed.push(week.id);
  }

  return { processed };
}
