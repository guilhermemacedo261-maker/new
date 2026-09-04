'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatDateBR, toBrasiliaDateTimeLocalValue } from '@/lib/utils/timezone';
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
  const [preparing, setPreparing] = useState(false);
  const [prepareMessage, setPrepareMessage] = useState<string | null>(null);

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

  async function handleScheduleChange(weekId: string, field: 'picks_open_at' | 'picks_close_at', value: string) {
    if (!value) return;
    await fetch(`/api/admin/weeks/${weekId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
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

  async function handlePrepareSeason() {
    if (!confirm('Isso cria (ou atualiza os jogos de) todas as semanas de 1 a 18 da temporada regular. Pode levar um tempinho. Continuar?')) {
      return;
    }
    setPreparing(true);
    setPrepareMessage(null);
    const res = await fetch('/api/admin/prepare-season', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const body = await res.json();
    setPreparing(false);
    setPrepareMessage(res.ok ? `✅ ${body.weeksCreated} semanas preparadas.` : `❌ ${body.error}`);
    reload();
  }

  if (loading) return <div className="p-8 text-center text-buteco-white/60">Carregando...</div>;

  return (
    <div className="p-4 md:p-8">
      <h1 className="font-display text-2xl mb-6">Semanas</h1>

      <button
        onClick={handlePrepareSeason}
        disabled={preparing}
        className="w-full mb-3 py-3 rounded-lg bg-buteco-gold text-buteco-black font-display disabled:opacity-50"
      >
        {preparing ? 'PREPARANDO...' : 'PREPARAR TEMPORADA INTEIRA (Semanas 1-18)'}
      </button>
      {prepareMessage && <p className="text-center text-sm mb-4">{prepareMessage}</p>}
      <p className="text-xs text-buteco-white/40 mb-6">
        Busca o calendário completo da NFL e cria todas as semanas de uma vez, com o prazo de palpites já calculado
        (quinta-feira 16h de cada semana). Elas ficam como &quot;Futura&quot; até chegar a vez de cada uma abrir - você
        pode ajustar as datas de qualquer semana abaixo a qualquer momento.
      </p>

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
          <div key={week.id} className="bg-buteco-charcoal rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <div className="flex-1 min-w-[140px]">
                <p className="font-display">Semana {week.week_number}</p>
                <p className="text-xs text-buteco-white/50">
                  Prazo atual:{' '}
                  {formatDateBR(week.picks_close_at, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
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
            </div>

            <div className="grid sm:grid-cols-2 gap-3 text-xs">
              <label className="flex flex-col gap-1 text-buteco-white/50">
                Abre em (horário de Brasília)
                <input
                  type="datetime-local"
                  defaultValue={toBrasiliaDateTimeLocalValue(week.picks_open_at)}
                  onBlur={(e) => handleScheduleChange(week.id, 'picks_open_at', e.target.value)}
                  className="bg-buteco-black rounded px-2 py-1.5 text-buteco-white"
                />
              </label>
              <label className="flex flex-col gap-1 text-buteco-white/50">
                Fecha em (horário de Brasília)
                <input
                  type="datetime-local"
                  defaultValue={toBrasiliaDateTimeLocalValue(week.picks_close_at)}
                  onBlur={(e) => handleScheduleChange(week.id, 'picks_close_at', e.target.value)}
                  className="bg-buteco-black rounded px-2 py-1.5 text-buteco-white"
                />
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
