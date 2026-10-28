import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const source = path.resolve(process.env.CAPTURE_OUT ?? '../../.private/video-production/take-01');
const manifest = JSON.parse(await readFile(path.join(source, 'manifest.json'), 'utf8'));
if (!manifest.clips.length) throw new Error('No completed scenes to prepare');
await mkdir('public/footage', { recursive: true });
await mkdir('public/fonts', { recursive: true });
for (const clip of manifest.clips) {
  const input = path.join(source, `${clip.id}.webm`);
  const output = path.resolve('public', clip.src);
  const old = await stat(output).catch(() => null);
  const raw = await stat(input);
  if (!old || old.mtimeMs < raw.mtimeMs) {
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', input, '-c:v', 'libx264', '-preset', 'fast', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', '60', '-an', '-movflags', '+faststart', output]);
  }
  const meta = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=r_frame_rate,width,height', '-of', 'json', output]));
  if (meta.streams[0].r_frame_rate !== '60/1' || meta.streams[0].width !== 1440 || meta.streams[0].height !== 810) throw new Error(`Unexpected capture format: ${clip.id}`);
  clip.duration = Number(meta.format.duration);
  console.log(`Prepared ${clip.id}: ${clip.duration.toFixed(2)}s`);
}
for (const weight of [400, 600, 700, 800]) {
  const target = `public/fonts/onest-${weight}.ttf`;
  if (await stat(target).catch(() => null)) continue;
  const css = await fetch(`https://fonts.googleapis.com/css2?family=Onest:wght@${weight}&display=swap`).then((response) => response.text());
  const url = css.match(/src: url\(([^)]+)\)/)?.[1];
  if (!url) throw new Error('Cannot find the Onest font file');
  const font = await fetch(url);
  if (!font.ok) throw new Error('Cannot download Onest');
  await writeFile(target, Buffer.from(await font.arrayBuffer()));
}
await writeFile('public/manifest.json', JSON.stringify(manifest, null, 2));
const duration = 11 + manifest.clips.reduce((sum, clip) => sum + clip.duration - .4, 0);
const rate = 24000;
const count = Math.ceil(duration * rate);
const wav = Buffer.alloc(44 + count * 4);
wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22);
wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 4, 28);
wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36);
wav.writeUInt32LE(count * 4, 40);
const chords = [[146.83, 220, 293.66, 349.23], [130.81, 196, 261.63, 329.63], [174.61, 220, 261.63, 349.23], [196, 246.94, 293.66, 392]];
const beat = 60 / 92;
for (let index = 0; index < count; index++) {
  const t = index / rate;
  const chordIndex = Math.floor(t / (beat * 8)) % chords.length;
  const chord = chords[chordIndex];
  const phase = (t % (beat * 8)) / (beat * 8);
  const padEnvelope = Math.min(1, phase * 7, (1 - phase) * 7);
  let left = 0;
  let right = 0;
  chord.forEach((frequency, voice) => {
    left += Math.sin(2 * Math.PI * frequency * t + voice) * .024 * padEnvelope;
    right += Math.sin(2 * Math.PI * frequency * 1.0006 * t + voice) * .024 * padEnvelope;
  });
  const pulse = t % (beat * 2);
  const note = chord[[2, 3, 1, 3][Math.floor(t / (beat * 2)) % 4]] * 2;
  const pluck = (Math.sin(2 * Math.PI * note * pulse) + .25 * Math.sin(4 * Math.PI * note * pulse)) * Math.exp(-pulse * 5) * Math.min(1, pulse * 70) * .09;
  const fade = Math.min(1, t / 3, (duration - t) / 4);
  wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, (left + pluck) * fade)) * 32767), 44 + index * 4);
  wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, (right + pluck * .85) * fade)) * 32767), 46 + index * 4);
}
await writeFile('public/music.wav', wav);
console.log(`Ready: ${manifest.clips.length} scenes, approximately ${duration.toFixed(1)}s`);
