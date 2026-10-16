-- Penalidade manual aplicada pelo admin num resultado semanal (ex: participante
-- que nao palpitou a tempo e perde 1 acerto como punicao). Persiste entre os
-- recalculos automaticos de weekly_results (cron, resultado de jogo, etc) -
-- recomputeWeeklyResults sempre preserva o valor ja gravado e so desconta ele
-- do total de acertos calculado a partir dos palpites reais.
alter table weekly_results add column if not exists manual_penalty int not null default 0;
