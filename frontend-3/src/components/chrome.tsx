import type { ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router';
import { setVariantsEnabled, useVariantsEnabled } from '../lib/variants';
import { useStore } from '../state/store';

export function Logo() {
  return <Link className="logo" to="/" aria-label="О!кно — на главную">О<b>!</b>кно</Link>;
}

export function Header({ tone = 'white', children }: { tone?: 'white' | 'lime' | 'clear'; children?: ReactNode }) {
  const { pathname } = useLocation();
  const { compare } = useStore();
  const role = pathname.startsWith('/partner') ? 'partner' : pathname.startsWith('/console') || pathname.startsWith('/developers') ? 'console' : 'guest';
  return (
    <header className={`top top-${tone}`}>
      <Logo />
      {children ?? (role === 'guest' && (
        <nav className="top-nav" aria-label="Разделы">
          <NavLink to="/search" end>Подбор</NavLink>
          <NavLink to="/compare">Сравнение{compare.length > 0 && <span className="cnt-dot num">{compare.length}</span>}</NavLink>
          <NavLink to="/trips/mayak">Мои поездки</NavLink>
          <NavLink to="/me">Профиль вкуса</NavLink>
        </nav>
      ))}
      <div className="roles" role="group" aria-label="Роль">
        <Link className={role === 'guest' ? 'on' : ''} to="/">Гость</Link>
        <Link className={role === 'partner' ? 'on' : ''} to="/partner">Отельер</Link>
        <Link className={role === 'console' ? 'on' : ''} to="/console">Островок</Link>
      </div>
    </header>
  );
}

export function Footer() {
  const variantsOn = useVariantsEnabled();
  const navigate = useNavigate();
  return (
    <footer className="foot">
      <div className="foot-in">
        <div className="foot-brand">
          <Logo />
          <p>Прототип для трека «О!дин шаг до идеального отеля», О! Хакатон 2026. Регион — Большой Сочи.</p>
        </div>
        <div className="foot-col"><h4>Гостям</h4><Link to="/search">Подбор по желанию</Link><Link to="/compare">Сравнение</Link><Link to="/me">Профиль вкуса</Link><Link to="/trips/mayak">Мои поездки</Link></div>
        <div className="foot-col"><h4>Отелям</h4><Link to="/partner">Кабинет отеля</Link><Link to="/partner#facades">Разметка сторон</Link></div>
        <div className="foot-col"><h4>Островку</h4><Link to="/console">Консоль знаний</Link><Link to="/developers">API и MCP</Link></div>
        <div className="foot-col"><h4>Данные</h4><span>© OpenStreetMap contributors, ODbL</span><span>Copernicus DEM GLO-30</span><span>Open-Meteo, CC BY 4.0</span><Link to="/credits">Авторы фотографий</Link></div>
      </div>
      <div className="foot-b">
        Отели, цены, рейтинги, номера и история поездок — демо-данные. Фото — Wikimedia Commons, иллюстрации, не конкретный отель.
        <button type="button" className="foot-variants" onClick={() => { setVariantsEnabled(!variantsOn); if (!variantsOn) navigate('/'); }}>{variantsOn ? 'Выключить другие лендинги' : 'Включить другие лендинги'}</button>
      </div>
    </footer>
  );
}
