import { NextResponse } from 'next/server';
import { prepareSeasonWeeks } from '@/services/nfl-service';

/**
 * Botao "PREPARAR TEMPORADA INTEIRA" do admin - cria de uma vez as
 * semanas 1 a 18 (temporada regular) com os jogos e prazos ja calculados,
 * para o admin so precisar ajustar datas pontuais depois se quiser.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    fromWeek?: number;
    toWeek?: number;
    season?: number;
  };

  try {
    const result = await prepareSeasonWeeks({
      fromWeek: body.fromWeek,
      toWeek: body.toWeek,
      season: body.season,
    });
    return NextResponse.json({ ok: true, weeksCreated: result.weeks.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
