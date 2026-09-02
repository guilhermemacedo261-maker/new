import { NextResponse } from 'next/server';
import { listActiveParticipants, toPublicParticipant } from '@/services/participants-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  const participants = await listActiveParticipants();
  return NextResponse.json({ participants: participants.map(toPublicParticipant) });
}
