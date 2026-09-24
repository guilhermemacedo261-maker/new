import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { PARTICIPANT_COOKIE, readSignedToken } from '@/lib/utils/auth';
import { getPendingPaymentForParticipant, regeneratePixCharge } from '@/services/payments-service';

export const dynamic = 'force-dynamic';

/** Cobranca pendente (se houver) do participante logado - usada pra travar a tela de palpites ate o Pix cair. */
export async function GET() {
  const participantId = await readSignedToken(cookies().get(PARTICIPANT_COOKIE)?.value);
  if (!participantId) return NextResponse.json({ payment: null });

  const payment = await getPendingPaymentForParticipant(participantId);
  return NextResponse.json({ payment });
}

/** Deixa o proprio participante gerar um Pix novo se o QR expirou, sem precisar chamar o admin. */
export async function POST() {
  const participantId = await readSignedToken(cookies().get(PARTICIPANT_COOKIE)?.value);
  if (!participantId) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });

  const payment = await getPendingPaymentForParticipant(participantId);
  if (!payment) return NextResponse.json({ error: 'Nenhuma cobranca pendente' }, { status: 404 });

  try {
    await regeneratePixCharge(payment.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const updated = await getPendingPaymentForParticipant(participantId);
  return NextResponse.json({ payment: updated });
}
