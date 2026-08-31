import { NextResponse } from 'next/server';
import { buildWeekPicksImage } from '@/services/image-service';

export const dynamic = 'force-dynamic';

/** Botao "GERAR IMAGEM DOS PALPITES" do admin (secao 11/12) - retorna o PNG para preview. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const weekId = searchParams.get('weekId');
  if (!weekId) return NextResponse.json({ error: 'weekId obrigatorio' }, { status: 400 });

  const image = await buildWeekPicksImage(weekId);
  return new NextResponse(new Uint8Array(image), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-store',
    },
  });
}
