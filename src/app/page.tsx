import Link from 'next/link';
import ParticipantAvatar from '@/components/ParticipantAvatar';
import Countdown from '@/components/Countdown';
import HomeBackgroundCarousel from '@/components/HomeBackgroundCarousel';
import { getActiveSeason, getCurrentWeek, listSeasonWeeks } from '@/services/weeks-service';
import { listActiveParticipants } from '@/services/participants-service';
import { listGamesForWeek } from '@/services/games-service';
import { getSeasonRanking, getWeeklyRanking } from '@/services/ranking-service';
import { formatDateBR } from '@/lib/utils/timezone';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [season, week, participants] = await Promise.all([
    getActiveSeason(),
    getCurrentWeek(),
    listActiveParticipants(),
  ]);

  const games = week ? await listGamesForWeek(week.id) : [];
  const ranking = season ? await getSeasonRanking(season.id) : [];
  const top5 = ranking.filter((r) => r.total_picks > 0).slice(0, 5);
  const leader = top5[0] ?? null;
  const runnerUp = top5[1] ?? null;

  let weeklyChampion: { name: string; correct: number; total: number; weekNumber: number } | null = null;
  if (season) {
    const weeks = await listSeasonWeeks(season.id);
    for (const pastWeek of weeks.filter((w) => w.status === 'closed' || w.status === 'finished')) {
      const weeklyRanking = await getWeeklyRanking(pastWeek.id);
      const champion = weeklyRanking.find((r) => r.weekly_position === 1);
      if (champion) {
        weeklyChampion = {
          name: champion.participant.name,
          correct: champion.correct_picks,
          total: champion.total_picks,
          weekNumber: pastWeek.week_number,
        };
        break;
      }
    }
  }

  return (
    <div className="p-4 md:p-8 space-y-8">
      <HomeBackgroundCarousel groupPhotoUrl={season?.group_photo_url ?? null} games={games} />

      <section className="text-center pt-6" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}>
        <h1 className="font-display text-4xl md:text-5xl tracking-wide">🏈 NFL DE BUTECO</h1>
        <p className="text-buteco-white/80 mt-2">O bolão de palpites mais disputado do buteco.</p>
      </section>

      {week ? (
        <section className="bg-buteco-charcoal rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <p className="font-display text-3xl text-buteco-gold">SEMANA {week.week_number}</p>
            <p className="text-sm text-buteco-white/60 mt-1">
              {games.length} jogo{games.length === 1 ? '' : 's'} nesta rodada
            </p>
          </div>
          <Countdown closeAtIso={week.picks_close_at} />
          <Link
            href="/picks"
            className="w-full md:w-auto text-center px-8 py-4 rounded-xl bg-buteco-red font-display text-lg tracking-wide"
          >
            FAZER MEUS PALPITES
          </Link>
        </section>
      ) : (
        <section className="bg-buteco-charcoal rounded-2xl p-6 text-center text-buteco-white/60">
          Nenhuma rodada aberta agora. 🍺 Toda terça-feira liberamos os jogos da semana!
        </section>
      )}

      {leader && (
        <section className="bg-gradient-to-br from-buteco-gold/20 to-transparent border border-buteco-gold/40 rounded-2xl p-6 text-center">
          <p className="font-display text-xl text-buteco-gold mb-3">🏆 LÍDER DA TEMPORADA</p>
          <div className="flex justify-center mb-2">
            <ParticipantAvatar name={leader.participant.name} photoUrl={leader.participant.photo_url} size="xl" ring />
          </div>
          <p className="font-display text-2xl">{leader.participant.name}</p>
          <p className="text-buteco-white/70">{leader.correct_picks} acertos</p>
          {runnerUp && (
            <p className="text-xs text-buteco-white/50 mt-2">
              🔥 {runnerUp.correct_picks} do {runnerUp.participant.name} — diferença de{' '}
              {leader.correct_picks - runnerUp.correct_picks} acertos
            </p>
          )}
        </section>
      )}

      {top5.length > 0 && (
        <section>
          <h2 className="font-display text-xl mb-3">🏆 TOP 5</h2>
          <div className="bg-buteco-charcoal rounded-2xl divide-y divide-white/5">
            {top5.map((r, i) => (
              <div key={r.participant_id} className="flex items-center gap-3 px-4 py-3">
                <span className="w-6 text-center font-display text-buteco-gold">
                  {['🥇', '🥈', '🥉'][i] ?? `${i + 1}º`}
                </span>
                <ParticipantAvatar name={r.participant.name} photoUrl={r.participant.photo_url} size="sm" />
                <span className="flex-1 font-semibold">{r.participant.name}</span>
                <span className="text-buteco-white/70">{r.correct_picks}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {weeklyChampion && (
        <section className="bg-buteco-charcoal rounded-2xl p-6 text-center">
          <p className="font-display text-lg text-buteco-gold mb-1">🏆 CAMPEÃO DA SEMANA {weeklyChampion.weekNumber}</p>
          <p className="font-display text-2xl">{weeklyChampion.name}</p>
          <p className="text-buteco-white/60">
            {weeklyChampion.correct}/{weeklyChampion.total}
          </p>
        </section>
      )}

      {games.length > 0 && (
        <section>
          <h2 className="font-display text-xl mb-3">Próximos jogos</h2>
          <div className="space-y-2">
            {games.slice(0, 5).map((game) => (
              <div key={game.id} className="flex items-center justify-between bg-buteco-charcoal rounded-xl px-4 py-3 text-sm">
                <span>
                  {game.away_team_abbreviation} @ {game.home_team_abbreviation}
                </span>
                <span className="text-buteco-white/50">{formatDateBR(game.game_time, { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="font-display text-xl mb-3">Participantes</h2>
        <div className="flex flex-wrap gap-4">
          {participants.map((p) => (
            <div key={p.id} className="flex flex-col items-center gap-1 w-16">
              <ParticipantAvatar name={p.name} photoUrl={p.photo_url} size="md" />
              <span className="text-[11px] text-center text-buteco-white/70 truncate w-full">{p.name}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
