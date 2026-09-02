import { NextResponse } from 'next/server';
import { deactivateParticipant, toPublicParticipant, updateParticipant } from '@/services/participants-service';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json();
  const { name, photo_url, active, display_order } = body as {
    name?: string;
    photo_url?: string | null;
    active?: boolean;
    display_order?: number;
  };

  const participant = await updateParticipant(params.id, { name, photo_url, active, display_order });
  return NextResponse.json({ participant: toPublicParticipant(participant) });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  await deactivateParticipant(params.id);
  return NextResponse.json({ ok: true });
}
