'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ParticipantAvatar from '@/components/ParticipantAvatar';
import type { Game, Pick, PublicParticipant } from '@/types/database';

function AdminPicksInner() {
  const weekId = useSearchParams().get('weekId');
  const [games, setGames] = useState<Game[]>([]);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [participants, setParticipants] = useState<PublicParticipant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!weekId) return;
    Promise.all([
      fetch(`/api/admin/games?weekId=${weekId}`).then((r) => r.json()),
      fetch(`/api/admin/picks?weekId=${weekId}`).then((r) => r.json()),
      fetch('/api/admin/participants').then((r) => r.json()),
    ]).then(([gamesRes, picksRes, participantsRes]) => {
      setGames(gamesRes.games ?? []);
      setPicks(picksRes.picks ?? []);
      setParticipants((participantsRes.participants ?? []).filter((p: PublicParticipant) => p.active));
      setLoading(false);
    });
  }, [weekId]);

  if (!weekId) return <p className="p-8 text-center text-buteco-white/60">Selecione uma semana em /admin/weeks.</p>;
  if (loading) return <p className="p-8 text-center text-buteco-white/60">Carregando...</p>;

  return (
    <div className="p-4 md:p-8 overflow-x-auto">
      <h1 className="font-display text-2xl mb-6">Palpites da semana</h1>
      <table className="text-xs border-collapse">
        <thead>
          <tr>
            <th className="text-left px-2 py-2">Jogo</th>
            {participants.map((p) => (
              <th key={p.id} className="px-2 py-2">
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
              <td className="px-2 py-2 whitespace-nowrap font-semibold">
                {game.away_team_abbreviation} x {game.home_team_abbreviation}
              </td>
              {participants.map((p) => {
                const pick = picks.find((pk) => pk.game_id === game.id && pk.participant_id === p.id);
                const label = pick ? (pick.selected_team === 'home' ? game.home_team_abbreviation : game.away_team_abbreviation) : '-';
                return (
                  <td key={p.id} className="px-2 py-2 text-center bg-buteco-charcoal">
                    {label}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminPicksPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-buteco-white/60">Carregando...</p>}>
      <AdminPicksInner />
    </Suspense>
  );
}
