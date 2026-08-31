-- ============================================================
-- NFL DE BUTECO - schema inicial
-- ============================================================
-- Todas as tabelas sao acessadas pelo backend (Next.js API routes)
-- usando a service role key. O anon key nao tem policies liberadas,
-- entao o frontend nunca le/escreve direto no Supabase - isso evita
-- vazamento de palpites antes do encerramento (Regra 9) e impede que
-- qualquer participante edite dados de outro via chamadas diretas.

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- seasons
-- ------------------------------------------------------------
create table if not exists seasons (
  id uuid primary key default gen_random_uuid(),
  year int not null unique,
  name text not null,
  status text not null default 'active' check (status in ('active', 'finished')),
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- participants
-- ------------------------------------------------------------
create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  photo_url text,
  active boolean not null default true,
  display_order int not null default 0,
  -- Colunas preparadas para login futuro (nao usadas na v1, apenas
  -- selecao de nome). Deixadas nullable de proposito.
  auth_user_id uuid,
  pin_hash text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- weeks
-- ------------------------------------------------------------
create table if not exists weeks (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  week_number int not null,
  status text not null default 'upcoming' check (status in ('upcoming', 'open', 'closed', 'finished')),
  picks_open_at timestamptz not null,
  picks_close_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (season_id, week_number)
);

-- ------------------------------------------------------------
-- games
-- ------------------------------------------------------------
create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references weeks(id) on delete cascade,
  external_id text not null,
  away_team text not null,
  away_team_abbreviation text not null,
  away_team_logo text,
  home_team text not null,
  home_team_abbreviation text not null,
  home_team_logo text,
  game_date date not null,
  game_time text not null,
  venue text,
  status text not null default 'scheduled' check (status in ('scheduled', 'in_progress', 'final', 'postponed')),
  away_score int,
  home_score int,
  winner text check (winner in ('home', 'away', 'tie')),
  results_processed boolean not null default false,
  created_at timestamptz not null default now(),
  -- Regra 8: evita jogo duplicado dentro da mesma semana.
  unique (week_id, external_id)
);

-- ------------------------------------------------------------
-- picks
-- ------------------------------------------------------------
create table if not exists picks (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references weeks(id) on delete cascade,
  game_id uuid not null references games(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  selected_team text not null check (selected_team in ('home', 'away')),
  is_correct boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Regra 1/2: um palpite por participante por jogo, sempre um vencedor unico.
  unique (game_id, participant_id)
);

create index if not exists idx_picks_week on picks(week_id);
create index if not exists idx_picks_participant on picks(participant_id);
create index if not exists idx_games_week on games(week_id);

-- ------------------------------------------------------------
-- weekly_results (consolidado por participante/semana)
-- ------------------------------------------------------------
create table if not exists weekly_results (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references weeks(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  correct_picks int not null default 0,
  wrong_picks int not null default 0,
  total_picks int not null default 0,
  accuracy_percentage numeric(5,2) not null default 0,
  weekly_position int,
  created_at timestamptz not null default now(),
  unique (week_id, participant_id)
);

-- ------------------------------------------------------------
-- season_results (consolidado por participante/temporada)
-- ------------------------------------------------------------
create table if not exists season_results (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  correct_picks int not null default 0,
  wrong_picks int not null default 0,
  total_picks int not null default 0,
  accuracy_percentage numeric(5,2) not null default 0,
  weekly_wins int not null default 0,
  current_position int,
  updated_at timestamptz not null default now(),
  unique (season_id, participant_id)
);

-- ------------------------------------------------------------
-- achievements / participant_achievements
-- ------------------------------------------------------------
create table if not exists achievements (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text not null,
  icon text not null,
  type text not null check (type in ('weekly', 'season', 'career')),
  created_at timestamptz not null default now()
);

create table if not exists participant_achievements (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id) on delete cascade,
  achievement_id uuid not null references achievements(id) on delete cascade,
  week_id uuid references weeks(id) on delete cascade,
  season_id uuid references seasons(id) on delete cascade,
  earned_at timestamptz not null default now(),
  -- "nulls not distinct" (Postgres 15+) e essencial aqui: conquistas de
  -- temporada/carreira (ex: GOAT) gravam week_id = null, e o Postgres por
  -- padrao trata NULL como sempre distinto de NULL - sem isso, rodar o
  -- calculo de conquistas duas vezes duplicaria a mesma conquista.
  unique nulls not distinct (participant_id, achievement_id, week_id)
);

-- ------------------------------------------------------------
-- whatsapp_sends (historico de envios)
-- ------------------------------------------------------------
create table if not exists whatsapp_sends (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references weeks(id) on delete cascade,
  status text not null check (status in ('success', 'failed')),
  error_message text,
  sent_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- RLS: bloqueia acesso via anon key. Todo acesso passa pelas API
-- routes do Next.js usando a service role key (que ignora RLS).
-- ------------------------------------------------------------
alter table seasons enable row level security;
alter table participants enable row level security;
alter table weeks enable row level security;
alter table games enable row level security;
alter table picks enable row level security;
alter table weekly_results enable row level security;
alter table season_results enable row level security;
alter table achievements enable row level security;
alter table participant_achievements enable row level security;
alter table whatsapp_sends enable row level security;
-- Nenhuma policy criada de proposito = nenhum acesso via anon/authenticated key.

-- ------------------------------------------------------------
-- seed de conquistas padrao
-- ------------------------------------------------------------
insert into achievements (code, name, description, icon, type) values
  ('campeao_semana', 'Campeao da Semana', 'Venceu uma rodada.', '🏆', 'weekly'),
  ('hot_hand', 'Hot Hand', 'Acertou 10 ou mais jogos em uma semana.', '🔥', 'weekly'),
  ('precisao', 'Precisao', 'Atingiu mais de 80% de aproveitamento na semana.', '🎯', 'weekly'),
  ('lider', 'Lider', 'Terminou uma semana em primeiro lugar no geral.', '👑', 'weekly'),
  ('perfeito', 'Perfeito', 'Acertou todos os jogos da semana.', '💯', 'weekly'),
  ('goat', 'GOAT', 'Terminou uma temporada em primeiro lugar.', '🐐', 'season')
on conflict (code) do nothing;
