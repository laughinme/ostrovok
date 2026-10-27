'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Header } from '@/widgets/site-chrome';
import { Demo, Icon, Mark } from '@/shared/ui/primitives';
import { Panorama, Photo } from '@/shared/ui/visuals';
import { byId } from '@/entities/hotel/api/demo';
import { FACADE_NAME } from '@/shared/lib/building';
import { rub } from '@/shared/lib/format';

const EXTRA = ['ранний заезд', 'место для собаки 30 кг', 'кроватка для ребёнка'];

export default function BookPage() {
  const h = byId(useParams<{ id: string }>()?.id);
  const sp = useSearchParams();
  const nav = useRouter();
  const room = h.rooms.find((r) => r.id === sp?.get('room')) ?? h.rooms.find((r) => r.recommended) ?? h.rooms[0];
  const rate = room.rates[+(sp?.get('rate') ?? 0)] ?? room.rates[0];
  const base = (room.request ?? '').split(' · ').filter(Boolean);
  const [req, setReq] = useState(new Set(base));
  const [pay, setPay] = useState<'now' | 'later'>('now');
  const all = [...base, ...EXTRA];
  const nights = 5;

  return (
    <div className="canvas-page">
      <Header />
      <main className="book">
        <div className="book-main">
          <Link className="pill-btn" href={`/hotels/${h.id}`}><Icon name="back" size={16} />{h.name}</Link>
          <h1 className="page-title">Бронь в один шаг</h1>
          <p className="lead">Мы уже знаем, какой номер вам нужен. Отель получит запрос вместе с бронью.</p>

          <section className="card-w">
            <h2 className="h-sm">Запрос отелю</h2>
            <div className="req-chips">
              {all.map((t) => (
                <button key={t} className={`rc${req.has(t) ? ' on' : ''}`} aria-pressed={req.has(t)} onClick={() => setReq((s) => { const n = new Set(s); if (n.has(t)) n.delete(t); else n.add(t); return n; })}><span className="box" />{t}</button>
              ))}
            </div>
            <div className="preview"><span className="lbl">Отель увидит</span>{req.size ? `Гость просит: ${[...req].join(', ')}.` : 'Без особых пожеланий.'}</div>
            <p className="why-req"><Mark v="yes" /> «{base[1] ?? 'этаж'}» добавили сами: ниже море закрывают дома напротив, а шум ж/д сильнее.</p>
          </section>

          <section className="card-w">
            <h2 className="h-sm">Гость</h2>
            <div className="fields">
              <label className="f"><span>Имя и фамилия</span><input defaultValue="Анна Демо" /></label>
              <label className="f"><span>Телефон</span><input defaultValue="+7 900 000-00-00" /></label>
              <label className="f"><span>Почта</span><input defaultValue="anna@demo.ru" /></label>
              <label className="f"><span>Гостей</span><input defaultValue="2 взрослых" /></label>
            </div>
          </section>

          <section className="card-w">
            <h2 className="h-sm">Оплата <Demo>имитация</Demo></h2>
            <div className="pay">
              <label className={pay === 'now' ? 'on' : ''}><input type="radio" name="pay" checked={pay === 'now'} onChange={() => setPay('now')} /><span>Картой сейчас<small>Бесплатная отмена до 8 ноября</small></span></label>
              <label className={pay === 'later' ? 'on' : ''}><input type="radio" name="pay" checked={pay === 'later'} onChange={() => setPay('later')} /><span>При заезде<small>Отель держит номер до 18:00</small></span></label>
            </div>
          </section>
        </div>
        <aside className="book-side">
          <div className="card-w sum">
            <div className="sum-media"><Photo k={room.photo} alt={room.name} credit={false} /><span className="sum-view"><Panorama facade={room.facades[0]} floor={Math.max(4, room.floors[0])} labels={false} /></span></div>
            <h3>{h.name} · {room.name}</h3>
            <div className="row"><span>Даты</span><span className="num">10–15 ноября · {nights} ночей</span></div>
            <div className="row"><span>Сторона и этаж</span><span>{room.facades.map((f) => FACADE_NAME[f]).join(' + ')} · {room.floors.join('–')}</span></div>
            <div className="row"><span>Питание</span><span>{rate.meal}</span></div>
            <div className="row"><span>{rub(rate.price)} × {nights}</span><span className="num">{rub(rate.price * nights)}</span></div>
            <div className="total"><span className="muted">Итого <Demo /></span><b className="num">{rub(rate.price * nights)}</b></div>
            <button className="btn btn-primary wide-btn" onClick={() => nav.push(`/trips/${h.id}`)}>Забронировать</button>
            <div className="promise"><Mark v="yes" /><span>Если отель не подтвердит сторону и этаж — предложим замену или вернём деньги.</span></div>
          </div>
        </aside>
      </main>
    </div>
  );
}
