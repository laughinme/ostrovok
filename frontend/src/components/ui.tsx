import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { SourceKind, Verdict } from '../data/types';
import { conf, dots } from '../lib/format';
import { MARK } from '../lib/score';

export const Demo = ({ children = 'демо' }: { children?: ReactNode }) => <span className="demo">{children}</span>;

export const Mark = ({ v }: { v: Verdict }) => <i className={`mk ${v[0] === 'u' ? 'u' : v[0]}`}>{MARK[v]}</i>;

export function Conf({ p }: { p: number }) {
  const n = dots(p);
  return (
    <span className="conf" title={`уверенность ${String(p).replace('.', ',')}`}>
      <span className="dots">{[1, 2, 3, 4].map((i) => <i key={i} className={i <= n ? 'f' : ''} />)}</span>
      {conf(p)}
    </span>
  );
}

const SRC_CLASS: Record<SourceKind, string> = { computed: 'calc', open_data: 'open', hotelier: 'hotel', guest: 'guest', demo_card: '' };
export const SrcTag = ({ kind, children }: { kind: SourceKind; children: ReactNode }) => <span className={`src-k ${SRC_CLASS[kind]}`}>{children}</span>;

/** Кольцо совпадения: число и дуга плавно доезжают до нового значения. */
export function Ring({ value, size = 62, label = 'совпадение' }: { value: number; size?: number; label?: string }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const a = from.current, b = value;
    if (a === b) return;
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 480);
      setShown(Math.round(a + (b - a) * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step); else from.current = b;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  const r = size / 2 - 5, c = 2 * Math.PI * r;
  return (
    <div className="ringbox">
      <svg className="ring-svg" width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`совпадение ${value}%`}>
        <circle className="bg" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth="5" />
        <circle className="fg" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth="5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - shown / 100)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        <text x={size / 2} y={size / 2 + 6} textAnchor="middle" className="num">{shown}</text>
      </svg>
      {label && <small>{label}</small>}
    </div>
  );
}

export function Rating({ value, label, count }: { value: number; label: string; count?: number }) {
  return (
    <div className="rating">
      <div className="rating-t"><b>{label}</b>{count != null && <span>{count} отзывов <Demo /></span>}</div>
      <span className="rating-v num">{String(value).replace('.', ',')}</span>
    </div>
  );
}

export const Stars = ({ n }: { n: number }) => <span className="stars" aria-label={`${n} звезды`}>{'★'.repeat(n)}</span>;

const PATHS: Record<string, ReactNode> = {
  mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>,
  camera: <><rect x="3" y="6" width="18" height="14" rx="2" /><circle cx="12" cy="13" r="3.5" /><path d="M8 6l1.5-2h5L16 6" /></>,
  paw: <><circle cx="6" cy="9" r="2" /><circle cx="18" cy="9" r="2" /><circle cx="9.5" cy="5" r="2" /><circle cx="14.5" cy="5" r="2" /><path d="M8 17c0-3 2-5 4-5s4 2 4 5c0 2-2 2.5-4 2s-4 0-4-2z" /></>,
  kid: <><circle cx="12" cy="7" r="3" /><path d="M6 21c0-4 3-7 6-7s6 3 6 7" /></>,
  laptop: <><rect x="4" y="5" width="16" height="11" rx="1.5" /><path d="M2 19h20" /></>,
  wave: <><path d="M3 18c3 0 3-2 6-2s3 2 6 2 3-2 6-2" /><path d="M12 13V4l5 3" /></>,
  heart: <path d="M12 20s-7-4.4-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.6-9 9-9 9z" />,
  pin: <><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></>,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  back: <path d="M19 12H5M11 6l-6 6 6 6" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  expand: <path d="M4 10V4h6M20 14v6h-6M4 4l6 6M20 20l-6-6" />,
  photo: <><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="M21 16l-5-5-8 8" /></>,
  beach: <><path d="M3 19c3 0 3-2 6-2s3 2 6 2 3-2 6-2" /><path d="M5 14c2-6 12-6 14 0" /></>,
  rail: <><rect x="6" y="3" width="12" height="13" rx="3" /><path d="M8 20l2-4M16 20l-2-4M6 10h12" /></>,
  food: <><path d="M7 3v8a2 2 0 0 0 2 2v8M11 3v8M17 3c-2 2-2 6 0 8v10" /></>,
  pharm: <><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M12 8v8M8 12h8" /></>,
  park: <><path d="M12 3l5 8h-3l4 6H6l4-6H7z" /><path d="M12 17v4" /></>,
  plane: <path d="M3 13l18-7-4 14-5-4-3 3v-5z" />,
  bus: <><rect x="5" y="3" width="14" height="15" rx="2" /><path d="M5 11h14M8 21v-3M16 21v-3" /></>,
  bar: <path d="M6 4h12l-6 8zM12 12v7M8 20h8" />,
  lift: <><path d="M3 5l18 4" /><path d="M12 7v6" /><rect x="8" y="13" width="8" height="6" rx="1" /></>,
  wifi: <><path d="M3 9a14 14 0 0 1 18 0M6 12.5a9 9 0 0 1 12 0M9 16a4 4 0 0 1 6 0" /><circle cx="12" cy="19" r="1" /></>,
  check: <path d="M5 12l5 5 9-10" />,
  spark: <path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6z" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5" /></>,
  moon: <path d="M20 14a8 8 0 1 1-10-10 7 7 0 0 0 10 10z" />,
  steps: <path d="M4 20h4v-4h4v-4h4V8h4" />,
  question: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 1-1 1.7M12 17h.01" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  guests: <><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3 3-5 6-5s6 2 6 5M16 5a3 3 0 0 1 0 6M18 15c2 .6 3 2.4 3 5" /></>,
  bed: <path d="M3 18v-8h18v8M3 14h18M7 10V7h10v3" />,
  meal: <><circle cx="12" cy="13" r="6" /><path d="M3 4v7M21 4v16" /></>,
  undo: <path d="M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" />,
  card: <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18" /></>,
};

export function Icon({ name, size = 18 }: { name: keyof typeof PATHS | string; size?: number }) {
  return (
    <svg className="ic" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name] ?? PATHS.spark}
    </svg>
  );
}

export function Toast({ text }: { text: string | null }) {
  return <div className={`toast${text ? ' show' : ''}`} role="status">{text}</div>;
}

export function useToast() {
  const [text, setText] = useState<string | null>(null);
  const t = useRef<number>(0);
  const show = (s: string) => { setText(s); clearTimeout(t.current); t.current = window.setTimeout(() => setText(null), 2800); };
  return [text, show] as const;
}
