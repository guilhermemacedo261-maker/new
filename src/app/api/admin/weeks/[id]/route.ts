import { NextResponse } from 'next/server';
import { closeWeek, reopenWeek } from '@/services/weeks-service';

/** action = "close" | "reopen" (secao 11 - "encerrar rodada" / "reabrir rodada manualmente"). */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { action } = (await request.json()) as { action?: string };

  if (action === 'close') {
    const week = await closeWeek(params.id);
    return NextResponse.json({ week });
  }
  if (action === 'reopen') {
    const week = await reopenWeek(params.id);
    return NextResponse.json({ week });
  }

  return NextResponse.json({ error: 'action deve ser "close" ou "reopen"' }, { status: 400 });
}
