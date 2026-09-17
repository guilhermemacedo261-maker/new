import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getPendingPaymentForParticipant } from './payments-service';
import { listActiveParticipants, toPublicParticipant } from './participants-service';
import type { Game, GameWithPick, PublicParticipant, TeamSide, Week } from '@/types/database';

export class PicksClosedError extends Error {
  constructor() {
    super('Os palpites para esta semana estao encerrados.');
  }
}

export class InvalidPicksError extends Error {}

/** Lancada quando o participante deve a vaquinha de uma rodada anterior (Regra da vaquinha - so libera os palpites apos o Pix). */
export class PaymentPendingError extends Error {
  constructor(public amount: number) {
    super(`Voce tem um pagamento pendente de R$ ${amount.toFixed(2)} da rodada anterior. Pague pra liberar os palpites.`);
  }
}

/** Retorna os jogos da semana com o palpite do PROPRIO participante (nunca dos outros - secao 18). */
export async function getWeekGamesWithMyPicks(weekId: string, participantId: string): Promise<GameWithPick[]> {
  const supabase = getSupabaseAdmin();

  const { data: games, error: gamesError } = await supabase
    .from('games')
    .select('*')
    .eq('week_id', weekId)
    .order('game_time', { ascending: true });
  if (gamesError) throw gamesError;

  const { data: myPicks, error: picksError } = await supabase
    .from('picks')
    .select('game_id, selected_team')
    .eq('week_id', weekId)
    .eq('participant_id', participantId);
  if (picksError) throw picksError;

  const pickByGame = new Map((myPicks ?? []).map((p) => [p.game_id, p.selected_team as TeamSide]));

  return (games ?? []).map((g: Game) => ({
    ...g,
    my_pick: pickByGame.get(g.id) ?? null,
  }));
}

function isPicksWindowOpen(week: Week, now = new Date()): boolean {
  if (week.status !== 'open') return false;
  return now.getTime() < new Date(week.picks_close_at).getTime();
}

export interface SubmitPickInput {
  gameId: string;
  selectedTeam: TeamSide;
}

/**
 * Salva/atualiza os palpites de um participante para a semana. Regras
 * aplicadas aqui (defesa em profundidade, alem das constraints do banco):
 *  - a rodada precisa estar aberta e antes do prazo (Regra 3/4);
 *  - todo jogo enviado precisa pertencer a semana informada;
 *  - cada jogo so pode ter um vencedor escolhido (Regra 1/2), garantido
 *    pela unique constraint (game_id, participant_id).
 */
export async function submitPicks(weekId: string, participantId: string, picks: SubmitPickInput[]): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { data: week, error: weekError } = await supabase.from('weeks').select('*').eq('id', weekId).single();
  if (weekError) throw weekError;
  if (!isPicksWindowOpen(week as Week)) {
    throw new PicksClosedError();
  }

  const pendingPayment = await getPendingPaymentForParticipant(participantId);
  if (pendingPayment) {
    throw new PaymentPendingError(pendingPayment.amount);
  }

  const { data: games, error: gamesError } = await supabase.from('games').select('id').eq('week_id', weekId);
  if (gamesError) throw gamesError;
  const validGameIds = new Set((games ?? []).map((g) => g.id));

  for (const pick of picks) {
    if (!validGameIds.has(pick.gameId)) {
      throw new InvalidPicksError(`Jogo ${pick.gameId} nao pertence a semana ${weekId}`);
    }
    if (pick.selectedTeam !== 'home' && pick.selectedTeam !== 'away') {
      throw new InvalidPicksError('selectedTeam invalido');
    }
  }

  const now = new Date().toISOString();
  const rows = picks.map((p) => ({
    week_id: weekId,
    game_id: p.gameId,
    participant_id: participantId,
    selected_team: p.selectedTeam,
    updated_at: now,
  }));

  const { error } = await supabase.from('picks').upsert(rows, { onConflict: 'game_id,participant_id' });
  if (error) throw error;
}

/** Palpites de TODOS os participantes para a semana - so deve ser exposto no frontend apos o encerramento, ou para o admin. */
export async function getAllPicksForWeek(weekId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('picks').select('*').eq('week_id', weekId);
  if (error) throw error;
  return data;
}

export function canRevealAllPicks(week: Week, now = new Date()): boolean {
  return week.status !== 'open' || now.getTime() >= new Date(week.picks_close_at).getTime();
}

export interface PickStatus {
  participant: PublicParticipant;
  hasPicked: boolean;
}

/**
 * Quem ja enviou os palpites da semana e quem ainda nao - so o status
 * (sim/nao), NUNCA o palpite em si (secao 18/Regra 9: ninguem pode ver
 * em quem os outros votaram antes do encerramento). Usado no /ao-vivo
 * enquanto a rodada ainda esta aberta pra palpitar.
 */
export async function getPickStatusForWeek(weekId: string): Promise<PickStatus[]> {
  const supabase = getSupabaseAdmin();

  const [participants, { data: picks, error: picksError }] = await Promise.all([
    listActiveParticipants(),
    supabase.from('picks').select('participant_id').eq('week_id', weekId),
  ]);
  if (picksError) throw picksError;

  const pickedParticipantIds = new Set((picks ?? []).map((p) => p.participant_id));

  return participants.map((participant) => ({
    participant: toPublicParticipant(participant),
    hasPicked: pickedParticipantIds.has(participant.id),
  }));
}
