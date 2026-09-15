import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { toPublicParticipant } from './participants-service';
import type { Game, GameStatus, Participant, Pick, PublicParticipant, TeamSide, Week, Winner } from '@/types/database';

export interface LiveParticipantStanding {
  participant: PublicParticipant;
  correct: number;
  wrong: number;
  total: number;
}

export interface LiveGameRow {
  id: string;
  awayAbbreviation: string;
  homeAbbreviation: string;
  awayScore: number | null;
  homeScore: number | null;
  status: GameStatus;
  winner: Winner | null;
  picksByParticipantId: Record<string, { selectedTeam: TeamSide; isCorrect: boolean | null }>;
}

/**
 * Quem estaria ganhando um jogo agora - usado pra colorir os palpites
 * antes do jogo acabar (Regra do usuario: "quero que mude durante o
 * jogo"). Em jogo encerrado usa o vencedor oficial; em andamento, deriva
 * do placar parcial (empate no meio do jogo = ninguem "ganhando" ainda,
 * fica neutro ate desempatar). E sempre provisorio ate o jogo virar
 * "final" - o placar pode mudar de mao a qualquer momento.
 */
function deriveLiveWinner(game: Game): Winner | null {
  if (game.status === 'final') return game.winner;
  if (game.status !== 'in_progress') return null;
  if (game.home_score === null || game.away_score === null) return null;
  if (game.home_score === game.away_score) return null;
  return game.home_score > game.away_score ? 'home' : 'away';
}

export interface LiveWeekStandings {
  week: Week;
  totalGames: number;
  gamesFinal: number;
  standings: LiveParticipantStanding[];
  leader: LiveParticipantStanding | null;
  trailer: LiveParticipantStanding | null;
  participants: PublicParticipant[];
  games: LiveGameRow[];
}

/**
 * Calcula o placar parcial da rodada em tempo real, direto de picks + games
 * (nao usa weekly_results, que so e recalculado pelo cron diario - aqui
 * precisamos do resultado no exato instante em que um jogo termina).
 */
export async function getLiveWeekStandings(week: Week): Promise<LiveWeekStandings> {
  const supabase = getSupabaseAdmin();

  const [{ data: games, error: gamesError }, { data: picks, error: picksError }, { data: participants, error: pError }] =
    await Promise.all([
      supabase.from('games').select('*').eq('week_id', week.id).order('game_time', { ascending: true }),
      supabase.from('picks').select('*').eq('week_id', week.id),
      supabase.from('participants').select('*').eq('active', true).order('display_order', { ascending: true }),
    ]);
  if (gamesError) throw gamesError;
  if (picksError) throw picksError;
  if (pError) throw pError;

  const allGames = (games as Game[]) ?? [];
  const allPicks = (picks as Pick[]) ?? [];
  const finalGames = allGames.filter((g) => g.status === 'final' && g.winner);

  const liveWinnerByGameId = new Map(allGames.map((g) => [g.id, deriveLiveWinner(g)]));
  const decidedGameIds = new Set(
    allGames.filter((g) => liveWinnerByGameId.get(g.id) !== null).map((g) => g.id)
  );

  const publicParticipants = ((participants as Participant[]) ?? []).map(toPublicParticipant);

  const gameRows: LiveGameRow[] = allGames.map((game) => {
    const liveWinner = liveWinnerByGameId.get(game.id) ?? null;
    const picksByParticipantId: LiveGameRow['picksByParticipantId'] = {};
    for (const pick of allPicks) {
      if (pick.game_id !== game.id) continue;
      const isCorrect = liveWinner ? liveWinner !== 'tie' && pick.selected_team === liveWinner : null;
      picksByParticipantId[pick.participant_id] = { selectedTeam: pick.selected_team, isCorrect };
    }
    return {
      id: game.id,
      awayAbbreviation: game.away_team_abbreviation,
      homeAbbreviation: game.home_team_abbreviation,
      awayScore: game.away_score,
      homeScore: game.home_score,
      status: game.status,
      winner: game.winner,
      picksByParticipantId,
    };
  });

  const standings: LiveParticipantStanding[] = ((participants as Participant[]) ?? []).map((participant) => {
    const decidedPicks = allPicks.filter((p) => p.participant_id === participant.id && decidedGameIds.has(p.game_id));
    const correct = decidedPicks.filter((p) => {
      const liveWinner = liveWinnerByGameId.get(p.game_id);
      return liveWinner !== 'tie' && p.selected_team === liveWinner;
    }).length;
    const total = decidedPicks.length;

    return { participant: toPublicParticipant(participant), correct, wrong: total - correct, total };
  });

  standings.sort((a, b) => b.correct - a.correct || a.wrong - b.wrong);

  const withPicks = standings.filter((s) => s.total > 0);
  const hasResults = decidedGameIds.size > 0 && withPicks.length > 0;

  const leader = hasResults ? withPicks[0] : null;
  const trailer = hasResults && withPicks.length > 1 ? withPicks[withPicks.length - 1] : null;

  return {
    week,
    totalGames: allGames.length,
    gamesFinal: finalGames.length,
    standings,
    leader,
    trailer,
    participants: publicParticipants,
    games: gameRows,
  };
}
