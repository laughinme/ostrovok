import { ArrowUpRight, ChevronDown, MapPin } from "lucide-react";
import type { HotelDetails } from "../model/types";

function NearbyPlaces({ places }: { places: HotelDetails["nearby"] }) {
  return (
    <ul className="hotel-nearby-places">
      {places.map(([kind, name, distance], index) => (
        <li key={`${kind}-${name}-${index}`}>
          <MapPin size={15} aria-hidden="true" />
          <span>{name}</span>
          <b>{distance}</b>
        </li>
      ))}
    </ul>
  );
}

export function HotelNearby({
  places,
  onRoute,
}: {
  places: HotelDetails["nearby"];
  onRoute: () => void;
}) {
  return (
    <section
      className={`hotel-surroundings${places.length <= 3 ? " hotel-surroundings--compact" : ""}`}
      aria-label="Места рядом с отелем"
    >
      <div className="hotel-surroundings-heading">
        <h3>Рядом с отелем</h3>
        <button type="button" onClick={onRoute}>
          Дорога к пляжу <ArrowUpRight size={16} aria-hidden="true" />
        </button>
      </div>
      {places.length > 0 ? (
        <NearbyPlaces places={places.slice(0, 3)} />
      ) : (
        <p className="hotel-surroundings-empty">
          Объекты рядом пока не добавлены. Посмотрите расположение отеля на карте.
        </p>
      )}
      {places.length > 3 && (
        <details className="hotel-nearby-more">
          <summary>
            Ещё места рядом · {places.length - 3}
            <ChevronDown size={15} aria-hidden="true" />
          </summary>
          <NearbyPlaces places={places.slice(3)} />
        </details>
      )}
    </section>
  );
}
