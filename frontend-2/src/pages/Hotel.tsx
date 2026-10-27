import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Coffee,
  Footprints,
  Heart,
  MapPin,
  Moon,
  Plus,
  ShieldCheck,
  Sparkles,
  Star,
  Sunset,
  Trees,
  Waves,
} from 'lucide-react'
import { type Fact } from '../data'
import { useApp } from '../state'
import {
  guestLabel,
  matchScore,
  money,
  nights,
  parseQuery,
  tripDates,
  tripFromSearch,
  tripSearch,
} from '../search'
import { DiscoveryMap } from '../components/DiscoveryMap'
import { EmptyState, EvidenceModal, Eyebrow, Modal, Status } from '../components/ui'

export function HotelPage() {
  const { id } = useParams(),
    app = useApp(),
    location = useLocation()
  const hotel = app.hotels.find((h) => h.id === id)
  const [tab, setTab] = useState('experience'),
    [evidence, setEvidence] = useState<Fact | null>(null)
  const [gallery, setGallery] = useState<number | null>(null),
    [requestOpen, setRequestOpen] = useState(false),
    [requestId, setRequestId] = useState('')
  const [floor, setFloor] = useState(hotel?.floor || 4),
    [side, setSide] = useState('sea'),
    [night, setNight] = useState(true)
  const trip = tripFromSearch(location.search, app.trip)
  const selected = parseQuery(trip.query)
  useEffect(() => {
    setFloor(hotel?.floor || 4)
    setTab('experience')
    setRequestId('')
    setSide('sea')
  }, [id, hotel?.floor])
  useEffect(() => {
    if (gallery === null || !hotel) return
    const key = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setGallery((v) => ((v || 0) + 1) % hotel.gallery.length)
      if (e.key === 'ArrowLeft')
        setGallery((v) => ((v || 0) + hotel.gallery.length - 1) % hotel.gallery.length)
    }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [gallery, hotel])
  if (!hotel)
    return (
      <main className="container">
        <EmptyState
          title="Этот отель пока не найден"
          text="Возможно, ссылка изменилась. В демокаталоге вас ждут другие особенные места."
        >
          <Link className="button primary" to={'/results' + tripSearch(app.trip)}>
            Посмотреть отели
            <ArrowRight size={17} />
          </Link>
        </EmptyState>
      </main>
    )
  const saved = app.favorites.includes(hotel.id),
    compared = app.compare.includes(hotel.id)
  const score = matchScore(hotel, selected)
  const seaVisible = side === 'sea' && floor >= hotel.floor && hotel.scores.sea >= 75
  const viewImage =
    hotel.destination === 'Красная Поляна'
      ? '/images/mountains.jpg'
      : side === 'sea'
        ? '/images/sea.jpg'
        : '/images/cabin.jpg'
  const month = Number(trip.start.slice(5, 7)),
    winter = month >= 10 || month <= 2
  const existing = app.requests.filter((r) => r.hotelId === hotel.id).at(-1)
  const actualNoise = hotel.noise + (side === 'sea' ? 5 : -3)
  const roomFact = hotel.facts.find((f) => f.id === 'rooms')
  const send = () => {
    const value = app.addRequest({ hotelId: hotel.id, room: hotel.room, floor, trip })
    setRequestId(value)
  }
  return (
    <main className="hotel-page container">
      <div className="hotel-breadcrumb">
        <Link className="back-link" to={'/results' + tripSearch(trip)}>
          <ArrowLeft size={15} />К вашим вариантам
        </Link>
        <span>
          Большой Сочи
          <ChevronRight size={13} />
          {hotel.destination}
          <ChevronRight size={13} />
          {hotel.name}
        </span>
      </div>
      <div className="hotel-title-row">
        <div>
          <div className="hotel-title-eyebrow">
            <span className="hotel-stars">{'★'.repeat(hotel.stars)}</span>
            <span>ОСОБЕННОЕ МЕСТО ДЛЯ ВАШЕЙ ПОЕЗДКИ</span>
          </div>
          <h1>
            {hotel.name}
            <span className="hotel-title-dot">.</span>
          </h1>
          <p>
            <MapPin size={15} />
            {hotel.district}
            <span className="rating-inline">
              <Star size={13} fill="currentColor" />
              {hotel.rating}
              <span>{hotel.reviews} отзывов · демо</span>
            </span>
          </p>
        </div>
        <div className="hotel-title-actions">
          <button
            className={`button outline small ${compared ? 'active' : ''}`}
            onClick={() => app.toggleCompare(hotel.id)}
            aria-pressed={compared}
          >
            {compared ? <Check size={16} /> : <Plus size={16} />}
            {compared ? 'В сравнении' : 'Сравнить'}
          </button>
          <button
            className={`button outline small ${saved ? 'active' : ''}`}
            onClick={() => app.toggleFavorite(hotel.id)}
            aria-pressed={saved}
          >
            <Heart size={16} fill={saved ? 'currentColor' : 'none'} />
            {saved ? 'Сохранено' : 'Сохранить'}
          </button>
        </div>
      </div>
      <div className="hotel-gallery">
        {hotel.gallery.slice(0, 3).map((photo, i) => (
          <button
            className={`gallery-cell gallery-cell-${i}`}
            key={photo + i}
            aria-label={`Открыть фото ${i + 1}`}
            onClick={() => setGallery(i)}
          >
            <img
              src={photo}
              alt={
                ['Атмосфера отеля — иллюстрация', 'Пример интерьера номера', 'Пейзаж и окружение'][
                  i
                ]
              }
            />
            {i === 0 && (
              <span className="gallery-tag">
                <Sparkles size={14} />
                {hotel.highlight}
              </span>
            )}
          </button>
        ))}
        <button className="all-photos" onClick={() => setGallery(0)}>
          Все фото
          <ArrowUpRight size={15} />
        </button>
        <span className="gallery-disclaimer">Иллюстративные фото · демоотель</span>
      </div>
      <div className="hotel-content-layout">
        <div className="hotel-main">
          <div className="hotel-tabs" role="tablist" aria-label="Информация об отеле">
            {[
              ['experience', 'Ваша поездка'],
              ['facts', 'Что мы узнали'],
              ['nearby', 'Что рядом'],
            ].map(([key, label]) => (
              <button
                key={key}
                id={'tab-' + key}
                aria-controls={'panel-' + key}
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
              >
                {label}
              </button>
            ))}
          </div>
          <div role="tabpanel" id={'panel-' + tab} aria-labelledby={'tab-' + tab}>
            {tab === 'experience' && (
              <>
                <div className="hotel-intro">
                  <Eyebrow>ПОЧУВСТВУЙТЕ МЕСТО ДО ПОЕЗДКИ</Eyebrow>
                  <h2>{hotel.subtitle}</h2>
                  <p>{hotel.description}</p>
                </div>
                <section className="window-section">
                  <div className="section-heading small-heading">
                    <div>
                      <h3>А что будет за окном?</h3>
                      <p>Вид зависит от этажа и стороны. Давайте заглянем.</p>
                    </div>
                    <span className="soft-label">Демомодель</span>
                  </div>
                  <div
                    className={`window-preview ${!seaVisible && side === 'sea' && hotel.scores.sea >= 75 ? 'obstructed' : ''}`}
                  >
                    <img
                      src={viewImage}
                      alt={
                        seaVisible
                          ? 'Иллюстрация открытого вида на море'
                          : side === 'garden'
                            ? 'Иллюстрация вида на сад'
                            : 'Иллюстрация окружения'
                      }
                    />
                    <div className="window-grid">
                      <i />
                      <i />
                      <i />
                    </div>
                    <div className="window-view-label">
                      <span>
                        {side === 'sea'
                          ? hotel.scores.sea < 75
                            ? 'Вид на город и горы'
                            : seaVisible
                              ? 'Горизонт открыт'
                              : 'Вид частично закрыт'
                          : 'Вид в сторону сада'}
                      </span>
                      <strong>{floor} этаж</strong>
                    </div>
                    {seaVisible && (
                      <div className={`sunset-marker ${winter ? 'winter' : ''}`}>
                        <Sunset size={24} />
                        <span>{winter ? 'Закат · юго-запад' : 'Закат · запад / северо-запад'}</span>
                      </div>
                    )}
                    <span className="window-caption">
                      Схема условий видимости · фото иллюстративное
                    </span>
                  </div>
                  <div className="window-controls">
                    <label htmlFor="floor">
                      Ваш этаж<strong>{floor}</strong>
                    </label>
                    <input
                      id="floor"
                      aria-label="Этаж номера"
                      type="range"
                      min="1"
                      max="6"
                      value={floor}
                      onChange={(e) => setFloor(Number(e.target.value))}
                    />
                    <div className="side-switch" aria-label="Сторона номера">
                      <button
                        aria-pressed={side === 'sea'}
                        className={side === 'sea' ? 'active' : ''}
                        onClick={() => setSide('sea')}
                      >
                        {hotel.scores.sea >= 75 ? 'К морю' : 'К панораме'}
                      </button>
                      <button
                        aria-pressed={side === 'garden'}
                        className={side === 'garden' ? 'active' : ''}
                        onClick={() => setSide('garden')}
                      >
                        Во двор
                      </button>
                    </div>
                  </div>
                  <p className="window-insight">
                    <CircleHelp size={15} />
                    {side === 'garden'
                      ? 'Во дворе тише, но море из этих окон не видно.'
                      : hotel.scores.sea < 75
                        ? hotel.tradeoff
                        : floor < hotel.floor
                          ? `В демомодели открытый вид начинается с ${hotel.floor}-го этажа. Попробуйте подняться выше.`
                          : `Рекомендуем ${hotel.floor}–6 этажи. ${winter ? 'В ваши даты направление заката подходит юго-западному фасаду.' : 'Летом направление заката другое — требуется уточнение у отеля.'}`}
                  </p>
                </section>
                <section className="noise-section">
                  <div className="section-heading small-heading">
                    <div>
                      <h3>Услышать тишину</h3>
                      <p>Модельная оценка шума, а не измерение на месте.</p>
                    </div>
                    <div className="segmented">
                      <button className={night ? 'active' : ''} onClick={() => setNight(true)}>
                        Ночь
                      </button>
                      <button className={!night ? 'active' : ''} onClick={() => setNight(false)}>
                        День
                      </button>
                    </div>
                  </div>
                  <div className="noise-content">
                    <div>
                      <Moon size={22} />
                      <strong>
                        {actualNoise + (night ? 0 : 12)}
                        <span>дБ</span>
                      </strong>
                      <span>
                        {actualNoise < 40
                          ? 'Тише спокойного разговора'
                          : actualNoise < 50
                            ? 'Слышно жизнь вокруг'
                            : 'Оживлённая улица'}
                      </span>
                    </div>
                    <svg
                      role="img"
                      aria-label={`Шум в течение ${night ? 'ночи' : 'дня'}: модельная оценка ${actualNoise + (night ? 0 : 12)} дБ`}
                      viewBox="0 0 360 100"
                    >
                      {Array.from({ length: 24 }, (_, i) => {
                        const h = Math.max(
                          12,
                          (actualNoise + (night ? 0 : 12)) * 0.9 + Math.sin(i * 0.8) * 13,
                        )
                        return (
                          <rect
                            key={i}
                            x={i * 15}
                            y={90 - h}
                            width="8"
                            height={h}
                            rx="4"
                            fill={night ? '#1642D3' : '#91bd76'}
                            opacity={0.25 + (i % 4) * 0.2}
                          />
                        )
                      })}
                    </svg>
                  </div>
                </section>
                <div className="honest-note">
                  <span>
                    <CircleHelp size={21} />
                  </span>
                  <div>
                    <strong>Чтобы ожидания совпали с реальностью</strong>
                    <p>{hotel.tradeoff}</p>
                  </div>
                </div>
              </>
            )}
            {tab === 'facts' && (
              <section className="facts-section">
                <Eyebrow>ПРОЗРАЧНО ВПЛОТЬ ДО ИСТОЧНИКА</Eyebrow>
                <h2>
                  Красивые обещания.
                  <br />
                  Понятные основания.
                </h2>
                <p className="section-description">
                  Нажмите на любой факт: расскажем, откуда он взялся и что ещё нужно проверить.
                </p>
                <div className="fact-grid">
                  {hotel.facts.map((fact) => (
                    <button className="fact-card" key={fact.id} onClick={() => setEvidence(fact)}>
                      <Status status={fact.status} />
                      <h3>{fact.title}</h3>
                      <strong>{fact.value}</strong>
                      <div>
                        <span>{fact.source}</span>
                        <ArrowUpRight size={17} />
                      </div>
                    </button>
                  ))}
                </div>
                <div className="status-explainer">
                  <span>
                    <ShieldCheck size={16} />
                    Подтверждено — ответ отеля
                  </span>
                  <span>
                    <Sparkles size={16} />
                    Рассчитано — вывод модели
                  </span>
                  <span>
                    <CircleHelp size={16} />
                    Уточняем — пока не знаем
                  </span>
                </div>
              </section>
            )}
            {tab === 'nearby' && (
              <section className="nearby-section">
                <Eyebrow>ВАШЕ МАЛЕНЬКОЕ ОКРУЖЕНИЕ</Eyebrow>
                <h2>
                  Выйти за порог —<br />и уже хорошо.
                </h2>
                <div className="nearby-list">
                  {hotel.nearby.map((place) => {
                    const Icon =
                      place.type === 'beach'
                        ? Waves
                        : place.type === 'cafe'
                          ? Coffee
                          : place.type === 'park'
                            ? Trees
                            : Footprints
                    return (
                      <div key={place.name}>
                        <span className="nearby-icon">
                          <Icon size={20} />
                        </span>
                        <div>
                          <strong>{place.name}</strong>
                          <span>
                            {place.type === 'beach'
                              ? 'Прогулка к воде'
                              : place.type === 'cafe'
                                ? 'Для ваших утренних ритуалов'
                                : place.type === 'park'
                                  ? 'Зелёный маршрут'
                                  : 'Когда захочется дальше'}
                          </span>
                        </div>
                        <strong>
                          {place.time}
                          <span>мин пешком</span>
                        </strong>
                      </div>
                    )
                  })}
                </div>
                <DiscoveryMap hotels={[hotel]} selected={hotel.id} small />
                <div className="demo-note">
                  <CircleHelp size={16} />
                  Места и маршруты — подготовленные примеры. Карта схематичная.
                </div>
              </section>
            )}
          </div>
        </div>
        <aside className="booking-sidebar">
          <div className="booking-card">
            <div className="booking-match">
              <Sparkles size={18} />
              <strong>{score}%</strong>
              <span>{selected.length ? 'совпадение с вами' : 'общая демооценка'}</span>
            </div>
            <h3>
              Ваш номер,
              <br />
              ваша история.
            </h3>
            <div className="recommended-room">
              <span>РЕКОМЕНДУЕМ</span>
              <strong>{hotel.room}</strong>
              <p>
                {hotel.floor}–6 этажи ·{' '}
                {hotel.scores.sea > 75 ? 'морская сторона' : 'панорамный вид'}
              </p>
              {roomFact && <Status status={roomFact.status} />}
            </div>
            <div className="booking-trip">
              <span>{tripDates(trip)}</span>
              <span>
                {guestLabel(trip)} · {nights(trip)} ночей
              </span>
            </div>
            <div className="booking-price">
              <strong>{money(hotel.price)}</strong>
              <span>/ ночь</span>
            </div>
            <div className="booking-total">
              <span>За всю поездку</span>
              <strong>{money(hotel.price * nights(trip))}</strong>
            </div>
            <button
              className="button primary full"
              onClick={() => {
                setRequestOpen(true)
                setRequestId('')
              }}
            >
              Попросить этот номер
              <ArrowUpRight size={18} />
            </button>
            <p className="booking-fine">
              Демозапрос без оплаты и бронирования.
              <br />
              Этаж и категорию должен подтвердить отель.
            </p>
            {existing && (
              <div className="existing-request">
                <Check size={15} />
                <span>Демозапрос {existing.id} сохранён</span>
              </div>
            )}
          </div>
          <div className="sidebar-trust">
            <ShieldCheck size={22} />
            <p>
              Вы знаете больше,
              <br />
              <strong>чем просто «вид на море».</strong>
            </p>
          </div>
          <button
            className="text-link evidence-shortcut"
            onClick={() => {
              setTab('facts')
              document
                .querySelector('.hotel-tabs')
                ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}
          >
            Посмотреть все источники
            <ArrowRight size={16} />
          </button>
        </aside>
      </div>
      {gallery !== null && (
        <Modal
          title={`Атмосфера «${hotel.name}»`}
          onClose={() => setGallery(null)}
          wide
          className="gallery-modal"
        >
          <div className="gallery-lightbox">
            <img src={hotel.gallery[gallery]} alt={`Иллюстративное фото ${gallery + 1}`} />
            <button
              className="gallery-prev icon-button"
              aria-label="Предыдущее фото"
              onClick={() =>
                setGallery((gallery + hotel.gallery.length - 1) % hotel.gallery.length)
              }
            >
              <ChevronLeft />
            </button>
            <button
              className="gallery-next icon-button"
              aria-label="Следующее фото"
              onClick={() => setGallery((gallery + 1) % hotel.gallery.length)}
            >
              <ChevronRight />
            </button>
          </div>
          <div className="gallery-lightbox-footer">
            <span>
              {gallery + 1} / {hotel.gallery.length}
            </span>
            <span>Все фотографии иллюстративные</span>
          </div>
        </Modal>
      )}
      {evidence && <EvidenceModal fact={evidence} onClose={() => setEvidence(null)} />}
      {requestOpen && (
        <Modal
          title={requestId ? 'Первый шаг сделан' : 'Проверим детали вместе'}
          onClose={() => setRequestOpen(false)}
        >
          {requestId ? (
            <div className="request-success">
              <span>
                <Check size={30} />
              </span>
              <h3>Ваши пожелания сохранены</h3>
              <p>
                Демозапрос <strong>{requestId}</strong> — {hotel.name}. В реальном сервисе отель
                подтвердит категорию, этаж и сторону до поездки.
              </p>
              <div className="demo-note">
                Это локальная симуляция. Сообщение отелю не отправлено, номер не забронирован.
              </div>
              <button className="button primary full" onClick={() => setRequestOpen(false)}>
                Отлично
                <Check size={17} />
              </button>
            </div>
          ) : (
            <>
              <p className="section-description">
                Луч подготовил пожелания к номеру. Сохраните их в демонстрационном сценарии.
              </p>
              <div className="request-summary">
                <img src={hotel.image} alt="" />
                <div>
                  <strong>{hotel.name}</strong>
                  <span>
                    {tripDates(trip)} · {guestLabel(trip)}
                  </span>
                </div>
              </div>
              <div className="request-text">
                <strong>Ваше пожелание отелю</strong>
                <p>
                  «Подскажите, пожалуйста, доступна ли категория „{hotel.room}“ на {floor}-м этаже,{' '}
                  {side === 'sea' ? 'со стороны панорамы' : 'со стороны двора'}? Нам важны{' '}
                  {selected.length
                    ? selected
                        .map(
                          (key) =>
                            ({
                              quiet: 'тишина',
                              sea: 'вид на море',
                              sunset: 'закат',
                              walk: 'дорога до пляжа',
                              work: 'рабочее место',
                              nature: 'природа',
                              kids: 'условия для детей',
                              pets: 'условия с питомцем',
                            })[key],
                        )
                        .join(', ')
                    : 'комфорт и соответствие описанию'}
                  .»
                </p>
              </div>
              <div className="booking-total">
                <span>Демонстрационная стоимость</span>
                <strong>{money(hotel.price * nights(trip))}</strong>
              </div>
              <button className="button primary full" onClick={send}>
                Сохранить демозапрос
                <ArrowRight size={18} />
              </button>
              <p className="fine-print">
                Без списаний, отправки сообщений и реального бронирования.
              </p>
            </>
          )}
        </Modal>
      )}
    </main>
  )
}
