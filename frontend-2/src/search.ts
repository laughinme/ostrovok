import { criteria, type Criterion, type Hotel } from './data'

export type Trip = {
  query: string
  destination: string
  start: string
  end: string
  adults: number
  children: number
}
export const defaultTrip: Trip = {
  query: '',
  destination: 'Большой Сочи',
  start: '2026-11-10',
  end: '2026-11-15',
  adults: 2,
  children: 0,
}
export const defaultQuery = 'Хочу тихий отель с видом на море и закат, недалеко от пляжа'
export const money = (n: number) => new Intl.NumberFormat('ru-RU').format(n) + ' ₽'
export function parseQuery(query: string): Criterion[] {
  return (Object.keys(criteria) as Criterion[]).filter((key) => criteria[key].pattern.test(query))
}
export function parseBudget(query: string): number | null {
  const match = query.match(/(?:до|бюджет|не дороже)\s*(\d[\d\s]*)(?:\s*(тыс|к))?/iu)
  if (!match) return null
  const number = Number(match[1].replace(/\s/g, '')) * (match[2] ? 1000 : 1)
  return number >= 1000 ? number : null
}
export function matchScore(
  hotel: Hotel,
  selected: Criterion[],
  important?: Criterion | null,
): number {
  if (!selected.length)
    return Math.round(Object.values(hotel.scores).reduce((a, b) => a + b, 0) / 8)
  const sum = selected.reduce(
    (total, key) => total + hotel.scores[key] * (key === important ? 2 : 1),
    0,
  )
  return Math.round(sum / (selected.length + (important && selected.includes(important) ? 1 : 0)))
}
export function rankHotels(
  hotels: Hotel[],
  trip: Trip,
  selected: Criterion[],
  options: {
    budget?: number
    important?: Criterion | null
    sort?: string
    strictQuiet?: boolean
  } = {},
): Hotel[] {
  const budget = options.budget ?? parseBudget(trip.query) ?? Infinity
  return hotels
    .filter(
      (hotel) =>
        (trip.destination === 'Большой Сочи' || hotel.destination === trip.destination) &&
        hotel.price <= budget &&
        (!options.strictQuiet || hotel.scores.quiet >= 85),
    )
    .sort((a, b) =>
      options.sort === 'price'
        ? a.price - b.price
        : options.sort === 'rating'
          ? Number(b.rating.replace(',', '.')) - Number(a.rating.replace(',', '.'))
          : matchScore(b, selected, options.important) - matchScore(a, selected, options.important),
    )
}
export function nights(trip: Trip): number {
  return Math.max(1, Math.round((Date.parse(trip.end) - Date.parse(trip.start)) / 86400000))
}
export function tripDates(trip: Trip): string {
  const fmt = (value: string) =>
    new Date(value + 'T12:00:00')
      .toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
      .replace('.', '')
  return `${fmt(trip.start)} — ${fmt(trip.end)}`
}
export function guestLabel(trip: Trip): string {
  const n = trip.adults + trip.children
  const word = n === 1 ? 'гость' : n < 5 ? 'гостя' : 'гостей'
  return `${n} ${word}`
}
export function tripSearch(trip: Trip): string {
  return (
    '?' +
    new URLSearchParams({
      q: trip.query || defaultQuery,
      d: trip.destination,
      from: trip.start,
      to: trip.end,
      a: String(trip.adults),
      c: String(trip.children),
    }).toString()
  )
}
export function validDate(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  )
}
export function tripFromSearch(search: string, fallback: Trip): Trip {
  const params = new URLSearchParams(search)
  if (!params.has('q')) return fallback
  const start = params.get('from'),
    end = params.get('to')
  const adults = Number(params.get('a') ?? fallback.adults),
    children = Number(params.get('c') ?? fallback.children)
  return {
    query: (params.get('q') || defaultQuery).slice(0, 600),
    destination: ['Большой Сочи', 'Сочи · центр', 'Хоста', 'Адлер', 'Красная Поляна'].includes(
      params.get('d') || '',
    )
      ? params.get('d')!
      : fallback.destination,
    start: validDate(start) ? start : fallback.start,
    end:
      validDate(end) && validDate(start) && end > start
        ? end
        : validDate(start) && start >= fallback.end
          ? new Date(Date.parse(start) + 5 * 86400000).toISOString().slice(0, 10)
          : fallback.end,
    adults: Number.isInteger(adults) && adults >= 1 && adults <= 6 ? adults : 2,
    children: Number.isInteger(children) && children >= 0 && children <= 4 ? children : 0,
  }
}
