import { ArrowUpRight, BusFront, CarFront, Check, Footprints, LoaderCircle } from "lucide-react";
import {
  travelTime,
  yandexDirections,
  type TravelMode,
  type TravelOption,
} from "../model/travel-options";
import "./hotel-travel-options.css";

const labels = { walk: "Пешком", car: "На машине", transit: "Общественный транспорт" };
const icons = { walk: Footprints, car: CarFront, transit: BusFront };

export function HotelTravelOptions({
  options,
  selected,
  onSelect,
  origin,
  destination,
  name,
  externalEnabled = true,
}: {
  options: TravelOption[];
  selected: TravelMode;
  onSelect(mode: TravelMode): void;
  origin: [number, number];
  destination: [number, number] | undefined;
  name: string;
  externalEnabled?: boolean;
}) {
  const fastest = options.some((option) => option.pending)
    ? undefined
    : options.find((option) => option.minutes !== null && !option.error)?.mode;
  return (
    <section className="hotel-travel-options" aria-label="Способы добраться">
      <header>
        <h3>Как добраться</h3>
        <span>Сначала быстрее</span>
      </header>
      <p className="travel-options-destination">{name || "Выберите пункт назначения"}</p>
      <ol>
        {options.map((option) => {
          const Icon = icons[option.mode];
          const external = externalEnabled && !option.drawing && !!destination && !option.pending;
          const content = (
            <>
              <Icon size={20} aria-hidden="true" />
              <span className="travel-option-copy">
                <b>{labels[option.mode]}</b>
                <small>{option.note}</small>
                {fastest === option.mode && (
                  <span className="travel-option-fastest">Быстрее из рассчитанных</span>
                )}
              </span>
              <span className="travel-option-time">
                {option.pending ? (
                  <LoaderCircle
                    size={18}
                    className="travel-option-spinner"
                    aria-label="Рассчитываем время"
                  />
                ) : option.minutes === null ? (
                  <>
                    <span>{external ? "Уточнить" : "-"}</span>
                    {external && <ArrowUpRight size={14} />}
                  </>
                ) : (
                  travelTime(option.minutes)
                )}
                {option.drawing && selected === option.mode && (
                  <Check size={15} aria-label="Выбран" />
                )}
              </span>
            </>
          );
          return (
            <li key={option.mode} data-mode={option.mode}>
              {external ? (
                <a
                  href={yandexDirections(origin, destination!, option.mode)}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${labels[option.mode]} - открыть маршрут в Яндекс Картах`}
                >
                  {content}
                </a>
              ) : (
                <button
                  type="button"
                  disabled={!option.drawing}
                  aria-pressed={!!option.drawing && selected === option.mode}
                  onClick={() => onSelect(option.mode)}
                >
                  {content}
                </button>
              )}
            </li>
          );
        })}
      </ol>
      {options.some((option) => option.mode === "transit" && option.minutes === null) && (
        <p className="travel-options-note">
          Для транспорта нужны актуальные рейсы и ожидание. Время можно проверить в Яндекс Картах.
        </p>
      )}
    </section>
  );
}
