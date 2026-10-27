import { describe, expect, it } from 'vitest'
import { hotels } from './data'
import {
  defaultTrip,
  matchScore,
  nights,
  parseBudget,
  parseQuery,
  rankHotels,
  tripFromSearch,
  tripSearch,
} from './search'

describe('поиск по подготовленному каталогу', () => {
  it('выделяет нестандартные пожелания и не выдумывает неизвестные', () => {
    expect(parseQuery('Хочу тишину, закат над морем и пляж пешком')).toEqual([
      'quiet',
      'sea',
      'sunset',
      'walk',
    ])
    expect(parseQuery('Фиолетовый ковёр и прозрачный потолок')).toEqual([])
  })
  it('отличает морской отпуск от работы в горах', () => {
    const sea = ['quiet', 'sea', 'sunset', 'walk'] as const
    expect(rankHotels(hotels, defaultTrip, [...sea])[0].id).toBe('more-vnutri')
    expect(rankHotels(hotels, defaultTrip, ['nature', 'work'])[0].id).toBe('vysota')
  })
  it('учитывает район, бюджет и обязательную тишину одновременно', () => {
    const trip = { ...defaultTrip, destination: 'Адлер', query: 'До 8 тыс за ночь' }
    expect(rankHotels(hotels, trip, ['quiet'], { strictQuiet: true }).map((h) => h.id)).toEqual([
      'tihaya-gavan',
    ])
    expect(rankHotels(hotels, trip, ['quiet'], { budget: 4000 })).toEqual([])
  })
  it('сортирует по цене и рейтингу независимо от совпадения', () => {
    expect(rankHotels(hotels, defaultTrip, ['quiet'], { sort: 'price' })[0].price).toBe(5200)
    expect(rankHotels(hotels, defaultTrip, ['quiet'], { sort: 'rating' })[0].id).toBe('vysota')
  })
  it('вдвое усиливает выбранный приоритет без выхода за 100%', () => {
    expect(matchScore(hotels[1], ['quiet', 'sea'], 'quiet')).toBe(92)
    expect(matchScore(hotels[1], ['quiet', 'sea'])).toBe(89)
  })
  it('понимает бюджет в рублях и тысячах', () => {
    expect(parseBudget('до 8 тыс')).toBe(8000)
    expect(parseBudget('не дороже 7 500 ₽')).toBe(7500)
    expect(parseBudget('до пляжа 5 минут')).toBeNull()
  })
  it('сохраняет поездку в ссылке, включая детей и даты', () => {
    const trip = {
      query: 'Море и закат',
      destination: 'Адлер',
      start: '2026-12-01',
      end: '2026-12-08',
      adults: 3,
      children: 2,
    }
    expect(tripFromSearch(tripSearch(trip), defaultTrip)).toEqual(trip)
    expect(nights(trip)).toBe(7)
  })
  it('восстанавливается после некорректных параметров ссылки', () => {
    const trip = tripFromSearch('?q=test&d=anywhere&from=oops&to=nope&a=-3&c=999', defaultTrip)
    expect(trip.destination).toBe('Большой Сочи')
    expect(trip.start).toBe(defaultTrip.start)
    expect(trip.adults).toBe(2)
    expect(trip.children).toBe(0)
    expect(tripFromSearch('?q=test&from=2027-01-20&to=2020-01-01', defaultTrip).end).toBe(
      '2027-01-25',
    )
  })
})
