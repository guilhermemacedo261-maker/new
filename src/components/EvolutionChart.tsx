import type { PlayerWeeklyPoint } from '@/services/player-service';

export default function EvolutionChart({ points }: { points: PlayerWeeklyPoint[] }) {
  if (points.length < 2) {
    return <p className="text-buteco-white/40 text-sm text-center py-8">Dados insuficientes para o gráfico ainda.</p>;
  }

  const width = 600;
  const height = 220;
  const padding = 32;
  const maxCorrect = Math.max(...points.map((p) => p.correct), 1);

  const stepX = (width - padding * 2) / (points.length - 1);
  const coords = points.map((p, i) => ({
    x: padding + i * stepX,
    y: height - padding - (p.correct / maxCorrect) * (height - padding * 2),
    point: p,
  }));

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#2a2d32" strokeWidth={1} />
      <path d={linePath} fill="none" stroke="#d4af37" strokeWidth={2.5} />
      {coords.map((c, i) => (
        <g key={i}>
          <circle cx={c.x} cy={c.y} r={4} fill="#d4af37" />
          <text x={c.x} y={height - padding + 16} fontSize={10} textAnchor="middle" fill="#9a9a94">
            S{c.point.weekNumber}
          </text>
          <text x={c.x} y={c.y - 10} fontSize={10} textAnchor="middle" fill="#f5f5f0">
            {c.point.correct}
          </text>
        </g>
      ))}
    </svg>
  );
}
