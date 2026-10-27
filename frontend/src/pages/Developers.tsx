'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Footer, Header } from '../components/chrome';

const MSGS = [
  ['user', 'Найди в Сочи номер с закатом над морем на 10–15 ноября, чтобы ночью было тихо'],
  ['tool', '→ okno.search_rooms(text: «закат над морем, тихо ночью», 10–15.11)'],
  ['tool', '← 8 отелей · лучший «Маяк» 85% · 3 факта с доказательствами'],
  ['bot', 'Подойдёт «Маяк», Делюкс на ЮЗ-стороне не ниже 4-го этажа: закат над морем в 16:53–16:58. Учтите: с этой стороны в 60 м ж/д, поэтому высокий этаж важен. Если тишина важнее заката — «Кипарис», но заката из окон там нет.'],
] as const;

export default function DevelopersPage() {
  const [n, setN] = useState(0);
  const [run, setRun] = useState(0);
  useEffect(() => {
    setN(0);
    const ts = MSGS.map((_, i) => window.setTimeout(() => setN(i + 1), 500 + i * 900));
    return () => ts.forEach(clearTimeout);
  }, [run]);
  return (
    <div className="canvas-page">
      <Header />
      <main className="dev">
        <section className="dev-hero">
          <div>
            <h1>Знания об отелях как строительный блок</h1>
            <p>Тот же слой фактов, что видят гости, — для поиска, ранжирования, голосового бота и любых AI-агентов.</p>
            <ul>
              <li>Факты на уровне фасада, этажа и дат — с источником и уверенностью</li>
              <li>Поиск по желанию своими словами с объяснением «да / нет / частично»</li>
              <li>MCP-сервер: подключается к Claude, ChatGPT и локальным моделям</li>
              <li>Работает без LLM-ключа: факты считаются заранее</li>
            </ul>
          </div>
          <div className="chat dark" aria-live="polite">
            <div className="who">Внешний AI-ассистент · подключён MCP «О!кно»</div>
            <AnimatePresence>
              {MSGS.slice(0, n).map(([k, t], i) => (
                <motion.div key={`${run}-${i}`} className={`m ${k}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                  {t}{k === 'bot' && <span className="src">Источник: О!кно · расчёт по рельефу и зданиям OSM · ответ отеля от 12.10 · уверенность 0,82</span>}
                </motion.div>
              ))}
            </AnimatePresence>
            {n === MSGS.length && <button className="replay" onClick={() => setRun((r) => r + 1)}>↻ повторить</button>}
          </div>
        </section>
        <section className="sec">
          <div className="sec-h"><h2>Пример ответа</h2><p>Каждый факт несёт доказательство — его можно показать пользователю как есть</p></div>
          <div className="cols2">
            <pre>{`# факты отеля по одной характеристике
GET /v1/hotels/mayak/facts?characteristic=sunset_over_sea

# поиск по желанию
POST /v1/search
{
  "text": "тихо, закат над морем, без подъёма",
  "trip": { "from": "2026-11-10", "to": "2026-11-15" }
}`}</pre>
            <pre>{`{
  "statement": "Море видно из окон ЮЗ-фасада с 4-го этажа",
  "scope": { "facades": ["SW"], "floorFrom": 4,
             "months": [10, 11, 12, 1, 2, 3] },
  "confidence": 0.82,
  "source": "computed",
  "method": "horizon + sun_at, Monte Carlo n=100",
  "observedAt": "2026-10-12",
  "evidence": [{ "kind": "horizon_panorama",
                 "attribution": "© OSM, Copernicus DEM" }],
  "caveats": ["деревья не учитываются"]
}`}</pre>
          </div>
        </section>
        <section className="sec">
          <div className="sec-h"><h2>Методы</h2></div>
          <div className="cols2">
            <div className="ep">
              {[['POST', '/v1/search', 'Желание текстом → отели с вердиктами по каждому пункту'], ['GET', '/v1/hotels/{id}/facts', 'Все факты отеля с доказательствами'], ['POST', '/v1/characteristics', 'Новая характеристика по описанию: рецепт и пробный прогон'], ['POST', '/v1/hotels/{id}/questions', 'Вопрос отелю: агент сформулирует и разберёт ответ'], ['GET', '/v1/changes', 'Лента изменений: что пересчитано и почему']].map(([m, p, d]) => <div key={p}><span className="m">{m}</span><code>{p}</code><p>{d}</p></div>)}
            </div>
            <pre>{`# подключение MCP к агенту
{
  "mcpServers": {
    "okno": { "url": "http://localhost:8080/mcp" }
  }
}

# инструменты
search_rooms · get_facts · explain_fact
compare_hotels · ask_hotelier`}</pre>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
