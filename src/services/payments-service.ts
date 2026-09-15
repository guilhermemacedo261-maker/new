import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createPixCharge } from '@/lib/mercadopago/client';
import { toPublicParticipant } from './participants-service';
import type { FundTransaction, Participant, PublicParticipant, Week, WeeklyPayment, WeeklyResult } from '@/types/database';

/** Regra da vaquinha: quem lidera a rodada paga menos, quem fica em ultimo paga mais - o resto paga o valor do meio. */
export const WEEKLY_PAYMENT_AMOUNTS = { leader: 7, middle: 12, last: 15 } as const;

function externalReferenceFor(weekId: string, participantId: string): string {
  return `week:${weekId}:participant:${participantId}`;
}

function payerEmailFor(participantId: string): string {
  // Mercado Pago exige um email no payer, mas nao precisa ser real nem
  // verificado pra Pix - so usamos como identificador.
  return `participante-${participantId}@nfldebuteco.app`;
}

async function generateChargeFor(week: Week, participant: Participant, amount: number) {
  return createPixCharge({
    amount,
    description: `NFL de Buteco - Semana ${week.week_number} - ${participant.name}`,
    externalReference: externalReferenceFor(week.id, participant.id),
    payerEmail: payerEmailFor(participant.id),
  });
}

/**
 * Gera a cobranca Pix da rodada pra cada participante ativo, com o valor
 * de acordo com a posicao na semana (Regra da vaquinha). Chamada uma vez
 * quando a semana vira "finished" (todos os jogos encerrados). Idempotente:
 * nunca gera 2 cobrancas pro mesmo participante/semana.
 */
export async function generateWeeklyCharges(weekId: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { data: week, error: weekError } = await supabase.from('weeks').select('*').eq('id', weekId).single();
  if (weekError) throw weekError;

  const { data: results, error: resultsError } = await supabase
    .from('weekly_results')
    .select('*, participant:participants(*)')
    .eq('week_id', weekId);
  if (resultsError) throw resultsError;

  const rows = (results ?? []) as unknown as (WeeklyResult & { participant: Participant })[];
  if (rows.length === 0) return;

  const { data: existingPayments, error: existingError } = await supabase
    .from('weekly_payments')
    .select('participant_id')
    .eq('week_id', weekId);
  if (existingError) throw existingError;
  const alreadyCharged = new Set((existingPayments ?? []).map((p) => p.participant_id));

  const positions = rows.map((r) => r.weekly_position).filter((p): p is number => p !== null);
  const bestPosition = positions.length > 0 ? Math.min(...positions) : null;
  const worstPosition = positions.length > 0 ? Math.max(...positions) : null;

  for (const row of rows) {
    if (!row.participant.active || alreadyCharged.has(row.participant_id)) continue;

    const amount =
      bestPosition !== null && row.weekly_position === bestPosition
        ? WEEKLY_PAYMENT_AMOUNTS.leader
        : worstPosition !== null && row.weekly_position === worstPosition
          ? WEEKLY_PAYMENT_AMOUNTS.last
          : WEEKLY_PAYMENT_AMOUNTS.middle;

    // eslint-disable-next-line no-await-in-loop -- cobrancas sao criadas uma de cada vez de proposito (idempotencia por participante).
    await createPendingPayment(week as Week, row.participant, amount);
  }
}

async function createPendingPayment(week: Week, participant: Participant, amount: number): Promise<void> {
  const supabase = getSupabaseAdmin();

  try {
    const charge = await generateChargeFor(week, participant, amount);
    const { error } = await supabase.from('weekly_payments').insert({
      week_id: week.id,
      participant_id: participant.id,
      amount,
      status: 'pending',
      pix_payment_id: charge.id,
      pix_copia_cola: charge.copiaECola,
      pix_qr_base64: charge.qrCodeBase64,
    });
    if (error) throw error;
  } catch (err) {
    // Nao deixa 1 falha (ex: MP_ACCESS_TOKEN ainda nao configurado, ou
    // Mercado Pago fora do ar) travar a cobranca dos outros participantes -
    // fica pendente sem QR, e o admin pode gerar de novo depois (regeneratePixCharge).
    console.error(`Falha ao gerar cobranca Pix para ${participant.name} (semana ${week.week_number})`, err);
    const { error } = await supabase.from('weekly_payments').insert({
      week_id: week.id,
      participant_id: participant.id,
      amount,
      status: 'pending',
    });
    if (error) throw error;
  }
}

/** Regenera o QR/copia-e-cola de uma cobranca que ficou sem Pix (ex: token nao estava configurado na hora). */
export async function regeneratePixCharge(weeklyPaymentId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('weekly_payments')
    .select('*, week:weeks(*), participant:participants(*)')
    .eq('id', weeklyPaymentId)
    .single();
  if (error) throw error;

  const row = data as unknown as WeeklyPayment & { week: Week; participant: Participant };
  if (row.status !== 'pending') throw new Error('Essa cobranca ja foi paga ou perdoada.');

  const charge = await generateChargeFor(row.week, row.participant, row.amount);
  const { error: updateError } = await supabase
    .from('weekly_payments')
    .update({ pix_payment_id: charge.id, pix_copia_cola: charge.copiaECola, pix_qr_base64: charge.qrCodeBase64 })
    .eq('id', weeklyPaymentId);
  if (updateError) throw updateError;
}

