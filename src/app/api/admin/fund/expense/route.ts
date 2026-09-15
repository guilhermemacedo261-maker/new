import { NextResponse } from 'next/server';
import { addFundExpense } from '@/services/payments-service';

/** Admin lanca uma despesa da festa no caixa (bebida, espaco, etc.). */
export async function POST(request: Request) {
  const body = (await request.json()) as { amount?: number; description?: string };
  if (!body.amount || body.amount <= 0) {
    return NextResponse.json({ error: 'amount deve ser maior que zero' }, { status: 400 });
  }
  await addFundExpense(body.amount, body.description ?? '');
  return NextResponse.json({ ok: true });
}
