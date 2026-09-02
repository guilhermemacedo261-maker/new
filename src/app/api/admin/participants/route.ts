import { NextResponse } from 'next/server';
import { createParticipant, listAllParticipants, toPublicParticipant } from '@/services/participants-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  const participants = await listAllParticipants();
  return NextResponse.json({ participants: participants.map(toPublicParticipant) });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, photo_url, display_order } = body as { name?: string; photo_url?: string; display_order?: number };

  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'name obrigatorio' }, { status: 400 });
  }

  const participant = await createParticipant({ name: name.trim(), photo_url, display_order });
  return NextResponse.json({ participant }, { status: 201 });
}
