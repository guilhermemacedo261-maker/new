'use client';

import { useEffect, useState } from 'react';
import { formatCountdown } from '@/lib/utils/timezone';

export default function Countdown({ closeAtIso, closedLabel = 'PALPITES ENCERRADOS' }: { closeAtIso: string; closedLabel?: string }) {
  const target = new Date(closeAtIso).getTime();
  const [remaining, setRemaining] = useState<number>(() => target - Date.now());

  useEffect(() => {
    const interval = setInterval(() => setRemaining(target - Date.now()), 1000);
    return () => clearInterval(interval);
  }, [target]);

  if (remaining <= 0) {
    return (
      <div className="flex items-center gap-2 text-buteco-red font-display text-xl tracking-wide">
        🔒 {closedLabel}
      </div>
    );
  }

  const { hours, minutes, seconds } = formatCountdown(remaining);

  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-buteco-white/50 mb-1">Palpites encerram em</p>
      <div className="flex gap-2 font-display text-3xl text-buteco-gold">
        <span>{hours}h</span>
        <span>{minutes}min</span>
        <span>{seconds}s</span>
      </div>
    </div>
  );
}
