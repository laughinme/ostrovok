# R9 · LLM-провайдеры для О!кна

**Проверено 28.10.2026.** Цены ниже — обычный синхронный текстовый inference, без Batch/Flex, если не сказано иначе.
Каждая ценовая строка содержит источник и дату просмотра; «не проверено» означает отсутствие достаточного подтверждения.
Исследование документальное: платные запросы, оплату и запуск с российского IP не выполняли; доступность конкретной сети жюри не измерена.
Видимость ID через `/models` не доказывает право на inference, наличие баланса или поддержку нужного API.

## 1. OpenAI: ровно запрошенные ID

USD за **1 млн** токенов. Контекст — общий размер окна, а не гарантированный предел входа.
В effort перечислены реальные значения, включая `max`, которого нет в исходном перечне вопроса.
Для моделей без reasoning параметр следует опускать: `none` не означает, что он поддерживается.

| Model ID | Вход / кэш / выход, $/1M | Контекст | Reasoning | Допустимый effort; default | Источник; просмотр |
|---|---:|---:|---|---|---|
| `gpt-5.4-nano` | 0.20 / 0.020 / 1.25 | 400 000 | Да | none, low, medium, high, xhigh; **none** | [карточка](https://developers.openai.com/api/docs/models/gpt-5.4-nano); 28.10.2026 |
| `gpt-5.4-mini` | 0.75 / 0.075 / 4.50 | 400 000 | Да | none, low, medium, high, xhigh; **none** | [карточка](https://developers.openai.com/api/docs/models/gpt-5.4-mini); 28.10.2026 |
| `gpt-5.4` | 2.50 / 0.25 / 15.00 | 1 050 000 | Да | none, low, medium, high, xhigh; **none** | [карточка](https://developers.openai.com/api/docs/models/gpt-5.4); 28.10.2026 |
| `gpt-5.5` | 5.00 / 0.50 / 30.00 | 1 050 000 | Да | none, low, medium, high, xhigh; **medium** | [карточка](https://developers.openai.com/api/docs/models/gpt-5.5); 28.10.2026 |
| `gpt-5-mini` | 0.25 / 0.025 / 2.00 | 400 000 | Да | minimal, low, medium, high; **medium**¹ | [карточка](https://developers.openai.com/api/docs/models/gpt-5-mini); 28.10.2026 |
| `gpt-5-nano` | 0.05 / 0.005 / 0.40 | 400 000 | Да | minimal, low, medium, high; **medium**¹ | [карточка](https://developers.openai.com/api/docs/models/gpt-5-nano); 28.10.2026 |
| `gpt-4.1-mini` | 0.40 / 0.10 / 1.60 | 1 047 576 | Нет | Не применяется | [карточка](https://developers.openai.com/api/docs/models/gpt-4.1-mini); 28.10.2026 |
| `gpt-4.1-nano` | 0.10 / 0.025 / 0.40 | 1 047 576 | Нет | Не применяется | [карточка](https://developers.openai.com/api/docs/models/gpt-4.1-nano); 28.10.2026 |
| `gpt-4o-mini` | 0.15 / 0.075 / 0.60 | 128 000 | Нет | Не применяется | [карточка](https://developers.openai.com/api/docs/models/gpt-4o-mini); 28.10.2026 |
| `gpt-5.6-luna` | 0.20 / 0.020 / 1.20 | 1 050 000 | Да | none, low, medium, high, xhigh, max; **medium** | [карточка](https://developers.openai.com/api/docs/models/gpt-5.6-luna); 28.10.2026 |
| `gpt-5.6-sol` | 4.00 / 0.40 / 20.00 | 1 050 000 | Да | none, low, medium, high, xhigh, max; **medium** | [карточка](https://developers.openai.com/api/docs/models/gpt-5.6-sol); 28.10.2026 |
| `gpt-5.6-terra` | 2.00 / 0.20 / 12.00 | 1 050 000 | Да | none, low, medium, high, xhigh, max; **medium** | [карточка](https://developers.openai.com/api/docs/models/gpt-5.6-terra); 28.10.2026 |
| `gpt-6-astra` | 10.00 / 1.00 / 50.00 | 1 050 000 | Да | low, medium, high, xhigh, max; default **не проверено** | [карточка](https://developers.openai.com/api/docs/models/gpt-6-astra); 28.10.2026 |
| `gpt-6-luna` | 0.10 / 0.010 / 0.50 | 1 050 000 | Да | none, low, medium, high, xhigh, max; **medium** | [карточка](https://developers.openai.com/api/docs/models/gpt-6-luna); 28.10.2026 |
| `gpt-6-sol` | 2.00 / 0.20 / 10.00 | 1 050 000 | Да | none, low, medium, high, xhigh, max; **medium** | [карточка](https://developers.openai.com/api/docs/models/gpt-6-sol); 28.10.2026 |
| `gpt-6.1-sol` | 2.00 / 0.10 / 10.00 | 1 050 000 | Да | low, medium, high, xhigh, max; **medium** | [карточка](https://developers.openai.com/api/docs/models/gpt-6.1-sol); 28.10.2026 |
| `gpt-6.1-terra` | 1.00 / 0.050 / 5.00 | 1 050 000 | Да | none, low, medium, high, xhigh, max; **medium** | [карточка](https://developers.openai.com/api/docs/models/gpt-6.1-terra); 28.10.2026 |

¹ Effort семейства GPT-5 и default подтверждены [руководством GPT-5](https://developers.openai.com/api/docs/guides/gpt-5).
У Astra карточка перечисляет effort без default; переносить default других моделей на неё нельзя.
Все перечисленные ID имеют официальные карточки; считать 5.6/6/6.1 вымышленными основания нет.
Карточка `gpt-4.1-nano` помечена **Shut down**: приведён опубликованный тариф, доступность inference по вашему ключу **не проверено**.
Карточки `gpt-5-mini`, `gpt-5-nano`, `gpt-5.4-nano`, `gpt-4.1-mini`, `gpt-4o-mini` помечены Deprecated; наличие цены не обещает дальнейшую доступность.

### Совместимость с нашим Chat Completions

| Семейство | Функции / schema | Последствие для `OpenAIChatModel` |
|---|---|---|
| 4.1, 4o-mini, 5, 5.4, 5.5, 5.6 | Карточки заявляют function calling и structured outputs | Подходят по протоколу; учитывать жизненный цикл и настройки конкретной модели |
| `gpt-6-luna`, `gpt-6-sol` | Функции в Chat Completions **только при `reasoning_effort=none`** | Явно задать none; default medium для нашего tool-loop не подходит |
| `gpt-6-astra`, `gpt-6.1-sol`, `gpt-6.1-terra` | Chat Completions есть, **tool calling требует Responses** | Не выбирать для текущего tool-loop без смены модели клиента/API |

Источник ограничения: [официальное руководство GPT-6](https://developers.openai.com/api/docs/guides/latest-model).
Это касается и структурированного результата, если фреймворк получает его через output tool.
В PydanticAI `ToolOutput` и `NativeOutput` — разные режимы: второй использует native JSON schema и имеет ограничения совместного использования с инструментами.
Подключение произвольного адреса поддерживает `OpenAIProvider(base_url=..., api_key=...)`; документация PydanticAI 2.0.0 сверена через Context7:
[OpenAI](https://github.com/pydantic/pydantic-ai/blob/v2.0.0/docs/models/openai.md), [output](https://github.com/pydantic/pydantic-ai/blob/v2.0.0/docs/output.md).

**Дешёвый/быстрый уровень — Luna**, Terra — промежуточный (примерно прежний mini в 5.6), Sol — старший, Astra — максимальная capability.
В выбранном наборе нет `gpt-6.1-luna`: дешёвый вариант актуального каталога — `gpt-6-luna`, а не автоматически `6.1-terra`.
Это позиционирование производителя, не наши замеры задержки: [карточки выше](https://developers.openai.com/api/docs/models/gpt-6-luna).

Кэш: одинаковый system prompt должен стоять неизменным префиксом; попадание в кэш не гарантировано.
У 5.6/6/6.1 есть отдельная оплата cache writes: обычно **1.25× uncached input**, поэтому cold fill нельзя считать cache hit;
у 6.1 Terra тариф зависит и от TTL. Для больших запросов >272k действуют повышенные ставки, для наших 3–5k это несущественно.
Тариф Sol 5.6 промо гарантирован минимум до 21.11.2026. Источники и дата цен — соответствующие карточки таблицы (28.10.2026).

## 2. OpenAI из России

**Россия отсутствует в списке поддерживаемых стран API.** OpenAI предупреждает о возможной блокировке/приостановке аккаунта за доступ из неподдерживаемых стран:
[официальный список](https://help.openai.com/en/articles/5347006-openai-api-supported-countries-and-territories).
Региональный отказ `unsupported_country_region_territory` соответствует этому ограничению; конкретный HTTP-ответ с российского IP в этой работе **не проверено**.
Работа сайта, ChatGPT-подписка, действующий иностранный ключ и успешный `/models` не гарантируют вызов модели из РФ.
**Прямой OpenAI не подходит как единственный LLM для жюри без VPN.**

## 3. Gemini Developer API / AI Studio и Google Cloud

OpenAI base URL: **`https://generativelanguage.googleapis.com/v1beta/openai/`**; Chat Completions — суффикс `chat/completions`,
авторизация `Authorization: Bearer <GEMINI_API_KEY>`. Через этот слой документированы **function calling и schema output**
(пример `chat.completions.parse` с Pydantic-моделью формирует `response_format`): [официальная совместимость](https://ai.google.dev/gemini-api/docs/openai).
Это не обещание полной совместимости со всеми keyword JSON Schema или сочетаниями tools + schema: наш 8-шаговый loop **не проверено**.

Последние варианты каждого уровня не обязаны иметь одинаковый номер поколения. Найдены Flash-Lite 3.5, Flash 3.8 и Pro 3.1 Preview;
новый флагман уже называется **Gemini 4 Argon**, а не Pro. USD за 1M текстовых токенов, Standard:

| Model ID | Вход / кэш / выход, $/1M | Free tier | Источник; просмотр |
|---|---:|---|---|
| `gemini-3.5-flash-lite` | 0.30 / 0.030 / 2.50 | Да, ограниченная квота | [прайс](https://ai.google.dev/gemini-api/docs/pricing#gemini-3.5-flash-lite); 28.10.2026 |
| `gemini-3.8-flash` | 0.75 / 0.075 / 3.75 до 31.12.2026; затем 1.50 / 0.15 / 7.50 | Да, ограниченная квота | [прайс](https://ai.google.dev/gemini-api/docs/pricing#gemini-3.8-flash); 28.10.2026 |
| `gemini-3.1-pro-preview` | 2.00 / 0.20 / 12.00 при входе ≤200k; выше 4.00 / 0.40 / 18.00 | Нет | [прайс](https://ai.google.dev/gemini-api/docs/pricing#gemini-3.1-pro-preview); 28.10.2026 |
| `gemini-4-argon` | 2.00 / 0.10 / 10.00 до 30.11.2026; затем 4.00 / 0.20 / 20.00 | Нет | [прайс](https://ai.google.dev/gemini-api/docs/pricing#gemini-4-argon); 28.10.2026 |
| `gemini-2.5-flash-lite` (старый бюджетный baseline) | 0.10 / 0.010 / 0.40 | Да, ограниченная квота | [прайс](https://ai.google.dev/gemini-api/docs/pricing#gemini-2.5-flash-lite); 28.10.2026 |

Выход включает thinking tokens. Free tier не равен гарантированной пропускной способности: текущие RPM/TPM/RPD зависят от модели/проекта,
их нужно смотреть в AI Studio; точные квоты нашего аккаунта **не проверено**. В free tier данные могут использоваться для улучшения продуктов.
Таблица не включает хранение explicit cache: оно оплачивается отдельно; Argon поддерживает только implicit cache. [Источник](https://ai.google.dev/gemini-api/docs/pricing).

**Из России без VPN: не считать рабочим вариантом.** РФ отсутствует в [списке регионов Gemini API и AI Studio](https://ai.google.dev/gemini-api/docs/available-regions).
Google применяет региональные ограничения по местоположению выполнения запроса; платный аккаунт не отменяет их.

**Стартовый Google Cloud credit $300 / 90 дней** — не баланс ключа AI Studio.
С марта 2026 welcome/free-trial credit **не оплачивает Developer API / AI Studio**; ранее выданным eligible кредитам разрешён остаток до истечения срока.
Paid Developer API требует отдельного billing/prepay, минимальное пополнение $5.
Источник сумм и условий: [Gemini billing](https://ai.google.dev/gemini-api/docs/billing), просмотр **28.10.2026**.
Для облачного пути Vertex AI / текущей Gemini platform Google прямо разрешает eligible trial credit на model queries:
[Google Cloud](https://cloud.google.com/products/gemini-enterprise-agent-platform), [условия trial](https://docs.cloud.google.com/free/docs/free-cloud-features), просмотр **28.10.2026**.
Нужны Cloud project, Cloud Billing, API и права доступа; это отдельная настройка endpoint/auth, не перенос ключа AI Studio.
Доступность конкретной модели и Cloud billing для российского клиента **не проверено**; trial не решает региональную проблему жюри.

## 4. OpenRouter

Base URL **`https://openrouter.ai/api/v1`**, `Authorization: Bearer <key>`.
Платформа передаёт `tools`, `tool_choice`, `response_format` и `json_schema` поддерживающим endpoint'ам:
[tool calling](https://openrouter.ai/docs/guides/features/tool-calling), [structured outputs](https://openrouter.ai/docs/guides/features/structured-outputs).
Поддержка определяется **моделью и конкретным upstream endpoint**, не названием семейства. У перечисленных ниже OpenAI/Gemini/Qwen/DeepSeek
публичный каталог содержит `tools`, `tool_choice`, `response_format`, `structured_outputs`. Это декларация возможностей, не результат нашего eval.
Для schema-запросов задавать `provider.require_parameters=true`, фиксировать проверенный маршрут: автоматический fallback может сменить реализацию strict.

Публичный [Models API](https://openrouter.ai/api/v1/models) прочитан без ключа; цены пересчитаны из $/token в $/1M.
Цена каталога может соответствовать самому дешёвому endpoint и не обязательно доступна после фильтрации по tools/schema.

| ID | Вход / кэш / выход, $/1M | Применение | Источник; просмотр |
|---|---:|---|---|
| `openai/gpt-5.4-mini` | 0.75 / 0.075 / 4.50 | Контроль качества tools и русских инструкций | [каталог API](https://openrouter.ai/api/v1/models), [карточка](https://openrouter.ai/openai/gpt-5.4-mini); 28.10.2026 |
| `openai/gpt-6-luna` | 0.10 / 0.010 / 0.50 | Дешёвый кандидат; учитывать ограничение Chat Completions из §1 | [каталог API](https://openrouter.ai/api/v1/models), [карточка](https://openrouter.ai/openai/gpt-6-luna); 28.10.2026 |
| `google/gemini-3.8-flash` | 0.825 / 0.0825 / 4.125 | Актуальный Flash; текущий маршрут дороже прямого промо Google | [каталог API](https://openrouter.ai/api/v1/models), [карточка](https://openrouter.ai/google/gemini-3.8-flash); 28.10.2026 |
| `google/gemini-3.5-flash-lite` | 0.30 / 0.030 / 2.50 | Обработка простых запросов | [каталог API](https://openrouter.ai/api/v1/models); 28.10.2026 |
| `google/gemini-2.5-flash-lite` | 0.10 / 0.010 / 0.40 | Старый дешёвый baseline | [каталог API](https://openrouter.ai/api/v1/models); 28.10.2026 |
| `qwen/qwen3-235b-a22b-2507` | 0.09 / не указан / 0.55 | Сильный бюджетный instruct-кандидат | [каталог API](https://openrouter.ai/api/v1/models), [карточка](https://openrouter.ai/qwen/qwen3-235b-a22b-2507); 28.10.2026 |
| `qwen/qwen3-30b-a3b-instruct-2507` | 0.10 / 0.10 / 0.30 | Быстрый instruct-кандидат, проверить сложные цепочки | [каталог API](https://openrouter.ai/api/v1/models); 28.10.2026 |
| `qwen/qwen3.8-flash` | 0.15 / 0.016 / 0.47 | Более новый дешёвый вариант | [каталог API](https://openrouter.ai/api/v1/models); 28.10.2026 |
| `deepseek/deepseek-v3.2` | 0.28 / 0.028 / 0.42 | Недорогой V3.x, проверить маршрут и reasoning | [каталог API](https://openrouter.ai/api/v1/models), [карточка](https://openrouter.ai/deepseek/deepseek-v3.2); 28.10.2026 |

**Наценка:** на Standard комиссия при покупке кредитов **5.5%, минимум $0.80** для некриптовалютных платежей,
**5%** для crypto; на отдельный inference-запрос платформенная комиссия не добавляется.
Business — **8%**. Источники: [обновление комиссии](https://openrouter.ai/blog/simplifying-our-platform-fee/),
[тарифы](https://openrouter.ai/pricing), просмотр **28.10.2026**. Реальная цена выбранного upstream всё равно может отличаться от прямого API.

**Россия / оплата:** официальный FAQ перечисляет международные карты, AliPay и USDC; российские карты, «Мир» и СБП не заявлены.
Наличие USDC не гарантирует разрешение платежа для российского аккаунта: [официальный FAQ](https://openrouter.ai/docs/faq).
Есть опубликованные свидетельства отказов по географии аккаунта и платежей с мая 2026; универсальность блокировки для всех российских IP **не проверено**.
Свидетельство с воспроизведённым письмом: [Skillbox, 12.05.2026](https://skillbox.ru/media/code/polzovateli-pozhalovalis-na-blokirovku-platezhey-v-openrouter-dlya-akkauntov-iz-rossii/).
Это сообщение об инциденте, а не официальный список поддерживаемых стран. Точный текущий охват ограничений OpenRouter публично не подтверждён.
**Для жюри без VPN OpenRouter не выбирать как единственный канал**, даже если у разработчика сейчас работает.

Отдельному inference-ключу можно назначить spend cap, workspace/guardrail budget и allowlist моделей; исчерпание блокирует запросы:
[spend controls](https://openrouter.ai/docs/guides/best-practices/spend-controls), [shared agent keys](https://openrouter.ai/docs/guides/best-practices/capping-shared-agent-keys).
Management/master key жюри не передавать; auto top-up отключить. Точность остановки при параллельных незавершённых запросах **не проверено**.

## 5. Российские провайдеры

Под «из РФ» здесь понимается сервис, рассчитанный на российского клиента, с российским биллингом; конкретный сетевой маршрут жюри **не проверено**.
Размещение open-weight модели в РФ не наследует географическую блокировку API её автора.

### 5.1. Yandex AI Studio / Foundation Models

Актуальный OpenAI base URL: **`https://ai.api.cloud.yandex.net/v1`**, полный метод — `/chat/completions`.
Не путать с нативным `https://llm.api.cloud.yandex.net/foundationModels/v1/completion` с другим телом запроса.
REST: **`Authorization: Api-Key <secret>`**, для IAM — `Authorization: Bearer <IAM-token>`;
в OpenAI-примерах также указан **`OpenAI-Project: <folder_id>`** (`project=` в SDK).
Официальный пример OpenAI SDK принимает ключ через `api_key`; при ручной настройке HTTP следовать документированным заголовкам.
Источники: [аутентификация](https://aistudio.yandex.ru/ru/docs/ai-studio/api-ref/authentication),
[Chat Completions](https://aistudio.yandex.ru/ru/docs/ai-studio/operations/generation/completions-structured).

Модель задаётся URI **`gpt://<folder_id>/<model>[/<branch>]`**. Явные актуальные варианты:

| Модель | Часть URI после folder | Примечание к выбору |
|---|---|---|
| YandexGPT Pro 5.1 / Pro 5 | `yandexgpt-5.1` / `yandexgpt-5-pro` | 32k; для нового подключения явный URI предпочтительнее `yandexgpt/latest` и `/rc` |
| YandexGPT Lite 5 | `yandexgpt-5-lite` | 32k; объявлено отключение 15.11.2026 |
| Qwen3 235B | `qwen3-235b-a22b-fp8/latest` | Есть в официальном IDE-примере и прайсе; наличие в текущем базовом каталоге **не проверено** |
| Qwen3.6 35B | `qwen3.6-35b-a3b` | 256k; актуальная альтернатива для скорости |
| gpt-oss 20B / 120B | `gpt-oss-20b` / `gpt-oss-120b` | 128k; объявлена доступность только до 30.10.2026 — плохой выбор для жюри |
| DeepSeek V4 / V4.1 Flash | `deepseek-v4-flash` / `deepseek-v4.1-flash` | 1M; V4 отключают 15.11.2026, выбирать V4.1 |
| Alice AI LLM / Flash | `aliceai-llm` / `aliceai-llm-flash` | 128k / 64k; Flash позиционируется для агентных сценариев |

Источники URI и жизненного цикла: [каталог](https://aistudio.yandex.ru/ru/docs//ai-studio/concepts/generation/models),
[официальная инструкция IDE](https://yandex.cloud/en/docs/tutorials/ml-ai/ai-model-ide-integration),
[позиционирование моделей](https://aistudio.yandex.ru/ru/docs/ai-studio/concepts/generation/).

**Tools и schema есть в Completions API:** официальный пример возвращает несколько `tool_calls`, затем принимает их результаты;
schema-пример использует `response_format={type: json_schema, json_schema: ...}` с YandexGPT 5.1.
Но руководство tool calling явно перечисляет только `tool_choice=auto/none`; `required` и принудительный named tool **не проверено**.
Нельзя автоматически обещать одинаковую поддержку strict/schema/tools для каждой модели из прайса.
Источники: [functions](https://aistudio.yandex.ru/en/docs/ai-studio/operations/generation/completions-function),
[JSON schema](https://aistudio.yandex.ru/ru/docs/ai-studio/operations/generation/completions-structured).

Синхронные цены с НДС; формат ячеек — **вход / кэш / выход**, рубли:

| Модель | ₽/1k | ₽/1M (пересчёт ×1000) | Источник; просмотр |
|---|---:|---:|---|
| YandexGPT Pro 5.1 | 0.8 / 0.8 / 0.8 | 800 / 800 / 800 | [прайс](https://aistudio.yandex.ru/ru/docs/ai-studio/pricing); 28.10.2026 |
| YandexGPT Pro 5 | 1.2 / 1.2 / 1.2 | 1200 / 1200 / 1200 | [прайс](https://aistudio.yandex.ru/ru/docs/ai-studio/pricing); 28.10.2026 |
| YandexGPT Lite | 0.2 / 0.2 / 0.2 | 200 / 200 / 200 | [прайс](https://aistudio.yandex.ru/ru/docs/ai-studio/pricing); 28.10.2026 |
| Qwen3 235B | 0.5 / 0.5 / 0.5 | 500 / 500 / 500 | [прайс](https://aistudio.yandex.ru/ru/docs/ai-studio/pricing); 28.10.2026 |
| Qwen3.6 35B | 0.2 / 0.05 / 0.3 | 200 / 50 / 300 | [прайс](https://aistudio.yandex.ru/ru/docs/ai-studio/pricing); 28.10.2026 |
| gpt-oss-20b / 120b | 0.1 / 0.1 / 0.1; 0.3 / 0.3 / 0.3 | 100 / 100 / 100; 300 / 300 / 300 | [прайс](https://aistudio.yandex.ru/ru/docs/ai-studio/pricing); 28.10.2026 |
| DeepSeek V4.1 Flash (V4 Flash — та же ставка) | 0.3 / 0.075 / 0.5 | 300 / 75 / 500 | [прайс](https://aistudio.yandex.ru/ru/docs/ai-studio/pricing); 28.10.2026 |
| Alice AI LLM Flash | 0.1 / 0.025 / 0.2 | 100 / 25 / 200 | [прайс](https://aistudio.yandex.ru/ru/docs/ai-studio/pricing); 28.10.2026 |

Для собственных функций нет отдельной ставки «токены инструментов»: переданные результаты считаются обычным входом.
Отдельная колонка tool tokens прайса относится к встроенным инструментам AI Studio. Кэш автоматический, но не гарантированный.

Ключ: создать Cloud billing account и каталог → отдельный service account → роль **`ai.languageModels.user`** на каталог → API key с TTL.
В инструкции Completions требуется scope **`yc.ai.foundationModels.execute`**, а новая общая инструкция выпуска ключа перечисляет
**`yc.ai.languageModels.execute`** для Model Gallery. Это расхождение документации: использовать ключ, выпущенный из AI Studio,
и проверить права на нужном endpoint; не считать оба имени взаимозаменяемыми без проверки.
Источники: [Completions scope](https://aistudio.yandex.ru/ru/docs/ai-studio/operations/generation/completions-structured),
[выпуск ключа и scopes](https://aistudio.yandex.ru/en/docs/ai-studio/operations/get-api-key).
**Hard spend cap на отдельный API key не подтверждён.** Cloud Billing budget только уведомляет и не останавливает потребление:
[официально](https://yandex.cloud/ru/docs/billing/concepts/budget). Для жёсткого ограничения нужен отдельный контролируемый gateway либо другой провайдер.
