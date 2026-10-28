export type Example = {
  id: string;
  title: string;
  what: string;
  method: "GET" | "POST";
  path: string;
  body?: unknown;
};

export const MCP_TOOLS = [
  {
    name: "search_hotels",
    what: "Запрос словами → отели с вероятностью каждого пожелания и тем, какой номер просить",
  },
  {
    name: "get_hotel_knowledge",
    what: "Всё, что известно об отеле: факты по сторонам и этажам, неизвестное, окрестности",
  },
  {
    name: "explain_fact",
    what: "Почему мы так думаем: метод, источники, доказательство, история и уверенность",
  },
  { name: "compare_hotels", what: "Сравнение 2–3 отелей по выбранным пожеланиям" },
  { name: "list_characteristics", what: "Реестр характеристик: что система умеет проверять" },
] as const;

export const EXAMPLES: Example[] = [
  {
    id: "intent",
    title: "Понять запрос",
    what: "Текст гостя → пожелания из реестра и параметры поездки",
    method: "POST",
    path: "/intents",
    body: { text: "Тихий номер с закатом над морем, 12–15 ноября, вдвоём, до 12 тысяч" },
  },
  {
    id: "search",
    title: "Подобрать номер",
    what: "Ранжирование по фактам: балл, риск разочарования, какую сторону и этаж просить",
    method: "POST",
    path: "/searches",
    body: { text: "Тихий номер с закатом над морем, 12–15 ноября, вдвоём" },
  },
  {
    id: "characteristics",
    title: "Реестр характеристик",
    what: "Каждая характеристика — данные: метод, срок годности, вопрос отелю",
    method: "GET",
    path: "/characteristics",
  },
  {
    id: "moods",
    title: "Подборки",
    what: "Сколько отелей подходит под настроение в выбранный месяц",
    method: "GET",
    path: "/moods?month=11",
  },
];

export function curl(origin: string, example: Example): string {
  const url = `${origin}/api/v1${example.path}`;
  if (example.method === "GET") return `curl '${url}'`;
  return [
    `curl -X POST '${url}' \\`,
    `  -H 'Content-Type: application/json' \\`,
    `  -d '${JSON.stringify(example.body)}'`,
  ].join("\n");
}

export function mcpConfig(origin: string): string {
  return JSON.stringify({ mcpServers: { okno: { url: `${origin}/mcp` } } }, null, 2);
}

export function preview(value: unknown, limit = 2400): string {
  const text = JSON.stringify(value, null, 2);
  return text.length > limit ? `${text.slice(0, limit)}\n…` : text;
}
