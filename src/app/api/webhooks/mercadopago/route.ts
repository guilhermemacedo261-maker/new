import { NextResponse } from 'next/server';
import { verifyMercadoPagoSignature } from '@/lib/mercadopago/webhook';
import { getPixPayment } from '@/lib/mercadopago/client';
import { confirmPaymentFromWebhook } from '@/services/payments-service';

export const dynamic = 'force-dynamic';

/**
 * Recebe as notificacoes de pagamento do Mercado Pago. So confia numa
 * notificacao depois de (1) validar a assinatura x-signature e (2)
 * reconsultar o pagamento direto na API - nunca usamos o payload do
 * webhook como fonte de verdade do status/valor (recomendacao do
 * proprio Mercado Pago, evita liberar palpite com um webhook forjado).
 */
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const body = await request.json().catch(() => null);

  const type = body?.type ?? searchParams.get('type');
  const dataId = searchParams.get('data.id') ?? body?.data?.id ?? null;

  if (type !== 'payment' || !dataId) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const valid = await verifyMercadoPagoSignature({
    signatureHeader: request.headers.get('x-signature'),
    requestId: request.headers.get('x-request-id'),
    dataId: String(dataId),
  });
  if (!valid) {
    return NextResponse.json({ error: 'Assinatura invalida' }, { status: 401 });
  }

  const payment = await getPixPayment(String(dataId));
  if (payment.status === 'approved') {
    await confirmPaymentFromWebhook(payment.id);
  }

  return NextResponse.json({ ok: true });
}
