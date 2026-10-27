import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  MapPin,
  Minus,
  Plus,
  Sparkles,
  Users,
  ArrowRight,
} from 'lucide-react'
import { criteria, destinations, type Criterion } from '../data'
import { useApp } from '../state'
import { defaultQuery, guestLabel, parseQuery, tripDates, tripSearch, type Trip } from '../search'
import { CriterionChip, Modal } from './ui'

export function TripSettings({
  trip,
  onSave,
  onClose,
}: {
  trip: Trip
  onSave: (trip: Trip) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState(trip)
  const [error, setError] = useState('')
  const today = new Date().toLocaleDateString('en-CA')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!draft.start || !draft.end || draft.end <= draft.start) {
      setError('Дата выезда должна быть позже даты заезда.')
      return
    }
    if (draft.start < today) {
      setError('Выберите дату заезда сегодня или позже.')
      return
    }
    onSave(draft)
    onClose()
  }
  return (
    <Modal title="Ваша поездка" onClose={onClose}>
      <form onSubmit={submit} className="settings-form">
        <label>
          Куда отправимся?
          <select
            value={draft.destination}
            onChange={(e) => setDraft({ ...draft, destination: e.target.value })}
          >
            {destinations.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>
        <div className="date-fields">
          <label>
            Заезд
            <input
              aria-label="Дата заезда"
              type="date"
              min={today}
              value={draft.start}
              onChange={(e) => setDraft({ ...draft, start: e.target.value })}
              required
            />
          </label>
          <label>
            Выезд
            <input
              aria-label="Дата выезда"
              type="date"
              min={draft.start}
              value={draft.end}
              onChange={(e) => setDraft({ ...draft, end: e.target.value })}
              required
            />
          </label>
        </div>
        {(['adults', 'children'] as const).map((key) => (
          <div className="guest-row" key={key}>
            <div>
              <strong>{key === 'adults' ? 'Взрослые' : 'Дети'}</strong>
              <span>{key === 'adults' ? 'От 18 лет' : 'До 17 лет'}</span>
            </div>
            <div className="stepper">
              <button
                type="button"
                aria-label={`Уменьшить: ${key === 'adults' ? 'взрослые' : 'дети'}`}
                disabled={draft[key] <= (key === 'adults' ? 1 : 0)}
                onClick={() => setDraft({ ...draft, [key]: draft[key] - 1 })}
              >
                <Minus size={16} />
              </button>
              <output aria-live="polite">{draft[key]}</output>
              <button
                type="button"
                aria-label={`Увеличить: ${key === 'adults' ? 'взрослые' : 'дети'}`}
                disabled={draft[key] >= (key === 'adults' ? 6 : 4)}
                onClick={() => setDraft({ ...draft, [key]: draft[key] + 1 })}
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        ))}
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <p className="fine-print">
          Демокаталог: Большой Сочи и Красная Поляна. Цены иллюстративные, наличие номеров не
          проверяется.
        </p>
        <button className="button primary full" type="submit">
          Сохранить параметры
          <ArrowRight size={18} />
        </button>
      </form>
    </Modal>
  )
}
export function SearchComposer({
  compact = false,
  onClose,
}: {
  compact?: boolean
  onClose?: () => void
}) {
  const app = useApp(),
    navigate = useNavigate()
  const [trip, setTrip] = useState(app.trip)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const selected = parseQuery(trip.query)
  function submit(e: FormEvent) {
    e.preventDefault()
    const next = { ...trip, query: trip.query.trim() || defaultQuery }
    app.setTrip(next)
    onClose?.()
    navigate('/search' + tripSearch(next))
  }
  const toggleCriterion = (id: Criterion) => {
    const next = selected.includes(id) ? selected.filter((key) => key !== id) : [...selected, id]
    setTrip({ ...trip, query: next.map((key) => criteria[key].label).join(', ') })
  }
  return (
    <>
      <form className={`search-composer ${compact ? 'compact' : ''}`} onSubmit={submit}>
        <div className="composer-context">
          <label className="destination-control">
            <MapPin size={17} />
            <select
              aria-label="Направление"
              value={trip.destination}
              onChange={(e) => setTrip({ ...trip, destination: e.target.value })}
            >
              {destinations.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
            <ChevronDown size={13} />
          </label>
          <span className="context-divider" />
          <button type="button" onClick={() => setSettingsOpen(true)}>
            <CalendarDays size={16} />
            {tripDates(trip)}
          </button>
          <span className="context-divider" />
          <button type="button" onClick={() => setSettingsOpen(true)}>
            <Users size={16} />
            {guestLabel(trip)}
          </button>
        </div>
        <label className="query-label" htmlFor={compact ? 'edit-query' : 'hotel-query'}>
          <Sparkles size={17} />
          Что сделает вашу поездку особенной?
        </label>
        <textarea
          id={compact ? 'edit-query' : 'hotel-query'}
          maxLength={600}
          value={trip.query}
          onChange={(e) => setTrip({ ...trip, query: e.target.value })}
          placeholder="Тихий номер, закат над морем и хороший кофе неподалёку…"
          rows={3}
        />
        <div className="composer-bottom">
          <span>Можно просто своими словами</span>
          <button className="button primary" type="submit">
            Найти мой отель
            <ArrowUpRight size={20} />
          </button>
        </div>
      </form>
      {!compact && (
        <div className="quick-criteria">
          <span>Например</span>
          {(['quiet', 'sea', 'sunset'] as Criterion[]).map((id) => (
            <CriterionChip
              key={id}
              id={id}
              active={selected.includes(id)}
              onClick={() => toggleCriterion(id)}
            />
          ))}
        </div>
      )}
      {settingsOpen && (
        <TripSettings trip={trip} onSave={setTrip} onClose={() => setSettingsOpen(false)} />
      )}
    </>
  )
}
