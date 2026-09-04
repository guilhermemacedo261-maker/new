import { NextResponse } from 'next/server';
import { listSeasons } from '@/services/weeks-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  const seasons = await listSeasons();
  return NextResponse.json({ seasons });
}
