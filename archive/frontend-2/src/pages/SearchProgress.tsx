import { useEffect, useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Database,
  Map,
  MessageSquare,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { parseQuery, tripFromSearch, tripSearch } from '../search'
import { useApp } from '../state'
import { criteria } from '../data'
import { Eyebrow, SunMark } from '../components/ui'

const steps = [
  {
    name: 'Слышим ваши пожелания',
    detail: 'Разбираем запрос на понятные критерии',
    icon: Sparkles,
  },
  { name: 'Исследуем место', detail: 'Смотрим рельеф, фасады, дороги и маршруты', icon: Map },
  {
    name: 'Сверяем источники',
    detail: 'Сопоставляем факты и отмечаем противоречия',
    icon: Database,
  },
  {
    name: 'Спрашиваем у отельера',
    detail: 'Проверяем то, чего не знает карта',
    icon: MessageSquare,
  },
  {
    name: 'Собираем ваш короткий список',
    detail: 'Объясняем совпадения и честные компромиссы',
    icon: ShieldCheck,
  },
]
export function SearchProgress() {
  const app = useApp(),
    location = useLocation(),
    navigate = useNavigate()
  const trip = tripFromSearch(location.search, app.trip)
  const [step, setStep] = useState(0)
  const selected = parseQuery(trip.query)
  useEffect(() => {
    setStep(0)
    const interval = setInterval(() => setStep((s) => Math.min(s + 1, 4)), 1250)
    const timeout = setTimeout(
      () => navigate('/results' + location.search, { replace: true }),
      6800,
    )
    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [location.search, navigate])
  return (
    <main className="progress-page container">
      <Link to="/" className="back-link">
        <ArrowLeft size={16} />
        Изменить пожелания
      </Link>
      <div className="progress-layout">
        <div className="progress-copy">
          <Eyebrow>ВАШ ЛИЧНЫЙ ИССЛЕДОВАТЕЛЬ</Eyebrow>
          <h1>
            Хорошие совпадения
            <br />
            не случайны.
          </h1>
          <p className="progress-query">«{trip.query}»</p>
          <div className="progress-criteria">
            {selected.map((key) => (
              <span key={key}>
                <Check size={13} />
                {criteria[key].short}
              </span>
            ))}
          </div>
          <div className="agent-steps" aria-live="polite">
            {steps.map((item, i) => (
              <div
                key={item.name}
                className={`agent-step ${i < step ? 'done' : i === step ? 'running' : ''}`}
              >
                <div className="agent-step-icon">
                  {i < step ? <Check size={18} /> : <item.icon size={18} />}
                </div>
                <div>
                  <strong>{item.name}</strong>
                  <p>{i === step || i < step ? item.detail : 'Следующий шаг'}</p>
                </div>
                {i === step && (
                  <span className="three-dots">
                    <i />
                    <i />
                    <i />
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="progress-actions">
            <button
              className="text-link"
              onClick={() => navigate('/results' + tripSearch(trip), { replace: true })}
            >
              Перейти к результатам
              <ArrowRight size={17} />
            </button>
            <span>Демонстрация работы агентов</span>
          </div>
        </div>
        <div className="agent-visual">
          <div className="agent-orbit orbit-one" />
          <div className="agent-orbit orbit-two" />
          <div className="agent-orbit orbit-three" />
          <div className="agent-core">
            <SunMark />
            <span>луч</span>
          </div>
          <div className={`orbit-node node-map ${step >= 1 ? 'lit' : ''}`}>
            <Map size={23} />
            <span>Геоданные</span>
          </div>
          <div className={`orbit-node node-hotel ${step >= 3 ? 'lit' : ''}`}>
            <MessageSquare size={23} />
            <span>Отельер</span>
          </div>
          <div className={`orbit-node node-source ${step >= 2 ? 'lit' : ''}`}>
            <Database size={23} />
            <span>Источники</span>
          </div>
          <div className="agent-photo photo-one">
            <img src="/images/coast.jpg" alt="" />
            <span>Море внутри</span>
          </div>
          <div className="agent-photo photo-two">
            <img src="/images/mountains.jpg" alt="" />
            <span>Высота</span>
          </div>
          <div className="live-insight" key={step}>
            <span className="green-dot" />
            <div>
              <strong>
                {
                  [
                    'В вашем запросе есть история',
                    'У каждого фасада — свой вид',
                    'Проверяем, где источники расходятся',
                    'Не всё можно увидеть на карте',
                    'Ваши варианты почти готовы',
                  ][step]
                }
              </strong>
              <span>
                {
                  [
                    'Ищем место, которое её продолжит',
                    'Даже у одного отеля окна бывают разными',
                    'Неопределённость тоже часть ответа',
                    'Поэтому задаём точные вопросы отельеру',
                    'С совпадениями, нюансами и источниками',
                  ][step]
                }
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="demo-note centered">
        <ShieldCheck size={16} />
        Симуляция на 6 демоотелях. Внешние API и реальные отельеры не задействованы.
      </div>
    </main>
  )
}
