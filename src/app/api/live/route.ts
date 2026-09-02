import { NextResponse } from 'next/server';
import { getCurrentWeek } from '@/services/weeks-service';
import { canRevealAllPicks } from '@/services/picks-service';
import { getLiveWeekStandings } from '@/services/live-service';

export const dynamic = 'force-dynamic';

/**
 * Placar ao vivo da rodada atual. Antes do encerramento dos palpites
 * (quinta 16h) retorna locked=true sem nenhum dado de palpite - os jogos
 * so comecam depois do prazo, entao isso na pratica so importa como
 * defesa extra (Regra 9 / secao 18).
 */
export async function GET() {
  const week = await getCurrentWeek();
  if (!week) return NextResponse.json({ week: null });

  if (!canRevealAllPicks(week)) {
    return NextResponse.json({ week, locked: true });
  }

  const standings = await getLiveWeekStandings(week);
  return NextResponse.json({ locked: false, ...standings });
}
