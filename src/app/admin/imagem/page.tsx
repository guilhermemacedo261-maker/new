'use client';

import { useEffect, useState } from 'react';
import type { Week } from '@/types/database';

/**
 * Gera a imagem dos palpites da semana para o admin baixar e compartilhar
 * manualmente (WhatsApp, grupo, onde quiser). Nao existe mais envio
 * automatico - o admin decide quando e onde postar.
 */
export default function AdminImagemPage() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [weekId, setWeekId] = useState('');
  const [imageVersion, setImageVersion] = useState(0);
  const [showImage, setShowImage] = useState(false);

  useEffect(() => {
    fetch('/api/admin/weeks')
      .then((r) => r.json())
      .then((res) => {
        setWeeks(res.weeks ?? []);
        if (res.weeks?.[0]) setWeekId(res.weeks[0].id);
      });
  }, []);

  function handleGenerate() {
    setShowImage(true);
    setImageVersion((v) => v + 1);
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <h1 className="font-display text-2xl mb-6">Imagem dos Palpites</h1>

      <select
        value={weekId}
        onChange={(e) => {
          setWeekId(e.target.value);
          setShowImage(false);
        }}
        className="w-full bg-buteco-charcoal border border-white/10 rounded-lg px-4 py-2 mb-4"
      >
        {weeks.map((w) => (
          <option key={w.id} value={w.id}>
            Semana {w.week_number}
          </option>
        ))}
      </select>

      <div className="flex gap-3 mb-6">
        <button onClick={handleGenerate} disabled={!weekId} className="flex-1 py-3 rounded-xl bg-buteco-gold text-buteco-black font-display disabled:opacity-50">
          GERAR IMAGEM DOS PALPITES
        </button>
        <a
          href={weekId ? `/api/admin/image/generate?weekId=${weekId}&download=1` : undefined}
          className={`flex-1 py-3 rounded-xl bg-buteco-green font-display text-center ${
            !weekId ? 'opacity-50 pointer-events-none' : ''
          }`}
        >
          BAIXAR IMAGEM
        </a>
      </div>

      <p className="text-center text-xs text-buteco-white/50 mb-4">
        Baixe a imagem e envie manualmente para o grupo do WhatsApp (ou onde quiser).
      </p>

      {showImage && weekId && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/admin/image/generate?weekId=${weekId}&v=${imageVersion}`}
          alt="Tabela de palpites"
          className="w-full rounded-xl border border-white/10"
        />
      )}
    </div>
  );
}
