import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { toPublicParticipant } from './participants-service';
import type { Participant, PublicParticipant, Season, SeasonResult } from '@/types/database';

export interface SeasonChampion {
  season: Season;
  result: SeasonResult & { participant: PublicParticipant };
}

export interface HallOfFameRecord {
  participant: PublicParticipant;
  value: number;
}

export interface HallOfFame {
  champions: SeasonChampion[];
  lanternas: SeasonChampion[];
  mostCorrectInSeason: HallOfFameRecord | null;
  bestAccuracy: HallOfFameRecord | null;
  mostWeeklyWins: HallOfFameRecord | null;
}

/** Consolida os dados do Hall da Fama (secao 33) - apenas temporadas encerradas contam como historico oficial. */
export async function getHallOfFame(): Promise<HallOfFame> {
  const supabase = getSupabaseAdmin();

  const { data: finishedSeasons, error: seasonsError } = await supabase
    .from('seasons')
    .select('*')
    .eq('status', 'finished')
    .order('year', { ascending: true });
  if (seasonsError) throw seasonsError;

  const seasons = (finishedSeasons as Season[]) ?? [];
  if (seasons.length === 0) {
    return { champions: [], lanternas: [], mostCorrectInSeason: null, bestAccuracy: null, mostWeeklyWins: null };
  }

  const { data: results, error: resultsError } = await supabase
    .from('season_results')
    .select('*, participant:participants(*)')
    .in('season_id', seasons.map((s) => s.id));
  if (resultsError) throw resultsError;

  const typedResults = (results as unknown as (SeasonResult & { participant: Participant })[]).map((r) => ({
    ...r,
    participant: toPublicParticipant(r.participant),
  }));

  const champions: SeasonChampion[] = seasons
    .map((season) => {
      const champion = typedResults.find((r) => r.season_id === season.id && r.current_position === 1);
      return champion ? { season, result: champion } : null;
    })
    .filter((c): c is SeasonChampion => c !== null);

  // "Bobo" da temporada (secao 33) - a lanterna e quem terminou na ultima
  // posicao entre quem de fato palpitou naquela temporada.
  const lanternas: SeasonChampion[] = seasons
    .map((season) => {
      const seasonRows = typedResults.filter((r) => r.season_id === season.id && r.total_picks > 0);
      if (seasonRows.length === 0) return null;
      const lanterna = [...seasonRows].sort((a, b) => (b.current_position ?? 0) - (a.current_position ?? 0))[0];
      return { season, result: lanterna };
    })
    .filter((c): c is SeasonChampion => c !== null);

  const mostCorrect = [...typedResults].sort((a, b) => b.correct_picks - a.correct_picks)[0];
  const bestAccuracy = [...typedResults]
    .filter((r) => r.total_picks > 0)
    .sort((a, b) => b.accuracy_percentage - a.accuracy_percentage)[0];

  const winsByParticipant = new Map<string, { participant: PublicParticipant; wins: number }>();
  for (const r of typedResults) {
    const entry = winsByParticipant.get(r.participant_id) ?? { participant: r.participant, wins: 0 };
    entry.wins += r.weekly_wins;
    winsByParticipant.set(r.participant_id, entry);
  }
  const mostWins = [...winsByParticipant.values()].sort((a, b) => b.wins - a.wins)[0];

  return {
    champions,
    lanternas,
    mostCorrectInSeason: mostCorrect ? { participant: mostCorrect.participant, value: mostCorrect.correct_picks } : null,
    bestAccuracy: bestAccuracy ? { participant: bestAccuracy.participant, value: bestAccuracy.accuracy_percentage } : null,
    mostWeeklyWins: mostWins ? { participant: mostWins.participant, value: mostWins.wins } : null,
  };
}
