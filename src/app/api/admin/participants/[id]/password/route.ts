import { NextResponse } from 'next/server';
import { generatePin } from '@/lib/utils/password';
import { setParticipantPassword } from '@/services/participants-service';

/**
 * Define a senha de um participante. Sem `password` no corpo, gera um PIN
 * novo de 4 digitos - devolvido em texto puro so nesta resposta, pro admin
 * copiar e mandar pro dono. Depois disso, so o hash fica salvo.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  const { password } = body as { password?: string };

  const finalPassword = password && password.trim() ? password.trim() : generatePin();
  await setParticipantPassword(params.id, finalPassword);

  return NextResponse.json({ password: finalPassword });
}
