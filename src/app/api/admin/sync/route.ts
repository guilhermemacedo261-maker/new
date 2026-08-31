import { NextResponse } from 'next/server';
import { syncNflWeek } from '@/services/nfl-service';

/** Botao "ATUALIZAR JOGOS AGORA" do painel admin (secao 9). */
export async function POST() {
  try {
    const result = await syncNflWeek();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
