'use client';

import ParticipantAvatar from './ParticipantAvatar';
import type { PublicParticipant } from '@/types/database';

export default function ParticipantSelector({
  participants,
  onSelect,
}: {
  participants: PublicParticipant[];
  onSelect: (participant: PublicParticipant) => void;
}) {
  return (
    <div>
      <h2 className="font-display text-2xl text-center mb-1">QUEM É VOCÊ?</h2>
      <p className="text-center text-buteco-white/60 mb-6 text-sm">Escolha seu nome para ver e fazer seus palpites.</p>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
        {participants.map((participant) => (
          <button
            key={participant.id}
            onClick={() => onSelect(participant)}
            className="flex flex-col items-center gap-2 p-3 rounded-xl bg-buteco-charcoal hover:bg-buteco-card border border-white/5 hover:border-buteco-gold/60 transition-colors"
          >
            <ParticipantAvatar name={participant.name} photoUrl={participant.photo_url} size="lg" />
            <span className="text-sm font-semibold text-center">{participant.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
