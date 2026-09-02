import ParticipantAvatar from './ParticipantAvatar';
import type { PublicParticipant } from '@/types/database';

export interface RankingRow {
  position: number | null;
  participant: PublicParticipant;
  correct: number;
  wrong: number;
  accuracy: number;
}

const MEDALS = ['🥇', '🥈', '🥉'];

export default function RankingTable({ rows }: { rows: RankingRow[] }) {
  return (
    <>
      {/* Desktop */}
      <div className="hidden md:block bg-buteco-charcoal rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-black/30 text-buteco-white/50 uppercase text-xs">
            <tr>
              <th className="py-3 px-4 text-left">#</th>
              <th className="py-3 px-4 text-left">Participante</th>
              <th className="py-3 px-4 text-right">Acertos</th>
              <th className="py-3 px-4 text-right">Erros</th>
              <th className="py-3 px-4 text-right">%</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((row, i) => (
              <tr key={row.participant.id}>
                <td className="py-3 px-4 font-display text-buteco-gold">{MEDALS[i] ?? row.position ?? '-'}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <ParticipantAvatar name={row.participant.name} photoUrl={row.participant.photo_url} size="sm" />
                    <span className="font-semibold">{row.participant.name}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-right">{row.correct}</td>
                <td className="py-3 px-4 text-right text-buteco-white/60">{row.wrong}</td>
                <td className="py-3 px-4 text-right">{row.accuracy.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="md:hidden grid grid-cols-2 gap-3">
        {rows.map((row, i) => (
          <div key={row.participant.id} className="bg-buteco-charcoal rounded-2xl p-4 text-center">
            <p className="font-display text-2xl text-buteco-gold">{MEDALS[i] ?? row.position ?? '-'}</p>
            <div className="flex justify-center my-2">
              <ParticipantAvatar name={row.participant.name} photoUrl={row.participant.photo_url} size="lg" />
            </div>
            <p className="font-display text-sm uppercase">{row.participant.name}</p>
            <p className="text-buteco-green text-sm font-semibold mt-1">{row.correct} acertos</p>
            <p className="text-buteco-white/50 text-xs">{row.wrong} erros</p>
            <p className="text-buteco-white/70 text-xs mt-1">{row.accuracy.toFixed(1)}% de aproveitamento</p>
          </div>
        ))}
      </div>
    </>
  );
}
