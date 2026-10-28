import { AbsoluteFill, Audio, Easing, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import type { CSSProperties } from 'react';

export type Focus = { at: number; duration: number; box: { x: number; y: number; width: number; height: number }; label: string; zoom: number };
export type Clip = { id: string; chapter: string; title: string; description: string; src: string; duration: number; focus: Focus[] };
export type FilmProps = { clips: Clip[]; music: boolean };
export const FPS = 60;
export const INTRO = 300;
export const OUTRO = 360;
export const OVERLAP = 24;
export const frames = (clip: Clip) => Math.floor(clip.duration * FPS);
export const filmDuration = (clips: Clip[]) => INTRO + OUTRO - OVERLAP + clips.reduce((sum, clip) => sum + frames(clip) - OVERLAP, 0);
const C = { ink: '#0B1533', blue: '#1B4DE4', lime: '#C9F59A', muted: '#AEBADA' };
const chapters = ['Гость', 'Доказательства', 'Поездка', 'Отельер', 'Агенты', 'API и MCP'];
const ease = Easing.bezier(0.45, 0, 0.55, 1);
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const panel: CSSProperties = { position: 'absolute', left: 312, top: 164, width: 1536, height: 864, borderRadius: 22, overflow: 'hidden', background: '#fff', border: '2px solid #3A4D7E' };

function Brand() {
  return <div style={{ position: 'absolute', top: 42, right: 72, fontSize: 40, fontWeight: 800, letterSpacing: -2 }}>О<span style={{ color: C.lime }}>!</span>кно</div>;
}

function Rail({ chapter }: { chapter: string }) {
  const active = chapters.indexOf(chapter);
  return <div style={{ position: 'absolute', left: 64, top: 166, width: 204 }}>
    {chapters.map((item, index) => <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 14, height: 45, color: index === active ? C.lime : index < active ? '#E5EDFF' : '#7282A7', fontWeight: index === active ? 700 : 400, fontSize: 19 }}>
      <div style={{ width: 7, height: 7, borderRadius: 9, background: index === active ? C.lime : index < active ? '#A7B7DB' : '#3A4769' }} />{item}
    </div>)}
  </div>;
}

function Shot({ clip }: { clip: Clip }) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;
  let power = 0;
  const mark = clip.focus.find((item) => t >= item.at && t <= item.at + item.duration);
  if (mark) {
    const local = t - mark.at;
    const ramp = Math.min(0.85, mark.duration / 3);
    power = interpolate(local, [0, ramp, mark.duration - ramp, mark.duration], [0, 1, 1, 0], { ...clamp, easing: ease });
  }
  const scale = 1 + ((mark?.zoom ?? 1) - 1) * power;
  const centerX = mark ? mark.box.x + mark.box.width / 2 : 720;
  const centerY = mark ? mark.box.y + mark.box.height / 2 : 405;
  const dx = Math.max(1440 * (1 - scale), Math.min(0, 720 - centerX * scale));
  const dy = Math.max(810 * (1 - scale), Math.min(0, 405 - centerY * scale));
  const alpha = interpolate(f, [0, OVERLAP], [0, 1], clamp);
  return <AbsoluteFill style={{ background: C.ink, opacity: alpha }}>
    <Brand />
    <div style={{ position: 'absolute', left: 64, top: 52, width: 1510, fontSize: 43, fontWeight: 700, letterSpacing: -1.5, lineHeight: 1.12 }}>{clip.title}</div>
    <Rail chapter={clip.chapter} />
    <div style={{ position: 'absolute', left: 64, top: 500, width: 204, fontSize: 23, lineHeight: 1.45, color: '#E6EDFF' }}>{clip.description}</div>
    {mark && <div style={{ position: 'absolute', left: 64, top: 790, width: 208, color: C.lime, opacity: power, fontSize: 19, lineHeight: 1.45, borderTop: `2px solid ${C.lime}`, paddingTop: 18 }}>{mark.label}</div>}
    <div style={panel}>
      <div style={{ width: 1440, height: 810, transformOrigin: '0 0', transform: 'scale(1.066666667)' }}>
        <div style={{ width: 1440, height: 810, transformOrigin: '0 0', transform: `translate(${dx}px,${dy}px) scale(${scale})` }}>
          <OffthreadVideo muted src={staticFile(clip.src)} style={{ width: 1440, height: 810 }} />
          {mark && <svg width="1440" height="810" style={{ position: 'absolute', inset: 0, opacity: power, pointerEvents: 'none' }}>
            <defs><mask id={`spot-${clip.id}`}><rect width="1440" height="810" fill="white" /><rect x={mark.box.x - 8} y={mark.box.y - 8} width={mark.box.width + 16} height={mark.box.height + 16} rx="15" fill="black" /></mask></defs>
            <rect width="1440" height="810" fill={C.ink} opacity=".2" mask={`url(#spot-${clip.id})`} />
            <rect x={mark.box.x - 5} y={mark.box.y - 5} width={mark.box.width + 10} height={mark.box.height + 10} rx="14" fill="none" stroke={C.lime} strokeWidth="4" />
          </svg>}
        </div>
      </div>
    </div>
  </AbsoluteFill>;
}

