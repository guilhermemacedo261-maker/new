import { NextResponse } from 'next/server';
import { listPaymentsForWeek } from '@/services/payments-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const weekId = searchParams.get('weekId');
  if (!weekId) return NextResponse.json({ error: 'weekId obrigatorio' }, { status: 400 });

  const payments = await listPaymentsForWeek(weekId);
  return NextResponse.json({ payments });
}
