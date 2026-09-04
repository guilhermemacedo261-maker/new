'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const SECTIONS = [
  { href: '/admin/participants', label: '👥 Participantes', desc: 'Adicionar, editar, ativar/desativar' },
  { href: '/admin/weeks', label: '📅 Semanas', desc: 'Ver rodadas, criar, encerrar, reabrir' },
  { href: '/admin/games', label: '🏈 Jogos', desc: 'Corrigir times, horários e placares' },
  { href: '/admin/picks', label: '📋 Palpites', desc: 'Ver os palpites de todos' },
  { href: '/admin/imagem', label: '📷 Imagem dos Palpites', desc: 'Gerar e baixar a imagem da semana' },
  { href: '/admin/hall-da-fama', label: '👑 Hall da Fama', desc: 'Foto do campeão e do bobo de cada temporada' },
];

export default function AdminHomePage() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function run(action: 'sync' | 'results') {
    setBusy(action);
    setMessage(null);
    const res = await fetch(`/api/admin/${action === 'sync' ? 'sync' : 'results'}`, { method: 'POST' });
    const body = await res.json();
    setBusy(null);
    setMessage(res.ok ? '✅ Concluído com sucesso.' : `❌ ${body.error}`);
  }

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.replace('/admin/login');
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl">Painel Admin</h1>
        <button onClick={logout} className="text-sm text-buteco-white/50 underline">
          Sair
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 mb-8">
        <button
          onClick={() => run('sync')}
          disabled={busy !== null}
          className="bg-buteco-red rounded-xl py-4 font-display disabled:opacity-50"
        >
          {busy === 'sync' ? 'ATUALIZANDO...' : 'ATUALIZAR JOGOS AGORA'}
        </button>
        <button
          onClick={() => run('results')}
          disabled={busy !== null}
          className="bg-buteco-green rounded-xl py-4 font-display disabled:opacity-50"
        >
          {busy === 'results' ? 'ATUALIZANDO...' : 'ATUALIZAR RESULTADOS AGORA'}
        </button>
      </div>
      {message && <p className="text-center text-sm mb-6">{message}</p>}

      <div className="grid sm:grid-cols-2 gap-3">
        {SECTIONS.map((section) => (
          <Link key={section.href} href={section.href} className="bg-buteco-charcoal rounded-2xl p-5 hover:border-buteco-gold/50 border border-transparent">
            <p className="font-display text-lg">{section.label}</p>
            <p className="text-sm text-buteco-white/50 mt-1">{section.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
