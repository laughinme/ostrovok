import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  MapPin,
  ShieldCheck,
  Sparkles,
  Waves,
} from 'lucide-react'
import { moods } from '../data'
import { useApp } from '../state'
import { tripSearch } from '../search'
import { SearchComposer } from '../components/SearchComposer'
import { Eyebrow, SunMark } from '../components/ui'

export function Home() {
  const navigate = useNavigate(),
    app = useApp()
  const startMood = (query: string) => {
    const next = { ...app.trip, query, destination: 'Большой Сочи' }
    app.setTrip(next)
    navigate('/search' + tripSearch(next))
  }
  return (
    <main className="home-page">
      <section className="hero container">
        <div className="hero-copy">
          <Eyebrow>НЕ ПРОСТО ОТЕЛЬ. ВАШ ОТЕЛЬ.</Eyebrow>
          <h1>
            У каждого свой
            <br />
            идеальный{' '}
            <span className="word-highlight">
              отель.
              <svg viewBox="0 0 300 18" preserveAspectRatio="none" aria-hidden="true">
                <path d="M3 12C70 1 180 0 295 7M22 17C110 8 210 8 277 12" />
              </svg>
            </span>
          </h1>
          <p className="hero-description">
            Вы рассказываете, о чём мечтаете.
            <br />
            Луч находит место, где всё совпадёт.
          </p>
          <SearchComposer />
          <div className="hero-trust">
            <ShieldCheck size={16} />
            <span>Проверяем то, чего нет в обычных фильтрах</span>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-image-wrap">
            <img
              className="hero-image"
              src="/images/day-pool.jpg"
              alt="Солнечная терраса курортного отеля с видом на море"
              fetchPriority="high"
            />
            <div className="hero-image-shade" />
            <span className="photo-label">
              <MapPin size={14} />
              Где-то между «хочу» и «остаюсь»
            </span>
            <div className="hero-photo-caption">
              <span>ОТПУСК, КОТОРЫЙ ЧУВСТВУЕТ ВАС</span>
              <strong>
                Кажется,
                <br />
                это ваше место.
              </strong>
              <Waves size={30} strokeWidth={1.4} />
            </div>
            <span className="image-disclaimer">Фото для вдохновения</span>
          </div>
          <div className="sun-sticker">
            <SunMark />
          </div>
          <div className="hero-match-card">
            <div className="match-card-top">
              <span className="mini-spark">
                <Sparkles size={17} />
              </span>
              <span>Вот почему это ваше</span>
              <strong>
                97<span>%</span>
              </strong>
            </div>
            <div className="match-card-facts">
              <span>
                <Check size={15} />
                Засыпать под тишину
              </span>
              <span>
                <Check size={15} />
                Встречать закат у моря
              </span>
              <span>
                <Check size={15} />
                До пляжа — пара минут
              </span>
            </div>
            <Link to={'/hotel/more-vnutri'} className="match-card-link">
              Посмотреть пример
              <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="hero-margin-note">
            меньше искать,
            <br />
            больше предвкушать{' '}
            <svg viewBox="0 0 90 30" aria-hidden="true">
              <path d="M3 8C30 35 55 0 82 12m-8-8 10 8-11 5" />
            </svg>
          </div>
        </div>
      </section>
      <div className="discovery-strip container">
        <div>
          <span className="green-dot" />6 особенных отелей в демокаталоге
        </div>
        <a href="#inspiration">
          А если пока не знаете, чего хочется
          <ArrowDown size={16} />
        </a>
        <span>
          Начнём с Большого Сочи
          <SunMark />
        </span>
      </div>
      <section id="inspiration" className="inspiration container">
        <div className="section-heading">
          <div>
            <Eyebrow>ПУТЕШЕСТВИЯ НАЧИНАЮТСЯ С ЧУВСТВА</Eyebrow>
            <h2>Как вам хочется отдохнуть?</h2>
          </div>
          <span className="section-note">
            Не место на карте.
            <br />
            Место, где вам хорошо.
          </span>
        </div>
        <div className="mood-grid">
          {moods.map((mood, i) => (
            <button className="mood-card" key={mood.title} onClick={() => startMood(mood.query)}>
              <img src={mood.image} alt="" loading="lazy" />
              <div className="mood-shade" />
              <span className="mood-number">0{i + 1}</span>
              <span className="mood-content">
                <strong>{mood.title}</strong>
                <span>{mood.text}</span>
              </span>
              <span className="mood-arrow">
                <ArrowUpRight size={21} />
              </span>
            </button>
          ))}
        </div>
      </section>
      <section className="promise-section container">
        <div className="promise-heading">
          <SunMark />
          <h2>
            Хороший отдых
            <br />
            начинается с доверия.
          </h2>
          <p>
            Красивый вид — это обещание.
            <br />
            Мы помогаем понять, что за ним стоит.
          </p>
          <Link className="text-link" to="/how">
            Как работает Луч
            <ArrowRight size={18} />
          </Link>
        </div>
        <div className="promise-cards">
          <article>
            <span className="promise-num">01 / ВНИМАНИЕ К ВАМ</span>
            <h3>
              Слышит ваши
              <br />
              «мне важно»
            </h3>
            <p>
              Тишина после полуночи, стол у окна, прогулка до моря без лестниц. Можно не искать
              нужный фильтр.
            </p>
          </article>
          <article>
            <span className="promise-num">02 / ФАКТЫ, А НЕ ДОГАДКИ</span>
            <h3>
              Заглядывает
              <br />
              чуть глубже
            </h3>
            <p>
              Сопоставляет рельеф, дороги и ответы отельера. У каждого вывода — свой источник и
              ограничения.
            </p>
          </article>
          <article>
            <span className="promise-num">03 / ЧЕСТНЫЙ ВЫБОР</span>
            <h3>
              Рассказывает
              <br />и о нюансах
            </h3>
            <p>
              Море видно только с верхних этажей? Рядом вечернее кафе? Вы узнаете об этом до
              поездки.
            </p>
          </article>
        </div>
      </section>
      <section className="hotel-owner-banner container">
        <div>
          <span className="eyebrow">ДЛЯ ТЕХ, КТО СОЗДАЁТ ГОСТЕПРИИМСТВО</span>
          <h2>У вашего отеля есть свои суперсилы.</h2>
          <p>Помогите гостям их увидеть. Ответьте агенту один раз.</p>
        </div>
        <Link to="/partner" className="button lime">
          В кабинет отельера
          <ArrowUpRight size={19} />
        </Link>
      </section>
    </main>
  )
}
