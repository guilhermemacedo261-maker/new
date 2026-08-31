import { NextResponse } from 'next/server';
import { listActiveParticipants } from '@/services/participants-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  const participants = await listActiveParticipants();
  return NextResponse.json({ participants });
}
