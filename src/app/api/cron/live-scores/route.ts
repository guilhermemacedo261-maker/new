import { NextResponse } from 'next/server';
import { assertCronAuthorized } from '@/lib/utils/cron-auth';
import { isLikelyGameWindow } from '@/lib/utils/timezone';
import { refreshResultsForActiveWeeks } from '@/services/results-service';

/**
 * Igual ao cron diario (process-results), mas chamado a cada poucos
 * minutos pela funcao agendada cron-live-scores.js - so que aqui a gente
 * sai fora (sem bater na API da NFL nem no banco) quando nao e um
 * horario provavel de jogo, pra nao gastar credito da Netlify a toa nos
 * dias/horarios sem partida. O cron diario continua existindo como rede
 * de seguranca, caso essa janela erre a hora por algum motivo.
 */
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const unauthorized = assertCronAuthorized(request);
  if (unauthorized) return unauthorized;

  if (!isLikelyGameWindow()) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'fora do horario provavel de jogo' });
  }

  try {
    const result = await refreshResultsForActiveWeeks();
    return NextResponse.json({ ok: true, skipped: false, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
