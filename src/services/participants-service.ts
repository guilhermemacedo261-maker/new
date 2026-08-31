import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type { Participant } from '@/types/database';

export async function listActiveParticipants(): Promise<Participant[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('participants')
    .select('*')
    .eq('active', true)
    .order('display_order', { ascending: true });
  if (error) throw error;
  return (data as Participant[]) ?? [];
}

export async function listAllParticipants(): Promise<Participant[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('participants').select('*').order('display_order', { ascending: true });
  if (error) throw error;
  return (data as Participant[]) ?? [];
}

export async function getParticipant(id: string): Promise<Participant | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('participants').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as Participant) ?? null;
}

export interface ParticipantInput {
  name: string;
  photo_url?: string | null;
  active?: boolean;
  display_order?: number;
}

export async function createParticipant(input: ParticipantInput): Promise<Participant> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('participants')
    .insert({
      name: input.name,
      photo_url: input.photo_url ?? null,
      active: input.active ?? true,
      display_order: input.display_order ?? 0,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as Participant;
}

export async function updateParticipant(id: string, input: Partial<ParticipantInput>): Promise<Participant> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('participants').update(input).eq('id', id).select('*').single();
  if (error) throw error;
  return data as Participant;
}

/** Exclusao logica (desativa) - preserva o historico de palpites/ranking do participante. */
export async function deactivateParticipant(id: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('participants').update({ active: false }).eq('id', id);
  if (error) throw error;
}
