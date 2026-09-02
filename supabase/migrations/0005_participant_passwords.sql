-- ============================================================
-- Cada participante passa a ter uma senha propria (hash + salt,
-- nunca texto puro) exigida para "virar" aquele participante em
-- /api/session. Isso fecha a brecha de qualquer um clicar no nome
-- de outro e ver/editar os palpites dele.
-- ============================================================
alter table participants add column if not exists password_salt text;
alter table participants add column if not exists password_hash text;
