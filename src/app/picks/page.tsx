'use client';

import { useEffect, useMemo, useState } from 'react';
import ParticipantSelector from '@/components/ParticipantSelector';
import ParticipantAvatar from '@/components/ParticipantAvatar';
import GameCard from '@/components/GameCard';
import Countdown from '@/components/Countdown';
import type { GameWithPick, Participant, TeamSide, Week } from '@/types/database';

type LoadState = 'loading' | 'ready' | 'error';

export default function PicksPage() {
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [allParticipants, setAllParticipants] = useState<Participant[]>([]);
  const [week, setWeek] = useState<Week | null>(null);
  const [games, setGames] = useState<GameWithPick[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadWeekAndGames() {
    const weekRes = await fetch('/api/weeks/current').then((r) => r.json());
    setWeek(weekRes.week ?? null);
    if (weekRes.week) {
      const gamesRes = await fetch(`/api/games?weekId=${weekRes.week.id}`).then((r) => r.json());
      setGames(gamesRes.games ?? []);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const [sessionRes, participantsRes] = await Promise.all([
          fetch('/api/session').then((r) => r.json()),
          fetch('/api/participants').then((r) => r.json()),
        ]);
        setAllParticipants(participantsRes.participants ?? []);
        setParticipant(sessionRes.participant ?? null);
        if (sessionRes.participant) await loadWeekAndGames();
        setLoadState('ready');
      } catch {
        setLoadState('error');
      }
    })();
  }, []);

  async function handleSelectParticipant(selected: Participant) {
    setLoadState('loading');
    await fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participantId: selected.id }),
    });
    setParticipant(selected);
    await loadWeekAndGames();
    setLoadState('ready');
  }

  async function handleSwitchParticipant() {
    await fetch('/api/session', { method: 'DELETE' });
    setParticipant(null);
    setGames([]);
    setWeek(null);
    setSavedMessage(null);
  }

  function handlePick(gameId: string, side: TeamSide) {
    setSavedMessage(null);
    setGames((prev) => prev.map((g) => (g.id === gameId ? { ...g, my_pick: side } : g)));
  }

  const isClosed = useMemo(() => {
    if (!week) return true;
    if (week.status !== 'open') return true;
    return Date.now() >= new Date(week.picks_close_at).getTime();
  }, [week]);

  const missingCount = games.filter((g) => !g.my_pick).length;

  async function handleConfirm() {
    if (!week) return;
    setSaving(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekId: week.id,
          picks: games.filter((g) => g.my_pick).map((g) => ({ gameId: g.id, selectedTeam: g.my_pick })),
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setErrorMessage(body.error ?? 'Erro ao salvar palpites.');
        return;
      }
      setSavedMessage(
        `✅ Palpites salvos! Você escolheu ${games.filter((g) => g.my_pick).length} favoritos da semana. Se precisar alterar, pode fazê-lo até o encerramento do prazo.`
      );
    } finally {
      setSaving(false);
    }
  }

  if (loadState === 'loading') {
    return <div className="p-8 text-center text-buteco-white/60">Carregando...</div>;
  }

  if (!participant) {
    return (
      <div className="p-4 md:p-8">
        <ParticipantSelector participants={allParticipants} onSelect={handleSelectParticipant} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ParticipantAvatar name={participant.name} photoUrl={participant.photo_url} size="md" ring />
          <div>
            <p className="text-xs text-buteco-white/50">Palpitando como</p>
            <p className="font-display text-lg">{participant.name}</p>
          </div>
        </div>
        <button onClick={handleSwitchParticipant} className="text-xs text-buteco-white/50 underline">
          Não é você?
        </button>
      </div>

      {!week && <p className="text-center text-buteco-white/60 py-12">Nenhuma rodada disponível no momento. Volte na terça-feira! 🏈</p>}

      {week && (
        <>
          <div className="flex items-center justify-between mb-6 bg-buteco-charcoal rounded-2xl p-4">
            <div>
              <p className="font-display text-2xl text-buteco-gold">SEMANA {week.week_number}</p>
              <p className="text-xs text-buteco-white/50">Escolha o vencedor de cada jogo</p>
            </div>
            <Countdown closeAtIso={week.picks_close_at} />
          </div>

          <div className="space-y-3">
            {games.map((game) => (
              <GameCard key={game.id} game={game} disabled={isClosed} onPick={handlePick} />
            ))}
          </div>

          {errorMessage && <p className="mt-4 text-buteco-red text-sm text-center">{errorMessage}</p>}
          {savedMessage && <p className="mt-4 text-buteco-green text-sm text-center font-semibold">{savedMessage}</p>}

          {!isClosed && (
            <button
              onClick={handleConfirm}
              disabled={saving || missingCount > 0}
              className="mt-6 w-full py-4 rounded-xl bg-buteco-red font-display text-lg tracking-wide disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? 'SALVANDO...' : missingCount > 0 ? `FALTAM ${missingCount} PALPITES` : 'CONFIRMAR PALPITES 🏈'}
            </button>
          )}
        </>
      )}
    </div>
  );
}
