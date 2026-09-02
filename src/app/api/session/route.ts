import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSignedToken, PARTICIPANT_COOKIE, readSignedToken } from '@/lib/utils/auth';
import {
  getParticipant,
  listActiveParticipants,
  toPublicParticipant,
  verifyParticipantPassword,
} from '@/services/participants-service';

export async function GET() {
  const cookieStore = cookies();
  const participantId = await readSignedToken(cookieStore.get(PARTICIPANT_COOKIE)?.value);
  if (!participantId) return NextResponse.json({ participant: null });

  const participant = await getParticipant(participantId);
  if (!participant || !participant.active) return NextResponse.json({ participant: null });

  return NextResponse.json({ participant: toPublicParticipant(participant) });
}

export async function POST(request: Request) {
  const { participantId, password } = await request.json();
  if (!participantId || typeof participantId !== 'string') {
    return NextResponse.json({ error: 'participantId obrigatorio' }, { status: 400 });
  }
  if (!password || typeof password !== 'string') {
    return NextResponse.json({ error: 'Senha obrigatoria' }, { status: 400 });
  }

  const participants = await listActiveParticipants();
  const participant = participants.find((p) => p.id === participantId);
  if (!participant) {
    return NextResponse.json({ error: 'Participante nao encontrado' }, { status: 404 });
  }
  if (!participant.password_hash) {
    return NextResponse.json({ error: 'Sua senha ainda nao foi cadastrada. Fale com o admin.' }, { status: 400 });
  }

  const valid = await verifyParticipantPassword(participant, password);
  if (!valid) {
    return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 });
  }

  const token = await createSignedToken(participant.id);
  const response = NextResponse.json({ participant: toPublicParticipant(participant) });
  response.cookies.set(PARTICIPANT_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 180, // 180 dias
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(PARTICIPANT_COOKIE);
  return response;
}
