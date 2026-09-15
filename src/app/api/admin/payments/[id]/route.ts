import { NextResponse } from 'next/server';
import { regeneratePixCharge, setPaymentStatusManually } from '@/services/payments-service';

/** action = "paid" | "waived" (marca manualmente) ou "regenerate" (gera o Pix de novo quando ficou sem QR). */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = (await request.json()) as { action?: string };

  if (body.action === 'paid' || body.action === 'waived') {
    await setPaymentStatusManually(params.id, body.action);
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'regenerate') {
    try {
      await regeneratePixCharge(params.id);
      return NextResponse.json({ ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Informe action ("paid", "waived" ou "regenerate")' }, { status: 400 });
}
