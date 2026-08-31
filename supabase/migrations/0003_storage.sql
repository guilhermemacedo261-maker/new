-- Bucket publico para as fotos dos participantes (secao 3/21 - Supabase
-- Storage). Publico de leitura porque as fotos aparecem no site e na
-- imagem enviada ao WhatsApp; upload continua restrito porque so a API
-- do admin (com a service role key) escreve no bucket.
insert into storage.buckets (id, name, public)
values ('participant-photos', 'participant-photos', true)
on conflict (id) do nothing;

drop policy if exists "Leitura publica das fotos dos participantes" on storage.objects;

create policy "Leitura publica das fotos dos participantes"
on storage.objects for select
using (bucket_id = 'participant-photos');
