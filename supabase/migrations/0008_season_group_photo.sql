-- ============================================================
-- Foto do grupo usada como plano de fundo da tela inicial (entre os
-- confrontos da semana no carrossel). Fica presa a temporada ativa,
-- como as fotos comemorativas de campeao/bobo em 0007.
-- ============================================================
alter table seasons add column if not exists group_photo_url text;
