import { Footer, Header } from '../components/chrome';
import { allPhotos } from '../lib/photos';

export default function CreditsPage() {
  const list = allPhotos();
  return (
    <div className="canvas-page">
      <Header />
      <main className="credits">
        <h1 className="page-title">Авторы фотографий и данных</h1>
        <p className="lead">Все фото — демонстрационные иллюстрации из Wikimedia Commons под свободными лицензиями. Они не изображают конкретные отели из прототипа.</p>
        <section className="card-w data-src">
          <h2 className="h-sm">Данные</h2>
          <ul>
            <li>Карта, здания, дороги, POI — © участники OpenStreetMap, лицензия ODbL</li>
            <li>Рельеф — Copernicus DEM GLO-30, © DLR e.V. / Airbus, предоставлено Европейским союзом</li>
            <li>Климат и температура воды — Open-Meteo, CC BY 4.0</li>
            <li>Подложка карты — OpenFreeMap, © OpenMapTiles</li>
          </ul>
        </section>
        <div className="credit-grid">
          {list.map(([k, m]) => (
            <a key={k} className="card-w credit" href={m.page} target="_blank" rel="noreferrer">
              <img src={m.src} alt="" loading="lazy" />
              <b>{m.title.replace(/^File:/, '').replace(/\.[a-z]+$/i, '')}</b>
              <span>{m.author} · {m.license}</span>
            </a>
          ))}
        </div>
        {!list.length && <p className="muted">Демо-фото ещё не скачаны: запустите <code>node scripts/fetch-demo-photos.mjs</code>.</p>}
      </main>
      <Footer />
    </div>
  );
}
