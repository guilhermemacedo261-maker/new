import RankingTable from '@/components/RankingTable';
import { getActiveSeason } from '@/services/weeks-service';
import { getSeasonRanking } from '@/services/ranking-service';

export const dynamic = 'force-dynamic';

export default async function RankingPage() {
  const season = await getActiveSeason();
  const ranking = season ? await getSeasonRanking(season.id) : [];

  const rows = ranking
    .filter((r) => r.total_picks > 0)
    .map((r) => ({
      position: r.current_position,
      participant: r.participant,
      correct: r.correct_picks,
      wrong: r.wrong_picks,
      accuracy: r.accuracy_percentage,
    }));

  return (
    <div className="p-4 md:p-8">
      <h1 className="font-display text-3xl text-center mb-1">🏆 RANKING NFL DE BUTECO</h1>
      <p className="text-center text-buteco-gold font-semibold mb-6">TEMPORADA {season?.year ?? '-'}</p>

      {rows.length === 0 ? (
        <p className="text-center text-buteco-white/60 py-12">Ainda não há jogos concluídos nesta temporada.</p>
      ) : (
        <RankingTable rows={rows} />
      )}
    </div>
  );
}
