import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { PARTICIPANT_COOKIE, readSignedToken } from '@/lib/utils/auth';
import { getPendingPaymentForParticipant } from '@/services/payments-service';

export const dynamic = 'force-dynamic';

/** Cobranca pendente (se houver) do participante logado - usada pra travar a tela de palpites ate o Pix cair. */
export async function GET() {
  const participantId = await readSignedToken(cookies().get(PARTICIPANT_COOKIE)?.value);
  if (!participantId) return NextResponse.json({ payment: null });

  const payment = await getPendingPaymentForParticipant(participantId);
  return NextResponse.json({ payment });
}
