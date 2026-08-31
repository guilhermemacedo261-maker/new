import { NextResponse } from 'next/server';
import { assertCronAuthorized } from '@/lib/utils/cron-auth';
import { refreshResultsForActiveWeeks } from '@/services/results-service';

// Roda diariamente para atualizar placares e recalcular ranking apos os
// jogos acontecerem (secao 26 "APOS OS JOGOS"). Ver vercel.json.
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const unauthorized = assertCronAuthorized(request);
  if (unauthorized) return unauthorized;

  try {
    const result = await refreshResultsForActiveWeeks();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
