import { StrictMode, lazy, Suspense, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router';
import SearchPage from './pages/Search';
import { StoreProvider } from './state/store';
import './styles/tokens.css';
import './styles/base.css';
import './styles/app.css';

const HotelPage = lazy(() => import('./pages/Hotel'));
const ComparePage = lazy(() => import('./pages/Compare'));
const BookPage = lazy(() => import('./pages/Book'));
const TripPage = lazy(() => import('./pages/Trip'));
const MePage = lazy(() => import('./pages/Me'));
const PartnerPage = lazy(() => import('./pages/Partner'));
const ConsolePage = lazy(() => import('./pages/Console'));
const DevelopersPage = lazy(() => import('./pages/Developers'));
const CreditsPage = lazy(() => import('./pages/Credits'));

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => { if (pathname !== '/search') window.scrollTo(0, 0); }, [pathname]);
  return null;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <BrowserRouter>
        <ScrollTop />
        <Suspense fallback={<div className="page-loading" />}>
          <Routes>
            <Route path="/" element={<SearchPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/hotels/:id" element={<HotelPage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/book/:id" element={<BookPage />} />
            <Route path="/trips/:id" element={<TripPage />} />
            <Route path="/me" element={<MePage />} />
            <Route path="/partner" element={<PartnerPage />} />
            <Route path="/console" element={<ConsolePage />} />
            <Route path="/developers" element={<DevelopersPage />} />
            <Route path="/credits" element={<CreditsPage />} />
            <Route path="*" element={<SearchPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </StoreProvider>
  </StrictMode>,
);
