-- ============================================================
-- Vaquinha da rodada: quem fica em ultimo paga mais, o lider paga
-- menos, e todo mundo no meio paga um valor fixo. O dinheiro nao
-- volta pra ninguem - fica guardado pra pagar a festa de fim de ano
-- (sem fins lucrativos, so rateio de despesa com regra divertida).
-- ============================================================

-- ------------------------------------------------------------
-- weekly_payments (1 linha por participante por semana encerrada)
-- ------------------------------------------------------------
create table if not exists weekly_payments (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references weeks(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  amount numeric(10,2) not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'waived')),
  -- dados da cobranca Pix no Mercado Pago (preenchidos ao gerar a cobranca).
  pix_payment_id text,
  pix_copia_cola text,
  pix_qr_base64 text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  -- nunca gera 2 cobrancas pro mesmo participante na mesma semana.
  unique (week_id, participant_id)
);

create index if not exists idx_weekly_payments_participant on weekly_payments(participant_id);
create index if not exists idx_weekly_payments_pix_payment_id on weekly_payments(pix_payment_id);

-- ------------------------------------------------------------
-- fund_transactions (extrato do caixa da festa)
-- ------------------------------------------------------------
create table if not exists fund_transactions (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('contribution', 'expense')),
  amount numeric(10,2) not null,
  description text,
  -- contribuicao: de quem veio. despesa: fica nulo.
  participant_id uuid references participants(id) on delete set null,
  week_id uuid references weeks(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table weekly_payments enable row level security;
alter table fund_transactions enable row level security;
-- Nenhuma policy criada de proposito, mesmo padrao do restante do schema:
-- todo acesso passa pelas API routes com a service role key.
