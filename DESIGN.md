---
version: alpha
name: О!кно
description: Предпросмотр номера до поездки с доказательствами — в узнаваемом языке Островка, дружелюбно и честно.
colors:
  ink: "#0B1533"
  surface: "#FFFFFF"
  surface-raised: "#F4F7FF"
  muted: "#5B6580"
  line: "#E1E6F2"
  primary: "#1B4DE4"
  on-primary: "#FFFFFF"
  scene: "#0A1C66"
  scene-raised: "#2450DA"
  scene-top: "#2F62FF"
  scene-mid: "#1438C2"
  scene-line: "#3A63E6"
  on-scene-muted: "#D5DEFF"
  map-land: "#F7F9FF"
  map-sea: "#CFDCFF"
  verified: "#C9F59A"
  on-verified: "#2C4A10"
  yes: "#1E8F4E"
  partial: "#B7860B"
  critical: "#D2463B"
typography:
  display:
    fontFamily: "Onest, system-ui, sans-serif"
    fontSize: 4.125rem
    fontWeight: 800
    lineHeight: 1
    letterSpacing: -0.035em
  heading:
    fontFamily: "Onest, system-ui, sans-serif"
    fontSize: 2.125rem
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -0.02em
  metric:
    fontFamily: "Onest, system-ui, sans-serif"
    fontSize: 1.875rem
    fontWeight: 700
    lineHeight: 1
    letterSpacing: -0.02em
  section:
    fontFamily: "Onest, system-ui, sans-serif"
    fontSize: 1.375rem
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: -0.01em
  lede:
    fontFamily: "Onest, system-ui, sans-serif"
    fontSize: 1.125rem
    fontWeight: 400
    lineHeight: 1.5
  title:
    fontFamily: "Onest, system-ui, sans-serif"
    fontSize: 1.125rem
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Onest, system-ui, sans-serif"
    fontSize: 0.9375rem
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Onest, system-ui, sans-serif"
    fontSize: 0.8125rem
    fontWeight: 500
    lineHeight: 1.3
  code:
    fontFamily: "ui-monospace, Menlo, monospace"
    fontSize: 0.8125rem
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: 10px
  md: 14px
  lg: 22px
  xl: 32px
  pill: 999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
  section: 96px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: 12px 22px
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: 9px 14px
  chip-verified:
    backgroundColor: "{colors.verified}"
    textColor: "{colors.on-verified}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: 7px 12px
  chip-ask:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: 7px 12px
  card:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: 20px
  scene:
    backgroundColor: "{colors.scene}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.xl}"
    padding: 56px
---

# О!кно: дизайн-система

## Overview

Направление **«Островок, переосмысленный»** (выбрано на гейте 1, 27.10.2026). Продукт выглядит как часть
Островка: фирменный насыщенный синий, салатовый и тёмно-синий, жирный гротеск, крупные скругления. Внутри
этого языка — свой визуальный словарь доказательств: панорама «Ваше окно», строки фактов с уверенностью,
салатовая отметка того, что проверено. Ощущение: дружелюбно, понятно, честно. Никогда не реклама и не
«магический AI».

## Colors

- **Ink** (`ink`): основной текст, обводки, активный переключатель ролей.
- **Primary** (`primary`, фирменный синий): единственный сигнал действия на экране — главная кнопка,
  процент совпадения, активный сегмент, ползунок. Одна главная кнопка на экран.
- **Scene** (`scene`, `scene-raised`): тёмно-синие «сцены» — герой лендинга, панорама, крупные
  иллюстративные блоки. Фон сцены — радиальный градиент от `#2F62FF` через `#1438C2` к `scene`.
- **Verified** (`verified`, салатовый): только то, что проверено или выделено как доказательство:
  проверяемые чипы, выделенный факт, акцент в заголовке героя. Не для кнопок и не для декора.
- **Yes / Partial / Critical**: значки ✓ / ⚠ / ✗ в фактах. `critical` — ещё ошибки и разрушительные действия.
- **Surface / surface-raised / line / muted**: белая основа, голубоватые подложки карточек и панелей,
  тонкие линии, вторичный текст.

## Typography

