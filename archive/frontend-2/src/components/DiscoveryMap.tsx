import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  ArrowUpRight,
  Coffee,
  Compass,
  Layers,
  Minus,
  Plus,
  Trees,
  Volume2,
  Waves,
} from 'lucide-react'
import { type Hotel } from '../data'
import { money } from '../search'

export function DiscoveryMap({
  hotels,
  selected,
  onSelect,
  small = false,
}: {
  hotels: Hotel[]
  selected?: string
  onSelect?: (id: string) => void
  small?: boolean
}) {
  const [layer, setLayer] = useState<'stays' | 'noise' | 'places'>('stays')
  const [zoom, setZoom] = useState(1)
  const location = useLocation()
  const active = hotels.find((h) => h.id === selected)
  return (
    <div className={`discovery-map ${small ? 'small' : ''}`}>
      <div className="map-top">
        <span>
          <MapGlyph />
          Большой Сочи
        </span>
        <div className="map-layers" aria-label="Слои карты">
          <button
            aria-label="Отели на карте"
            aria-pressed={layer === 'stays'}
            className={layer === 'stays' ? 'active' : ''}
            onClick={() => setLayer('stays')}
          >
            <Layers size={15} />
            Отели
          </button>
          <button
            aria-label="Слой шума"
            aria-pressed={layer === 'noise'}
            className={layer === 'noise' ? 'active' : ''}
            onClick={() => setLayer('noise')}
          >
            <Volume2 size={15} />
            Шум
          </button>
          <button
            aria-label="Места рядом"
            aria-pressed={layer === 'places'}
            className={layer === 'places' ? 'active' : ''}
            onClick={() => setLayer('places')}
          >
            <Coffee size={15} />
            Рядом
          </button>
        </div>
      </div>
      <div className="map-geography" style={{ transform: `scale(${zoom})` }}>
        <svg
          className="map-base"
          viewBox="0 0 640 740"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <pattern
              id="map-blocks"
              width="62"
              height="52"
              patternTransform="rotate(-22)"
              patternUnits="userSpaceOnUse"
            >
              <rect width="62" height="52" fill="#f1efe7" />
              <rect x="5" y="5" width="22" height="17" rx="3" fill="#e5e2d8" />
              <rect x="32" y="6" width="21" height="34" rx="4" fill="#e7e4db" />
              <path d="M0 47h62M58 0v52" stroke="#fff" strokeWidth="7" />
            </pattern>
            <filter id="noise-blur">
              <feGaussianBlur stdDeviation="18" />
            </filter>
          </defs>
          <rect width="640" height="740" fill="#dae9ec" />
          <path
            d="M0 0H640V740H520L455 650 401 580 355 510 293 451 247 374 191 302 131 221 67 136 0 84Z"
            fill="url(#map-blocks)"
          />
          <path d="M400 0L350 100 427 193 470 280 550 312 640 289V0Z" fill="#dfe9cf" />
          <path d="M510 0L468 94 519 170 553 219 640 190V0Z" fill="#cfdcb9" />
          <path d="M305 185q37-37 67-2l40 85q7 39-34 42l-44-27Z" fill="#d6e3c5" />
          <path
            d="M73 82C131 151 166 198 223 286S318 410 393 494 465 607 550 740"
            fill="none"
            stroke="#fff"
            strokeWidth="17"
          />
          <path
            d="M73 82C131 151 166 198 223 286S318 410 393 494 465 607 550 740"
            fill="none"
            stroke="#e1caa1"
            strokeWidth="6"
          />
          <path
            d="M133 0C138 94 229 151 259 240S365 342 418 420 514 563 640 614"
            fill="none"
            stroke="#fff"
            strokeWidth="11"
          />
          <path
            d="M292 0q-43 140 71 188t75 144 85 107 117 52"
            fill="none"
            stroke="#b8d6dc"
            strokeWidth="10"
          />
          <path
            d="M225 40L52 271M354 143L138 397M436 277L261 526M558 378L348 658M623 522L451 740"
            stroke="#fff"
            strokeWidth="5"
          />
          <path
            d="M0 93L91 197 157 285 217 371 276 455 344 526 397 600 446 683 480 740"
            fill="none"
            stroke="#fff7dc"
            strokeWidth="7"
          />
          <path
            d="M0 103L91 207 157 295 217 381 276 465 344 536 397 610 446 693 480 750"
            fill="none"
            stroke="#bfc3b9"
            strokeWidth="2"
            strokeDasharray="5 5"
          />
          {layer === 'noise' && (
            <g filter="url(#noise-blur)" opacity=".38">
              <path
                d="M73 82C131 151 166 198 223 286S318 410 393 494 465 607 550 740"
                fill="none"
                stroke="#e6a066"
                strokeWidth="46"
              />
              <ellipse cx="500" cy="540" rx="55" ry="70" fill="#e59577" />
            </g>
          )}
        </svg>
        <span className="map-label label-sea">
          Чёрное море<span>43°27′ с. ш.</span>
        </span>
        <span className="map-label label-sochi">СОЧИ</span>
        <span className="map-label label-hosta">ХОСТА</span>
        <span className="map-label label-adler">АДЛЕР</span>
        <span className="map-label label-mountains">
          КРАСНАЯ ПОЛЯНА<span>в сторону гор ↗</span>
        </span>
        <span className="map-road-label">Курортный проспект</span>
        {layer === 'places' && (
          <>
            <span className="poi poi-cafe" title="Кафе">
              <Coffee size={16} />
            </span>
            <span className="poi poi-park" title="Парк">
              <Trees size={16} />
            </span>
            <span className="poi poi-beach" title="Пляж">
              <Waves size={16} />
            </span>
          </>
        )}
        {hotels.map((hotel) => (
          <button
            key={hotel.id}
            onClick={() => onSelect?.(hotel.id)}
            aria-label={`На карте: ${hotel.name}, ${money(hotel.price)}`}
            aria-pressed={hotel.id === selected}
            className={`map-pin ${selected === hotel.id ? 'selected' : ''}`}
            style={{ left: `${hotel.position.x}%`, top: `${hotel.position.y}%` }}
          >
            {money(hotel.price)}
            <span />
          </button>
        ))}
      </div>
      <span className="map-north">
        <Compass size={22} />
        <span>С</span>
      </span>
      <div className="map-zoom">
        <button
          aria-label="Приблизить карту"
          disabled={zoom >= 1.8}
          onClick={() => setZoom((z) => Math.min(1.8, +(z + 0.2).toFixed(1)))}
        >
          <Plus size={19} />
        </button>
        <button
          aria-label="Отдалить карту"
          disabled={zoom <= 1}
          onClick={() => setZoom((z) => Math.max(1, +(z - 0.2).toFixed(1)))}
        >
          <Minus size={19} />
        </button>
      </div>
      {layer === 'noise' && (
        <div className="map-legend">
          <span />
          Тише
          <span />
          Шумнее<small>Модель, не замер</small>
        </div>
      )}
      {active && !small && (
        <div className="map-preview">
          <img src={active.image} alt="" />
          <div>
            <strong>{active.name}</strong>
            <span>{active.district}</span>
            <span>{money(active.price)} / ночь</span>
          </div>
          <Link
            to={'/hotel/' + active.id + location.search}
            aria-label={'Перейти к отелю ' + active.name}
          >
            <ArrowUpRight size={20} />
          </Link>
        </div>
      )}
      <div className="map-attribution">Схематичная карта · демо · геометрия условная</div>
    </div>
  )
}
function MapGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="m2 3 4-1 4 2 4-1v10l-4 1-4-2-4 1V3ZM6 2v10m4-8v10"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  )
}
