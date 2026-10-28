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
