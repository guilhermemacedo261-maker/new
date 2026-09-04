'use client';

import { useEffect, useState } from 'react';
import type { Season } from '@/types/database';

export default function AdminHallDaFamaPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  async function reload() {
    const res = await fetch('/api/admin/seasons').then((r) => r.json());
    setSeasons(res.seasons ?? []);
    setLoading(false);
  }

  useEffect(() => {
    reload();
  }, []);

  async function handleUpload(
    season: Season,
    field: 'champion_photo_url' | 'lanterna_photo_url' | 'group_photo_url',
    file: File
  ) {
    setSaving(season.id);
    const formData = new FormData();
    formData.append('file', file);
    const uploadRes = await fetch('/api/admin/upload', { method: 'POST', body: formData }).then((r) => r.json());
    if (uploadRes.url) {
      await fetch(`/api/admin/seasons/${season.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: uploadRes.url }),
      });
      await reload();
    }
    setSaving(null);
  }

  if (loading) return <div className="p-8 text-center text-buteco-white/60">Carregando...</div>;

  return (
    <div className="p-4 md:p-8">
      <h1 className="font-display text-2xl mb-1">Hall da Fama</h1>
      <p className="text-xs text-buteco-white/40 mb-6">
        Foto comemorativa do campeão e do bobo de cada temporada (aparece só no Hall da Fama, não mexe na foto de
        perfil do participante). Temporadas &quot;encerradas&quot; aparecem lá no site.
      </p>

      <div className="space-y-3">
        {seasons.map((season) => (
          <div key={season.id} className="bg-buteco-charcoal rounded-xl p-4">
            <p className="font-display mb-3">
              {season.name} <span className="text-xs text-buteco-white/40">({season.status})</span>
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <PhotoSlot
                label="🏆 Foto do campeão"
                currentUrl={season.champion_photo_url}
                disabled={saving === season.id}
                onSelect={(file) => handleUpload(season, 'champion_photo_url', file)}
              />
              <PhotoSlot
                label="🤡 Foto do bobo"
                currentUrl={season.lanterna_photo_url}
                disabled={saving === season.id}
                onSelect={(file) => handleUpload(season, 'lanterna_photo_url', file)}
              />
              {season.status === 'active' && (
                <PhotoSlot
                  label="📸 Foto do grupo (fundo da tela inicial)"
                  currentUrl={season.group_photo_url}
                  disabled={saving === season.id}
                  onSelect={(file) => handleUpload(season, 'group_photo_url', file)}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PhotoSlot({
  label,
  currentUrl,
  disabled,
  onSelect,
}: {
  label: string;
  currentUrl: string | null;
  disabled: boolean;
  onSelect: (file: File) => void;
}) {
  return (
    <label className="flex items-center gap-3 bg-buteco-black rounded-lg p-3 cursor-pointer">
      {currentUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={currentUrl} alt={label} className="w-14 h-14 rounded-full object-cover shrink-0" />
      ) : (
        <div className="w-14 h-14 rounded-full bg-buteco-charcoal shrink-0" />
      )}
      <span className="text-sm">{disabled ? 'Enviando...' : label}</span>
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        disabled={disabled}
        onChange={(e) => e.target.files?.[0] && onSelect(e.target.files[0])}
      />
    </label>
  );
}
