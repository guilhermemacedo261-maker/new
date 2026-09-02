import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { processWeekResults } from './ranking-service';
import type { Game } from '@/types/database';

export async function listGamesForWeek(weekId: string): Promise<Game[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('week_id', weekId)
    .order('game_time', { ascending: true });
  if (error) throw error;
  return (data as Game[]) ?? [];
}

export type GameCorrection = Partial<
  Pick<
    Game,
    | 'away_team'
    | 'away_team_abbreviation'
    | 'away_team_logo'
    | 'home_team'
    | 'home_team_abbreviation'
    | 'home_team_logo'
    | 'game_date'
    | 'game_time'
    | 'venue'
    | 'status'
    | 'away_score'
    | 'home_score'
  >
>;

/**
 * Correcao manual de um jogo pelo admin (secao 11 - "corrigir jogo
 * manualmente"). Duas garantias importantes:
 *  1. Marca o jogo como `manually_corrected` - a partir daqui, a busca
 *     automatica de jogos/resultados (cron ou botao "Atualizar") nunca
 *     mais sobrescreve esse jogo especifico, so os outros da semana.
 *  2. Recalcula ranking/historico/ao-vivo/hall da fama NA HORA (chama
 *     processWeekResults direto), sem esperar o proximo ciclo do cron -
 *     a correcao aparece no site inteiro imediatamente.
 */
export async function correctGame(gameId: string, correction: GameCorrection): Promise<Game> {
  const supabase = getSupabaseAdmin();

  const patch: GameCorrection & { winner?: Game['winner']; results_processed?: boolean; manually_corrected: true } = {
    ...correction,
    manually_corrected: true,
  };

  // Sempre confere o estado atual (nao so quando o placar vem na correcao):
  // o admin pode editar so o placar numa chamada e so o status noutra, e o
  // vencedor precisa refletir a combinacao final dos dois.
  const { data: current } = await supabase.from('games').select('*').eq('id', gameId).single();
  const effectiveStatus = correction.status ?? current?.status;
  const homeScore = correction.home_score ?? current?.home_score ?? null;
  const awayScore = correction.away_score ?? current?.away_score ?? null;

  if (effectiveStatus === 'final' && homeScore !== null && awayScore !== null) {
    patch.winner = homeScore === awayScore ? 'tie' : homeScore > awayScore ? 'home' : 'away';
    patch.results_processed = false; // forca o ranking-service reprocessar com o placar corrigido
  }

  const { data, error } = await supabase.from('games').update(patch).eq('id', gameId).select('*').single();
  if (error) throw error;

  if (current?.week_id) {
    await processWeekResults(current.week_id);
  }

  return data as Game;
}
