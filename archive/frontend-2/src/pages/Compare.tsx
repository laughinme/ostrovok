import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Plus, Sparkles, X } from 'lucide-react'
import { criteria, type Criterion, type Fact, type Hotel } from '../data'
import { useApp } from '../state'
import { matchScore, money, parseQuery, tripSearch } from '../search'
import { EmptyState, EvidenceModal, Eyebrow, Modal, Status } from '../components/ui'

type Row = { label: string; value: (h: Hotel) => string; fact?: string }
const rows: Row[] = [
  { label: 'Стоимость за ночь', value: (h) => money(h.price) },
  {
    label: 'Вид из окна',
    value: (h) =>
      h.facts.find((f) => f.id === 'view')?.value ||
      (h.scores.sea > 80 ? 'Морская сторона' : 'Город и горы'),
    fact: 'view',
  },
  { label: 'Тишина ночью', value: (h) => `${h.noise} дБ · модельная оценка`, fact: 'noise' },
  {
    label: 'Дойти до пляжа',
    value: (h) => (h.beach >= 60 ? 'Около часа на машине' : `${h.beach} минут пешком`),
    fact: 'beach',
  },
  {
    label: 'Для работы',
    value: (h) => (h.scores.work >= 90 ? 'Отдельная рабочая зона' : 'Стол в номере'),
  },
  {
    label: 'С питомцем',
    value: (h) =>
      h.scores.pets >= 90
        ? 'Можно, по запросу'
        : h.scores.pets >= 55
          ? 'Условия нужно уточнить'
          : 'Не предусмотрено',
    fact: 'pets',
  },
  { label: 'Ваша категория', value: (h) => h.room, fact: 'rooms' },
  { label: 'Честный нюанс', value: (h) => h.tradeoff },
]
export function Compare() {
  const app = useApp(),
    location = useLocation()
  const [adding, setAdding] = useState(false),
    [onlyDifferences, setOnlyDifferences] = useState(false)
  const [evidence, setEvidence] = useState<Fact | null>(null)
  const parsed = parseQuery(app.trip.query)
  const [priority, setPriority] = useState<Criterion | ''>('')
  const selected = app.hotels
    .filter((h) => app.compare.includes(h.id))
    .sort((a, b) => app.compare.indexOf(a.id) - app.compare.indexOf(b.id))
  const score = (h: Hotel) => matchScore(h, priority ? [priority] : parsed)
  const winner = [...selected].sort((a, b) => score(b) - score(a))[0]
  const visibleRows = rows.filter(
    (row) => !onlyDifferences || new Set(selected.map((h) => row.value(h))).size > 1,
  )
  return (
    <main className="compare-page container">
      <Link className="back-link" to={'/results' + tripSearch(app.trip)}>
        <ArrowLeft size={15} />К вашим вариантам
      </Link>
      <div className="section-heading compare-heading">
        <div>
          <Eyebrow>ВСЁ ВАЖНОЕ — РЯДОМ</Eyebrow>
          <h1>
            Выбирать легче,
            <br />
            когда видно разницу.
          </h1>
        </div>
        {selected.length > 0 && (
          <button
            className="button outline"
            disabled={selected.length >= 3}
            onClick={() => setAdding(true)}
          >
            <Plus size={17} />
            Добавить отель
          </button>
        )}
      </div>
      {!selected.length ? (
        <EmptyState
          title="У хорошего выбора есть варианты"
          text="Добавьте до трёх отелей и сравните тишину, виды, дорогу до моря и то, о чём обычно не пишут."
        >
          <button className="button primary" onClick={() => setAdding(true)}>
            Выбрать отели
            <Plus size={18} />
          </button>
        </EmptyState>
      ) : (
        <>
          <div className="comparison-controls">
            <label className="compare-priority">
              Что важнее всего?
              <select
                aria-label="Приоритет сравнения"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Criterion | '')}
              >
                <option value="">Все мои пожелания</option>
                {Object.entries(criteria).map(([id, c]) => (
                  <option key={id} value={id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={onlyDifferences}
                onChange={(e) => setOnlyDifferences(e.target.checked)}
              />
              <span className="toggle-track" />
              Только различия
            </label>
          </div>
          <div className="comparison-scroll">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th scope="col">
                    <span className="comparison-table-label">
                      ВАШ КОРОТКИЙ
                      <br />
                      СПИСОК
                    </span>
                    <span className="comparison-table-count">{selected.length} / 3 отеля</span>
                  </th>
                  {selected.map((hotel) => (
                    <th key={hotel.id} scope="col">
                      <div className="compare-hotel">
                        <div className="compare-photo">
                          <img src={hotel.image} alt="" />
                          <button
                            className="icon-button"
                            aria-label={'Убрать из сравнения ' + hotel.name}
                            onClick={() => app.toggleCompare(hotel.id)}
                          >
                            <X size={15} />
                          </button>
                        </div>
                        <span className="hotel-stars">{'★'.repeat(hotel.stars)}</span>
                        <Link to={'/hotel/' + hotel.id + location.search}>{hotel.name}</Link>
                        <span>{hotel.district}</span>
                        <div className={`compare-match ${winner?.id === hotel.id ? 'winner' : ''}`}>
                          <Sparkles size={14} />
                          <strong>{score(hotel)}%</strong>
                          <span>{winner?.id === hotel.id ? 'Ближе к вам' : 'Совпадение'}</span>
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr key={row.label}>
                    <th scope="row">{row.label}</th>
                    {selected.map((hotel) => {
                      const f = hotel.facts.find((fact) => fact.id === row.fact)
                      return (
                        <td key={hotel.id}>
                          <span
                            className={row.label === 'Честный нюанс' ? 'comparison-tradeoff' : ''}
                          >
                            {row.value(hotel)}
                          </span>
                          {f && (
                            <button
                              className="compare-source"
                              onClick={() => setEvidence(f)}
                              aria-label={`Источник: ${row.label}, ${hotel.name}`}
                            >
                              <Status status={f.status} />
                            </button>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
                <tr className="comparison-footer">
                  <th scope="row">Кажется, это ваш?</th>
                  {selected.map((hotel) => (
                    <td key={hotel.id}>
                      <Link
                        className="button primary small"
                        to={'/hotel/' + hotel.id + location.search}
                      >
                        Об отеле
                        <ArrowUpRightIcon />
                      </Link>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          {selected.length === 1 && (
            <div className="single-comparison">
              <Plus size={18} />
              <span>Добавьте ещё один отель, чтобы увидеть различия.</span>
              <button className="text-link" onClick={() => setAdding(true)}>
                Выбрать
                <ArrowRight size={16} />
              </button>
            </div>
          )}
          {winner && selected.length > 1 && (
            <div className="comparison-verdict">
              <Sparkles size={25} />
              <div>
                <strong>
                  Если важнее{' '}
                  {priority ? criteria[priority].label.toLowerCase() : 'всё, о чём вы мечтали'},
                  присмотритесь к «{winner.name}».
                </strong>
                <p>
                  Он ближе всего к вашим пожеланиям по подготовленным демооценкам. Окончательный
                  выбор — всегда за вами.
                </p>
              </div>
              <Link className="text-link" to={'/hotel/' + winner.id + location.search}>
                Познакомиться
                <ArrowRight size={18} />
              </Link>
            </div>
          )}
          <p className="results-footnote">
            Сравнение основано на демонстрационных данных. Нажмите на статус, чтобы проверить
            источник и ограничения.
          </p>
        </>
      )}
      {adding && (
        <Modal title="Кого добавим в сравнение?" onClose={() => setAdding(false)}>
          <p className="section-description">
            Выберите до трёх мест. Сейчас {selected.length} из 3.
          </p>
          <div className="add-hotel-list">
            {app.hotels.map((hotel) => (
              <button
                key={hotel.id}
                disabled={selected.length >= 3 && !app.compare.includes(hotel.id)}
                onClick={() => app.toggleCompare(hotel.id)}
              >
                <img src={hotel.image} alt="" />
                <span>
                  <strong>{hotel.name}</strong>
                  <span>{hotel.district}</span>
                </span>
                <span
                  className={`selection-circle ${app.compare.includes(hotel.id) ? 'active' : ''}`}
                >
                  {app.compare.includes(hotel.id) ? <Check size={16} /> : <Plus size={16} />}
                </span>
              </button>
            ))}
          </div>
          <button className="button primary full" onClick={() => setAdding(false)}>
            Готово
            <ArrowRight size={17} />
          </button>
        </Modal>
      )}
      {evidence && <EvidenceModal fact={evidence} onClose={() => setEvidence(null)} />}
    </main>
  )
}
function ArrowUpRightIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="M6 18 18 6M6 6h12v12" />
    </svg>
  )
}
