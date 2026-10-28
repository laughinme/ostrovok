import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export const viewport = { width: 1440, height: 810 };
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function createCapture({ base, out }) {
  await mkdir(out, { recursive: true });
  const browser = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport, locale: 'ru-RU', deviceScaleFactor: 1 });
  await context.addInitScript(() => {
    const mount = () => {
      const pointer = document.createElement('div');
      pointer.id = 'demo-pointer';
      pointer.style.cssText = 'position:fixed;left:0;top:0;width:26px;height:32px;z-index:2147483647;pointer-events:none;transform:translate(1260px,650px);filter:drop-shadow(0 2px 2px #0b153350)';
      pointer.innerHTML = '<svg viewBox="0 0 26 32"><path d="M3 2L23 20L14 21L10 29L3 2Z" fill="white" stroke="#0b1533" stroke-width="2" stroke-linejoin="round"/></svg>';
      document.documentElement.append(pointer);
      window.demoPointer = { x: 1260, y: 650 };
      const style = document.createElement('style');
      style.textContent = '*{cursor:none!important}html{scroll-behavior:auto!important}::-webkit-scrollbar{width:0;height:0}';
      document.documentElement.append(style);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
    else mount();
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.url().includes('/api/') && response.status() >= 400) {
      errors.push(`${response.status()} ${new URL(response.url()).pathname}`);
    }
  });
  const previous = JSON.parse(await readFile(path.join(out, 'manifest.json'), 'utf8').catch(() => '{"clips":[]}'));
  const manifest = { base, viewport, fps: 60, clips: previous.clips, errors };
  let clip;
  let started;

  const glide = async (target, duration = 1800) => {
    await page.evaluate(({ target, duration }) => new Promise((resolve) => {
      const start = performance.now();
      const from = window.scrollY;
      const to = Math.min(Math.max(0, target), document.documentElement.scrollHeight - innerHeight);
      const tick = (now) => {
        const p = Math.min(1, (now - start) / duration);
        const eased = p * p * p * (p * (p * 6 - 15) + 10);
        window.scrollTo({ top: from + (to - from) * eased, behavior: 'instant' });
        if (p < 1) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    }), { target, duration });
    await sleep(450);
  };

  const frame = async (locator, top = 125, duration = 1800) => {
    const box = await locator.boundingBox();
    if (!box) throw new Error(`Invisible recording target: ${locator}`);
    const current = await page.evaluate(() => scrollY);
    await glide(current + box.y - top, duration);
  };

  const move = async (x, y, duration = 800) => {
    await page.evaluate(({ x, y, duration }) => new Promise((resolve) => {
      const from = window.demoPointer;
      const pointer = document.getElementById('demo-pointer');
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min(1, (now - start) / duration);
        const t = p * p * (3 - 2 * p);
        const px = from.x + (x - from.x) * t;
        const py = from.y + (y - from.y) * t - Math.sin(p * Math.PI) * 22;
        pointer.style.transform = `translate(${px}px,${py}px)`;
        if (p < 1) requestAnimationFrame(tick);
        else { window.demoPointer = { x, y }; resolve(); }
      };
      requestAnimationFrame(tick);
    }), { x, y, duration });
    await page.mouse.move(x, y);
  };

  const tap = async (locator) => {
    let box = await locator.boundingBox();
    if (!box) throw new Error('Click target is missing');
    if (box.y < 90 || box.y + box.height > viewport.height - 30) {
      await frame(locator, 320);
      box = await locator.boundingBox();
    }
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await move(x, y);
    await sleep(200);
    await page.evaluate(({ x, y }) => {
      const ring = document.createElement('div');
      ring.style.cssText = `position:fixed;left:${x - 18}px;top:${y - 18}px;width:36px;height:36px;border:3px solid #1b4de4;border-radius:50%;pointer-events:none;z-index:2147483646`;
      document.documentElement.append(ring);
      ring.animate([{ transform: 'scale(.45)', opacity: .8 }, { transform: 'scale(1.8)', opacity: 0 }], { duration: 700 }).onfinish = () => ring.remove();
    }, { x, y });
    await locator.click({ position: { x: box.width / 2, y: box.height / 2 } });
    await sleep(450);
  };

  const type = async (locator, text, delay = 35) => {
    await tap(locator);
    for (const part of text.match(/.{1,28}(?:\s|$)|.+/gu) ?? [text]) {
      await locator.pressSequentially(part, { delay });
      await sleep(140);
    }
    await sleep(600);
  };

  const focus = async (locator, label, seconds = 3, zoom = 1.15) => {
    const box = await locator.boundingBox();
    if (!box || box.y < 0 || box.y + box.height > viewport.height) throw new Error(`Focus target outside frame: ${label}`);
    clip.focus.push({ at: (Date.now() - started) / 1000, duration: seconds, box, label, zoom });
    await sleep(seconds * 1000);
  };

  const scene = async (id, chapter, title, description, action) => {
    clip = { id, chapter, title, description, url: page.url(), src: `footage/${id}.mp4`, focus: [] };
    const raw = path.join(out, `${id}.webm`);
    await page.screencast.start({ path: raw, fps: 60, size: viewport, quality: 95 });
    started = Date.now();
    try {
      await sleep(350);
      await action();
      await sleep(700);
      await page.screenshot({ path: path.join(out, `${id}.png`) });
    } finally {
      await page.screencast.stop();
    }
    const meta = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'json', raw]));
    clip.duration = Number(meta.format.duration);
    manifest.clips = manifest.clips.filter((item) => item.id !== id).concat(clip).sort((a, b) => a.id.localeCompare(b.id));
    await writeFile(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2));
    console.log(`${id}: ${clip.duration.toFixed(1)}s — ${title}`);
  };

  return {
    page, browser, context, scene, frame, glide, tap, type, move, focus,
    goto: async (route) => {
      await page.goto(new URL(route, base).href, { waitUntil: 'networkidle', timeout: 120000 });
      await page.evaluate(() => document.fonts.ready);
      await sleep(1000);
    },
    close: async () => {
      await writeFile(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2));
      await context.close();
      await browser.close();
      if (errors.length) console.log('Recording diagnostics:', [...new Set(errors)]);
    },
  };
}
