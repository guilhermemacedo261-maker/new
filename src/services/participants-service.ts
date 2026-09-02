import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { hashPassword, verifyPassword } from '@/lib/utils/password';
import type { Participant, PublicParticipant } from '@/types/database';

/** Remove hash/salt antes de mandar o participante pro navegador (secao 18). */
export function toPublicParticipant(p: Participant): PublicParticipant {
  const { password_salt, password_hash, ...rest } = p;
  return { ...rest, has_password: Boolean(password_hash) };
}

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

/** Define/reseta a senha de um participante (admin). Retorna o hash - nunca a senha em texto puro. */
export async function setParticipantPassword(id: string, plainPassword: string): Promise<void> {
  const { salt, hash } = await hashPassword(plainPassword);
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('participants')
    .update({ password_salt: salt, password_hash: hash })
    .eq('id', id);
  if (error) throw error;
}

/** Confere a senha informada contra o hash salvo. Sem senha configurada = sempre nega. */
export async function verifyParticipantPassword(participant: Participant, plainPassword: string): Promise<boolean> {
  if (!participant.password_hash || !participant.password_salt) return false;
  return verifyPassword(plainPassword, participant.password_salt, participant.password_hash);
}
