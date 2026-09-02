-- ============================================================
-- Marca jogos corrigidos manualmente pelo admin para que a busca
-- automatica de resultados (cron diario / "Atualizar resultados agora")
-- nunca sobrescreva a correcao - a API da NFL as vezes demora a
-- atualizar ou erra, e a palavra final e sempre do admin.
-- ============================================================
alter table games add column if not exists manually_corrected boolean not null default false;
