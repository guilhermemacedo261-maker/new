import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

/** Upload de foto de participante para o Supabase Storage (secao 3/21). Retorna a URL publica. */
export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'arquivo obrigatorio (campo "file")' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Formato invalido. Use PNG, JPG ou WEBP.' }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: 'Arquivo maior que 5MB.' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const extension = file.type.split('/')[1];
  const path = `${randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from('participant-photos')
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data } = supabase.storage.from('participant-photos').getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
