import { Logo } from "@/widgets/site-header";
import { Link } from "@tanstack/react-router";

export function LandingFooter({
  variantsOn,
  onToggleVariants,
}: {
  variantsOn: boolean;
  onToggleVariants(): void;
}) {
  return (
    <footer className="foot">
      <div className="foot-in">
        <div className="foot-brand">
          <Logo className="logo" />
          <p>
            Прототип для трека «О!дин шаг до идеального отеля», О! Хакатон 2026. Регион - Большой
            Сочи.
          </p>
        </div>
        <div className="foot-col">
          <h4>Гостям</h4>
          <Link to="/results">Подбор по желанию</Link>
          <Link to="/compare">Сравнение</Link>
        </div>
        <div className="foot-col">
          <h4>Отелям</h4>
          <Link to="/partner">Кабинет отеля</Link>
        </div>
        <div className="foot-col">
          <h4>Данные</h4>
          <span>© OpenStreetMap contributors, ODbL</span>
          <span>Copernicus DEM GLO-30</span>
          <span>Open-Meteo, CC BY 4.0</span>
          <a href="/hotel-photos/credits.html">Фотографии, авторы и лицензии</a>
        </div>
      </div>
      <div className="foot-b">
        География и расчёты - по открытым данным. Цены, рейтинги и бронирование - демо. Фотографии
        для настроения.
        <button type="button" className="foot-variants" onClick={onToggleVariants}>
          {variantsOn ? "Выключить другие лендинги" : "Включить другие лендинги"}
        </button>
      </div>
    </footer>
  );
}
