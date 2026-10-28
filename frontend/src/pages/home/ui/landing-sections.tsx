import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { MOODS } from "../model/catalog";
import { LandingFooter } from "./landing-chrome";
import { Icon, Photo, Mark, SrcTag } from "./landing-ui";

const EX_PROMPTS = [
  "Тихий номер с закатом над морем",
  "Поработать неделю у моря",
  "С собакой и рядом лес",
  "С ребёнком, без подъёмов к пляжу",
];
function Examples({ onPick, light }: { onPick(t: string): void; light?: boolean }) {
  return (
    <div className={`examples${light ? " light" : ""}`}>
      {EX_PROMPTS.map((t) => (
        <button key={t} type="button" onClick={() => onPick(t)}>
          «{t}»
        </button>
      ))}
    </div>
  );
}

function ProofCard() {
  return (
    <motion.figure
      className="proof-photo"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <Photo k="lux-h1a" alt="Номер с видом на закат над морем" credit={false} />
      <span className="pp-tag">
        <Icon name="pin" size={14} />
        Закатный берег · номер 512 · ЮЗ, 5 этаж
      </span>
      <motion.div
        className="pp-card"
        initial={{ opacity: 0, y: 20, rotate: -2 }}
        animate={{ opacity: 1, y: 0, rotate: -2 }}
        transition={{ delay: 0.35, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="pp-h">
          <span>Почему этот номер ваш</span>
          <b className="num">92%</b>
        </div>
        <ul>
          <li>
            <Mark v="yes" />
            Закат над морем в 16:58 <SrcTag kind="computed">расчёт</SrcTag>
          </li>
          <li>
            <Mark v="yes" />
            Ночью ≈ 38 дБ во двор <SrcTag kind="computed">расчёт</SrcTag>
          </li>
          <li>
            <Mark v="partial" />
            Ж/д в 60 м — берём 5 этаж <SrcTag kind="hotelier">отель</SrcTag>
          </li>
        </ul>
        <Link to="/search" search={{ q: "Тихий номер с закатом над морем" }}>
          Найти отель с доказательствами →
        </Link>
      </motion.div>
      <figcaption>Фото для настроения</figcaption>
    </motion.figure>
  );
}

function MoodStrip({ onMood }: { onMood(m: (typeof MOODS)[number]): void }) {
  return (
    <div className="mood-strip">
      {MOODS.map((m) => (
        <button key={m.id} type="button" className="mood" onClick={() => onMood(m)}>
          <Photo k={m.photo} alt="" credit={false} />
          <span className="mood-t">
            <b>{m.title}</b>
            <span className="num">{m.proof}</span>
            <span className="cta">
              Подобрать <Icon name="arrow" size={15} />
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}

function Landing({
  onMood,
  showMoods,
  variantsOn,
  onToggleVariants,
}: {
  onMood(m: (typeof MOODS)[number]): void;
  showMoods: boolean;
  variantsOn: boolean;
  onToggleVariants(): void;
}) {
  return (
    <div className="sheet">
      {showMoods && (
        <section className="sec-l">
          <div className="sec-lh">
            <h2>Начните с настроения</h2>
            <p>Подборки собраны из наших расчётов, а не из рекламы</p>
          </div>
          <div className="moods">
            {MOODS.map((m) => (
              <button key={m.id} type="button" className="mood" onClick={() => onMood(m)}>
                <Photo k={m.photo} alt="" credit={false} />
                <span className="mood-t">
                  <b>{m.title}</b>
                  <span className="num">{m.proof}</span>
                  <span className="cta">
                    Подобрать <Icon name="arrow" size={15} />
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="sec-l">
        <div className="sec-lh">
          <h2>Откуда мы это знаем</h2>
          <p>
            Не из рекламы отеля и не из догадок нейросети. У каждого факта есть источник, дата и
            уверенность.
          </p>
        </div>
        <div className="src3">
          <div className="src">
            <span className="k">
              <Icon name="sun" /> Считаем
            </span>
            <h3>По рельефу и зданиям</h3>
            <p>Для каждого фасада и этажа строим линию горизонта и путь солнца в ваши даты.</p>
            <ul>
              <li>вид на море, горы, закат</li>
              <li>шум по сторонам здания</li>
              <li>подъёмы, ступени и переходы до пляжа</li>
            </ul>
          </div>
          <div className="src">
            <span className="k">
              <Icon name="pin" /> Берём из открытых данных
            </span>
            <h3>Карта и климат</h3>
            <p>OpenStreetMap, Copernicus, Open-Meteo — с атрибуцией и датой выгрузки.</p>
            <ul>
              <li>что работает рядом ночью</li>
              <li>погода и вода по дням поездки</li>
              <li>аптеки, кафе, площадки</li>
            </ul>
          </div>
          <div className="src">
            <span className="k">
              <Icon name="question" /> Спрашиваем отель
            </span>
            <h3>Только то, что не посчитать</h3>
            <p>Три точных вопроса вместо анкеты: те, что важнее всего гостям.</p>
            <ul>
              <li>какие номера на какой стороне</li>
              <li>правила для животных</li>
              <li>шумоизоляция окон</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="sec-l proof">
        <div>
          <h2>Нажмите «почему» у любого факта</h2>
          <p>
            Покажем метод, источники, уверенность и что может пойти не так. Если не знаем — так и
            скажем и спросим отель.
          </p>
          <Link
            className="btn btn-primary"
            to="/search"
            search={{ q: "Тихий номер с закатом над морем" }}
          >
            Подобрать отель с доказательствами
          </Link>
        </div>
        <div className="proof-card">
          <div className="lbl">Почему мы так думаем</div>
          <div className="stmt">Море видно из окон ЮЗ-фасада начиная с 4-го этажа</div>
          <div className="bar">
            <span style={{ width: "82%" }} />
          </div>
          <dl>
            <div>
              <dt>Уверенность</dt>
              <dd>
                <b className="num">82 из 100</b> симуляций с учётом погрешности высот домов
                показывают море
              </dd>
            </div>
            <div>
              <dt>Источники</dt>
              <dd>Copernicus DEM 30 м · здания OSM, сентябрь 2026 · ответ отеля, 12 октября</dd>
            </div>
            <div>
              <dt>Что может пойти не так</dt>
              <dd>Деревья не учитываем; высота дома напротив оценена</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="sec-l tiles4">
        <div className="tile-a">
          <b className="num">214</b>
          <span>
            отелей Большого Сочи
            <br />
            посчитано по этажам
          </span>
        </div>
        <div className="tile-a">
          <b className="num">38</b>
          <span>
            характеристик сверх
            <br />
            карточки отеля
          </span>
        </div>
        <Link className="tile-b" to="/partner">
          <h3>Отельерам</h3>
          <p>
            Отвечайте на 3 вопроса в неделю — остальное посчитаем сами. Гости найдут вас за то, чем
            вы правда хороши.
          </p>
          <span className="goto">
            Открыть кабинет <Icon name="arrow" size={16} />
          </span>
        </Link>
        <a
          className="tile-c"
          href="https://github.com/laughinme/ostrovok/blob/main/frontend/ARCHITECTURE.md"
          target="_blank"
          rel="noreferrer"
        >
          <h3>Разработчикам и AI-агентам</h3>
          <p>Те же факты с доказательствами через API и MCP.</p>
          <code>{"GET /api/v1/hotels/{hotelId}/facts"}</code>
          <span className="goto">
            Документация <Icon name="arrow" size={16} />
          </span>
        </a>
      </section>
      <LandingFooter variantsOn={variantsOn} onToggleVariants={onToggleVariants} />
    </div>
  );
}

export { Examples, ProofCard, MoodStrip, Landing };
