import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { sendWeekPicksToWhatsapp } from '@/services/whatsapp-service';
import type { Week } from '@/types/database';

/** Botao "ENVIAR PARA WHATSAPP" do admin (secao 11/15) - envio manual, fora do cron de quinta. */
export async function POST(request: Request) {
  const { weekId } = (await request.json()) as { weekId?: string };
  if (!weekId) return NextResponse.json({ error: 'weekId obrigatorio' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: week, error } = await supabase.from('weeks').select('*').eq('id', weekId).single();
  if (error || !week) return NextResponse.json({ error: 'Semana nao encontrada' }, { status: 404 });

  const result = await sendWeekPicksToWhatsapp(week as Week);
  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}