function Title({ closing = false }: { closing?: boolean }) {
  const f = useCurrentFrame();
  const entrance = interpolate(f, [12, 80], [0, 1], { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) });
  return <AbsoluteFill style={{ background: C.ink }}>
    <Brand />
    <div style={{ position: 'absolute', left: 96, top: closing ? 264 : 230, width: 1120, opacity: entrance, transform: `translateY(${(1 - entrance) * 35}px)` }}>
      <div style={{ color: C.lime, fontSize: 26, fontWeight: 600, marginBottom: 34 }}>{closing ? 'О!кно · О! Хакатон 2026' : 'Большой Сочи · О!кно'}</div>
      <div style={{ fontSize: closing ? 90 : 96, fontWeight: 800, letterSpacing: -4, lineHeight: 1.08 }}>{closing ? <>От «хочу» —<br />к нужному номеру.</> : <>Знаем о номере<br />больше.</>}</div>
      <div style={{ fontSize: 35, marginTop: 36, color: '#CBD6F0', lineHeight: 1.4 }}>{closing ? 'Гость, отельер и агенты работают с одними знаниями.' : 'И можем это доказать.'}</div>
      <div style={{ fontSize: 22, marginTop: 68, color: C.muted }}>{closing ? 'ostrovok-okno.vercel.app' : 'Живая демонстрация · цены и заявки — демо'}</div>
    </div>
    <svg viewBox="0 0 480 650" style={{ position: 'absolute', right: 80, top: 220, width: 450, height: 610, opacity: entrance }}>
      <rect x="42" y="60" width="370" height="480" rx="100" fill="#17328B" stroke="#4667C5" strokeWidth="2" />
      <path d="M43 320H411V441Q411 540 312 540H142Q43 540 43 441Z" fill="#2450DA" />
      <circle cx="300" cy="285" r="54" fill={C.lime} />
      <path d="M46 319H409" stroke={C.lime} strokeWidth="3" />
      <path d="M227 62V539M43 375H411" stroke={C.ink} strokeWidth="15" />
      <path d="M96 599H357" stroke="#4667C5" strokeWidth="3" strokeLinecap="round" />
    </svg>
  </AbsoluteFill>;
}

export function Film({ clips, music }: FilmProps) {
  const f = useCurrentFrame();
  const duration = filmDuration(clips);
  let cursor = INTRO - OVERLAP;
  return <AbsoluteFill style={{ background: C.ink, color: 'white', fontFamily: 'Onest, Arial, sans-serif' }}>
    <style>{[400, 600, 700, 800].map((weight) => `@font-face{font-family:Onest;src:url('${staticFile(`fonts/onest-${weight}.ttf`)}') format('truetype');font-weight:${weight}}`).join('')}</style>
    <Sequence durationInFrames={INTRO}><Title /></Sequence>
    {clips.map((clip) => {
      const from = cursor;
      cursor += frames(clip) - OVERLAP;
      return <Sequence key={clip.id} from={from} durationInFrames={frames(clip)} premountFor={60}><Shot clip={clip} /></Sequence>;
    })}
    <Sequence from={cursor} durationInFrames={OUTRO}><Title closing /></Sequence>
    <div style={{ position: 'absolute', left: 0, bottom: 0, height: 4, width: `${(f / (duration - 1)) * 100}%`, background: C.lime }} />
    {music && <Audio src={staticFile('music.wav')} volume={(at) => interpolate(at, [0, 90, duration - 180, duration], [0, .4, .4, 0], clamp)} />}
  </AbsoluteFill>;
}
