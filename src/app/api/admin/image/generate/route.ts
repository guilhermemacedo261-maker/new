import { NextResponse } from 'next/server';
import { buildWeekPicksImage } from '@/services/image-service';
import { getWeekById } from '@/services/weeks-service';

export const dynamic = 'force-dynamic';

/**
 * Gera o PNG da tabela de palpites da semana (secao 12). Usado tanto para
 * o preview em /admin/imagem quanto para o download (?download=1) - o
 * admin baixa a imagem e compartilha manualmente onde quiser.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const weekId = searchParams.get('weekId');
  if (!weekId) return NextResponse.json({ error: 'weekId obrigatorio' }, { status: 400 });

  const week = await getWeekById(weekId);
  const image = await buildWeekPicksImage(weekId);

  const headers: Record<string, string> = {
    'Content-Type': 'image/png',
    'Cache-Control': 'no-store',
  };

  if (searchParams.get('download') === '1') {
    const filename = `nfl-de-buteco-semana-${week?.week_number ?? weekId}.png`;
    headers['Content-Disposition'] = `attachment; filename="${filename}"`;
  }

  return new NextResponse(new Uint8Array(image), { headers });
}
