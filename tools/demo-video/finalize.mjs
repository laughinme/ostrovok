import { readFile, writeFile, rename, stat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const output = path.resolve(process.argv[2] ?? '../../.private/video-production/okno-presentation.mp4');
const folder = path.dirname(output);
const manifest = JSON.parse(await readFile('public/manifest.json', 'utf8'));
if (manifest.clips.length !== 19) throw new Error('The full presentation needs all 19 scenes');
const clips = manifest.clips;
const chapters = [{ start: 0, title: 'О!кно' }];
const samples = [180];
const timeline = [];
let cursor = 300 - 24;
let chapter;
for (const clip of clips) {
  const duration = Math.floor(clip.duration * 60);
  if (duration <= 24) throw new Error(`Scene ${clip.id} is too short`);
  if (clip.chapter !== chapter) {
    chapter = clip.chapter;
    chapters.push({ start: cursor, title: chapter });
  }
  const mark = clip.focus[0];
  const endSamples = { '02-query': 3, '10-booking': 1.5, '19-api': 1.2 };
  const selected = clip.id in endSamples ? Math.max(0, clip.duration - endSamples[clip.id]) : mark ? mark.at + mark.duration / 2 : Math.min(clip.duration / 2, 3);
  samples.push(Math.round(cursor + selected * 60));
  timeline.push({ id: clip.id, title: clip.title, start: cursor / 60, duration: duration / 60 });
  cursor += duration - 24;
}
chapters.push({ start: cursor, title: 'От «хочу» — к нужному номеру' });
samples.push(cursor + 180);
const expectedFrames = cursor + 360;
const metadata = [';FFMETADATA1', 'title=О!кно — презентация проекта', 'comment=Живая демонстрация. Цены и заявки — демо'];
for (const [index, chapter] of chapters.entries()) {
  const end = chapters[index + 1]?.start ?? expectedFrames;
  metadata.push('[CHAPTER]', 'TIMEBASE=1/1000', `START=${Math.round(chapter.start * 1000 / 60)}`, `END=${Math.round(end * 1000 / 60)}`, `title=${chapter.title}`);
}
const metaPath = path.join(folder, 'chapters.ffmetadata');
await writeFile(metaPath, metadata.join('\n') + '\n');
const ready = path.join(folder, 'okno-presentation.ready.mp4');
execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', output, '-i', metaPath, '-map_metadata', '1', '-map_chapters', '1', '-c', 'copy', '-movflags', '+faststart', ready]);
await rename(ready, output);
const result = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-show_chapters', '-of', 'json', output]));
const video = result.streams.find((stream) => stream.codec_type === 'video');
const audio = result.streams.find((stream) => stream.codec_type === 'audio');
if (video.width !== 1920 || video.height !== 1080 || video.r_frame_rate !== '60/1') throw new Error('Unexpected output dimensions or frame rate');
if (video.codec_name !== 'h264' || !['yuv420p', 'yuvj420p'].includes(video.pix_fmt) || audio?.codec_name !== 'aac') throw new Error('Unexpected delivery codecs');
if (Number(video.nb_frames) !== expectedFrames) throw new Error(`Expected ${expectedFrames} frames, got ${video.nb_frames}`);
if (expectedFrames / 60 > 180 || expectedFrames / 60 < 120) throw new Error('The full presentation must be 2–3 minutes');
const filter = `select='${samples.map((sample) => `eq(n,${sample})`).join('+')}',scale=384:216,tile=3x7`;
execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', output, '-vf', filter, '-frames:v', '1', path.join(folder, 'storyboard-final.jpg')]);
execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-ss', '46', '-i', output, '-frames:v', '1', path.join(folder, 'poster.jpg')]);
const chapterLines = chapters.map((chapter) => {
  const seconds = Math.floor(chapter.start / 60);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')} ${chapter.title}`;
});
await writeFile(path.join(folder, 'chapters.txt'), chapterLines.join('\n') + '\n');
const report = { output, width: video.width, height: video.height, fps: 60, frames: expectedFrames, duration: expectedFrames / 60, size: (await stat(output)).size, videoCodec: video.codec_name, pixelFormat: video.pix_fmt, audioCodec: audio.codec_name, chapters: chapterLines, timeline };
await writeFile(path.join(folder, 'verification.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ output, duration: report.duration, sizeMB: +(report.size / 1024 / 1024).toFixed(1), frames: expectedFrames, chapters: chapterLines }, null, 2));