Onest — один шрифт на весь интерфейс (русский гротеск с полной кириллицей, Google Fonts). Моноширинный `code` — только для кода API и вызовов инструментов агентов в консоли. Иерархия только весом и
размером: display 800 для героя, heading 700 для заголовков страниц, title 600 для блоков, body 400.
Цифры в процентах, ценах, времени, этажах — `font-variant-numeric: tabular-nums`. Типографика: «ёлочки»,
`ё`, неразрывный пробел перед единицами (`60 м`, `8 400 ₽`).

## Layout

Десктоп основной (1440 / 1366), телефон 390 — адаптив. Поля 48 px на десктопе, 16 px на телефоне.
Лендинг: сцена-герой со скруглением 32 px и отступом 24 px от краёв окна. Продукт: белая рабочая
поверхность, справа панель шириной 400 px (доказательства, бронь). Плотность продукта средняя: строки
фактов 13 px по вертикали, разделители — тонкие линии.

## Elevation & Depth

Тени не используем. Глубина — тоном: белая поверхность → `surface-raised` → тёмно-синяя сцена. Карточки на
сцене — `scene-raised` с тонкой обводкой светлее фона. Цветные размытые тени и стекло запрещены.

## Shapes

Скругления: 10 (мелкие элементы) / 14 (кнопки, поля) / 22 (карточки, окно панорамы) / 32 (сцены) /
pill (чипы, сегменты, переключатель ролей). Иконки линейные, 1,6 px, без кругов-подложек. Повторяющийся
мотив — линия горизонта панорамы.

## Components

- **Поле желания**: белое, скругление 22, внутри текст запроса и строка чипов под разделителем.
  Состояния: пусто (подсказки), ввод, голос, фото, разбор.
- **Чип намерения**: pill. Проверяемый — салатовый; «спросим у отеля» — голубоватый; непроверяемый —
  пунктирная обводка. Точка слева = важность (заливка — обязательно, кольцо — важно).
- **Подборка-настроение**: карточка на сцене (`scene-raised`), название + подзаголовок-доказательство с числом.
- **Строка факта**: ✓/⚠/✗ · утверждение + область действия · уверенность (точки + слово) · «почему →».
  Выделенная строка — салатовая подложка во всю ширину.
- **Панель «Почему мы так думаем»**: `surface-raised`, полоса уверенности синим, метод, источники с
  датами, «что может пойти не так», история.
- **Ваше окно**: карточка со скруглением 22, сцена-панорама внутри, сегменты фасада, ползунок этажа,
  атрибуция данных внизу.
- **Карточка брони**: `surface-raised` без обводки, запрос отелю в виде pill, цена, главная кнопка.
- Метка **«демо»** на любых синтетических данных: маленький pill с обводкой.

## Motion

- **Character**: уверенно и мягко — элементы приезжают и встают на место, без пружинистых отскоков в данных.
- **Durations**: instant 100ms · quick 180ms · move 320ms · scene 600-900ms
- **Easing**: out `cubic-bezier(0.22, 1, 0.36, 1)` · in-out `cubic-bezier(0.65, 0, 0.35, 1)` · cinematic `cubic-bezier(0.76, 0, 0.24, 1)`
- **Springs**: default 320/24 (панели, перетаскивание чипов) · snappy 520/42 (сегменты, переключатели)
- **Signature moment**: вход → рабочее пространство. Поле желания поднимается из сцены-героя и становится
  холстом намерений, сцена сжимается в полосу, снизу вырастают выдача и карта. Один непрерывный переход
  (shared element), обратимый.
- **Product patterns**: правка чипа перестраивает выдачу (Flip/layout, проценты пересчитываются счётчиком);
  ползунок этажа плавно сдвигает линию горизонта (420 ms out); факт → панель «почему» выезжает справа
  (move); ответ агента или отельера подсвечивает изменившиеся строки салатовым на 1,2 s.
- **Reduced motion**: все переходы мгновенные, состояние меняется сразу; подсветка изменений остаётся
  (без анимации); мигающий курсор отключён.

## Do's and Don'ts

- **Do** держать одну синюю главную кнопку на экран; салатовый — только для «проверено» и выделения.
- **Do** вместо фото отелей показывать наши визуализации: панорамы, фасады, карты.
- **Do** подписывать источники данных у каждой визуализации.
- **Don't** использовать логотип Островка, пока организаторы не подтвердили, что можно.
- **Don't** цветные тени, стекло, градиентный текст, эмодзи-иконки.
- **Don't** выдумывать отзывы, рейтинги и цифры бизнеса; синтетика помечается «демо».
