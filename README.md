# 🏈 NFL DE BUTECO

Site para o grupo de amigos que faz palpites dos jogos da NFL toda semana. Cada um escolhe seu nome, palpita os vencedores, e toda quinta-feira às 16h (horário de Brasília) o sistema fecha a rodada. O admin gera e baixa a imagem da tabela de palpites em `/admin/imagem` e compartilha onde quiser (WhatsApp, etc). Depois dos jogos, o ranking da temporada é atualizado automaticamente.

Sem dinheiro, sem apostas - é só honra e a foto de perfil de quem "pipocou" na semana.

## Stack

- **Next.js 14 (App Router) + TypeScript + Tailwind** - frontend e API routes.
- **Supabase (PostgreSQL + Storage)** - banco de dados e fotos dos participantes.
- **ESPN scoreboard API** (pública, sem chave) - calendário/resultados da NFL.
- **@napi-rs/canvas** - geração da imagem da tabela de palpites (sem precisar de um navegador headless em produção).
- **Vercel Cron** - agendamento das rotinas automáticas.

## 1. Pré-requisitos

- Node.js 20+ (recomendado - mesma versão usada pelas Functions da Vercel)
- Uma conta no [Supabase](https://supabase.com) (plano gratuito é suficiente para o MVP)

## 2. Configurando o Supabase

1. Crie um projeto novo no Supabase.
2. Vá em **SQL Editor** e execute, em ordem, os arquivos de `supabase/migrations/`:
   - `0001_init.sql` - cria as tabelas, constraints e RLS.
   - `0002_seed_participants.sql` - cria a temporada 2026 e os participantes de exemplo (edite os nomes antes de rodar, se quiser).
   - `0003_storage.sql` - cria o bucket público `participant-photos`.
3. Em **Project Settings → API**, copie:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY` (reservada para uso futuro, hoje o frontend não acessa o Supabase diretamente)
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (**nunca** exponha essa chave no frontend)

> **Por que RLS sem policies?** Todas as tabelas têm Row Level Security habilitado e nenhuma policy de leitura/escrita pública. Isso é intencional: o frontend nunca fala direto com o Supabase, só através das API routes do Next.js (que usam a `service_role` key). Isso garante que um participante não consiga, via DevTools, ler os palpites dos outros antes do encerramento (seção 18 do briefing).

## 3. Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha:

```bash
cp .env.example .env.local
```

| Variável | Descrição |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Credenciais do Supabase (passo 2) |
| `SESSION_SECRET` | String aleatória longa (`openssl rand -hex 32`). Assina os cookies de participante/admin |
| `ADMIN_PASSWORD` | Senha para entrar em `/admin` |
| `CRON_SECRET` | String aleatória. Protege as rotas `/api/cron/*` contra chamadas externas |
| `APP_URL` | URL pública do site (usada pelos scripts de cron locais) |

## 4. Rodando localmente

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000`. Vá em `/admin/login`, entre com `ADMIN_PASSWORD` e use o botão **"ATUALIZAR JOGOS AGORA"** para buscar a semana atual da NFL pela primeira vez.

## 5. Deploy (Vercel)

1. Importe o repositório na Vercel.
2. Configure as mesmas variáveis de ambiente do `.env.local` em **Project Settings → Environment Variables**.
3. O arquivo `vercel.json` já define os 3 cron jobs (horários em UTC, calculados a partir de America/Sao_Paulo, que não tem horário de verão):
   - `0 11 * * 2` → terça-feira 08:00 (Brasília) - busca os jogos da semana.
   - `0 19 * * 4` → quinta-feira 16:00 (Brasília) - encerra os palpites da rodada.
   - `0 12 * * *` → todo dia 09:00 (Brasília) - atualiza placares/ranking.
4. A Vercel injeta automaticamente o header `Authorization: Bearer $CRON_SECRET` nessas chamadas quando a env var `CRON_SECRET` está definida - não precisa configurar nada além disso.

> Plano Hobby da Vercel tem limite de execuções de cron por mês; se isso for um problema, rode os mesmos endpoints (`/api/cron/update-games`, `/api/cron/close-picks`, `/api/cron/process-results`) através de qualquer outro agendador externo gratuito (ex: [cron-job.org](https://cron-job.org)) enviando o mesmo header `Authorization`.

## 6. Imagem dos palpites

Não há envio automático para o WhatsApp. Em `/admin/imagem`, o administrador escolhe a semana, gera a imagem (pré-visualiza na tela) e baixa o PNG com um clique - depois é só compartilhar manualmente onde quiser (grupo do WhatsApp, etc). Antes do encerramento dos jogos, a imagem mostra só o palpite de cada um (sem verde/vermelho); depois que os jogos terminam e o ranking é recalculado, as células passam a mostrar acerto/erro.

## 7. Fluxo semanal (resumo)

```
TERÇA 08:00   → cron busca jogos da NFL, abre a rodada
TERÇA → QUI   → participantes fazem/alteram palpites
QUINTA 16:00  → cron encerra os palpites da rodada
                → admin gera e baixa a imagem em /admin/imagem quando quiser
APÓS OS JOGOS → cron diário atualiza placares, calcula acertos e ranking
```

## 8. Estrutura do projeto

```
src/
  app/            páginas (App Router) e API routes
  components/     componentes de UI reutilizáveis
  lib/            integrações puras (supabase, nfl, gerador de imagem, utils)
  services/       regras de negócio (picks, ranking, achievements, imagem, etc.)
  types/          tipos compartilhados do banco
supabase/migrations/  esquema SQL versionado
```

## 9. Trocando de fonte de dados da NFL

Troque a implementação de `fetchNflWeek` em `src/lib/nfl/espn.ts` por outra fonte (Sportradar, etc.), mantendo o formato `NflGame`/`NflWeekInfo` (`src/lib/nfl/types.ts`) - o resto do sistema não muda.

## 10. Limitações conhecidas do MVP

- A API pública da ESPN não é documentada oficialmente e pode mudar sem aviso - o admin sempre pode corrigir jogos manualmente em `/admin/games` se algo vier errado.
