import { NextResponse } from 'next/server';
import { correctGame } from '@/services/games-service';

/** Correcao manual de um jogo (secao 7/11 - horario, times ou placar errados na API). */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json();
  const game = await correctGame(params.id, body);
  return NextResponse.json({ game });
}
