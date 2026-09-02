-- ============================================================
-- pin_hash era uma coluna de reserva do schema inicial (nunca usada por
-- nenhum codigo) para um futuro login por senha. Esse login foi
-- implementado na migracao 0005 com password_salt/password_hash -
-- remove a coluna morta pra nao ter dois campos de "senha" no mesmo lugar.
-- ============================================================
alter table participants drop column if exists pin_hash;
