// Confere a assinatura do webhook do Mercado Pago (header x-signature),
// pra garantir que a notificacao "pagamento aprovado" veio mesmo do
// Mercado Pago - sem isso, qualquer um que descobrisse a URL do webhook
// poderia forjar "paguei" e liberar os palpites de graca. Mesma familia
// de Web Crypto usada em lib/utils/auth.ts.
//
// Algoritmo documentado pelo Mercado Pago:
// https://www.mercadopago.com.br/developers/pt/docs/checkout-api/additional-content/security/signature

function getWebhookSecret(): string {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) throw new Error('MP_WEBHOOK_SECRET nao configurado no servidor');
  return secret;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ]);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return bytesToHex(new Uint8Array(signature));
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

export async function verifyMercadoPagoSignature(params: {
  signatureHeader: string | null;
  requestId: string | null;
  dataId: string | null;
}): Promise<boolean> {
  const { signatureHeader, requestId, dataId } = params;
  if (!signatureHeader || !requestId || !dataId) return false;

  const parsed = Object.fromEntries(
    signatureHeader.split(',').map((part) => {
      const [key, value] = part.split('=').map((s) => s.trim());
      return [key, value] as const;
    })
  );
  const ts = parsed.ts;
  const v1 = parsed.v1;
  if (!ts || !v1) return false;

  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const expected = await hmacSha256Hex(getWebhookSecret(), manifest);

  return constantTimeEqual(expected, v1);
}
