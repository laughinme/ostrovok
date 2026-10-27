import { test, expect, type Page } from '@playwright/test'

const query = 'Хочу тихий отель с видом на море и закат, недалеко от пляжа'
const search =
  '?' +
  new URLSearchParams({
    q: query,
    d: 'Большой Сочи',
    from: '2026-11-10',
    to: '2026-11-15',
    a: '2',
    c: '0',
  })
const errors = new WeakMap<Page, string[]>()
async function capture(page: Page, path: string) {
  await page.evaluate(async () => {
    ;(document.activeElement as HTMLElement | null)?.blur()
    const images = [...document.images]
    images.forEach((image) => {
      image.loading = 'eager'
    })
    await document.fonts.ready
    await Promise.all(images.map((image) => image.decode().catch(() => {})))
    await Promise.all(
      document
        .getAnimations()
        .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
        .map((animation) => animation.finished.catch(() => {})),
    )
  })
  await page.screenshot({ path, fullPage: true })
}
test.beforeEach(async ({ page }) => {
  errors.set(page, [])
  page.on('pageerror', (error) => errors.get(page)!.push(error.message))
})
test.afterEach(async ({ page }) => {
  expect(errors.get(page)).toEqual([])
})

test('поиск, работа агентов, карта, фильтры и пустая выдача', async ({ page }, info) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('У каждого свой')
  await page.evaluate(() => document.fonts.ready)
  await capture(page, `artifacts/home-${info.project.name}.png`)
  await page.getByLabel('Что сделает вашу поездку особенной?').fill(query)
  await page.getByRole('button', { name: 'Найти мой отель' }).click()
  await expect(page).toHaveURL(/\/search\?/)
  await expect(page.getByRole('heading', { name: 'Хорошие совпадения не случайны.' })).toBeVisible()
  await capture(page, `artifacts/agents-${info.project.name}.png`)
  await page.getByRole('button', { name: 'Перейти к результатам' }).click()
  await expect(page.locator('.hotel-card')).toHaveCount(6)
  await expect(page.locator('.hotel-card h2').first()).toHaveText('Море внутри')
  await page.getByRole('button', { name: 'Слой шума' }).click()
  await expect(page.getByText('Модель, не замер', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'На карте: Тихая гавань, 6 900 ₽' }).click()
  await expect(page.locator('.map-preview strong')).toHaveText('Тихая гавань')
  await page.getByRole('button', { name: 'Тишина ночью' }).click()
  await expect(page.getByRole('button', { name: 'Тишина ночью ×2' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await capture(page, `artifacts/results-${info.project.name}.png`)
  await page.getByRole('button', { name: 'Фильтры', exact: true }).click()
  await page.getByLabel('Бюджет за ночь').fill('4000')
  await page.getByRole('button', { name: 'Показать 0 вариантов' }).click()
  await expect(page.getByRole('heading', { name: 'Чуть больше свободы?' })).toBeVisible()
  await page.getByRole('button', { name: 'Сбросить фильтры' }).click()
  await expect(page.locator('.hotel-card')).toHaveCount(6)
  await page.getByLabel('Сортировка').selectOption('price')
  await expect(page.locator('.hotel-card h2').first()).toHaveText('Ритм')
})

test('параметры поездки попадают в URL и стоимость', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /10 ноя.*15 ноя/ }).click()
  await page.getByLabel('Дата заезда').fill('2026-12-01')
  await page.getByLabel('Дата выезда').fill('2026-12-08')
  await page.getByRole('button', { name: 'Увеличить: дети' }).click()
  await page.getByRole('button', { name: 'Сохранить параметры' }).click()
  await page.getByLabel('Направление', { exact: true }).selectOption('Адлер')
  await page.getByRole('button', { name: 'Найти мой отель' }).click()
  await page.getByRole('button', { name: 'Перейти к результатам' }).click()
  await expect(page.locator('.hotel-card')).toHaveCount(2)
  await expect(page).toHaveURL(/from=2026-12-01&to=2026-12-08&a=2&c=1/)
  await page.getByRole('link', { name: 'Открыть отель Тихая гавань' }).click()
  await expect(page.locator('.booking-trip')).toContainText('3 гостя · 7 ночей')
  await expect(page.locator('.booking-total')).toContainText('48 300 ₽')
})

test('избранное и сравнение сохраняются после перезагрузки', async ({ page }, info) => {
  await page.goto('/results' + search)
  await page.getByRole('button', { name: 'Сохранить Море внутри', exact: true }).click()
  await page.getByRole('button', { name: 'Сравнить: Море внутри', exact: true }).click()
  await page.getByRole('button', { name: 'Сравнить: Тихая гавань', exact: true }).click()
  await page.reload()
  await page.getByRole('link', { name: 'Сравнить отели', exact: true }).first().click()
  await expect(page.locator('.compare-hotel')).toHaveCount(2)
  await page.getByLabel('Приоритет сравнения').selectOption('quiet')
  await expect(
    page.locator('.compare-hotel').filter({ hasText: 'Тихая гавань' }).locator('.winner'),
  ).toBeVisible()
  await page.getByLabel('Только различия').check()
  await capture(page, `artifacts/compare-${info.project.name}.png`)
  await page.getByRole('button', { name: 'Источник: Вид из окна, Море внутри' }).click()
  await expect(page.getByRole('dialog')).toContainText('Модель не учитывает деревья')
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Избранное, 1 отелей' }).click()
  await expect(page.getByRole('dialog')).toContainText('Море внутри')
  await page.getByRole('button', { name: 'Убрать из избранного Море внутри' }).click()
  await expect(page.getByRole('heading', { name: 'Сохраните то самое чувство' })).toBeVisible()
})

