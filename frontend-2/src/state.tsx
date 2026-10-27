import { createContext, useContext, useState, useMemo, useEffect, type ReactNode } from 'react'
import { hotels as seedHotels, type Hotel } from './data'
import { defaultTrip, validDate, type Trip } from './search'

type Profile = {
  room: string
  quiet: string
  pets: string
  confirmed: boolean
  updated?: ('quiet' | 'pets')[]
}
type Request = { hotelId: string; room: string; floor: number; trip: Trip; id: string }
type Persisted = {
  favorites: string[]
  compare: string[]
  trip: Trip
  profile: Profile
  requests: Request[]
}
const initial: Persisted = {
  favorites: [],
  compare: [],
  trip: defaultTrip,
  profile: {
    room: 'Делюкс · этажи 4–6 · юго-западная сторона',
    quiet: 'Тихая сторона сада, окна с двойным остеклением',
    pets: 'По запросу, до 10 кг',
    confirmed: false,
  },
  requests: [],
}
const storageKey = 'luch-v2-state-v1'
function restore(): Persisted {
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey) || 'null')
    if (!raw || typeof raw !== 'object') return initial
    const ids = (value: unknown) =>
      Array.isArray(value)
        ? [
            ...new Set(
              value.filter(
                (id): id is string => typeof id === 'string' && seedHotels.some((h) => h.id === id),
              ),
            ),
          ]
        : []
    const trip =
      raw.trip &&
      typeof raw.trip.query === 'string' &&
      typeof raw.trip.destination === 'string' &&
      validDate(raw.trip.start) &&
      validDate(raw.trip.end) &&
      raw.trip.end > raw.trip.start &&
      Number.isInteger(raw.trip.adults) &&
      raw.trip.adults >= 1 &&
      raw.trip.adults <= 6 &&
      Number.isInteger(raw.trip.children) &&
      raw.trip.children >= 0 &&
      raw.trip.children <= 4
        ? raw.trip
        : defaultTrip
    const profile =
      raw.profile &&
      typeof raw.profile.room === 'string' &&
      typeof raw.profile.quiet === 'string' &&
      typeof raw.profile.pets === 'string' &&
      typeof raw.profile.confirmed === 'boolean'
        ? {
            ...raw.profile,
            updated: Array.isArray(raw.profile.updated)
              ? raw.profile.updated.filter((key: unknown) => key === 'quiet' || key === 'pets')
              : [],
          }
        : initial.profile
    const requests = Array.isArray(raw.requests)
      ? raw.requests.filter(
          (r: Request) =>
            r &&
            typeof r.id === 'string' &&
            seedHotels.some((h) => h.id === r.hotelId) &&
            typeof r.room === 'string' &&
            Number.isInteger(r.floor) &&
            r.trip &&
            validDate(r.trip.start) &&
            validDate(r.trip.end),
        )
      : []
    return {
      favorites: ids(raw.favorites),
      compare: ids(raw.compare).slice(0, 3),
      trip,
      profile,
      requests,
    }
  } catch {
    return initial
  }
}
type AppState = Persisted & {
  hotels: Hotel[]
  setTrip: (trip: Trip) => void
  toggleFavorite: (id: string) => void
  toggleCompare: (id: string) => void
  saveProfile: (profile: Profile) => void
  addRequest: (request: Omit<Request, 'id'>) => string
  notify: (message: string) => void
  toast: string
}
const Context = createContext<AppState | null>(null)
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(restore)
  const [toast, setToast] = useState('')
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state))
    } catch {}
  }, [state])
  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(''), 4200)
    return () => clearTimeout(id)
  }, [toast])
  const hotels = useMemo(
    () =>
      seedHotels.map((hotel) => {
        if (hotel.id !== 'more-vnutri') return hotel
        const updated = state.profile.updated || []
        const facts = hotel.facts.map((f) => {
          const value =
            f.id === 'rooms' && state.profile.confirmed
              ? state.profile.room
              : f.id === 'noise' && updated.includes('quiet')
                ? state.profile.quiet
                : null
          return value
            ? {
                ...f,
                value,
                status: 'confirmed' as const,
                confidence: 97,
                source: 'Подтверждено вами в демокабинете',
                method: 'Отельер проверил и подтвердил формулировку. Ответ сохранён локально.',
                limitation:
                  'Это демонстрационное подтверждение. Перед реальной поездкой проверьте сведения у отеля.',
              }
            : f
        })
        if (updated.includes('pets'))
          facts.push({
            id: 'pets',
            title: 'С питомцем',
            value: state.profile.pets,
            status: 'confirmed',
            confidence: 96,
            source: 'Подтверждено вами в демокабинете',
            checked: '26 октября 2026',
            method: 'Условия подтверждены отельером в локальной симуляции.',
            limitation: 'Условия требуют повторного подтверждения перед реальной поездкой.',
          })
        return { ...hotel, room: state.profile.confirmed ? state.profile.room : hotel.room, facts }
      }),
    [state.profile],
  )
  const notify = (message: string) => setToast(message)
  const toggleFavorite = (id: string) =>
    setState((s) => ({
      ...s,
      favorites: s.favorites.includes(id)
        ? s.favorites.filter((x) => x !== id)
        : [...s.favorites, id],
    }))
  const toggleCompare = (id: string) => {
    if (!state.compare.includes(id) && state.compare.length >= 3) {
      notify('Можно сравнить до 3 отелей. Уберите один, чтобы добавить другой.')
      return
    }
    setState((s) => ({
      ...s,
      compare: s.compare.includes(id) ? s.compare.filter((x) => x !== id) : [...s.compare, id],
    }))
  }
  const addRequest = (request: Omit<Request, 'id'>) => {
    const id = 'ЛЧ-' + Date.now().toString().slice(-6)
    setState((s) => ({ ...s, requests: [...s.requests, { ...request, id }] }))
    return id
  }
  return (
    <Context.Provider
      value={{
        ...state,
        hotels,
        toast,
        notify,
        toggleFavorite,
        toggleCompare,
        setTrip: (trip) => setState((s) => ({ ...s, trip })),
        saveProfile: (profile) => setState((s) => ({ ...s, profile })),
        addRequest,
      }}
    >
      {children}
    </Context.Provider>
  )
}
export function useApp() {
  const value = useContext(Context)
  if (!value) throw new Error('AppProvider missing')
  return value
}
