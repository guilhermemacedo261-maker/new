import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { PARTICIPANT_COOKIE, readSignedToken } from '@/lib/utils/auth';
import { getWeekGamesWithMyPicks } from '@/services/picks-service';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const weekId = searchParams.get('weekId');
  if (!weekId) return NextResponse.json({ error: 'weekId obrigatorio' }, { status: 400 });

  const participantId = await readSignedToken(cookies().get(PARTICIPANT_COOKIE)?.value);

  if (participantId) {
    const games = await getWeekGamesWithMyPicks(weekId, participantId);
    return NextResponse.json({ games });
  }

  // sem participante identificado: retorna os jogos sem nenhum campo de palpite.
  const supabase = getSupabaseAdmin();
  const { data: games, error } = await supabase
    .from('games')
    .select('*')
    .eq('week_id', weekId)
    .order('game_time', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ games: (games ?? []).map((g) => ({ ...g, my_pick: null })) });
}
