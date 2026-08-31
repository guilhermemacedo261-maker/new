'use client';

import { useEffect, useState } from 'react';
import ParticipantAvatar from '@/components/ParticipantAvatar';
import type { Participant } from '@/types/database';

export default function AdminParticipantsPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);

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

  async function handleToggleActive(p: Participant) {
    await fetch(`/api/admin/participants/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !p.active }),
    });
    reload();
  }

  async function handleRename(p: Participant, name: string) {
    await fetch(`/api/admin/participants/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
  }

  async function handlePhotoUpload(p: Participant, file: File) {
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
      <h1 className="font-display text-2xl mb-6">Participantes</h1>

      <div className="flex gap-2 mb-6">
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

      <div className="space-y-2">
        {participants.map((p) => (
          <div key={p.id} className="flex items-center gap-3 bg-buteco-charcoal rounded-xl p-3">
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
            <button
              onClick={() => handleToggleActive(p)}
              className={`text-xs px-3 py-1 rounded-full font-semibold ${
                p.active ? 'bg-buteco-green/20 text-buteco-green' : 'bg-white/10 text-buteco-white/50'
              }`}
            >
              {p.active ? 'Ativo' : 'Inativo'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
