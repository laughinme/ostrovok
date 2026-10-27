import { useEffect, useId, useRef, type ReactNode } from 'react'
import {
  X,
  Check,
  Sparkles,
  Waves,
  Moon,
  Sunset,
  Footprints,
  Laptop,
  Mountain,
  Baby,
  PawPrint,
  ArrowUpRight,
  ShieldCheck,
  CircleHelp,
  CircleAlert,
} from 'lucide-react'
import { criteria, type Criterion, type Fact, type FactStatus } from '../data'

export const criterionIcons = {
  quiet: Moon,
  sea: Waves,
  sunset: Sunset,
  walk: Footprints,
  work: Laptop,
  nature: Mountain,
  kids: Baby,
  pets: PawPrint,
}
export function SunMark({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="3.8" strokeLinecap="round">
        <path d="M24 4v9m0 22v9M4 24h9m22 0h9M10 10l6.3 6.3m15.4 15.4L38 38m0-28-6.3 6.3M16.3 31.7 10 38" />
      </g>
      <circle cx="24" cy="24" r="5" fill="currentColor" />
    </svg>
  )
}
export function Eyebrow({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return (
    <div className={`eyebrow ${light ? 'light' : ''}`}>
      <span className="tiny-sun">✳</span>
      {children}
    </div>
  )
}
export function CriterionChip({
  id,
  active,
  onClick,
  children,
}: {
  id: Criterion
  active?: boolean
  onClick?: () => void
  children?: ReactNode
}) {
  const Icon = criterionIcons[id]
  return (
    <button
      type="button"
      className={`criterion-chip ${active ? 'active' : ''}`}
      onClick={onClick}
      aria-pressed={active}
    >
      <Icon size={15} />
      {children || criteria[id].label}
      {active && <Check size={13} />}
    </button>
  )
}
export const statusNames: Record<FactStatus, string> = {
  confirmed: 'Подтверждено',
  calculated: 'Рассчитано',
  conflict: 'Есть противоречие',
  pending: 'Уточняем у отеля',
}
export function Status({ status }: { status: FactStatus }) {
  const Icon =
    status === 'confirmed'
      ? ShieldCheck
      : status === 'calculated'
        ? Sparkles
        : status === 'conflict'
          ? CircleAlert
          : CircleHelp
  return (
    <span className={`status status-${status}`}>
      <Icon size={13} />
      {statusNames[status]}
    </span>
  )
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
  className = '',
}: {
  title: string
  children: ReactNode
  onClose: () => void
  wide?: boolean
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const id = useId()
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const dialog = ref.current!
    const focusable = () =>
      [
        ...dialog.querySelectorAll<HTMLElement>(
          'button, a[href], input, select, textarea, [tabindex="0"]',
        ),
      ].filter((el) => !el.hasAttribute('disabled') && el.getClientRects().length > 0)
    ;(focusable()[0] || dialog).focus()
    const keydown = (e: KeyboardEvent) => {
      const dialogs = document.querySelectorAll('[role="dialog"]')
      if (dialogs[dialogs.length - 1] !== dialog) return
      if (e.key === 'Escape') close.current()
      if (e.key === 'Tab') {
        const items = focusable(),
          first = items[0],
          last = items[items.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }
    }
    document.addEventListener('keydown', keydown)
    return () => {
      document.body.style.overflow = overflow
      document.removeEventListener('keydown', keydown)
      previous?.focus()
    }
  }, [])
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        ref={ref}
        tabIndex={-1}
        className={`modal ${wide ? 'wide' : ''} ${className}`}
      >
        <div className="modal-heading">
          <h2 id={id}>{title}</h2>
          <button className="icon-button" aria-label="Закрыть окно" onClick={onClose}>
            <X size={21} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
export function EvidenceModal({ fact, onClose }: { fact: Fact; onClose: () => void }) {
  return (
    <Modal title="Почему мы так думаем" onClose={onClose}>
      <Status status={fact.status} />
      <h3 className="evidence-title">{fact.title}</h3>
      <p className="evidence-value">{fact.value}</p>
      <div className="confidence-line">
        <span>Достоверность в демомодели</span>
        <strong>{fact.confidence}%</strong>
      </div>
      <div className="progress-track">
        <span style={{ width: `${fact.confidence}%` }} />
      </div>
      <dl className="evidence-details">
        <dt>Источник</dt>
        <dd>{fact.source}</dd>
        <dt>Как получили</dt>
        <dd>{fact.method}</dd>
        <dt>Что важно учесть</dt>
        <dd>{fact.limitation}</dd>
        <dt>Обновлено</dt>
        <dd>{fact.checked}</dd>
      </dl>
      <div className="demo-note">
        <CircleHelp size={17} />
        <span>
          Это пример устройства системы доверия. Источники и вычисления симулируются; проценты не
          являются результатом измеренной калибровки.
        </span>
      </div>
    </Modal>
  )
}
export function EmptyState({
  title,
  text,
  children,
}: {
  title: string
  text: string
  children?: ReactNode
}) {
  return (
    <div className="empty-state">
      <SunMark />
      <h2>{title}</h2>
      <p>{text}</p>
      {children}
    </div>
  )
}
export function ArrowLink({ children }: { children: ReactNode }) {
  return (
    <span className="arrow-link">
      {children}
      <ArrowUpRight size={18} />
    </span>
  )
}
