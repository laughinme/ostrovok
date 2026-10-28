import type { Hotel } from "@/entities/hotel";
export function ViewCompass({ hotel }: { hotel: Hotel }) {
  const arc = (from: number, to: number, r: number) => {
    const span = (to - from + 360) % 360 || 360;
    const p = (a: number) => [
      50 + r * Math.sin((a * Math.PI) / 180),
      50 - r * Math.cos((a * Math.PI) / 180),
    ];
    const [x1, y1] = p(from);
    const [x2, y2] = p(from + span);
    return `M50,50 L${x1},${y1} A${r},${r} 0 ${span > 180 ? 1 : 0} 1 ${x2},${y2} Z`;
  };
  const sx = 50 + 44 * Math.sin((hotel.sunsetAzimuth * Math.PI) / 180);
  const sy = 50 - 44 * Math.cos((hotel.sunsetAzimuth * Math.PI) / 180);
  return (
    <svg viewBox="0 0 100 100" className="mx-auto h-48 w-48">
      <circle cx="50" cy="50" r="44" fill="var(--muted)" />
      {hotel.views.map((v, i) => (
        <path
          key={i}
          d={arc(v.from, v.to, 44)}
          fill={i === 0 ? "var(--sea)" : "var(--conf-high)"}
          opacity={0.75}
        />
      ))}
      <circle cx="50" cy="50" r="3" fill="var(--foreground)" />
      <line
        x1="50"
        y1="50"
        x2={sx}
        y2={sy}
        stroke="var(--coral)"
        strokeWidth="1"
        strokeDasharray="2 1.5"
      />
      <circle cx={sx} cy={sy} r="4" fill="var(--sun)" stroke="var(--coral)" strokeWidth="1" />
      {[
        ["С", 50, 4],
        ["В", 97, 52],
        ["Ю", 50, 99],
        ["З", 2, 52],
      ].map(([l, x, y]) => (
        <text
          key={l as string}
          x={x as number}
          y={y as number}
          fontSize="5"
          textAnchor="middle"
          fill="var(--muted-foreground)"
          fontFamily="var(--font-mono)"
        >
          {l}
        </text>
      ))}
    </svg>
  );
}
