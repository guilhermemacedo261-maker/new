'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Game } from '@/types/database';

function AdminGamesInner() {
  const searchParams = useSearchParams();
  const weekId = searchParams.get('weekId');
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!weekId) return;
    fetch(`/api/admin/games?weekId=${weekId}`)
      .then((r) => r.json())
      .then((res) => {
        setGames(res.games ?? []);
        setLoading(false);
      });
  }, [weekId]);

  async function handleSave(game: Game, patch: Partial<Game>) {
    await fetch(`/api/admin/games/${game.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
  }

  if (!weekId) return <p className="p-8 text-center text-buteco-white/60">Selecione uma semana em /admin/weeks.</p>;
  if (loading) return <p className="p-8 text-center text-buteco-white/60">Carregando...</p>;

  return (
    <div className="p-4 md:p-8">
      <h1 className="font-display text-2xl mb-6">Jogos da semana</h1>
      <div className="space-y-3">
        {games.map((game) => (
          <div key={game.id} className="bg-buteco-charcoal rounded-xl p-4 grid sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <input
                defaultValue={game.away_team_abbreviation}
                onBlur={(e) => handleSave(game, { away_team_abbreviation: e.target.value })}
                className="w-16 bg-transparent border-b border-white/10 text-center"
              />
              <span>x</span>
              <input
                defaultValue={game.home_team_abbreviation}
                onBlur={(e) => handleSave(game, { home_team_abbreviation: e.target.value })}
                className="w-16 bg-transparent border-b border-white/10 text-center"
              />
            </div>
            <div className="flex items-center gap-2 text-sm">
              <input
                type="number"
                defaultValue={game.away_score ?? ''}
                onBlur={(e) => handleSave(game, { away_score: e.target.value ? Number(e.target.value) : null })}
                placeholder="Placar visitante"
                className="w-24 bg-buteco-black rounded px-2 py-1"
              />
              <input
                type="number"
                defaultValue={game.home_score ?? ''}
                onBlur={(e) => handleSave(game, { home_score: e.target.value ? Number(e.target.value) : null })}
                placeholder="Placar mandante"
                className="w-24 bg-buteco-black rounded px-2 py-1"
              />
              <select
                defaultValue={game.status}
                onChange={(e) => handleSave(game, { status: e.target.value as Game['status'] })}
                className="bg-buteco-black rounded px-2 py-1 text-xs"
              >
                <option value="scheduled">Agendado</option>
                <option value="in_progress">Em andamento</option>
                <option value="final">Final</option>
                <option value="postponed">Adiado</option>
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminGamesPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-buteco-white/60">Carregando...</p>}>
      <AdminGamesInner />
    </Suspense>
  );
}
