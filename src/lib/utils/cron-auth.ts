import { NextResponse } from 'next/server';

/** Confere o header Authorization: Bearer <CRON_SECRET> enviado pelo Vercel Cron (ou pelos scripts npm de fallback). */
export function assertCronAuthorized(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET nao configurado no servidor' }, { status: 500 });
  }

  const header = request.headers.get('authorization');
  if (header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
  }

  return null;
}
