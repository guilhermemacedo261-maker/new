'use client';

import { useEffect, useState } from 'react';
import ParticipantAvatar from '@/components/ParticipantAvatar';
import type { PublicParticipant } from '@/types/database';

export default function AdminParticipantsPage() {
  const [participants, setParticipants] = useState<PublicParticipant[]>([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, string>>({});
  const [generatingAll, setGeneratingAll] = useState(false);

  async function reload() {
    const res = await fetch('/api/admin/participants').then((r) => r.json());
    setParticipants(res.participants ?? []);
    setLoading(false);
  }

  useEffect(() => {
    reload();
  }, []);

  async function handleCreate() {
    if (!newName.trim()) return;
    await fetch('/api/admin/participants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), display_order: participants.length + 1 }),
    });
    setNewName('');
    reload();
  }

  async function handleGeneratePassword(p: PublicParticipant) {
    const res = await fetch(`/api/admin/participants/${p.id}/password`, { method: 'POST' }).then((r) => r.json());
    setRevealedPasswords((prev) => ({ ...prev, [p.id]: res.password }));
    reload();
  }

  async function handleGenerateAllPasswords() {
    setGeneratingAll(true);
    const revealed: Record<string, string> = {};
    for (const p of participants) {
      // eslint-disable-next-line no-await-in-loop
      const res = await fetch(`/api/admin/participants/${p.id}/password`, { method: 'POST' }).then((r) => r.json());
      revealed[p.id] = res.password;
    }
    setRevealedPasswords((prev) => ({ ...prev, ...revealed }));
    setGeneratingAll(false);
    reload();
  }

  async function handleToggleActive(p: PublicParticipant) {
    await fetch(`/api/admin/participants/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !p.active }),
    });
    reload();
  }

  async function handleRename(p: PublicParticipant, name: string) {
    await fetch(`/api/admin/participants/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
  }

  async function handlePhotoUpload(p: PublicParticipant, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const uploadRes = await fetch('/api/admin/upload', { method: 'POST', body: formData }).then((r) => r.json());
    if (uploadRes.url) {
      await fetch(`/api/admin/participants/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo_url: uploadRes.url }),
      });
      reload();
    }
  }

  if (loading) return <div className="p-8 text-center text-buteco-white/60">Carregando...</div>;

  return (
    <div className="p-4 md:p-8">
      <h1 className="font-display text-2xl mb-1">Participantes</h1>
      <p className="text-xs text-buteco-white/40 mb-6">
        Cada um precisa de uma senha pra palpitar - sem ela, ninguém consegue ver ou mexer no palpite dos outros.
      </p>

      <div className="flex gap-2 mb-4">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nome do novo participante"
          className="flex-1 rounded-lg bg-buteco-charcoal border border-white/10 px-4 py-2 outline-none focus:border-buteco-gold"
        />
        <button onClick={handleCreate} className="px-5 py-2 rounded-lg bg-buteco-red font-display">
          Adicionar
        </button>
      </div>

      <button
        onClick={handleGenerateAllPasswords}
        disabled={generatingAll}
        className="mb-6 px-4 py-2 rounded-lg bg-buteco-gold text-buteco-black font-display text-sm disabled:opacity-40"
      >
        {generatingAll ? 'Gerando...' : '🔑 Gerar senha pra todo mundo'}
      </button>

      <div className="space-y-2">
        {participants.map((p) => (
          <div key={p.id} className="bg-buteco-charcoal rounded-xl p-3">
            <div className="flex items-center gap-3">
              <label className="cursor-pointer">
                <ParticipantAvatar name={p.name} photoUrl={p.photo_url} size="md" />
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handlePhotoUpload(p, e.target.files[0])}
                />
              </label>
              <input
                defaultValue={p.name}
                onBlur={(e) => handleRename(p, e.target.value)}
                className="flex-1 bg-transparent border-b border-white/10 focus:border-buteco-gold outline-none py-1"
              />
              <span
                className={`text-[11px] px-2 py-1 rounded-full font-semibold ${
                  p.has_password ? 'bg-buteco-green/20 text-buteco-green' : 'bg-buteco-red/20 text-buteco-red'
                }`}
              >
                {p.has_password ? '🔒 Com senha' : '⚠️ Sem senha'}
              </span>
              <button
                onClick={() => handleGeneratePassword(p)}
                className="text-xs px-3 py-1 rounded-full font-semibold bg-buteco-gold/20 text-buteco-gold"
              >
                {p.has_password ? 'Redefinir senha' : 'Gerar senha'}
              </button>
              <button
                onClick={() => handleToggleActive(p)}
                className={`text-xs px-3 py-1 rounded-full font-semibold ${
                  p.active ? 'bg-buteco-green/20 text-buteco-green' : 'bg-white/10 text-buteco-white/50'
                }`}
              >
                {p.active ? 'Ativo' : 'Inativo'}
              </button>
            </div>
            {revealedPasswords[p.id] && (
              <p className="mt-2 text-xs text-buteco-white/70">
                Senha de <span className="font-semibold text-buteco-white">{p.name}</span>:{' '}
                <span className="font-mono text-buteco-gold text-sm tracking-widest">{revealedPasswords[p.id]}</span>{' '}
                <span className="text-buteco-white/40">(copie e mande pra ele - não aparece de novo)</span>
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
