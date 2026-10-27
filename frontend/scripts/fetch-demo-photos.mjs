// Скачивает демо-фото с Wikimedia Commons (только свободные лицензии) и пишет атрибуцию.
// Запуск: node scripts/fetch-demo-photos.mjs [--candidates]
//   --candidates  скачать кандидатов по запросам в scripts/.candidates/ для ручного отбора
//   без флага     скачать отобранные файлы из PICKED в public/demo/photos/ + photos.json
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const API = 'https://commons.wikimedia.org/w/api.php';
const UA = 'okno-hackathon-demo/0.1 (Ostrovok Hackathon 2026 prototype; demo photos with attribution)';
const OK_LICENSE = /^(CC BY(-SA)? [0-9.]+|CC0|Public domain)/i;

const QUERIES = {
  coast: 'Sochi embankment sea',
  sunset: 'Sochi sunset sea',
  beach: 'Sochi beach pebble',
  adler: 'Adler Sochi beach',
  khosta: 'Khosta Sochi',
  lazarevskoye: 'Lazarevskoye beach',
  polyana: 'Krasnaya Polyana mountains',
  mountains: 'Sochi mountains view',
  street: 'Sochi street palm',
  park: 'Sochi Arboretum',
  room: 'hotel room interior bed window',
  balcony: 'hotel balcony sea view',
  pool: 'hotel swimming pool sea',
  lobby: 'hotel lobby interior',
  breakfast: 'hotel breakfast buffet',
  building: 'Sochi sanatorium building',
};

// Отобранные файлы: ключ → заголовок файла на Commons
export const PICKED = {
  'ext-1': "File:Grand Hotel Brighton Close-Up of Sea-Facing Balconies.jpg",
  'ext-2': "File:Sea View from Balcony - panoramio.jpg",
  'ext-3': "File:Сочи, дендрарий - panoramio.jpg",
  'ext-4': "File:Khosta1.JPG",
  'ext-5': "File:Dendrarium Sochi Mauritanian arbour.jpg",
  'ext-6': "File:Beach in Lazarevskoye, Sochi.jpg",
  'ext-7': "File:Alpine resort Gazprom in Krasnaya Polyana.jpg",
  'ext-8': "File:Sochi - panoramio (2).jpg",
  'room-1': "File:TW 台灣 Taiwan 台北市 Taipei City 中正區 Zhongzheng District 忠孝西路一段 Zhongxiao West Road 1 section 台北凱撒大飯店 Caesar Park Taipei hotel room window curtain n beds night August 2019 SSG 03.jpg",
  'room-2': "File:Lobby lounge of Amantaka Suite Amantaka luxury Resort & Hotel Luang Prabang Laos.jpg",
  'room-3': "File:Kruisherenhotel, hotel room 2.jpg",
  'balcony-1': "File:Rio-hotel-upstairs-pool 14 14 35 177000.jpeg",
  'balcony-2': "File:Pineda de Mar - Passeig Maritim - Taurus Park Hotel - View on the beach of the Mediterranean Sea 03.jpg",
  'balcony-3': "File:Rio-hotel-upstairs-pool 14 14 20 881000.jpeg",
  'pool-1': "File:Swimming Pool Pantelleria September 2014 (216951789).jpeg",
  'pool-2': "File:Swimming pool at the Los Arboles boutique resort and hotel in Palm Springs, California LCCN2013631641.tif",
  'lobby-1': "File:Lobby hall with couches and chandelier at The Fullerton Bay Hotel Singapore.jpg",
  'lobby-2': "File:Interior of the lobby coffee and drinks at The Fullerton Bay Hotel Singapore.jpg",
  'breakfast-1': "File:Breakfast buffet Marriott Hotel Lima 01.jpg",
  'beach-1': "File:Chkalovskiy Beach in Adler, Sochi 1.jpg",
  'beach-2': "File:Chkalovskiy Beach in Adler, Sochi 2.jpg",
  'beach-3': "File:Вид с пирса на Лазаревский пляж.jpg",
  'beach-4': "File:Chkalovskiy Beach in Adler, Sochi.jpg",
  'mountains-1': "File:Sochi mountain village.jpg",
  'mountains-2': "File:Krasnaya Polyana Mountains (261532271).jpeg",
  'mountains-3': "File:Krasnaya Polyana Mountains (261402723).jpeg",
  'park-1': "File:Dendrarium Sochi main entrance.jpg",
  'street-1': "File:Knyaz Vladimir сruise ship, Sea Port of Sochi.jpg",
  'street-2': "File:Batumi Sunset On The Black Sea (55651140).jpeg",
  'mood-sea': "File:Chkalovskiy Beach in Adler, Sochi 3.jpg",
  'mood-mountains': "File:Krasnaya Polyana Mountains (261532271).jpeg",
  'mood-kids': "File:Chkalovskiy Beach in Adler, Sochi 1.jpg",
  'mood-sunset': "File:RIAN archive 499451 On a beach in Sochi.jpg",
};

