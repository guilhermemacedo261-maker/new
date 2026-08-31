-- ============================================================
-- Seed inicial dos participantes do grupo.
-- Pode ser editado/removido pelo painel /admin depois.
-- Fotos ficam null (usa avatar com iniciais) ate o admin subir uma foto real.
-- ============================================================
insert into participants (name, photo_url, active, display_order) values
  ('Paulo Xana', null, true, 1),
  ('Pezão', null, true, 2),
  ('Macedo Bicampeão', null, true, 3),
  ('Dani', null, true, 4),
  ('Augusto Bobo', null, true, 5),
  ('Salgado', null, true, 6),
  ('Pezin', null, true, 7),
  ('Haniel', null, true, 8),
  ('Desconhecido', null, true, 9)
on conflict do nothing;

insert into seasons (year, name, status) values
  (2026, 'Temporada 2026', 'active')
on conflict (year) do nothing;
