import { NextResponse } from 'next/server';
import { assertCronAuthorized } from '@/lib/utils/cron-auth';
import { syncNflWeek } from '@/services/nfl-service';

// Disparado toda terca-feira 08:00 (America/Sao_Paulo) - ver vercel.json.
// Tambem pode ser chamado manualmente pelo botao "Atualizar jogos agora" do admin.
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const unauthorized = assertCronAuthorized(request);
  if (unauthorized) return unauthorized;

  try {
    const result = await syncNflWeek();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
