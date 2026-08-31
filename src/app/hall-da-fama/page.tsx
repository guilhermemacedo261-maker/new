import ParticipantAvatar from '@/components/ParticipantAvatar';
import { getHallOfFame } from '@/services/hall-of-fame-service';

export const dynamic = 'force-dynamic';

export default async function HallDaFamaPage() {
  const { champions, mostCorrectInSeason, bestAccuracy, mostWeeklyWins } = await getHallOfFame();

  return (
    <div className="p-4 md:p-8">
      <h1 className="font-display text-3xl text-center mb-6">👑 HALL DA FAMA</h1>

      {champions.length === 0 ? (
        <p className="text-center text-buteco-white/60 py-12">
          Nenhuma temporada encerrada ainda. Volte quando o primeiro campeão do NFL DE BUTECO for coroado! 🏆
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4 mb-10">
          {champions.map(({ season, result }) => (
            <div key={season.id} className="bg-buteco-charcoal rounded-2xl p-6 text-center">
              <p className="font-display text-buteco-gold">🏆 {season.year}</p>
              <div className="flex justify-center my-2">
                <ParticipantAvatar name={result.participant.name} photoUrl={result.participant.photo_url} size="lg" ring />
              </div>
              <p className="font-display text-xl uppercase">{result.participant.name}</p>
              <p className="text-buteco-white/60 text-sm">{result.correct_picks} acertos</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-4">
        <RecordCard title="Maior número de acertos em uma temporada" record={mostCorrectInSeason} suffix="acertos" />
        <RecordCard
          title="Melhor aproveitamento"
          record={bestAccuracy}
          suffix="%"
          format={(v) => v.toFixed(1)}
        />
        <RecordCard title="Mais vitórias semanais" record={mostWeeklyWins} suffix="semanas" />
      </div>
    </div>
  );
}

function RecordCard({
  title,
  record,
  suffix,
  format,
}: {
  title: string;
  record: { participant: { name: string; photo_url: string | null } ; value: number } | null;
  suffix: string;
  format?: (value: number) => string;
}) {
  return (
    <div className="bg-buteco-charcoal rounded-2xl p-5 text-center">
      <p className="text-xs uppercase text-buteco-white/50 mb-3">{title}</p>
      {record ? (
        <>
          <div className="flex justify-center mb-2">
            <ParticipantAvatar name={record.participant.name} photoUrl={record.participant.photo_url} size="md" />
          </div>
          <p className="font-display">{record.participant.name}</p>
          <p className="text-buteco-gold font-semibold">
            {format ? format(record.value) : record.value} {suffix}
          </p>
        </>
      ) : (
        <p className="text-buteco-white/40 text-sm">-</p>
      )}
    </div>
  );
}
