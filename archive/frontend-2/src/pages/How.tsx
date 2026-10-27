import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Database,
  Map,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react'
import { defaultQuery, tripSearch } from '../search'
import { useApp } from '../state'
import { Eyebrow, SunMark } from '../components/ui'

const sources = [
  {
    title: 'Геоданные',
    icon: Map,
    text: 'Не просто расстояние до моря',
    description:
      'Рельеф, высота зданий, сторона фасада и пешеходный маршрут помогают понять, что видно из окна и как на самом деле дойти до пляжа.',
    example: 'Пример: море видно с юго-западной стороны, с 4-го этажа.',
    status: 'Вычисляем по модели',
  },
  {
    title: 'Открытые источники',
    icon: Database,
    text: 'За красивой картинкой — жизнь района',
    description:
      'Дороги, железнодорожные пути, ночные заведения и инфраструктура помогают оценить окружение. Если сведения расходятся, мы показываем это.',
    example: 'Пример: карта показывает оживлённую улицу, а отель обещает тишину. Нужна проверка.',
    status: 'Сопоставляем и проверяем',
  },
  {
    title: 'Отельер',
    icon: MessageSquare,
    text: 'Иногда лучший источник — человек',
    description:
      'Какие номера выходят на запад, есть ли рабочий стол, можно ли с собакой — эти детали знает отель. Агент задаёт точный вопрос и предлагает сохранить ответ в структурированном виде.',
    example: 'Пример: «Делюкс на 4–6 этажах, юго-западная сторона».',
    status: 'Запрашиваем подтверждение',
  },
]
export function How() {
  const [active, setActive] = useState(0),
    app = useApp(),
    navigate = useNavigate()
  const source = sources[active],
    Icon = source.icon
  const start = () => {
    const trip = { ...app.trip, query: defaultQuery }
    app.setTrip(trip)
    navigate('/search' + tripSearch(trip))
  }
  return (
    <main className="how-page container">
      <section className="how-hero">
        <Eyebrow>ПУСТЬ СЮРПРИЗЫ БУДУТ ПРИЯТНЫМИ</Eyebrow>
        <h1>
          Чуть больше знаний.
          <br />
          Гораздо меньше
          <br />
          <span>«а на фото было иначе».</span>
        </h1>
        <p>
          Луч изучает отель с разных сторон, чтобы ваши
          <br />
          ожидания встретились с реальностью.
        </p>
        <button className="button primary" onClick={start}>
          Посмотреть работу агентов
          <ArrowUpRight size={19} />
        </button>
        <div className="how-sun">
          <SunMark />
        </div>
      </section>
      <section className="how-sources">
        <div className="section-heading">
          <div>
            <Eyebrow>ТРИ ВЗГЛЯДА НА ОДНО МЕСТО</Eyebrow>
            <h2>Не гадаем. Собираем картину.</h2>
          </div>
        </div>
        <div className="source-tabs" role="tablist" aria-label="Источники данных">
          {sources.map((s, i) => (
            <button
              key={s.title}
              id={'source-tab-' + i}
              aria-controls="source-panel"
              role="tab"
              aria-selected={active === i}
              onClick={() => setActive(i)}
              className={active === i ? 'active' : ''}
            >
              <s.icon size={19} />
              <span>0{i + 1}</span>
              {s.title}
              <ArrowRight size={17} />
            </button>
          ))}
        </div>
        <div
          className="source-detail"
          role="tabpanel"
          id="source-panel"
          aria-labelledby={'source-tab-' + active}
        >
          <div className="source-illustration">
            <Icon size={83} strokeWidth={1} />
            <div className="source-illustration-ring" />
            <span>
              <Check size={15} />
              {source.status}
            </span>
          </div>
          <div>
            <span className="soft-label">ИССЛЕДОВАТЕЛЬ 0{active + 1}</span>
            <h3>{source.text}</h3>
            <p>{source.description}</p>
            <blockquote>{source.example}</blockquote>
          </div>
        </div>
      </section>
      <section className="how-trust">
        <div>
          <ShieldCheck size={34} />
          <h2>
            «Пока не знаем» —<br />
            тоже хороший ответ.
          </h2>
        </div>
        <p>
          У каждого факта есть источник, дата и ограничения. Расчёт не выдаётся за измерение, а
          ответ отеля — за независимую проверку. Уверенность в демоверсии иллюстрирует механику
          доверия, а не измеренную точность.
        </p>
      </section>
      <div className="how-demo-banner">
        <span className="green-dot" />
        <p>
          <strong>Здесь всё можно попробовать.</strong> Каталог, агентные шаги, карта и ответы
          отельера симулируются локально. Реальные бронирования и сообщения не отправляются.
        </p>
        <Link to="/partner" className="text-link">
          Стать отельером на минуту
          <ArrowRight size={17} />
        </Link>
      </div>
    </main>
  )
}
