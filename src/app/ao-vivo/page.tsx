'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ParticipantAvatar from '@/components/ParticipantAvatar';
import Countdown from '@/components/Countdown';
import type { Week } from '@/types/database';
import type { LiveParticipantStanding } from '@/services/live-service';

const POLL_INTERVAL_MS = 20000;

interface LiveResponse {
  week: Week | null;
  locked?: boolean;
  totalGames?: number;
  gamesFinal?: number;
  standings?: LiveParticipantStanding[];
  leader?: LiveParticipantStanding | null;
  trailer?: LiveParticipantStanding | null;
}

function AoVivoInner() {
  const weekId = useSearchParams().get('weekId');
  const [data, setData] = useState<LiveResponse | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function load() {
    try {
      const url = weekId ? `/api/live?weekId=${weekId}` : '/api/live';
      const res = await fetch(url, { cache: 'no-store' });
      const json = (await res.json()) as LiveResponse;
      setData(json);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();

    // So paginas com a aba em segundo plano (ex: esquecida aberta o dia
    // inteiro num celular) param de consumir requisicoes/creditos da
    // Netlify - so volta a atualizar quando a pessoa realmente esta olhando.
    function startPolling() {
      if (timerRef.current) return;
      timerRef.current = setInterval(load, POLL_INTERVAL_MS);
    }
    function stopPolling() {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        load();
        startPolling();
      } else {
        stopPolling();
      }
    }

    if (document.visibilityState === 'visible') startPolling();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekId]);

  if (loading) {
    return <div className="p-8 text-center text-buteco-white/60">Carregando...</div>;
  }

  if (!data?.week) {
    return (
      <div className="p-8 text-center text-buteco-white/60">
        Nenhuma rodada disponível no momento. Volte na terça-feira! 🏈
      </div>
    );
  }

  const { week } = data;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-center gap-2 mb-1">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-buteco-red opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-buteco-red" />
        </span>
        <h1 className="font-display text-2xl tracking-wide">AO VIVO</h1>
      </div>
      <p className="text-center text-buteco-gold font-semibold mb-6">SEMANA {week.week_number}</p>

      {data.locked ? (
        <div className="bg-buteco-charcoal rounded-2xl p-8 text-center">
          <p className="text-buteco-white/60 mb-4">
            Os palpites ainda não foram revelados. O placar ao vivo aparece assim que a rodada é encerrada.
          </p>
          <div className="flex justify-center">
            <Countdown closeAtIso={week.picks_close_at} />
          </div>
        </div>
      ) : (
        <>
          <p className="text-center text-xs text-buteco-white/40 mb-6">
            {data.gamesFinal}/{data.totalGames} jogos encerrados
            {lastUpdated && ` · atualizado às ${lastUpdated.toLocaleTimeString('pt-BR')}`}
          </p>

          {!data.leader ? (
            <div className="bg-buteco-charcoal rounded-2xl p-8 text-center text-buteco-white/60 mb-8">
              Nenhum jogo terminou ainda. Assim que o primeiro resultado sair, o líder e a lanterna da rodada aparecem
              aqui. 🍺
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              <StandoutCard standing={data.leader} kind="leader" />
              {data.trailer && <StandoutCard standing={data.trailer} kind="trailer" />}
            </div>
          )}

          <div className="bg-buteco-charcoal rounded-2xl divide-y divide-white/5">
            {(data.standings ?? []).map((s, i) => (
              <div key={s.participant.id} className="flex items-center gap-3 px-4 py-3">
                <span className="w-6 text-center text-buteco-white/40 text-sm">{i + 1}º</span>
                <ParticipantAvatar name={s.participant.name} photoUrl={s.participant.photo_url} size="sm" />
                <span className="flex-1 font-semibold">{s.participant.name}</span>
                <span className="text-buteco-green font-semibold">{s.correct}</span>
                <span className="text-buteco-white/30">-</span>
                <span className="text-buteco-red font-semibold">{s.wrong}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function StandoutCard({ standing, kind }: { standing: LiveParticipantStanding; kind: 'leader' | 'trailer' }) {
  const isLeader = kind === 'leader';

  return (
    <div
      className={`rounded-2xl p-6 text-center border ${
        isLeader
          ? 'bg-gradient-to-br from-buteco-gold/20 to-transparent border-buteco-gold/40'
          : 'bg-gradient-to-br from-buteco-red/20 to-transparent border-buteco-red/40'
      }`}
    >
      <p className={`font-display text-lg mb-3 ${isLeader ? 'text-buteco-gold' : 'text-buteco-red'}`}>
        {isLeader ? '👑 LÍDER DA RODADA' : '🤡 LANTERNA DA RODADA'}
      </p>
      <div className="relative inline-block">
        <ParticipantAvatar
          name={standing.participant.name}
          photoUrl={standing.participant.photo_url}
          size="xxl"
          ring
          ringColor={isLeader ? 'gold' : 'red'}
        />
        <span className="absolute -top-3 -right-1 text-5xl drop-shadow-lg">{isLeader ? '👑' : '🤡'}</span>
      </div>
      <p className="font-display text-xl mt-4">{standing.participant.name}</p>
      <p className={`font-semibold ${isLeader ? 'text-buteco-green' : 'text-buteco-white/60'}`}>
        {standing.correct} acertos - {standing.wrong} erros
      </p>
    </div>
  );
}

export default function AoVivoPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-buteco-white/60">Carregando...</div>}>
      <AoVivoInner />
    </Suspense>
  );
}
