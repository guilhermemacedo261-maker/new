import { notFound } from 'next/navigation';
import ParticipantAvatar from '@/components/ParticipantAvatar';
import { getWeekById } from '@/services/weeks-service';
import { listGamesForWeek } from '@/services/games-service';
import { getAllPicksForWeek, canRevealAllPicks } from '@/services/picks-service';
import { getWeeklyRanking } from '@/services/ranking-service';
import { listActiveParticipants } from '@/services/participants-service';

export const dynamic = 'force-dynamic';

export default async function HistoricoWeekPage({ params }: { params: { weekId: string } }) {
  const week = await getWeekById(params.weekId);
  if (!week || !canRevealAllPicks(week)) notFound();

  const [games, picks, participants, ranking] = await Promise.all([
    listGamesForWeek(week.id),
    getAllPicksForWeek(week.id),
    listActiveParticipants(),
    getWeeklyRanking(week.id),
  ]);

  return (
    <div className="p-4 md:p-8">
      <h1 className="font-display text-3xl text-center mb-6">SEMANA {week.week_number}</h1>

      <section className="mb-8">
        <h2 className="font-display text-lg mb-3">🏆 Ranking da semana</h2>
        <div className="bg-buteco-charcoal rounded-2xl divide-y divide-white/5">
          {ranking.map((r, i) => (
            <div key={r.participant_id} className="flex items-center gap-3 px-4 py-3">
              <span className="w-8 text-center font-display text-buteco-gold">
                {['🥇', '🥈', '🥉'][i] ?? `${r.weekly_position ?? '-'}º`}
              </span>
              <ParticipantAvatar name={r.participant.name} photoUrl={r.participant.photo_url} size="sm" />
              <span className="flex-1 font-semibold">{r.participant.name}</span>
              <span className="text-buteco-white/70">
                {r.correct_picks}/{r.total_picks}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-lg mb-3">Jogos e palpites</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 bg-buteco-black text-left px-2 py-2">Jogo</th>
                {participants.map((p) => (
                  <th key={p.id} className="px-2 py-2 min-w-[70px]">
                    <div className="flex flex-col items-center gap-1">
                      <ParticipantAvatar name={p.name} photoUrl={p.photo_url} size="sm" />
                      <span className="truncate max-w-[60px]">{p.name}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {games.map((game) => (
                <tr key={game.id} className="border-t border-white/5">
                  <td className="sticky left-0 bg-buteco-black px-2 py-2 font-semibold whitespace-nowrap">
                    {game.away_team_abbreviation} x {game.home_team_abbreviation}
                  </td>
                  {participants.map((p) => {
                    const pick = picks.find((pk) => pk.game_id === game.id && pk.participant_id === p.id);
                    let bg = 'bg-buteco-card';
                    if (pick?.is_correct === true) bg = 'bg-buteco-green/70';
                    if (pick?.is_correct === false) bg = 'bg-buteco-red/70';
                    const label = pick
                      ? pick.selected_team === 'home'
                        ? game.home_team_abbreviation
                        : game.away_team_abbreviation
                      : '-';
                    return (
                      <td key={p.id} className={`px-2 py-2 text-center ${bg}`}>
                        {label}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="border-t border-white/10 font-display">
                <td className="sticky left-0 bg-buteco-black px-2 py-2">RECORD</td>
                {participants.map((p) => {
                  const result = ranking.find((r) => r.participant_id === p.id);
                  return (
                    <td key={p.id} className="px-2 py-2 text-center text-buteco-gold">
                      {result ? `${result.correct_picks}-${result.wrong_picks}` : '-'}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
