import Image from 'next/image';

function initialsFor(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

const SIZE_CLASSES: Record<'sm' | 'md' | 'lg' | 'xl' | 'xxl', string> = {
  sm: 'w-9 h-9 text-xs',
  md: 'w-14 h-14 text-base',
  lg: 'w-20 h-20 text-xl',
  xl: 'w-28 h-28 text-3xl',
  xxl: 'w-44 h-44 text-5xl',
};

const PIXEL_SIZES: Record<'sm' | 'md' | 'lg' | 'xl' | 'xxl', number> = {
  sm: 36,
  md: 56,
  lg: 80,
  xl: 112,
  xxl: 176,
};

const RING_CLASSES: Record<'gold' | 'red' | 'green', string> = {
  gold: 'ring-buteco-gold',
  red: 'ring-buteco-red',
  green: 'ring-buteco-green',
};

export default function ParticipantAvatar({
  name,
  photoUrl,
  size = 'md',
  ring = false,
  ringColor = 'gold',
}: {
  name: string;
  photoUrl: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  ring?: boolean;
  ringColor?: 'gold' | 'red' | 'green';
}) {
  const dimension = PIXEL_SIZES[size];
  const ringWidth = size === 'xxl' ? 'ring-4 ring-offset-4' : 'ring-2 ring-offset-2';

  return (
    <div
      className={`relative shrink-0 rounded-full overflow-hidden bg-[#2a2d32] flex items-center justify-center font-display text-buteco-gold ${SIZE_CLASSES[size]} ${
        ring ? `${ringWidth} ${RING_CLASSES[ringColor]} ring-offset-buteco-black` : ''
      }`}
    >
      {photoUrl ? (
        <Image src={photoUrl} alt={name} width={dimension} height={dimension} className="object-cover w-full h-full" />
      ) : (
        <span>{initialsFor(name)}</span>
      )}
    </div>
  );
}
