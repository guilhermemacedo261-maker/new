'use client';

import PickButton from './PickButton';
import { formatDateBR } from '@/lib/utils/timezone';
import type { GameWithPick, TeamSide } from '@/types/database';

export default function GameCard({
  game,
  disabled,
  onPick,
}: {
  game: GameWithPick;
  disabled?: boolean;
  onPick: (gameId: string, side: TeamSide) => void;
}) {
  const dateLabel = formatDateBR(game.game_time, {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="bg-buteco-charcoal rounded-2xl p-4 border border-white/5">
      <div className="flex items-center justify-between text-xs text-buteco-white/60 mb-3 uppercase tracking-wide">
        <span>{dateLabel}</span>
        {game.venue && <span className="truncate max-w-[50%]">{game.venue}</span>}
      </div>

      <div className="flex items-stretch gap-3">
        <PickButton
          teamName={game.away_team}
          abbreviation={game.away_team_abbreviation}
          logoUrl={game.away_team_logo}
          selected={game.my_pick === 'away'}
          disabled={disabled}
          onClick={() => onPick(game.id, 'away')}
        />
        <div className="flex items-center justify-center font-display text-buteco-white/40 text-sm">@</div>
        <PickButton
          teamName={game.home_team}
          abbreviation={game.home_team_abbreviation}
          logoUrl={game.home_team_logo}
          selected={game.my_pick === 'home'}
          disabled={disabled}
          onClick={() => onPick(game.id, 'home')}
        />
      </div>
    </div>
  );
}
