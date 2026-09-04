import { NextResponse } from 'next/server';
import { updateSeasonPhotos } from '@/services/weeks-service';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json();
  const { champion_photo_url, lanterna_photo_url, group_photo_url } = body as {
    champion_photo_url?: string | null;
    lanterna_photo_url?: string | null;
    group_photo_url?: string | null;
  };

  const season = await updateSeasonPhotos(params.id, { champion_photo_url, lanterna_photo_url, group_photo_url });
  return NextResponse.json({ season });
}
