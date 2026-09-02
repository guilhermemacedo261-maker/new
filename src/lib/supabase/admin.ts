import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Cliente com a service role key: usado APENAS em codigo de servidor
// (API routes, cron). Ignora RLS de proposito - e o unico jeito de
// ler/escrever nas tabelas, ja que nenhuma policy de anon foi criada.
// Nunca importar este arquivo em um componente client ('use client').
let _client: ReturnType<typeof createClient<Database>> | null = null;

// O Next.js "sequestra" o fetch global do processo e cacheia chamadas
// automaticamente - inclusive as que o supabase-js faz por baixo dos
// panos - mesmo com `dynamic = 'force-dynamic'' na rota (o runtime da
// Netlify pra Next.js nao respeita isso 100% pra fetches de bibliotecas).
// Isso fazia edicoes no admin (ex: prazo da semana) nao aparecerem para
// os participantes ate um novo deploy. Forcar no-store aqui garante que
// toda consulta ao Supabase busca o dado atual, sempre.
function noStoreFetch(input: RequestInfo | URL, init?: RequestInit) {
  return fetch(input, { ...init, cache: 'no-store' });
}

export function getSupabaseAdmin() {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Supabase nao configurado. Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local'
    );
  }

  _client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: noStoreFetch },
  });

  return _client;
}
