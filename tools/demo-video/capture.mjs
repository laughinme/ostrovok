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
const signInAs = async (name, target) => {
  await h.goto(target);
  const button = page.getByRole('button', { name: new RegExp(`^Войти как ${name}`) });
  if (await button.waitFor({ timeout: 20000 }).then(() => true, () => false)) {
    await button.click();
    await sleep(3000);
  }
};

try {
  if (include('guest') || include('hotel') || include('booking')) await signInAs('Анна', '/trips');
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
  await frame(page.getByRole('button', { name: /^Сравнить [—-] / }).first().locator('xpath=ancestor::article'), 92);
  await sleep(1000);
  await scene('03-results', 'Гость', 'Видно, почему подходит каждый вариант', 'Совпадение с запросом, условия и честные компромиссы', async () => {
    const card = page.getByRole('button', { name: /^Сравнить [—-] / }).first().locator('xpath=ancestor::article');
    await focus(card, 'Соответствие вашим желаниям', 3.5, 1.13);
    await tap(page.getByRole('button', { name: /^Сравнить [—-] / }).nth(0));
    await tap(page.getByRole('button', { name: /^Сравнить [—-] / }).nth(1));
  });
  await tap(page.getByRole('link', { name: /^Сравнение/ }).first());
  await page.waitForURL('**/compare');
  await page.getByText('Cascade', { exact: true }).first().waitFor({ timeout: 60000 });
  await sleep(2000);
  await scene('04-compare', 'Гость', 'Сравниваем по важному для вас', 'Один запрос — понятный выбор между отелями', async () => {
    await sleep(2500);
    await glide(320, 2000);
    await sleep(2400);
  });
  }
  if (include('compare') && part) {
    await h.goto(`/results?q=${encodeURIComponent(query)}`);
    await page.getByRole('link', { name: 'Подробнее' }).first().waitFor({ timeout: 120000 });
    await tap(page.getByRole('button', { name: /^Сравнить [—-] / }).nth(0));
    await tap(page.getByRole('button', { name: /^Сравнить [—-] / }).nth(1));
    await tap(page.getByRole('link', { name: /^Сравнение/ }).first());
    await page.waitForURL('**/compare');
    await page.getByText('Cascade', { exact: true }).first().waitFor({ timeout: 60000 });
    await sleep(2000);
    await scene('04-compare', 'Гость', 'Сравниваем по важному для вас', 'Один запрос — понятный выбор между отелями', async () => {
      await sleep(2500);
      await glide(320, 2000);
      await sleep(2400);
    });
  }
  if (include('guest') || include('overview')) {
  await h.goto(state.hotelUrl);
  await page.getByRole('heading', { name: 'Ваше окно', exact: true }).waitFor({ timeout: 60000 });
  await scene('05-hotel', 'Гость', 'Не просто отель — конкретный номер', 'Фасад, этаж и ваши даты меняют впечатление', async () => {
    await sleep(4600);
  });
  }
  if (part && ['hotel', 'source', 'booking'].includes(part)) await h.goto(state.hotelUrl);
  if (include('hotel')) {
  await frame(page.locator('#window'), 105);
  await sleep(2000);
  await scene('06-window', 'Доказательства', 'Загляните в своё окно до поездки', 'Рельеф, соседние здания и солнце в выбранные даты', async () => {
    await focus(page.locator('.w-stage, .window-frame').first(), 'Расчёт по открытым данным', 2.5, 1.08);
    await tap(page.getByRole('radiogroup', { name: 'Сторона окна на компасе' }).getByRole('radio', { name: /^Северо-восток/ }));
    await sleep(1300);
    await tap(page.getByRole('radiogroup', { name: 'Сторона окна на компасе' }).getByRole('radio', { name: /^Юго-запад/ }));
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
  const route = page.locator('#where');
  await frame(route, 110);
  await sleep(1800);
  await scene('08-route', 'Доказательства', 'Путь до моря и мест рядом', 'Пешком по графу улиц OSM с учётом рельефа', async () => {
    await sleep(2300);
    await glide(await page.evaluate(() => scrollY + 290), 2000);
    await sleep(2100);
  });
  }
  if (include('hotel') || include('source')) {
  const legacyWhy = page.getByRole('button', { name: /почему →/ }).first();
  const computed = page.locator('button.hotel-fact-item').filter({ hasText: 'расчёт' }).first();
  const why = await legacyWhy.count() ? legacyWhy : await computed.count() ? computed : page.locator('button.hotel-fact-item').first();
  await frame(why, 310);
  await scene('09-source', 'Доказательства', 'У каждого факта есть «почему»', 'Источник, метод, уверенность и ограничения оценки', async () => {
    await tap(why);
    await sleep(1500);
    await focus(page.getByRole('dialog').first(), 'Факт можно проверить', 4, 1.3);
    await page.keyboard.press('Escape');
    await sleep(600);
  });
  }
  if (include('hotel') || include('similar')) {
  if (part === 'similar') await h.goto(state.hotelUrl);
  const similar = page.locator('#similar');
  await frame(similar, 110);
  await sleep(1200);
  await scene('09b-similar', 'Гость', 'Понравился отель? Найдём похожий, но…', 'Тише, ближе к морю или дешевле: сходство и улучшение на фактах', async () => {
    await sleep(1200);
    await tap(page.getByRole('group', { name: 'Что улучшить в похожем отеле' }).getByRole('button').first());
    await page.getByRole('heading', { name: 'Похожие отели' }).waitFor({ timeout: 60000 });
    await sleep(1500);
    await glide(await page.evaluate(() => scrollY + 320), 2000);
    await sleep(2600);
  });
  }
  if (include('hotel') || include('booking')) {
  const book = page.getByRole('button', { name: 'Забронировать', exact: true }).nth(2);
  await frame(book, 360);
  await scene('10-booking', 'Поездка', 'Пожелания доходят до заявки', 'Демонстрационная бронь · без оплаты', async () => {
    await tap(book);
    await sleep(1500);
    await tap(page.getByLabel('Взрослые', { exact: true }));
    await page.getByLabel('Взрослые', { exact: true }).fill('2');
    await sleep(1400);
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
  await signInAs('Ирина', '/partner');
  await page.getByRole('heading', { name: 'Кабинет отельера', exact: true }).waitFor({ timeout: 60000 });
  await sleep(1600);
  await scene('12-partner', 'Отельер', 'Отель проверяет важные детали', 'Расчёт можно дополнить подтверждением отеля', async () => {
    await sleep(1600);
    const search = page.getByPlaceholder('Найти факт');
    await frame(search, 180, 2000);
    await type(search, 'парковка', 75);
    const confirm = page.getByRole('button', { name: 'Всё верно', exact: true }).first();
    if (!await confirm.count()) {
      await search.fill('Самолётов');
      await sleep(1000);
    }
    await sleep(1200);
    const saved = page.waitForResponse((response) => response.url().includes('/partner/facts/') && response.url().endsWith('/confirm') && response.request().method() === 'POST');
    await tap(confirm);
    const response = await saved;
    if (!response.ok()) throw new Error(`Hotel confirmation failed: ${response.status()}`);
    await sleep(1500);
  });
  await sleep(1600);
  const history = page.getByRole('heading', { name: 'История изменений', exact: true });
  await frame(history, 180);
  await scene('13-partner-answer', 'Отельер', 'Подтверждение сохранено в истории', 'У знания появляется ещё один источник — отель', async () => {
    await focus(history.locator('xpath=ancestor::section[1]'), 'Отельер — источник факта', 4.5, 1.14);
  });
  }
  if (include('agents')) {
  await signInAs('Оператор', '/console');
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
  }
  if (include('agents') || include('agents-result')) {
  if (part === 'agents-result') {
    await signInAs('Оператор', '/console');
    await page.getByRole('combobox', { name: 'Агент', exact: true }).selectOption('curator');
    await trace().locator('li').filter({ hasText: 'План' }).first().waitFor({ timeout: 60000 });
  }
  await frame(trace(), 120);
  await scene('16-learned', 'Агенты', 'Рецепт готов, ход исследования сохранён', 'Пробный прогон по OSM · ожидание между сценами сокращено', async () => {
    await focus(trace().locator('li').filter({ hasText: 'План' }).first(), 'Инструменты, данные и решение', 4.5, 1.15);
    await sleep(600);
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
  if (include('agents') || include('onboarding')) {
  if (part === 'onboarding') await signInAs('Оператор', '/console');
  await glide(0);
  await tap(page.getByRole('navigation', { name: 'Разделы консоли' }).getByRole('button', { name: /Новый отель/ }));
  await sleep(2000);
  await scene('17b-onboarding', 'Агенты', 'Новый отель — агенты изучают его сами', 'Реальный отель из OSM: расчёты, доказательства, вопросы отельеру', async () => {
    await sleep(1500);
    await tap(page.getByRole('button', { name: /^Изучить «/ }).first());
    await trace().waitFor({ timeout: 60000 });
    await sleep(5000);
  });
  await page.getByRole('heading', { name: 'Отель изучен' }).waitFor({ timeout: 180000 });
  await sleep(1500);
  await frame(page.getByRole('heading', { name: 'Отель изучен' }), 140);
  await scene('17c-onboarded', 'Агенты', 'За полминуты — десятки фактов с источниками', 'Отельеру остаются только вопросы, которые нельзя посчитать · ожидание сокращено', async () => {
    await sleep(2500);
    await glide(await page.evaluate(() => scrollY + 360), 2200);
    await sleep(2800);
  });
  }
  if (include('platform')) {
  await h.goto('/developers');
  await scene('18-platform', 'API и MCP', 'Знания доступны внешним агентам', 'MCP · подключение по Streamable HTTP · только чтение', async () => {
    await sleep(1600);
    await glide(330, 2000);
    await sleep(2400);
  });
  const run = page.getByRole('button', { name: 'Запустить', exact: true }).first();
  await frame(run, 290, 2000);
  await scene('19-api', 'API и MCP', 'Тот же слой знаний — через API', 'Живой запрос к серверу из интерфейса для разработчиков', async () => {
    const response = page.waitForResponse((response) => response.url().includes('/api/v1/intents') && response.request().method() === 'POST', { timeout: 60000 });
    await tap(run);
    await response;
    await sleep(700);
    await glide(await page.evaluate(() => scrollY + 220), 1600);
    await sleep(3000);
  });
  }
} catch (error) {
  await page.screenshot({ path: path.join(out, 'failure.png') }).catch(() => {});
  console.error(error);
  process.exitCode = 1;
} finally {
  await h.close();
}
