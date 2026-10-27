import { useEffect, useMemo, useState } from 'react'
import { useLocation, Link } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  MapPin,
  Map,
  Pencil,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react'
import { criteria, type Criterion } from '../data'
import { useApp } from '../state'
import {
  guestLabel,
  parseBudget,
  parseQuery,
  rankHotels,
  tripDates,
  tripFromSearch,
  money,
} from '../search'
import { HotelCard } from '../components/HotelCard'
import { DiscoveryMap } from '../components/DiscoveryMap'
import { SearchComposer } from '../components/SearchComposer'
import { EmptyState, Eyebrow, Modal, criterionIcons } from '../components/ui'

export function Results() {
  const app = useApp(),
    location = useLocation()
  const trip = useMemo(() => tripFromSearch(location.search, app.trip), [location.search, app.trip])
  const [selected, setSelected] = useState<Criterion[]>(() => parseQuery(trip.query))
  const [important, setImportant] = useState<Criterion | null>(null)
  const [sort, setSort] = useState('match'),
    [budget, setBudget] = useState(parseBudget(trip.query) || 15000)
  const [strictQuiet, setStrictQuiet] = useState(false),
    [filters, setFilters] = useState(false),
    [editing, setEditing] = useState(false)
  const [mapVisible, setMapVisible] = useState(true),
    [activeId, setActiveId] = useState('')
  useEffect(() => {
    setSelected(parseQuery(trip.query))
    setBudget(parseBudget(trip.query) || 15000)
    setImportant(null)
    setStrictQuiet(false)
  }, [trip.query])
  useEffect(() => {
    if (JSON.stringify(trip) !== JSON.stringify(app.trip)) app.setTrip(trip)
  }, [trip, app])
  const results = rankHotels(app.hotels, trip, selected, { budget, sort, important, strictQuiet })
  const active = results.some((h) => h.id === activeId) ? activeId : results[0]?.id
  const selectHotel = (id: string) => {
    setActiveId(id)
    if (window.innerWidth < 900)
      document.getElementById('card-' + id)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
  return (
    <main className="results-page">
      <div className="results-header container">
        <Link to="/" className="back-link">
          <ArrowLeft size={15} />
          Новый поиск
        </Link>
        <div className="results-title-row">
          <div>
            <Eyebrow>ИЩЕМ НЕ ИДЕАЛЬНЫЙ. ИЩЕМ ВАШ.</Eyebrow>
            <h1>
              Здесь может случиться ваш отпуск<span className="blue-dot">.</span>
            </h1>
          </div>
          <div className="results-count">
            <strong>{results.length.toString().padStart(2, '0')}</strong>
            <span>
              особенных
              <br />
              вариантов
            </span>
          </div>
        </div>
        <div className="search-summary">
          <span className="summary-spark">
            <Sparkles size={19} />
          </span>
          <div>
            <strong>«{trip.query}»</strong>
            <span>
              <MapPin size={13} />
              {trip.destination}
              <i />
              {tripDates(trip)}
              <i />
              {guestLabel(trip)}
            </span>
          </div>
          <button
            className="edit-query"
            aria-label="Изменить запрос"
            onClick={() => setEditing(true)}
          >
            <Pencil size={16} />
            <span>Изменить</span>
          </button>
        </div>
        <div className="intent-row">
          <span>Вам важно</span>
          <div className="intent-chips">
            {selected.map((id) => {
              const Icon = criterionIcons[id]
              return (
                <button
                  key={id}
                  className={`intent-chip ${important === id ? 'important' : ''}`}
                  title="Нажмите, чтобы сделать главным приоритетом"
                  aria-pressed={important === id}
                  onClick={() => setImportant(important === id ? null : id)}
                >
                  <Icon size={14} />
                  {criteria[id].label}
                  {important === id ? <span>×2</span> : <Check size={12} />}
                </button>
              )
            })}
            {!selected.length && (
              <span className="unknown-query">
                Пока не умеем проверить эти пожелания. Показываем общие характеристики.
              </span>
            )}
          </div>
          <span className="intent-hint">Нажмите, чтобы расставить приоритеты</span>
        </div>
      </div>
      <div className="results-toolbar container">
        <div className="toolbar-left">
          <button
            className={`button outline small ${filters ? 'active' : ''}`}
            onClick={() => setFilters(true)}
          >
            <SlidersHorizontal size={15} />
            Фильтры{(budget < 15000 || strictQuiet) && <span className="filter-dot" />}
          </button>
          <button
            className={`quiet-filter ${strictQuiet ? 'active' : ''}`}
            aria-pressed={strictQuiet}
            onClick={() => setStrictQuiet(!strictQuiet)}
          >
            {strictQuiet && <Check size={14} />}Только тихие
          </button>
        </div>
        <div className="toolbar-right">
          <label className="sort-control">
            <span>Сначала</span>
            <select aria-label="Сортировка" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="match">лучшие совпадения</option>
              <option value="price">дешевле</option>
              <option value="rating">выше рейтинг</option>
            </select>
            <ChevronDown size={13} />
          </label>
          <button
            className={`button outline small map-switch ${mapVisible ? 'active' : ''}`}
            aria-pressed={mapVisible}
            onClick={() => setMapVisible(!mapVisible)}
          >
            <Map size={15} />
            {mapVisible ? 'Скрыть карту' : 'На карте'}
          </button>
        </div>
      </div>
      <div className={`results-body container ${mapVisible ? '' : 'without-map'}`}>
        <div className="result-list">
          <div className="result-list-note">
            <Sparkles size={14} />
            Сначала совпадения, потом честные нюансы
          </div>
          {results.length ? (
            results.map((hotel, i) => (
              <HotelCard
                key={hotel.id}
                hotel={hotel}
                selected={selected}
                important={important}
                active={active === hotel.id}
                onSelect={() => setActiveId(hotel.id)}
                index={i}
              />
            ))
          ) : (
            <EmptyState
              title="Чуть больше свободы?"
              text="С такими фильтрами вариантов пока нет. Увеличьте бюджет или попробуйте соседний район."
            >
              <button
                className="button primary"
                onClick={() => {
                  setBudget(15000)
                  setStrictQuiet(false)
                }}
              >
                Сбросить фильтры
                <ArrowRight size={17} />
              </button>
              <button className="text-link" onClick={() => setEditing(true)}>
                Изменить поездку
              </button>
            </EmptyState>
          )}
          <div className="results-footnote">
            Все отели, цены, оценки и факты — демонстрационные. Фотографии иллюстрируют атмосферу и
            не принадлежат указанным объектам.
          </div>
        </div>
        {mapVisible && (
          <aside className="results-map">
            <DiscoveryMap hotels={results} selected={active} onSelect={selectHotel} />
            <div className="map-explainer">
              <span className="green-dot" />
              <p>
                Близко на карте — не всегда близко пешком.
                <br />
                <strong>Мы учитываем маршрут, рельеф и лестницы.</strong>
              </p>
            </div>
          </aside>
        )}
      </div>
      {app.compare.length > 0 && (
        <div className="compare-dock">
          <div className="compare-dock-images">
            {app.compare.map((id) => (
              <img src={app.hotels.find((h) => h.id === id)!.image} alt="" key={id} />
            ))}
          </div>
          <span>Выбрано {app.compare.length} из 3</span>
          <Link className="button primary small" to={'/compare' + location.search}>
            Сравнить отели
            <ArrowRight size={17} />
          </Link>
        </div>
      )}
      {editing && (
        <Modal title="Найдём ваш вариант" onClose={() => setEditing(false)} wide>
          <SearchComposer compact onClose={() => setEditing(false)} />
        </Modal>
      )}
      {filters && (
        <Modal title="Чуть точнее под вас" onClose={() => setFilters(false)}>
          <div className="filter-form">
            <label htmlFor="budget">
              Бюджет за ночь<strong>{money(budget)}</strong>
            </label>
            <input
              id="budget"
              type="range"
              min="3000"
              max="15000"
              step="100"
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
            />
            <div className="range-labels">
              <span>3 000 ₽</span>
              <span>15 000 ₽</span>
            </div>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={strictQuiet}
                onChange={(e) => setStrictQuiet(e.target.checked)}
              />
              <span>
                <strong>Тишина — обязательно</strong>
                <small>Только отели с оценкой тишины от 85 из 100</small>
              </span>
            </label>
            <p className="fine-print">
              Число совпадений рассчитывается по подготовленным демооценкам.
            </p>
            <button className="button primary full" onClick={() => setFilters(false)}>
              Показать {results.length} вариантов
              <ArrowRight size={17} />
            </button>
            <button
              className="text-link centered"
              onClick={() => {
                setBudget(15000)
                setStrictQuiet(false)
              }}
            >
              Сбросить фильтры
              <X size={14} />
            </button>
          </div>
        </Modal>
      )}
    </main>
  )
}
