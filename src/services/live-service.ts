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
  const finalGameById = new Map(finalGames.map((g) => [g.id, g]));

  const publicParticipants = ((participants as Participant[]) ?? []).map(toPublicParticipant);

  const gameRows: LiveGameRow[] = allGames.map((game) => {
    const picksByParticipantId: LiveGameRow['picksByParticipantId'] = {};
    for (const pick of allPicks) {
      if (pick.game_id !== game.id) continue;
      const isCorrect =
        game.status === 'final' && game.winner ? game.winner !== 'tie' && pick.selected_team === game.winner : null;
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
    const decidedPicks = allPicks.filter(
      (p) => p.participant_id === participant.id && finalGameById.has(p.game_id)
    );
    const correct = decidedPicks.filter((p) => {
      const game = finalGameById.get(p.game_id)!;
      return game.winner !== 'tie' && p.selected_team === game.winner;
    }).length;
    const total = decidedPicks.length;

    return { participant: toPublicParticipant(participant), correct, wrong: total - correct, total };
  });

  standings.sort((a, b) => b.correct - a.correct || a.wrong - b.wrong);

  const withPicks = standings.filter((s) => s.total > 0);
  const hasResults = finalGames.length > 0 && withPicks.length > 0;

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
