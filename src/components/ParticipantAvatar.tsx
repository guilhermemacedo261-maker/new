import Image from 'next/image';

function initialsFor(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

const SIZE_CLASSES: Record<'sm' | 'md' | 'lg' | 'xl', string> = {
  sm: 'w-9 h-9 text-xs',
  md: 'w-14 h-14 text-base',
  lg: 'w-20 h-20 text-xl',
  xl: 'w-28 h-28 text-3xl',
};

const PIXEL_SIZES: Record<'sm' | 'md' | 'lg' | 'xl', number> = {
  sm: 36,
  md: 56,
  lg: 80,
  xl: 112,
};

export default function ParticipantAvatar({
  name,
  photoUrl,
  size = 'md',
  ring = false,
}: {
  name: string;
  photoUrl: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  ring?: boolean;
}) {
  const dimension = PIXEL_SIZES[size];

  return (
    <div
      className={`relative shrink-0 rounded-full overflow-hidden bg-[#2a2d32] flex items-center justify-center font-display text-buteco-gold ${SIZE_CLASSES[size]} ${
        ring ? 'ring-2 ring-buteco-gold ring-offset-2 ring-offset-buteco-black' : ''
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
