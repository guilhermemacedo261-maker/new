import Link from 'next/link';
import { getActiveSeason, listSeasonWeeks } from '@/services/weeks-service';
import { getWeeklyRanking } from '@/services/ranking-service';

export const dynamic = 'force-dynamic';

export default async function HistoricoPage() {
  const season = await getActiveSeason();
  const weeks = season ? await listSeasonWeeks(season.id) : [];
  const pastWeeks = weeks.filter((w) => w.status === 'closed' || w.status === 'finished');

  const items = await Promise.all(
    pastWeeks.map(async (week) => {
      const ranking = await getWeeklyRanking(week.id);
      const champion = ranking.find((r) => r.weekly_position === 1);
      return { week, champion };
    })
  );

  return (
    <div className="p-4 md:p-8">
      <h1 className="font-display text-3xl text-center mb-1">📊 HISTÓRICO</h1>
      <p className="text-center text-buteco-gold font-semibold mb-6">TEMPORADA {season?.year ?? '-'}</p>

      {items.length === 0 ? (
        <p className="text-center text-buteco-white/60 py-12">Nenhuma rodada encerrada ainda.</p>
      ) : (
        <div className="space-y-3">
          {items.map(({ week, champion }) => (
            <Link
              key={week.id}
              href={`/historico/${week.id}`}
              className="flex items-center justify-between bg-buteco-charcoal rounded-2xl p-4 hover:border-buteco-gold/50 border border-transparent"
            >
              <span className="font-display text-lg">Semana {week.week_number}</span>
              {champion ? (
                <span className="text-sm text-buteco-white/70">
                  🏆 {champion.participant.name} — {champion.correct_picks}/{champion.total_picks}
                </span>
              ) : (
                <span className="text-sm text-buteco-white/40">Sem resultados ainda</span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
