import type { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { setVariantsEnabled, useVariantsEnabled } from '@/features/landing-variants';
import { useHotelSelection } from '@/features/select-hotels';

export function Logo() {
  return <Link className="logo" href="/" aria-label="О!кно — на главную">О<b>!</b>кно</Link>;
}

export function Header({ tone = 'white', children }: { tone?: 'white' | 'lime' | 'clear'; children?: ReactNode }) {
  const pathname = usePathname() ?? '/';
  const { compare } = useHotelSelection();
  const role = pathname.startsWith('/partner') ? 'partner' : pathname.startsWith('/console') || pathname.startsWith('/developers') ? 'console' : 'guest';
  return (
    <header className={`top top-${tone}`}>
      <Logo />
      {children ?? (role === 'guest' && (
        <nav className="top-nav" aria-label="Разделы">
          <Link className={pathname === '/search' ? 'on' : ''} href="/search">Подбор</Link>
          <Link className={pathname.startsWith('/compare') ? 'on' : ''} href="/compare">Сравнение{compare.length > 0 && <span className="cnt-dot num">{compare.length}</span>}</Link>
          <Link className={pathname.startsWith('/trips') ? 'on' : ''} href="/trips/mayak">Мои поездки</Link>
          <Link className={pathname.startsWith('/me') ? 'on' : ''} href="/me">Профиль вкуса</Link>
        </nav>
      ))}
      <div className="roles" role="group" aria-label="Роль">
        <Link className={role === 'guest' ? 'on' : ''} href="/">Гость</Link>
        <Link className={role === 'partner' ? 'on' : ''} href="/partner">Отельер</Link>
        <Link className={role === 'console' ? 'on' : ''} href="/console">Островок</Link>
      </div>
    </header>
  );
}

export function Footer() {
  const variantsOn = useVariantsEnabled();
  const navigate = useRouter();
  return (
    <footer className="foot">
      <div className="foot-in">
        <div className="foot-brand">
          <Logo />
          <p>Прототип для трека «О!дин шаг до идеального отеля», О! Хакатон 2026. Регион — Большой Сочи.</p>
        </div>
        <div className="foot-col"><h4>Гостям</h4><Link href="/search">Подбор по желанию</Link><Link href="/compare">Сравнение</Link><Link href="/me">Профиль вкуса</Link><Link href="/trips/mayak">Мои поездки</Link></div>
        <div className="foot-col"><h4>Отелям</h4><Link href="/partner">Кабинет отеля</Link><Link href="/partner#facades">Разметка сторон</Link></div>
        <div className="foot-col"><h4>Островку</h4><Link href="/console">Консоль знаний</Link><Link href="/developers">API и MCP</Link></div>
        <div className="foot-col"><h4>Данные</h4><span>© OpenStreetMap contributors, ODbL</span><span>Copernicus DEM GLO-30</span><span>Open-Meteo, CC BY 4.0</span><Link href="/credits">Авторы фотографий</Link></div>
      </div>
      <div className="foot-b">
        Отели, цены, рейтинги, номера и история поездок — демо-данные. Фото — Wikimedia Commons, иллюстрации, не конкретный отель.
        <button type="button" className="foot-variants" onClick={() => { setVariantsEnabled(!variantsOn); if (!variantsOn) navigate.push('/'); }}>{variantsOn ? 'Выключить другие лендинги' : 'Включить другие лендинги'}</button>
      </div>
    </footer>
  );
}
