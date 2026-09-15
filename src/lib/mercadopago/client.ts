// Integracao com a API de Pagamentos do Mercado Pago (Pix). Usamos fetch
// direto em vez do SDK oficial pra manter o mesmo estilo do restante do
// projeto (ver src/lib/nfl/espn.ts) - sao so 2 chamadas.

const BASE_URL = 'https://api.mercadopago.com';

function getAccessToken(): string {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) throw new Error('MP_ACCESS_TOKEN nao configurado no servidor');
  return token;
}

export interface CreatePixChargeInput {
  amount: number;
  description: string;
  /** Usado como chave de idempotencia (Regra: nunca gerar 2 cobrancas pro mesmo participante/semana) e pra casar o webhook com a cobranca. */
  externalReference: string;
  payerEmail: string;
}

export interface PixCharge {
  id: string;
  status: string;
  copiaECola: string;
  qrCodeBase64: string;
}

/** Cria uma cobranca Pix imediata no Mercado Pago e devolve o QR Code/copia-e-cola. */
export async function createPixCharge(input: CreatePixChargeInput): Promise<PixCharge> {
  const appUrl = process.env.APP_URL;
  const res = await fetch(`${BASE_URL}/v1/payments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      'Content-Type': 'application/json',
      // evita duplicar a cobranca se a chamada for repetida (retry de rede, etc).
      'X-Idempotency-Key': input.externalReference,
    },
    body: JSON.stringify({
      transaction_amount: input.amount,
      description: input.description,
      payment_method_id: 'pix',
      payer: { email: input.payerEmail },
      external_reference: input.externalReference,
      notification_url: appUrl ? `${appUrl}/api/webhooks/mercadopago` : undefined,
    }),
  });

  if (!res.ok) {
    throw new Error(`Falha ao criar cobranca Pix no Mercado Pago (${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  const transactionData = data.point_of_interaction?.transaction_data;
  if (!transactionData?.qr_code) {
    throw new Error('Mercado Pago nao retornou os dados do Pix (qr_code ausente)');
  }

  return {
    id: String(data.id),
    status: data.status,
    copiaECola: transactionData.qr_code,
    qrCodeBase64: transactionData.qr_code_base64,
  };
}

export interface PixPaymentStatus {
  id: string;
  status: string;
  externalReference: string | null;
}

/**
 * Busca o status atual de um pagamento direto na API (nunca confiamos so
 * no payload do webhook - a recomendacao oficial do Mercado Pago e sempre
 * reconsultar o pagamento pelo id antes de considerar aprovado).
 */
export async function getPixPayment(paymentId: string): Promise<PixPaymentStatus> {
  const res = await fetch(`${BASE_URL}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${getAccessToken()}` },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Falha ao consultar pagamento ${paymentId} no Mercado Pago (${res.status}): ${await res.text()}`);
  }
  const data = await res.json();
  return { id: String(data.id), status: data.status, externalReference: data.external_reference ?? null };
}
