import { expect, test } from '@playwright/test';

// Rendering must work even when external map tiles are unavailable.
test.beforeEach(async ({ page }) => {
  await page.route('https://tiles.openfreemap.org/**', (route) => route.abort());
});

test('demo API exposes list, details, health and an honest 404', async ({ request }) => {
  expect(await (await request.get('/health')).json()).toEqual({ status: 'ok' });
  const hotels = await (await request.get('/api/hotels')).json();
  expect(hotels.length).toBeGreaterThan(0);
  expect(await (await request.get(`/api/hotels/${hotels[0].id}`)).json()).toEqual(hotels[0]);
  expect((await request.get('/api/hotels/missing')).status()).toBe(404);
});

test('search transitions to results, preserves criteria and completes a booking', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '«Тихий номер с закатом над морем»', exact: true }).click();
  await expect(page).toHaveURL('/search');
  await expect(page.locator('.hcard')).toHaveCount(8);
  await expect(page.locator('.list-head h2')).toContainText('Тихий номер с закатом над морем');
  await page.locator('.hcard').first().getByRole('button', { name: 'Показать номера' }).click();
  await expect(page).toHaveURL(/\/hotels\//);
  await page.getByRole('button', { name: 'Забронировать', exact: true }).first().click();
  await expect(page).toHaveURL(/\/book\/.*\?room=.+&rate=0/);
  await expect(page.getByRole('heading', { name: 'Бронь в один шаг' })).toBeVisible();
  await page.getByRole('button', { name: 'Забронировать', exact: true }).click();
  await expect(page).toHaveURL(/\/trips\//);
  await expect(page.locator('.ticket-statuses').getByText('Отель подтвердил', { exact: true })).toBeVisible();
  await expect(page.locator('.ticket-stub-room')).toContainText('512');
});

test('Query cache survives navigation; failures offer retry; invalid hotels never fall back', async ({ page }) => {
  let requests = 0;
  let failing = true;
  await page.route('**/api/hotels', async (route) => {
    requests++;
    if (failing) await route.fulfill({ status: 503, json: { message: 'Unavailable' } });
    else await route.continue();
  });
  await page.goto('/compare');
  await expect(page.locator('main[role=alert]')).toContainText('Не удалось загрузить данные', { timeout: 15_000 });
  failing = false;
  await page.getByRole('button', { name: 'Повторить', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Что выбрать из 3' })).toBeVisible();
  const afterRetry = requests;
  await page.getByRole('link', { name: 'Подбор', exact: true }).click();
  await expect(page.locator('.hcard')).toHaveCount(8);
  expect(requests).toBe(afterRetry);
  await page.goto('/hotels/does-not-exist');
  await expect(page.getByRole('heading', { name: 'Отель не найден' })).toBeVisible();
});

for (const route of ['/search', '/hotels/mayak', '/compare', '/book/mayak?room=sea&rate=1', '/trips/mayak', '/me', '/partner', '/console', '/developers', '/credits']) {
  test(`direct navigation and refresh: ${route}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error' && /hydrat|didn't match|does not match/i.test(message.text())) errors.push(message.text());
    });
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1, h2').first()).toBeVisible();
    await page.reload();
    await expect(page.locator('h1, h2').first()).toBeVisible();
    expect(errors).toEqual([]);
  });
}

for (const width of [1440, 1366, 390]) {
  test(`landing and hotel render at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Оооочень точный подбор номера' })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`landing-${width}.png`), fullPage: false });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.goto('/hotels/mayak');
    await expect(page.locator('h1')).toContainText('Маяк');
    await page.screenshot({ path: testInfo.outputPath(`hotel-${width}.png`), fullPage: false });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}


test('booking keeps the room and rate encoded in the URL after refresh', async ({ page, request }) => {
  const hotel = await (await request.get('/api/hotels/mayak')).json();
  const room = hotel.rooms[0];
  await page.goto(`/book/mayak?room=${room.id}&rate=1`);
  await expect(page.locator('.sum h3')).toContainText(room.name);
  const total = page.locator('.total b');
  const expected = new Intl.NumberFormat('ru-RU').format(room.rates[1].price * 5).replace(/\s/g, '');
  expect((await total.innerText()).replace(/\s|₽/g, '')).toBe(expected);
  await page.reload();
  await expect(page.locator('.sum h3')).toContainText(room.name);
  expect((await total.innerText()).replace(/\s|₽/g, '')).toBe(expected);
});

for (const variant of ['photo', 'split']) {
  test(`landing variant ${variant} hydrates from URL and persists across navigation`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error' && /hydrat|didn't match|does not match/i.test(message.text())) errors.push(message.text());
    });
    await page.goto(`/?variants=1&v=${variant}`);
    await expect(page.locator(`.search-page.v-${variant}`)).toBeVisible();
    await page.getByRole('link', { name: 'Подбор', exact: true }).click();
    await expect(page.locator(`.search-page.v-${variant}.is-app`)).toBeVisible();
    expect(errors).toEqual([]);
  });
}
