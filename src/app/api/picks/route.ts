import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { PARTICIPANT_COOKIE, readSignedToken } from '@/lib/utils/auth';
import { InvalidPicksError, PicksClosedError, submitPicks } from '@/services/picks-service';

export async function POST(request: Request) {
  const participantId = await readSignedToken(cookies().get(PARTICIPANT_COOKIE)?.value);
  if (!participantId) {
    return NextResponse.json({ error: 'Selecione seu nome antes de enviar palpites.' }, { status: 401 });
  }

  const body = await request.json();
  const { weekId, picks } = body as { weekId?: string; picks?: { gameId: string; selectedTeam: 'home' | 'away' }[] };

  if (!weekId || !Array.isArray(picks)) {
    return NextResponse.json({ error: 'weekId e picks (array) sao obrigatorios' }, { status: 400 });
  }

  try {
    await submitPicks(
      weekId,
      participantId,
      picks.map((p) => ({ gameId: p.gameId, selectedTeam: p.selectedTeam }))
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof PicksClosedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    if (err instanceof InvalidPicksError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
