'use client';

import { useEffect, useState } from 'react';
import type { Week } from '@/types/database';

export default function AdminWhatsappPage() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [weekId, setWeekId] = useState('');
  const [imageVersion, setImageVersion] = useState(0);
  const [showImage, setShowImage] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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

  async function handleSend() {
    setSending(true);
    setMessage(null);
    const res = await fetch('/api/admin/whatsapp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekId }),
    });
    const body = await res.json();
    setSending(false);
    setMessage(res.ok ? '✅ Enviado para o WhatsApp!' : `❌ ${body.error}`);
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <h1 className="font-display text-2xl mb-6">WhatsApp</h1>

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
        <button onClick={handleSend} disabled={!weekId || sending} className="flex-1 py-3 rounded-xl bg-buteco-green font-display disabled:opacity-50">
          {sending ? 'ENVIANDO...' : 'ENVIAR PARA WHATSAPP'}
        </button>
      </div>

      {message && <p className="text-center text-sm mb-4">{message}</p>}

      {showImage && weekId && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/api/admin/image/generate?weekId=${weekId}&v=${imageVersion}`} alt="Tabela de palpites" className="w-full rounded-xl border border-white/10" />
      )}
    </div>
  );
}
