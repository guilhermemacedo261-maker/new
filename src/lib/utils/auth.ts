// Cookies assinados (HMAC-SHA256, via Web Crypto) para identificar o
// participante selecionado e a sessao do admin, sem precisar de um
// sistema de login completo na v1. Usamos apenas Web APIs (crypto.subtle,
// TextEncoder/Decoder, btoa/atob) de proposito: isso roda tanto nas API
// routes (Node) quanto no middleware (Edge runtime), que nao tem acesso
// ao modulo nativo "crypto" nem a "Buffer" do Node. O segredo nunca sai
// do servidor, entao um participante nao consegue forjar o cookie de
// outro so editando o valor no navegador (Regra 9 / secao 18).

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET nao configurado no .env.local');
  }
  return secret;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function importKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey('raw', encoder.encode(getSecret()), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ]);
}

async function sign(value: string): Promise<string> {
  const key = await importKey();
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return bytesToBase64Url(new Uint8Array(signature));
}

export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function createSignedToken(value: string): Promise<string> {
  const signature = await sign(value);
  const encoded = bytesToBase64Url(new TextEncoder().encode(value));
  return `${encoded}.${signature}`;
}

export async function readSignedToken(token: string | undefined | null): Promise<string | null> {
  if (!token) return null;
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) return null;

  let value: string;
  try {
    value = new TextDecoder().decode(base64UrlToBytes(encoded));
  } catch {
    return null;
  }

  const expected = await sign(value);
  if (!constantTimeEqual(signature, expected)) return null;

  return value;
}

export const PARTICIPANT_COOKIE = 'nfl_buteco_participant';
export const ADMIN_COOKIE = 'nfl_buteco_admin';