test('этаж, сторона, галерея, источники и запрос номера', async ({ page }, info) => {
  await page.goto('/hotel/more-vnutri' + search)
  await page.getByLabel('Этаж номера').fill('2')
  await expect(page.getByText('Вид частично закрыт', { exact: true })).toBeVisible()
  await page.getByLabel('Этаж номера').fill('6')
  await expect(page.getByText('Горизонт открыт', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Во двор', exact: true }).click()
  await expect(page.getByText('Вид в сторону сада', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'К морю', exact: true }).click()
  await capture(page, `artifacts/hotel-${info.project.name}.png`)
  await page.getByRole('button', { name: 'Все фото', exact: true }).click()
  await page.getByRole('button', { name: 'Следующее фото' }).click()
  await expect(page.getByText('2 / 4', { exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await page.getByRole('tab', { name: 'Что мы узнали' }).click()
  await page.locator('.fact-card').first().click()
  await expect(page.getByRole('dialog')).toContainText('OpenStreetMap + DEM')
  await page.keyboard.press('Escape')
  await page.getByRole('tab', { name: 'Что рядом' }).click()
  await expect(page.getByText('Пляж «Тихий берег»')).toBeVisible()
  await page.getByRole('button', { name: 'Попросить этот номер' }).click()
  await expect(page.getByRole('dialog')).toContainText('на 6-м этаже')
  await page.getByRole('button', { name: 'Сохранить демозапрос' }).click()
  await expect(page.getByRole('heading', { name: 'Ваши пожелания сохранены' })).toBeVisible()
  await page.getByRole('button', { name: 'Отлично', exact: true }).click()
  await page.reload()
  await expect(page.locator('.existing-request')).toContainText('сохранён')
})

test('отельер разбирает ответ, подтверждает и обновляет факт гостя', async ({ page }, info) => {
  await page.goto('/partner')
  await page.getByRole('button', { name: 'Ответить Лучу' }).click()
  await page
    .getByRole('textbox', { name: 'Ответ агенту', exact: true })
    .fill('Делюкс на 4–6 этажах выходят на юго-запад')
  await page.getByRole('button', { name: 'Отправить ответ агенту' }).click()
  await expect(page.locator('.extracted-fact')).toContainText('Делюкс · этажи 4–6 · юго-запад')
  await capture(page, `artifacts/partner-${info.project.name}.png`)
  await page.getByRole('button', { name: 'Подтвердить и применить' }).click()
  await page.getByRole('button', { name: 'Характеристики', exact: true }).click()
  await expect(page.getByText('Привязка категорий к фасаду подтверждена вами')).toBeVisible()
  await page.goto('/hotel/more-vnutri' + search)
  await page.getByRole('tab', { name: 'Что мы узнали' }).click()
  const room = page.locator('.fact-card').filter({ hasText: 'Категория номера' })
  await expect(room).toContainText('Подтверждено')
  await expect(room).toContainText('Делюкс · этажи 4–6 · юго-запад')
  await page.reload()
  await expect(page.locator('.recommended-room')).toContainText('Подтверждено')
})

test('непонятный ответ не обновляет факт и некорректные ссылки обрабатываются', async ({
  page,
}) => {
  await page.goto('/partner')
  await page.getByRole('button', { name: 'Диалог с Лучом' }).click()
  await page
    .getByRole('textbox', { name: 'Ответ агенту', exact: true })
    .fill('Спасибо, у нас красиво')
  await page.getByRole('button', { name: 'Отправить ответ агенту' }).click()
  await expect(page.getByText(/Пока не получилось выделить/)).toBeVisible()
  await expect(page.locator('.extracted-fact')).toHaveCount(0)
  await page.goto('/hotel/not-a-hotel')
  await expect(page.getByRole('heading', { name: 'Этот отель пока не найден' })).toBeVisible()
  await page.goto('/not-a-page')
  await expect(page.getByRole('heading', { name: 'Здесь пока тихо' })).toBeVisible()
  await page.goto('/results?q=фиолетовый+ковёр')
  await expect(page.getByText(/Пока не умеем проверить эти пожелания/)).toBeVisible()
  await expect(page.locator('.hotel-card')).toHaveCount(6)
})

test('все страницы помещаются по ширине и фото загружаются локально', async ({ page }) => {
  for (const path of [
    '/',
    '/results' + search,
    '/hotel/more-vnutri' + search,
    '/compare',
    '/partner',
    '/how',
  ]) {
    await page.goto(path)
    await page.evaluate(() => document.fonts.ready)
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
      path,
    ).toBe(true)
    expect(
      await page
        .locator('img')
        .evaluateAll((images) =>
          images.every(
            (img) => img instanceof HTMLImageElement && img.complete && img.naturalWidth > 0,
          ),
        ),
    ).toBe(true)
  }
})
