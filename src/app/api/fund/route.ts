import { NextResponse } from 'next/server';
import { getFundBalance } from '@/services/payments-service';

export const dynamic = 'force-dynamic';

/** Extrato publico do caixa da festa (transparencia pro grupo - Regra da vaquinha). */
export async function GET() {
  const balance = await getFundBalance();
  return NextResponse.json(balance);
}
