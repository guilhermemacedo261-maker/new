import { NextResponse } from 'next/server';
import { closeWeek, reopenWeek, updateWeekSchedule } from '@/services/weeks-service';
import { parseBrasiliaDateTimeLocal } from '@/lib/utils/timezone';

/**
 * action = "close" | "reopen" (secao 11 - "encerrar rodada" / "reabrir
 * rodada manualmente"). Ou picks_open_at/picks_close_at (strings de
 * <input type="datetime-local">, ex "2026-09-18T16:00") para mudar
 * quando a semana abre/fecha - sempre interpretadas como horario de
 * Brasilia, nunca o fuso do navegador do admin (Regra 4).
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = (await request.json()) as {
    action?: string;
    picks_open_at?: string;
    picks_close_at?: string;
  };

  if (body.action === 'close') {
    const week = await closeWeek(params.id);
    return NextResponse.json({ week });
  }
  if (body.action === 'reopen') {
    const week = await reopenWeek(params.id);
    return NextResponse.json({ week });
  }

  if (body.picks_open_at || body.picks_close_at) {
    const patch: { picks_open_at?: string; picks_close_at?: string } = {};
    if (body.picks_open_at) patch.picks_open_at = parseBrasiliaDateTimeLocal(body.picks_open_at).toISOString();
    if (body.picks_close_at) patch.picks_close_at = parseBrasiliaDateTimeLocal(body.picks_close_at).toISOString();

    const week = await updateWeekSchedule(params.id, patch);
    return NextResponse.json({ week });
  }

  return NextResponse.json(
    { error: 'Informe action ("close"/"reopen") ou picks_open_at/picks_close_at' },
    { status: 400 }
  );
}
