-- ============================================================
-- Seed inicial dos participantes de exemplo.
-- Pode ser editado/removido pelo painel /admin depois - isso aqui
-- so serve para o site nao nascer vazio.
-- Fotos ficam null (usa avatar com iniciais) at o admin subir uma foto real.
-- ============================================================
insert into participants (name, photo_url, active, display_order) values
  ('Dudu', null, true, 1),
  ('Ramon', null, true, 2),
  ('Pirata', null, true, 3),
  ('Kendrin', null, true, 4),
  ('Zoca', null, true, 5),
  ('Dalmir', null, true, 6),
  ('Macedo', null, true, 7),
  ('Med', null, true, 8),
  ('Tharcio', null, true, 9),
  ('Poxam', null, true, 10),
  ('Jair', null, true, 11),
  ('Robson', null, true, 12),
  ('Rafael', null, true, 13),
  ('Bia Haddad', null, true, 14)
on conflict do nothing;

insert into seasons (year, name, status) values
  (2026, 'Temporada 2026', 'active')
on conflict (year) do nothing;
