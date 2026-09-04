-- ============================================================
-- Foto comemorativa do campeao/bobo de cada temporada no Hall da Fama -
-- separada da foto de perfil do participante (que pode mudar), fixando
-- o momento daquela conquista especifica (ex: foto com o trofeu, foto
-- de chapeu de bobo).
-- ============================================================
alter table seasons add column if not exists champion_photo_url text;
alter table seasons add column if not exists lanterna_photo_url text;
