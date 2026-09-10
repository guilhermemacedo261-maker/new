import { NextResponse } from 'next/server';
import { assertCronAuthorized } from '@/lib/utils/cron-auth';
import { hasLikelyLiveGames } from '@/services/games-service';
import { refreshResultsForActiveWeeks } from '@/services/results-service';

/**
 * Igual ao cron diario (process-results), mas chamado a cada poucos
 * minutos pela funcao agendada cron-live-scores.js - so que aqui a gente
 * sai fora (sem bater na API da NFL) quando nenhum jogo das semanas
 * ativas ja deveria ter comecado, pra nao gastar credito da Netlify a
 * toa fora dos horarios de jogo. Baseado no horario real de cada jogo
 * (nao um heuristico fixo de dia/hora), entao funciona mesmo pra jogos
 * fora do padrao quinta/domingo/segunda. O cron diario continua
 * existindo como rede de seguranca.
 */
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const unauthorized = assertCronAuthorized(request);
  if (unauthorized) return unauthorized;

  if (!(await hasLikelyLiveGames())) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'nenhum jogo pendente de resultado nas semanas ativas' });
  }

  try {
    const result = await refreshResultsForActiveWeeks();
    return NextResponse.json({ ok: true, skipped: false, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
