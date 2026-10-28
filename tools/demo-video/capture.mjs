import path from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { createCapture, sleep } from './capture-lib.mjs';

const base = process.env.DEMO_URL ?? 'https://ostrovok-okno.vercel.app';
const out = path.resolve(process.env.CAPTURE_OUT ?? '../../.private/video-production/take-01');
const h = await createCapture({ base, out });
const { page, scene, frame, glide, tap, type, focus } = h;
const query = 'Хочу тихий номер с закатом над морем, до пляжа пешком, 12–15 ноября, вдвоём, до 12 тысяч за ночь';
const trace = () => page.getByLabel('Ход агента').last();
const part = process.env.CAPTURE_PART;
const include = (name) => !part || part === name;
const statePath = path.resolve('../../.private/video-production/run-state.json');
const state = JSON.parse(await readFile(statePath, 'utf8').catch(() => '{}'));

try {
  if (include('guest')) {
  await h.goto('/');
  await scene('01-landing', 'Гость', 'Отдых начинается с вашего «хочу»', 'Большой Сочи · рабочий прототип О!кно', async () => {
    await sleep(1800);
    await glide(530, 2600);
    await sleep(1800);
  });
  await glide(0);
  await scene('02-query', 'Гость', 'Опишите поездку своими словами', 'Желания, даты и бюджет — в одном запросе', async () => {
    await type(page.getByRole('textbox', { name: 'Опишите поездку своими словами' }), query, 32);
    await sleep(1300);
    await tap(page.getByRole('button', { name: 'Подобрать', exact: true }));
    await sleep(700);
  });
  await page.getByRole('link', { name: 'Подробнее' }).first().waitFor({ timeout: 120000 });
  await sleep(2000);
  const hotelUrl = await page.getByRole('link', { name: 'Подробнее' }).first().getAttribute('href');
  state.hotelUrl = hotelUrl;
  await writeFile(statePath, JSON.stringify(state));
  await scene('03-results', 'Гость', 'Видно, почему подходит каждый вариант', 'Совпадение с запросом, условия и честные компромиссы', async () => {
    const card = page.getByRole('button', { name: /^Сравнить — / }).first().locator('xpath=ancestor::article');
    await focus(card, 'Соответствие вашим желаниям', 3.5, 1.13);
    await tap(page.getByRole('button', { name: /^Сравнить — / }).nth(0));
    await tap(page.getByRole('button', { name: /^Сравнить — / }).nth(1));
  });
  await h.goto('/compare');
  await sleep(2000);
  await scene('04-compare', 'Гость', 'Сравниваем по важному для вас', 'Один запрос — понятный выбор между отелями', async () => {
    await sleep(2500);
    await glide(320, 2000);
    await sleep(2400);
  });
  await h.goto(state.hotelUrl);
  await page.getByRole('heading', { name: 'Ваше окно', exact: true }).waitFor({ timeout: 60000 });
  await scene('05-hotel', 'Гость', 'Не просто отель — конкретный номер', 'Фасад, этаж и ваши даты меняют впечатление', async () => {
    await sleep(2000);
    await frame(page.getByRole('heading', { name: 'Как это будет', exact: true }), 145, 2300);
    await sleep(1400);
  });
  }
  if (include('hotel')) {
  if (part) await h.goto(state.hotelUrl);
  await frame(page.locator('#window'), 105);
  await sleep(2000);
  await scene('06-window', 'Доказательства', 'Загляните в своё окно до поездки', 'Рельеф, соседние здания и солнце в выбранные даты', async () => {
    await focus(page.locator('.w-stage, .window-frame').first(), 'Расчёт по открытым данным', 2.5, 1.08);
    await tap(page.getByRole('group', { name: 'Сторона здания' }).getByRole('button', { name: /^СВ/ }));
    await sleep(1300);
    await tap(page.getByRole('group', { name: 'Сторона здания' }).getByRole('button', { name: /^ЮЗ/ }));
    await sleep(1300);
    const slider = page.getByRole('slider', { name: 'Этаж', exact: true });
    await tap(slider);
    await slider.press('Home');
    await sleep(800);
    await slider.press('End');
    await sleep(2200);
    await glide(await page.evaluate(() => scrollY + 400), 2000);
    await sleep(1800);
  });
  await frame(page.locator('#night'), 115);
  await sleep(1400);
  await scene('07-night', 'Доказательства', 'Тишина зависит от стороны здания', 'Условный индекс по OSM · это оценка, а не замер', async () => {
    await sleep(2200);
    await tap(page.locator('#night').getByRole('button', { name: 'День', exact: true }));
    await sleep(1500);
    await tap(page.locator('#night').getByRole('button', { name: 'Ночь', exact: true }));
    await sleep(1700);
  });
  const route = page.locator('#morning');
  await frame(route, 110);
  await sleep(1800);
  await scene('08-route', 'Доказательства', 'Проверяем и спуск, и путь обратно', 'До пляжа: время, рельеф и набор высоты', async () => {
    await sleep(2300);
    await glide(await page.evaluate(() => scrollY + 290), 2000);
    await sleep(2100);
  });
  const legacyWhy = page.getByRole('button', { name: /почему →/ }).first();
  const why = await legacyWhy.count() ? legacyWhy : page.locator('#hotel-facts button').filter({ hasText: 'расчёт' }).first();
  await frame(why, 310);
  await scene('09-source', 'Доказательства', 'У каждого факта есть «почему»', 'Источник, метод, уверенность и ограничения оценки', async () => {
    await tap(why);
    await sleep(1500);
    await focus(page.getByRole('dialog').first(), 'Факт можно проверить', 4, 1.08);
    await tap(page.getByRole('button', { name: 'Закрыть', exact: true }));
  });
  const book = page.getByRole('button', { name: 'Забронировать', exact: true }).first();
  await frame(book, 360);
  await scene('10-booking', 'Поездка', 'Пожелания доходят до заявки', 'Демонстрационная бронь · без оплаты', async () => {
    await tap(book);
    await sleep(1500);
    await sleep(2400);
    await tap(page.getByRole('button', { name: 'Создать демо-заявку', exact: true }));
    await sleep(1400);
  });
  await page.getByRole('link', { name: /Открыть (поездку|мою бронь)/ }).waitFor({ timeout: 60000 });
  await tap(page.getByRole('link', { name: /Открыть (поездку|мою бронь)/ }));
  await sleep(2000);
  await scene('11-trip', 'Поездка', 'Всё важное собрано перед поездкой', 'Заявка, ожидания и статус ответа отеля', async () => {
    await sleep(2500);
    await glide(410, 2100);
    await sleep(2500);
  });
  }
  if (include('partner')) {
  await h.goto('/partner');
  await page.getByRole('heading', { name: /Хороший отдых/ }).waitFor({ timeout: 60000 });
  await sleep(1600);
  await scene('12-partner', 'Отельер', 'Отель отвечает обычным текстом', 'Помощник уточняет то, что нельзя узнать из геоданных', async () => {
    await sleep(1600);
    await frame(page.locator('#partner-assistant'), 150, 2200);
    const answer = page.getByRole('button', { name: 'Ответить', exact: true }).first();
    if (await answer.count()) await tap(answer);
    await type(page.getByPlaceholder('Ответьте своими словами…'), 'Да, собак до 20 кг принимаем. Доплата 700 ₽ в сутки.', 36);
    await tap(page.getByRole('button', { name: 'Отправить ответ', exact: true }));
  });
  await page.getByText('Сохраняем ответ…', { exact: true }).waitFor({ state: 'hidden', timeout: 60000 });
  await sleep(1600);
  await frame(page.locator('#partner-assistant'), 125);
  await scene('13-partner-answer', 'Отельер', 'Ответ становится знанием об отеле', 'Сохраняем содержание ответа и его источник', async () => {
    await focus(page.getByLabel('Переписка с помощником'), 'Отельер — источник факта', 4.5, 1.14);
  });
  }
  if (include('agents')) {
  await h.goto('/console');
  await sleep(2000);
  await scene('14-agents', 'Агенты', 'Видно, как добываются знания', 'От вопроса до проверенного факта — в консоли', async () => {
    await sleep(2400);
    await glide(270, 1800);
    await sleep(1800);
  });
  await glide(0);
  await tap(page.getByRole('button', { name: 'Научить новому', exact: true }));
  await sleep(1000);
  await scene('15-learn', 'Агенты', 'Новая характеристика — из описания', 'Куратор проверяет данные и собирает рецепт расчёта', async () => {
    await type(page.getByRole('textbox').first(), 'рядом есть смотровая площадка, 15 минут пешком', 38);
    await tap(page.getByRole('button', { name: 'Научить агента', exact: true }));
    await trace().waitFor({ timeout: 60000 });
    await sleep(1800);
  });
  await page.getByText(/· готово/i).first().waitFor({ timeout: 150000 });
  await sleep(1200);
  await frame(trace(), 290);
  await scene('16-learned', 'Агенты', 'Рецепт готов, ход исследования сохранён', 'Реальное выполнение · ожидание между сценами сокращено', async () => {
    await focus(trace(), 'Инструменты, данные и решение', 5, 1.12);
  });
  await glide(0);
  await tap(page.getByRole('button', { name: 'Качество', exact: true }));
  await sleep(1800);
  await scene('17-quality', 'Агенты', 'Качество можно измерить', 'Метрики разбора, поиска и покрытия знаний', async () => {
    await sleep(2600);
    await glide(250, 1800);
    await sleep(1700);
  });
  }
  if (include('platform')) {
  await h.goto('/developers');
  await scene('18-platform', 'API и MCP', 'Один слой знаний — для разных продуктов', 'REST API и MCP для внешних приложений и агентов', async () => {
    await sleep(2300);
    await frame(page.getByRole('button', { name: 'Выполнить', exact: true }).first(), 500, 2400);
    await tap(page.getByRole('button', { name: 'Выполнить', exact: true }).first());
    await page.getByText(/ответ за/).first().waitFor({ timeout: 60000 });
    await sleep(1000);
    await glide(await page.evaluate(() => scrollY + 240), 1600);
    await sleep(2300);
  });
  }
} catch (error) {
  await page.screenshot({ path: path.join(out, 'failure.png') }).catch(() => {});
  console.error(error);
  process.exitCode = 1;
} finally {
  await h.close();
}
