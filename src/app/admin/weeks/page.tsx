'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatDateBR } from '@/lib/utils/timezone';
import type { Week } from '@/types/database';

const STATUS_LABEL: Record<Week['status'], string> = {
  upcoming: 'Futura',
  open: 'Aberta',
  closed: 'Encerrada',
  finished: 'Finalizada',
};

export default function AdminWeeksPage() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [newWeekNumber, setNewWeekNumber] = useState('');
  const [loading, setLoading] = useState(true);

  async function reload() {
    const res = await fetch('/api/admin/weeks').then((r) => r.json());
    setWeeks(res.weeks ?? []);
    setLoading(false);
  }

  useEffect(() => {
    reload();
  }, []);

  async function handleAction(weekId: string, action: 'close' | 'reopen') {
    await fetch(`/api/admin/weeks/${weekId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    reload();
  }

  async function handleCreate() {
    const weekNumber = Number(newWeekNumber);
    if (!weekNumber) return;
    await fetch('/api/admin/weeks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ week_number: weekNumber }),
    });
    setNewWeekNumber('');
    reload();
  }

  if (loading) return <div className="p-8 text-center text-buteco-white/60">Carregando...</div>;

  return (
    <div className="p-4 md:p-8">
      <h1 className="font-display text-2xl mb-6">Semanas</h1>

      <div className="flex gap-2 mb-6">
        <input
          value={newWeekNumber}
          onChange={(e) => setNewWeekNumber(e.target.value)}
          type="number"
          placeholder="Número da semana"
          className="flex-1 rounded-lg bg-buteco-charcoal border border-white/10 px-4 py-2 outline-none focus:border-buteco-gold"
        />
        <button onClick={handleCreate} className="px-5 py-2 rounded-lg bg-buteco-red font-display">
          Criar semana
        </button>
      </div>

      <div className="space-y-2">
        {weeks.map((week) => (
          <div key={week.id} className="flex items-center gap-3 bg-buteco-charcoal rounded-xl p-4">
            <div className="flex-1">
              <p className="font-display">Semana {week.week_number}</p>
              <p className="text-xs text-buteco-white/50">
                Prazo: {formatDateBR(week.picks_close_at, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-white/10">{STATUS_LABEL[week.status]}</span>
            <Link href={`/admin/games?weekId=${week.id}`} className="text-xs underline text-buteco-white/60">
              Jogos
            </Link>
            <Link href={`/admin/picks?weekId=${week.id}`} className="text-xs underline text-buteco-white/60">
              Palpites
            </Link>
            {week.status === 'open' ? (
              <button onClick={() => handleAction(week.id, 'close')} className="text-xs px-3 py-1 rounded-full bg-buteco-red/20 text-buteco-red">
                Encerrar
              </button>
            ) : (
              <button onClick={() => handleAction(week.id, 'reopen')} className="text-xs px-3 py-1 rounded-full bg-buteco-green/20 text-buteco-green">
                Reabrir
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
