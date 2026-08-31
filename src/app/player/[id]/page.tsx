import { notFound } from 'next/navigation';
import ParticipantAvatar from '@/components/ParticipantAvatar';
import EvolutionChart from '@/components/EvolutionChart';
import { getActiveSeason } from '@/services/weeks-service';
import { getPlayerProfile } from '@/services/player-service';

export const dynamic = 'force-dynamic';

export default async function PlayerPage({ params }: { params: { id: string } }) {
  const season = await getActiveSeason();
  if (!season) notFound();

  const profile = await getPlayerProfile(params.id, season.id);
  if (!profile) notFound();

  const { participant, seasonResult, weeklyPoints, bestWeek, worstWeek, weeksWon, achievements } = profile;

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <div className="flex justify-center mb-3">
          <ParticipantAvatar name={participant.name} photoUrl={participant.photo_url} size="xl" ring />
        </div>
        <h1 className="font-display text-3xl">🏈 {participant.name.toUpperCase()}</h1>
        <p className="text-buteco-gold font-semibold mt-1">TEMPORADA {season.year}</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6 text-center">
        <Stat label="Acertos" value={seasonResult?.correct_picks ?? 0} color="text-buteco-green" />
        <Stat label="Erros" value={seasonResult?.wrong_picks ?? 0} color="text-buteco-red" />
        <Stat label="Aproveitamento" value={`${(seasonResult?.accuracy_percentage ?? 0).toFixed(1)}%`} color="text-buteco-gold" />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-8 text-center text-sm">
        <Stat label="Semanas vencidas" value={weeksWon} />
        <Stat label="Melhor semana" value={bestWeek ? `${bestWeek.correct}/${bestWeek.total}` : '-'} />
        <Stat label="Pior semana" value={worstWeek ? `${worstWeek.correct}/${worstWeek.total}` : '-'} />
      </div>

      <section className="mb-8">
        <h2 className="font-display text-lg mb-3">Evolução de acertos</h2>
        <div className="bg-buteco-charcoal rounded-2xl p-4">
          <EvolutionChart points={weeklyPoints} />
        </div>
      </section>

      <section>
        <h2 className="font-display text-lg mb-3">Conquistas</h2>
        {achievements.length === 0 ? (
          <p className="text-buteco-white/40 text-sm">Nenhuma conquista ainda. Bora acertar mais palpites! 🏈</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {achievements.map((a) => (
              <div key={a.id} className="bg-buteco-charcoal rounded-xl px-4 py-3 text-center w-28">
                <p className="text-2xl">{a.achievement.icon}</p>
                <p className="text-xs font-semibold mt-1">{a.achievement.name}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="bg-buteco-charcoal rounded-xl py-4">
      <p className={`font-display text-2xl ${color ?? ''}`}>{value}</p>
      <p className="text-[11px] uppercase text-buteco-white/50 mt-1">{label}</p>
    </div>
  );
}
