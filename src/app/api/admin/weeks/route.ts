import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getActiveSeason, listSeasonWeeks } from '@/services/weeks-service';
import { nextThursday16h } from '@/lib/utils/timezone';

export const dynamic = 'force-dynamic';

export async function GET() {
  const season = await getActiveSeason();
  if (!season) return NextResponse.json({ weeks: [] });
  const weeks = await listSeasonWeeks(season.id);
  return NextResponse.json({ weeks, season });
}

/** Criacao manual de uma semana (secao 11 - "criar semana manualmente"), para quando a API da NFL falhar. */
export async function POST(request: Request) {
  const body = await request.json();
  const { week_number, picks_close_at } = body as { week_number?: number; picks_close_at?: string };

  if (!week_number) {
    return NextResponse.json({ error: 'week_number obrigatorio' }, { status: 400 });
  }

  const season = await getActiveSeason();
  if (!season) return NextResponse.json({ error: 'Nenhuma temporada ativa' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const now = new Date();
  const { data, error } = await supabase
    .from('weeks')
    .insert({
      season_id: season.id,
      week_number,
      status: 'open',
      picks_open_at: now.toISOString(),
      picks_close_at: picks_close_at ?? nextThursday16h(now).toISOString(),
    })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ week: data }, { status: 201 });
}