const strip = (html = '') => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

async function search(q, limit = 12) {
  const url = `${API}?action=query&generator=search&gsrsearch=${encodeURIComponent(q + ' filetype:bitmap')}&gsrnamespace=6&gsrlimit=${limit}&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=1280&format=json`;
  const d = await (await get(url)).json();
  return Object.values(d.query?.pages ?? {}).map((p) => {
    const ii = p.imageinfo[0], m = ii.extmetadata;
    return {
      title: p.title, width: ii.width, height: ii.height, thumb: ii.thumburl, page: ii.descriptionurl,
      license: m.LicenseShortName?.value ?? '', licenseUrl: m.LicenseUrl?.value ?? '',
      author: strip(m.Artist?.value) || 'unknown',
    };
  }).filter((x) => OK_LICENSE.test(x.license) && x.width > x.height * 1.2);
}

async function byTitle(title) {
  const url = `${API}?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=1280&format=json`;
  const p = Object.values((await (await get(url)).json()).query.pages)[0];
  const ii = p.imageinfo[0], m = ii.extmetadata;
  return { title: p.title, thumb: ii.thumburl, page: ii.descriptionurl, license: m.LicenseShortName?.value ?? '', licenseUrl: m.LicenseUrl?.value ?? '', author: strip(m.Artist?.value) || 'unknown' };
}

async function get(url) {
  for (let i = 0; i < 6; i++) {
    const r = await fetch(url, { headers: { 'User-Agent': UA } });
    if (r.status !== 429 && r.ok) return r;
    if (r.status !== 429) throw new Error(`${r.status} ${url}`);
    await sleep(3000 * (i + 1));
  }
  throw new Error(`rate limited ${url}`);
}

async function download(url, file) {
  const r = await get(url);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, Buffer.from(await r.arrayBuffer()));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (process.argv.includes('--candidates')) {
  const out = join(ROOT, 'scripts', '.candidates');
  const index = [];
  for (const [key, q] of Object.entries(QUERIES)) {
    const list = (await search(q)).slice(0, 8);
    for (const [i, c] of list.entries()) {
      const file = join(out, `${key}-${i}.jpg`);
      try { await download(c.thumb, file); index.push({ key: `${key}-${i}`, ...c }); } catch (e) { console.warn(e.message); }
      await sleep(1200);
    }
    console.log(key, list.length);
    await sleep(2000);
  }
  await writeFile(join(out, 'index.json'), JSON.stringify(index, null, 2));
} else {
  const meta = {};
  for (const [key, title] of Object.entries(PICKED)) {
    const c = await byTitle(title);
    if (!OK_LICENSE.test(c.license)) { console.warn('skip license', title, c.license); continue; }
    await download(c.thumb, join(ROOT, 'public', 'demo', 'photos', `${key}.jpg`));
    meta[key] = { src: `/demo/photos/${key}.jpg`, title: c.title, author: c.author, license: c.license, licenseUrl: c.licenseUrl, page: c.page };
    await sleep(1200);
  }
  await mkdir(join(ROOT, 'src', 'data'), { recursive: true });
  await writeFile(join(ROOT, 'src', 'data', 'photos.json'), JSON.stringify(meta, null, 2));
  console.log('saved', Object.keys(meta).length);
}