export type PendingPayment = WeeklyPayment & { week: Week };

/** Cobranca pendente mais antiga de um participante (usada pra travar os palpites da rodada nova ate pagar a anterior). */
export async function getPendingPaymentForParticipant(participantId: string): Promise<PendingPayment | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('weekly_payments')
    .select('*, week:weeks(*)')
    .eq('participant_id', participantId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as PendingPayment | null;
}

/** Marca uma cobranca como paga e registra a contribuicao no caixa - idempotente (webhook pode chegar mais de uma vez). */
export async function markPaymentPaid(weeklyPaymentId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data: payment, error } = await supabase
    .from('weekly_payments')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', weeklyPaymentId)
    .eq('status', 'pending')
    .select('*')
    .maybeSingle();
  if (error) throw error;
  if (!payment) return;

  const { error: ledgerError } = await supabase.from('fund_transactions').insert({
    type: 'contribution',
    amount: payment.amount,
    description: 'Pagamento da rodada',
    participant_id: payment.participant_id,
    week_id: payment.week_id,
  });
  if (ledgerError) throw ledgerError;
}

/** Chamada pelo webhook do Mercado Pago apos confirmar (via API, nunca so pelo payload) que o pagamento foi aprovado. */
export async function confirmPaymentFromWebhook(pixPaymentId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data: payment, error } = await supabase
    .from('weekly_payments')
    .select('id, status')
    .eq('pix_payment_id', pixPaymentId)
    .maybeSingle();
  if (error) throw error;
  if (!payment || payment.status !== 'pending') return;

  await markPaymentPaid(payment.id);
}

/** Admin marca manualmente (pagou em especie, Pix direto fora do sistema, etc.) ou perdoa a cobranca. */
export async function setPaymentStatusManually(weeklyPaymentId: string, status: 'paid' | 'waived'): Promise<void> {
  if (status === 'paid') {
    await markPaymentPaid(weeklyPaymentId);
    return;
  }
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('weekly_payments')
    .update({ status: 'waived' })
    .eq('id', weeklyPaymentId)
    .eq('status', 'pending');
  if (error) throw error;
}

export async function listPaymentsForWeek(weekId: string): Promise<(WeeklyPayment & { participant: PublicParticipant })[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('weekly_payments')
    .select('*, participant:participants(*)')
    .eq('week_id', weekId);
  if (error) throw error;
  const rows = data as unknown as (WeeklyPayment & { participant: Participant })[];
  return rows.map((r) => ({ ...r, participant: toPublicParticipant(r.participant) }));
}

export interface ContributionSummary {
  participant: PublicParticipant;
  totalPaid: number;
  weeksPaid: number;
}

export interface FundBalance {
  total: number;
  transactions: (FundTransaction & { participant: PublicParticipant | null })[];
  contributions: ContributionSummary[];
}

/** Extrato do caixa da festa - soma de contribuicoes menos despesas lancadas pelo admin, mais quanto cada um ja contribuiu no total. */
export async function getFundBalance(): Promise<FundBalance> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('fund_transactions')
    .select('*, participant:participants(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as unknown as (FundTransaction & { participant: Participant | null })[];
  const total = rows.reduce((sum, t) => sum + (t.type === 'contribution' ? Number(t.amount) : -Number(t.amount)), 0);

  const contributionsByParticipant = new Map<string, { participant: Participant; totalPaid: number; weeksPaid: number }>();
  for (const row of rows) {
    if (row.type !== 'contribution' || !row.participant) continue;
    const existing = contributionsByParticipant.get(row.participant.id);
    if (existing) {
      existing.totalPaid += Number(row.amount);
      existing.weeksPaid += 1;
    } else {
      contributionsByParticipant.set(row.participant.id, {
        participant: row.participant,
        totalPaid: Number(row.amount),
        weeksPaid: 1,
      });
    }
  }
  const contributions = Array.from(contributionsByParticipant.values())
    .map((c) => ({ participant: toPublicParticipant(c.participant), totalPaid: c.totalPaid, weeksPaid: c.weeksPaid }))
    .sort((a, b) => b.totalPaid - a.totalPaid);

  return {
    total,
    transactions: rows.map((t) => ({ ...t, participant: t.participant ? toPublicParticipant(t.participant) : null })),
    contributions,
  };
}

/** Admin lanca uma despesa da festa no caixa (compra de bebida, aluguel de espaco, etc.). */
export async function addFundExpense(amount: number, description: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('fund_transactions').insert({ type: 'expense', amount, description });
  if (error) throw error;
}
