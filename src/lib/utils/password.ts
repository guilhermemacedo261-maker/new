// Hash de senha dos participantes via PBKDF2 (Web Crypto - mesma familia
// de API usada em auth.ts), com salt aleatorio por pessoa. Nunca guardamos
// a senha em texto puro no banco.

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  return bytes;
}

async function deriveHash(password: string, salt: Uint8Array): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return bytesToHex(new Uint8Array(bits));
}

export async function hashPassword(password: string): Promise<{ salt: string; hash: string }> {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const hash = await deriveHash(password, saltBytes);
  return { salt: bytesToHex(saltBytes), hash };
}

export async function verifyPassword(password: string, salt: string, expectedHash: string): Promise<boolean> {
  const computed = await deriveHash(password, hexToBytes(salt));
  if (computed.length !== expectedHash.length) return false;
  let mismatch = 0;
  for (let i = 0; i < computed.length; i++) mismatch |= computed.charCodeAt(i) ^ expectedHash.charCodeAt(i);
  return mismatch === 0;
}

/** Gera um PIN numerico facil de digitar no celular (padrao para novas senhas). */
export function generatePin(length = 4): string {
  const digits = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(digits)
    .map((b) => (b % 10).toString())
    .join('');
}
