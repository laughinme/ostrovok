import { useRef, useState, useEffect, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  LayoutDashboard,
  MessageSquare,
  Pencil,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { useApp } from '../state'
import { type Fact } from '../data'
import { Eyebrow, EvidenceModal, Modal, Status, SunMark } from '../components/ui'

type ProfileKey = 'room' | 'quiet' | 'pets'
const questions: Record<
  ProfileKey,
  { title: string; question: string; example: string; label: string }
> = {
  room: {
    title: 'Категории и вид из окна',
    label: 'Номера и фасад',
    question:
      'Мы рассчитали, что море и ноябрьский закат видны с юго-западного фасада, начиная с 4-го этажа. Какие категории номеров расположены на этой стороне?',
    example: 'Номера Делюкс на 4–6 этажах выходят на юго-запад.',
  },
  quiet: {
    title: 'Тишина ночью',
    label: 'Условия тишины',
    question:
      'Гостям важно высыпаться. С какой стороны тише ночью? Есть ли в этих номерах дополнительная шумоизоляция?',
    example: 'Тише со стороны сада. В номерах двойное остекление, ночью около 32 дБ.',
  },
  pets: {
    title: 'Условия с питомцем',
    label: 'Проживание с питомцем',
    question: 'Можно ли приехать с питомцем? Подскажите допустимый вес и дополнительные условия.',
    example: 'Принимаем собак и кошек до 10 кг. Доплата 1 500 ₽ за всё проживание.',
  },
}
function extractAnswer(key: ProfileKey, answer: string): string | null {
  const text = answer.trim()
  if (key === 'room') {
    const floor = text.match(/([1-6])\s*[-–—]\s*([1-6])\s*этаж/iu)
    const one = text.match(/([1-6])(?:-?[а-я]*)?\s*этаж/iu)
    const side = text.match(
      /юго[- ]?запад|северо[- ]?запад|юго[- ]?восток|северо[- ]?восток|запад|восток|юг|север/iu,
    )
    const category = text.match(/делюкс|апартамент[ыа]?|комфорт|стандарт|люкс/iu)
    if (!floor && !one && !side && !category) return null
    const parts = [
      category ? category[0][0].toUpperCase() + category[0].slice(1).toLowerCase() : '',
      floor ? `этажи ${floor[1]}–${floor[2]}` : one ? `этаж ${one[1]}` : '',
      side?.[0].toLowerCase() || '',
    ].filter(Boolean)
    return parts.join(' · ')
  }
  if (key === 'quiet')
    return /тих|двор|сад|остекл|шумо|\d+\s*дб|шум/iu.test(text) ? text.slice(0, 300) : null
  return /кг|питом|собак|кош|нельзя|запрещ|животн/iu.test(text) ? text.slice(0, 300) : null
}
export function Partner() {
  const app = useApp(),
    hotel = app.hotels[0]
  const [view, setView] = useState('overview'),
    [evidence, setEvidence] = useState<Fact | null>(null)
  const [editing, setEditing] = useState(false),
    [draftProfile, setDraftProfile] = useState(app.profile)
  const [questionKey, setQuestionKey] = useState<ProfileKey>('room')
  const [input, setInput] = useState(''),
    [messages, setMessages] = useState<{ role: 'user' | 'agent'; text: string }[]>([])
  const [proposal, setProposal] = useState<{ key: ProfileKey; value: string } | null>(null),
    [busy, setBusy] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined),
    chatEnd = useRef<HTMLDivElement>(null)
  useEffect(() => () => clearTimeout(timer.current), [])
  useEffect(() => {
    if (messages.length) chatEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [messages, proposal])
  const openEdit = () => {
    setDraftProfile(app.profile)
    setEditing(true)
  }
  const sendAnswer = (event: FormEvent) => {
    event.preventDefault()
    if (!input.trim() || busy) return
    const answer = input.trim(),
      key = questionKey
    setMessages((m) => [...m, { role: 'user', text: answer }])
    setInput('')
    setBusy(true)
    setProposal(null)
    timer.current = setTimeout(() => {
      const value = extractAnswer(key, answer)
      setBusy(false)
      if (value) {
        setProposal({ key, value })
        setMessages((m) => [
          ...m,
          {
            role: 'agent',
            text: 'Вот что получилось извлечь из ответа. Проверьте формулировку и подтвердите — только после этого обновим сведения для гостей.',
          },
        ])
      } else
        setMessages((m) => [
          ...m,
          {
            role: 'agent',
            text:
              'Пока не получилось выделить конкретные данные. Подскажите, пожалуйста: ' +
              questions[key].example,
          },
        ])
    }, 900)
  }
  const applyProposal = () => {
    if (!proposal) return
    app.saveProfile({
      ...app.profile,
      [proposal.key]: proposal.value,
      confirmed: proposal.key === 'room' ? true : app.profile.confirmed,
      updated:
        proposal.key === 'room'
          ? app.profile.updated
          : [...new Set([...(app.profile.updated || []), proposal.key])],
    })
    setMessages((m) => [
      ...m,
      {
        role: 'agent',
        text: 'Готово! Подтверждённый ответ сохранён локально и доступен в характеристиках отеля. Спасибо, что помогаете гостям выбрать точнее.',
      },
    ])
    setProposal(null)
    app.notify('Сведения обновлены в демокаталоге')
  }
  return (
    <main className="partner-page">
      <div className="partner-layout container">
        <aside className="partner-nav">
          <div className="partner-property">
            <img src="/images/terrace.jpg" alt="" />
            <div>
              <strong>Море внутри</strong>
              <span>Хоста · отель 4★</span>
            </div>
            <span className="green-dot" />
          </div>
          <span className="partner-nav-label">ВАШ КАБИНЕТ</span>
          {[
            ['overview', 'Обзор', LayoutDashboard],
            ['facts', 'Характеристики', ClipboardList],
            ['chat', 'Диалог с Лучом', MessageSquare],
          ].map(([key, label, Icon]) => {
            const I = Icon as typeof LayoutDashboard
            return (
              <button
                className={view === key ? 'active' : ''}
                key={String(key)}
                onClick={() => setView(String(key))}
              >
                <I size={17} />
                {String(label)}
                {key === 'chat' && !app.profile.confirmed && <span>1</span>}
              </button>
            )
          })}
          <div className="partner-nav-bottom">
            <SunMark />
            <strong>
              Один ответ.
              <br />
              Много точных совпадений.
            </strong>
            <p>Помогите гостям узнать ваш отель с его лучшей стороны.</p>
            <Link to="/hotel/more-vnutri">
              Глазами гостя
              <ArrowUpRight size={15} />
            </Link>
          </div>
        </aside>
        <div className="partner-main">
          <div className="partner-page-heading">
            <div>
              <Eyebrow>ГОСТЕПРИИМСТВО НАЧИНАЕТСЯ ДО ЗАЕЗДА</Eyebrow>
              <h1>
                {view === 'chat'
                  ? 'Давайте узнаем вас лучше.'
                  : view === 'facts'
                    ? 'Ваши сильные стороны.'
                    : 'Ваш отель. Чуть ближе к гостям.'}
              </h1>
              <p>
                {view === 'chat'
                  ? 'Луч спрашивает только о том, чего ещё не знает.'
                  : 'Подтверждайте факты, чтобы вас находили именно ваши гости.'}
              </p>
            </div>
            <span className="partner-demo-label">Демокабинет</span>
          </div>
          {view === 'overview' && (
            <>
              <div className="partner-stats">
                <article>
                  <span>Изучено характеристик</span>
                  <strong>
                    06<span>/ 06</span>
                  </strong>
                  <p>
                    <Check size={13} />В демопрофиле отеля
                  </p>
                </article>
                <article>
                  <span>Подтверждено отельером</span>
                  <strong>{app.profile.confirmed ? '02' : '01'}</strong>
                  <p>
                    <ShieldCheck size={13} />
                    Ответы видны гостям
                  </p>
                </article>
                <article>
                  <span>Вопросы к вам</span>
                  <strong>
                    {app.profile.confirmed ? '00' : '01'}
                    <span className="lime-stat-dot" />
                  </strong>
                  <p>
                    {app.profile.confirmed ? 'Всё важное подтвердили' : 'Остался один важный ответ'}
                  </p>
                </article>
              </div>
              <div className={`partner-action-card ${app.profile.confirmed ? 'confirmed' : ''}`}>
                <div className="partner-action-icon">
                  {app.profile.confirmed ? <CheckCheck size={31} /> : <Sparkles size={31} />}
                </div>
                <div>
                  <span>
                    {app.profile.confirmed
                      ? 'ВЫ ПОМОГЛИ СДЕЛАТЬ ВЫБОР ТОЧНЕЕ'
                      : 'КОМУ-ТО НУЖЕН ИМЕННО ВАШ ВИД'}
                  </span>
                  <h2>
                    {app.profile.confirmed
                      ? 'Теперь мы знаем, какой номер советовать.'
                      : 'С какого номера начинается море?'}
                  </h2>
                  <p>
                    {app.profile.confirmed
                      ? app.profile.room
                      : 'Луч нашёл подходящий фасад. Осталось узнать, какие категории номеров выходят на эту сторону.'}
                  </p>
                </div>
                <button className="button primary small" onClick={() => setView('chat')}>
                  {app.profile.confirmed ? 'Продолжить диалог' : 'Ответить Лучу'}
                  <ArrowRight size={17} />
                </button>
              </div>
              <div className="section-heading small-heading">
                <div>
                  <h2>Вот что Луч уже узнал</h2>
                  <p>Под каждым выводом — источник. Вы можете его проверить.</p>
                </div>
                <button className="text-link" onClick={() => setView('facts')}>
                  Все сведения
                  <ArrowRight size={16} />
                </button>
              </div>
              <div className="partner-fact-list">
                {hotel.facts.slice(0, 5).map((fact) => (
                  <button key={fact.id} onClick={() => setEvidence(fact)}>
                    <span>
                      <strong>{fact.title}</strong>
                      <span>{fact.value}</span>
                    </span>
                    <Status status={fact.status} />
                    <ChevronRight size={16} />
                  </button>
                ))}
              </div>
              <div className="partner-bottom-note">
                <ShieldCheck size={21} />
                <p>
                  Всё прозрачно: ответы сохраняются только на этом устройстве.{' '}
                  <strong>Это демонстрация кабинета, а не реальные данные объекта.</strong>
                </p>
              </div>
            </>
          )}
          {view === 'facts' && (
            <>
              <div className="partner-profile-card">
                <div className="section-heading small-heading">
                  <div>
                    <h2>То, что знаете только вы</h2>
                    <p>Управляйте условиями проживания и категориями.</p>
                  </div>
                  <button className="button outline small" onClick={openEdit}>
                    <Pencil size={15} />
                    Изменить
                  </button>
                </div>
                {(['room', 'quiet', 'pets'] as ProfileKey[]).map((key) => (
                  <div className="profile-data-row" key={key}>
                    <span>{questions[key].label}</span>
                    <strong>{app.profile[key]}</strong>
                  </div>
                ))}
                {app.profile.confirmed && (
                  <p className="profile-confirmed">
                    <CheckCheck size={16} />
                    Привязка категорий к фасаду подтверждена вами
                  </p>
                )}
              </div>
              <div className="partner-fact-list">
                {hotel.facts.map((fact) => (
                  <button key={fact.id} onClick={() => setEvidence(fact)}>
                    <span>
                      <strong>{fact.title}</strong>
                      <span>{fact.value}</span>
                    </span>
                    <Status status={fact.status} />
                    <ChevronRight size={16} />
                  </button>
                ))}
              </div>
            </>
          )}
          {view === 'chat' && (
            <div className="partner-chat-layout">
              <div className="agent-chat">
                <div className="chat-heading">
                  <span className="chat-avatar">
                    <SunMark />
                  </span>
                  <div>
                    <strong>Луч · ваш AI-исследователь</strong>
                    <span>
                      <span className="green-dot" />
                      Демонстрационный диалог
                    </span>
                  </div>
                  <ShieldCheck size={18} />
                </div>
                <div className="chat-messages">
                  <div className="chat-date">Сегодня · локальная симуляция</div>
                  <div className="chat-message agent">
                    <span className="message-agent-icon">
                      <Sparkles size={15} />
                    </span>
                    <div>
                      <span>ЛУЧ</span>
                      <p>{questions[questionKey].question}</p>
                    </div>
                  </div>
                  {messages.map((message, i) => (
                    <div key={i} className={`chat-message ${message.role}`}>
                      <div>
                        {message.role === 'agent' && <span>ЛУЧ</span>}
                        <p>{message.text}</p>
                      </div>
                    </div>
                  ))}
                  {busy && (
                    <div className="chat-thinking">
                      <Sparkles size={15} />
                      <span>Выделяем факты из вашего ответа…</span>
                    </div>
                  )}
                  {proposal && (
                    <div className="extracted-fact">
                      <span>
                        <Sparkles size={14} />
                        ИЗВЛЕЧЕНО ИЗ ОТВЕТА
                      </span>
                      <strong>{questions[proposal.key].label}</strong>
                      <p>{proposal.value}</p>
                      <div>
                        <button className="button primary small" onClick={applyProposal}>
                          Подтвердить и применить
                          <Check size={15} />
                        </button>
                        <button
                          className="text-link"
                          onClick={() => {
                            setDraftProfile({ ...app.profile, [proposal.key]: proposal.value })
                            setEditing(true)
                          }}
                        >
                          Исправить
                          <Pencil size={13} />
                        </button>
                      </div>
                    </div>
                  )}
                  <div ref={chatEnd} />
                </div>
                <form className="chat-form" onSubmit={sendAnswer}>
                  <label htmlFor="agent-answer" className="sr-only">
                    Ответ агенту
                  </label>
                  <textarea
                    id="agent-answer"
                    value={input}
                    maxLength={600}
                    placeholder="Ответьте своими словами…"
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        e.currentTarget.form?.requestSubmit()
                      }
                    }}
                    rows={2}
                  />
                  <button
                    type="submit"
                    aria-label="Отправить ответ агенту"
                    disabled={!input.trim() || busy}
                  >
                    <Send size={18} />
                  </button>
                </form>
                <p className="chat-form-note">Enter — отправить · Shift + Enter — новая строка</p>
              </div>
              <aside className="chat-context">
                <h3>О чём поговорим</h3>
                {(Object.keys(questions) as ProfileKey[]).map((key) => (
                  <button
                    disabled={busy}
                    className={key === questionKey ? 'active' : ''}
                    key={key}
                    onClick={() => {
                      setQuestionKey(key)
                      setMessages([])
                      setProposal(null)
                      setInput('')
                    }}
                  >
                    {key === 'room' && app.profile.confirmed ? (
                      <Check size={15} />
                    ) : (
                      <CircleHelp size={15} />
                    )}
                    {questions[key].title}
                    <ChevronRight size={14} />
                  </button>
                ))}
                <div className="sample-answer">
                  <span>МОЖНО ОТВЕТИТЬ, НАПРИМЕР</span>
                  <p>«{questions[questionKey].example}»</p>
                  <button
                    className="text-link"
                    onClick={() => setInput(questions[questionKey].example)}
                  >
                    Использовать пример
                    <Plus size={14} />
                  </button>
                </div>
                <div className="demo-note">
                  <ShieldCheck size={16} />
                  <span>
                    Текст разбирается локальными правилами. Проверьте результат перед
                    подтверждением.
                  </span>
                </div>
              </aside>
            </div>
          )}
        </div>
      </div>
      {evidence && <EvidenceModal fact={evidence} onClose={() => setEvidence(null)} />}
      {editing && (
        <Modal title="Сведения от отельера" onClose={() => setEditing(false)}>
          <form
            className="settings-form"
            onSubmit={(e) => {
              e.preventDefault()
              app.saveProfile({ ...draftProfile, confirmed: true, updated: ['quiet', 'pets'] })
              setEditing(false)
              setProposal(null)
              app.notify('Профиль обновлён. Подтверждение видно в карточке отеля.')
            }}
          >
            {(['room', 'quiet', 'pets'] as ProfileKey[]).map((key) => (
              <label key={key}>
                {questions[key].label}
                <textarea
                  value={draftProfile[key]}
                  maxLength={300}
                  rows={2}
                  required
                  onChange={(e) => setDraftProfile({ ...draftProfile, [key]: e.target.value })}
                />
              </label>
            ))}
            <p className="fine-print">
              Сохраняя, вы подтверждаете сведения в демопрофиле. Они остаются на этом устройстве.
            </p>
            <button className="button primary full" type="submit">
              Подтвердить и сохранить
              <Check size={17} />
            </button>
          </form>
        </Modal>
      )}
    </main>
  )
}
