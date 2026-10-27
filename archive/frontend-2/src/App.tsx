import { Component, useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, Check, GitCompareArrows, Heart, Menu, X } from 'lucide-react'
import { useApp } from './state'
import { money, tripSearch } from './search'
import { EmptyState, Modal, SunMark } from './components/ui'
import { Home } from './pages/Home'
import { Results } from './pages/Results'
import { HotelPage } from './pages/Hotel'
import { Compare } from './pages/Compare'
import { Partner } from './pages/Partner'
import { SearchProgress } from './pages/SearchProgress'
import { How } from './pages/How'

function Header() {
  const app = useApp(),
    location = useLocation()
  const [savedOpen, setSavedOpen] = useState(false),
    [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => {
    setMenuOpen(false)
    setSavedOpen(false)
  }, [location.pathname, location.search])
  return (
    <>
      <header className="site-header">
        <div className="header-inner container">
          <Link to="/" className="brand" aria-label="Луч от Островка — на главную">
            <span className="brand-mark">
              <SunMark />
            </span>
            <span className="brand-name">
              луч<span>ОТ ОСТРОВКА</span>
            </span>
          </Link>
          <nav className="desktop-nav" aria-label="Главная навигация">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                isActive ||
                ['/search', '/results'].includes(location.pathname) ||
                location.pathname.startsWith('/hotel/')
                  ? 'active'
                  : ''
              }
            >
              Найти свой отель
            </NavLink>
            <NavLink to="/how">Как это работает</NavLink>
          </nav>
          <div className="header-actions">
            <button
              className={`header-icon ${app.favorites.length ? 'has-items' : ''}`}
              aria-label={`Избранное, ${app.favorites.length} отелей`}
              onClick={() => setSavedOpen(true)}
            >
              <Heart size={19} />
              {app.favorites.length > 0 && <span>{app.favorites.length}</span>}
            </button>
            <Link
              className={`header-icon ${app.compare.length ? 'has-items' : ''}`}
              to={'/compare' + tripSearch(app.trip)}
              aria-label={`Сравнение, ${app.compare.length} отелей`}
            >
              <GitCompareArrows size={20} />
              {app.compare.length > 0 && <span>{app.compare.length}</span>}
            </Link>
            <span className="header-divider" />
            <Link className="owner-link" to="/partner">
              Отельерам
              <ArrowUpRight size={16} />
            </Link>
            <button
              className="mobile-menu-button icon-button"
              aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X size={21} /> : <Menu size={21} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className="mobile-nav" aria-label="Мобильная навигация">
            <Link to="/">
              Найти свой отель
              <ArrowUpRight size={16} />
            </Link>
            <Link to="/how">
              Как это работает
              <ArrowUpRight size={16} />
            </Link>
            <Link to="/partner">
              Кабинет отельера
              <ArrowUpRight size={16} />
            </Link>
            <Link to={'/compare' + tripSearch(app.trip)}>
              Сравнение
              <ArrowUpRight size={16} />
            </Link>
          </nav>
        )}
      </header>
      {savedOpen && (
        <Modal title="Места, к которым хочется вернуться" onClose={() => setSavedOpen(false)}>
          {!app.favorites.length ? (
            <EmptyState
              title="Сохраните то самое чувство"
              text="Нажмите на сердечко у отеля — и ваши особенные места будут здесь."
            >
              <Link
                className="button primary"
                to={'/results' + tripSearch(app.trip)}
                onClick={() => setSavedOpen(false)}
              >
                Найти своё место
                <ArrowRight size={17} />
              </Link>
            </EmptyState>
          ) : (
            <div className="saved-hotels">
              {app.hotels
                .filter((h) => app.favorites.includes(h.id))
                .map((hotel) => (
                  <div className="saved-hotel" key={hotel.id}>
                    <Link
                      to={'/hotel/' + hotel.id + tripSearch(app.trip)}
                      onClick={() => setSavedOpen(false)}
                    >
                      <img src={hotel.image} alt="" />
                      <span>
                        <strong>{hotel.name}</strong>
                        <span>{hotel.district}</span>
                        <span>{money(hotel.price)} / ночь</span>
                      </span>
                    </Link>
                    <button
                      className="icon-button"
                      aria-label={'Убрать из избранного ' + hotel.name}
                      onClick={() => app.toggleFavorite(hotel.id)}
                    >
                      <X size={17} />
                    </button>
                  </div>
                ))}
            </div>
          )}
        </Modal>
      )}
    </>
  )
}
function Footer() {
  return (
    <footer className="site-footer container">
      <div className="footer-top">
        <Link className="footer-brand" to="/">
          <SunMark />
          <strong>луч</strong>
          <span>
            Найдите место,
            <br />
            где вы — на своём месте.
          </span>
        </Link>
        <nav aria-label="Навигация внизу страницы">
          <Link to="/how">Как это работает</Link>
          <Link to="/partner">Отельерам</Link>
          <Link to="/compare">Сравнить отели</Link>
        </nav>
        <span className="footer-made">
          С заботой о ваших
          <br />
          будущих воспоминаниях <span>↗</span>
        </span>
      </div>
      <div className="footer-bottom">
        <span>© 2026 Луч · Концепт для О!Хакатона</span>
        <span>
          <span className="green-dot" />
          Деморежим · данные и фотографии иллюстративные
        </span>
        <span>Независимая версия 02</span>
      </div>
    </footer>
  )
}
class ErrorBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false }
  static getDerivedStateFromError() {
    return { error: true }
  }
  render() {
    return this.state.error ? (
      <main className="container">
        <EmptyState
          title="Кажется, нам нужна пауза"
          text="Не удалось отобразить страницу. Обновите её и попробуйте ещё раз."
        >
          <button className="button primary" onClick={() => window.location.reload()}>
            Обновить страницу
            <ArrowRight size={17} />
          </button>
        </EmptyState>
      </main>
    ) : (
      this.props.children
    )
  }
}
export function App() {
  const location = useLocation(),
    app = useApp()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    document.title =
      location.pathname === '/partner'
        ? 'Ваш отель — кабинет Луча'
        : location.pathname === '/compare'
          ? 'Видно разницу — Луч'
          : 'Луч — ваш особенный отель'
  }, [location.pathname, location.search])
  return (
    <ErrorBoundary>
      <a href="#main-content" className="skip-link">
        Перейти к содержимому
      </a>
      <Header />
      <div id="main-content" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<SearchProgress />} />
          <Route path="/results" element={<Results />} />
          <Route path="/hotel/:id" element={<HotelPage />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/partner" element={<Partner />} />
          <Route path="/how" element={<How />} />
          <Route
            path="*"
            element={
              <main className="container">
                <EmptyState
                  title="Здесь пока тихо"
                  text="Такой страницы нет, но ваше идеальное место уже где-то рядом."
                >
                  <Link to="/" className="button primary">
                    На главную
                    <ArrowRight size={17} />
                  </Link>
                </EmptyState>
              </main>
            }
          />
        </Routes>
      </div>
      <Footer />
      <div className={`toast ${app.toast ? 'visible' : ''}`} role="status" aria-live="polite">
        {app.toast && (
          <>
            <Check size={17} />
            {app.toast}
          </>
        )}
      </div>
    </ErrorBoundary>
  )
}
