# Запись презентации О!кно

Локальная студия записи и монтажа. Не входит в Docker приложения.
Исходные видео, снимки и экспорт хранятся в `.private/video-production/`, вне git.

`capture-lib.mjs` пишет Chromium через Playwright Screencast в 1440×810, 60 fps.
Прокрутка идёт через `requestAnimationFrame` с плавным разгоном и торможением;
курсор движется по дуге, перед кликом есть пауза и видимый импульс. Каждый
сюжет записывается отдельно, вместе с координатами акцентов и диагностикой API.
Отсутствующая цель или акцент за границами кадра останавливают запись.

```sh
cd tools/demo-video
npm ci
npx playwright install chromium
```

Приёмы подачи: сглаженный курсор и приближения, как в
[Screen Studio](https://screen.studio/guide/cursor), аннотации и отдельные
сцены, как в [Recordly](https://github.com/DougNix/recordly).
Монтаж строится в [Remotion](https://www.remotion.dev/docs/).
Скилл `remotion-best-practices` уже установлен; установка чужого рекордера не нужна.
