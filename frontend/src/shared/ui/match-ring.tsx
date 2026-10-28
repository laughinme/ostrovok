import { motion, useReducedMotion } from "framer-motion";
import { useId } from "react";
export function MatchRing({
  value,
  size = 64,
  stroke = 6,
}: {
  value: number;
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const gradient = useId();
  const reduce = useReducedMotion();
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradient} x1="0" x2="1">
            <stop offset="0%" stopColor="var(--sun)" />
            <stop offset="100%" stopColor="var(--coral)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="var(--muted)"
          strokeWidth={stroke}
          fill="none"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={`url(#${gradient})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          initial={reduce ? false : { strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - value / 100) }}
          transition={{ duration: reduce ? 0 : 0.8, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="font-mono font-semibold" style={{ fontSize: size / 4.2 }}>
          {value}
          <span className="text-muted-foreground" style={{ fontSize: size / 7 }}>
            %
          </span>
        </span>
      </div>
    </div>
  );
}
