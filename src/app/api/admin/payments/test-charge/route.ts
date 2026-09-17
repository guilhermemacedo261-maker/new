import { NextResponse } from 'next/server';

/**
 * ROTA TEMPORARIA DE TESTE - so pra validar o Access Token de producao
 * do Mercado Pago antes de mesclar a vaquinha pra valer. Nao grava nada
 * em weekly_payments/fund_transactions (isolada dos dados reais) e nao
 * configura notification_url (nao testa o webhook, so a criacao/consulta
 * do Pix). So GET de proposito, pra dar pra acionar clicando o link no
 * navegador (logado como admin). Remover depois do teste.
 */
function getAccessToken(): string {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) throw new Error('MP_ACCESS_TOKEN nao configurado');
  return token;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const checkId = searchParams.get('id');

  if (checkId) {
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${checkId}`, {
      headers: { Authorization: `Bearer ${getAccessToken()}` },
      cache: 'no-store',
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: data }, { status: res.status });
    return NextResponse.json({ id: data.id, status: data.status, status_detail: data.status_detail });
  }

  const amount = Number(searchParams.get('amount') ?? '1');

  const res = await fetch('https://api.mercadopago.com/v1/payments', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': `teste-manual-${Date.now()}`,
    },
    body: JSON.stringify({
      transaction_amount: amount,
      description: 'NFL de Buteco - teste de integracao (Macedo)',
      payment_method_id: 'pix',
      payer: { email: 'teste-nfldebuteco@nfldebuteco.app' },
      external_reference: 'teste-manual',
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json({ error: data }, { status: res.status });
  }

  const transactionData = data.point_of_interaction?.transaction_data;
  return NextResponse.json({
    id: data.id,
    status: data.status,
    copiaECola: transactionData?.qr_code ?? null,
    qrCodeBase64Length: transactionData?.qr_code_base64?.length ?? 0,
    checkStatusUrl: `/api/admin/payments/test-charge?id=${data.id}`,
  });
}
