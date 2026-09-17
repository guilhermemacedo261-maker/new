import { NextResponse } from 'next/server';
import { getCurrentWeek, getWeekById } from '@/services/weeks-service';
import { canRevealAllPicks, getPickStatusForWeek } from '@/services/picks-service';
import { getLiveWeekStandings } from '@/services/live-service';

export const dynamic = 'force-dynamic';

/**
 * Placar ao vivo da rodada atual. Antes do encerramento dos palpites
 * (quinta 16h) retorna locked=true, sem nenhum palpite - so quem ja
 * enviou ou nao (Regra 9 / secao 18 continua protegendo o CONTEUDO dos
 * palpites, so o status de "enviou/nao enviou" e publico).
 *
 * ?weekId= permite pre-visualizar uma semana especifica (ex: uma rodada
 * de teste) sem afetar o que os participantes veem por padrao.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const weekId = searchParams.get('weekId');

  const week = weekId ? await getWeekById(weekId) : await getCurrentWeek();
  if (!week) return NextResponse.json({ week: null });

  if (!canRevealAllPicks(week)) {
    const pickStatus = week.status === 'open' ? await getPickStatusForWeek(week.id) : [];
    return NextResponse.json({ week, locked: true, pickStatus });
  }

  const standings = await getLiveWeekStandings(week);
  return NextResponse.json({ locked: false, ...standings });
}
