import { NextResponse } from 'next/server';
import { assertCronAuthorized } from '@/lib/utils/cron-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { closeWeek } from '@/services/weeks-service';
import type { Week } from '@/types/database';

// Disparado toda quinta-feira 16:00 (America/Sao_Paulo) - ver vercel.json.
// Encerra a(s) rodada(s) cujo prazo ja passou. A imagem dos palpites e
// gerada sob demanda pelo admin em /admin/imagem - nao ha envio automatico.
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const unauthorized = assertCronAuthorized(request);
  if (unauthorized) return unauthorized;

  const supabase = getSupabaseAdmin();
  const { data: dueWeeks, error } = await supabase
    .from('weeks')
    .select('*')
    .eq('status', 'open')
    .lte('picks_close_at', new Date().toISOString());

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const closedWeeks = [];
  for (const week of (dueWeeks as Week[]) ?? []) {
    const closed = await closeWeek(week.id);
    closedWeeks.push({ weekId: closed.id, weekNumber: closed.week_number });
  }

  return NextResponse.json({ ok: true, closedWeeks });
}
