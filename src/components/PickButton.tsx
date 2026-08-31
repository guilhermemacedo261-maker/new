'use client';

import Image from 'next/image';

export default function PickButton({
  teamName,
  abbreviation,
  logoUrl,
  selected,
  disabled,
  onClick,
}: {
  teamName: string;
  abbreviation: string;
  logoUrl: string | null;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex-1 flex flex-col items-center gap-2 rounded-xl border-2 px-3 py-4 transition-all ${
        selected
          ? 'border-buteco-green bg-buteco-green/15 shadow-card'
          : 'border-white/10 bg-buteco-card hover:border-white/30'
      } ${disabled && !selected ? 'opacity-40' : ''} disabled:cursor-not-allowed`}
    >
      <div className="relative w-12 h-12">
        {logoUrl ? (
          <Image src={logoUrl} alt={teamName} fill className="object-contain" />
        ) : (
          <div className="w-full h-full rounded-full bg-white/10" />
        )}
      </div>
      <span className="font-display text-sm tracking-wide text-center leading-tight">{abbreviation}</span>
      {selected && <span className="text-buteco-green text-xs font-bold">✓ SEU PALPITE</span>}
    </button>
  );
}
