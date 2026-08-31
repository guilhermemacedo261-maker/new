import { NextResponse } from 'next/server';
import { refreshResultsForActiveWeeks } from '@/services/results-service';

/** Botao "ATUALIZAR RESULTADOS AGORA" do painel admin. */
export async function POST() {
  try {
    const result = await refreshResultsForActiveWeeks();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
