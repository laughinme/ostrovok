import { Link, useLocation } from 'react-router-dom'
import { ArrowUpRight, Check, Heart, Plus, Star, Waves } from 'lucide-react'
import { type Criterion, type Hotel, criteria } from '../data'
import { matchScore, money, nights } from '../search'
import { useApp } from '../state'
import { criterionIcons } from './ui'

export function HotelCard({
  hotel,
  selected,
  important,
  active,
  onSelect,
  index = 0,
}: {
  hotel: Hotel
  selected: Criterion[]
  important?: Criterion | null
  active?: boolean
  onSelect?: () => void
  index?: number
}) {
  const app = useApp(),
    location = useLocation()
  const compared = app.compare.includes(hotel.id),
    saved = app.favorites.includes(hotel.id)
  const shown = (selected.length ? selected : (['quiet', 'sea', 'walk'] as Criterion[])).slice(0, 3)
  const score = matchScore(hotel, selected, important)
  return (
    <article
      id={'card-' + hotel.id}
      className={`hotel-card ${active ? 'selected' : ''}`}
      onMouseEnter={onSelect}
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="hotel-card-image">
        <Link to={'/hotel/' + hotel.id + location.search} aria-label={'Подробнее: ' + hotel.name}>
          <img
            src={hotel.image}
            alt={`Иллюстрация отеля «${hotel.name}»`}
            loading={index > 1 ? 'lazy' : 'eager'}
          />
        </Link>
        {index === 0 && selected.length > 0 && (
          <span className="best-badge">
            <Waves size={13} />
            Ваше совпадение
          </span>
        )}
        <button
          className={`favorite-button ${saved ? 'saved' : ''}`}
          aria-label={saved ? `Убрать ${hotel.name} из избранного` : `Сохранить ${hotel.name}`}
          aria-pressed={saved}
          onClick={() => app.toggleFavorite(hotel.id)}
        >
          <Heart size={19} fill={saved ? 'currentColor' : 'none'} />
        </button>
        <span className="photo-demo">Фото-пример</span>
      </div>
      <div className="hotel-card-body">
        <div className="hotel-card-top">
          <div>
            <span className="hotel-stars">{'★'.repeat(hotel.stars)}</span>
            <h2>
              <Link to={'/hotel/' + hotel.id + location.search}>{hotel.name}</Link>
            </h2>
            <p className="hotel-district">{hotel.district}</p>
          </div>
          <div className={`match-score ${score >= 90 ? 'excellent' : ''}`}>
            <strong>
              {score}
              <span>%</span>
            </strong>
            <span>{selected.length ? 'вам подходит' : 'общая оценка'}</span>
          </div>
        </div>
        <div className="card-criteria">
          {shown.map((key) => {
            const Icon = criterionIcons[key]
            const value = hotel.scores[key]
            return (
              <span key={key} className={value < 75 ? 'partial' : ''}>
                <Icon size={14} />
                {key === 'quiet'
                  ? `${hotel.noise} дБ ночью`
                  : key === 'walk'
                    ? hotel.beach < 30
                      ? `${hotel.beach} мин до пляжа`
                      : 'Море в часе езды'
                    : key === 'sea'
                      ? value > 75
                        ? 'Вид на море'
                        : value === 0
                          ? 'Вид на горы'
                          : 'Частичный вид'
                      : criteria[key].short}
                {value >= 85 && <Check size={12} />}
              </span>
            )
          })}
        </div>
        <p className="card-tradeoff">{hotel.tradeoff.split('. ')[0]}.</p>
        <div className="hotel-card-bottom">
          <button
            className={`compare-toggle ${compared ? 'on' : ''}`}
            onClick={() => app.toggleCompare(hotel.id)}
            aria-pressed={compared}
            aria-label={`${compared ? 'Убрать из сравнения' : 'Сравнить'}: ${hotel.name}`}
          >
            <span>{compared ? <Check size={12} /> : <Plus size={12} />}</span>
            {compared ? 'В сравнении' : 'Сравнить'}
          </button>
          <div className="card-price">
            <strong>{money(hotel.price)}</strong>
            <span>/ ночь</span>
          </div>
          <Link
            className="card-open"
            aria-label={'Открыть отель ' + hotel.name}
            to={'/hotel/' + hotel.id + location.search}
          >
            <ArrowUpRight size={20} />
          </Link>
        </div>
        <span className="card-total">
          {money(hotel.price * nights(app.trip))} за {nights(app.trip)} ночей · демоцена
        </span>
      </div>
      <div className="card-rating">
        <Star size={11} fill="currentColor" />
        {hotel.rating}
        <span>({hotel.reviews})</span>
      </div>
    </article>
  )
}
