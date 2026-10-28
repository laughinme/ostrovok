import { CRITERIA, formatReviewCount, type Criterion, type Hotel } from "@/entities/hotel";
import { MatchRing, Reveal } from "@/shared/ui";
import {
  Check,
  ArrowRight,
  Heart,
  Images,
  Info,
  MapPin,
  Scale,
  ShieldCheck,
  Star,
  Waves,
} from "lucide-react";
import { Photo } from "./visuals";
import type { HotelDetails } from "../model/types";
import { rub } from "../lib/format";

export function HotelOverview({
  hotel,
  details: h,
  criteria,
  score,
  favorite,
  inComparison,
  onFavorite,
  onCompare,
  onPhoto,
  onSection,
}: {
  hotel: Hotel;
  details: HotelDetails;
  criteria: Criterion[];
  score: number;
  favorite: boolean;
  inComparison: boolean;
  onFavorite: () => void;
  onCompare: () => void;
  onPhoto: (index: number) => void;
  onSection: (id: string) => void;
}) {
  const photos = h.photos.slice(0, 3);
  return (
    <>
      <Reveal className="hotel-intro">
        <div className="hotel-intro-heading">
          <div className="hotel-category">
            <span>{h.stars ? `${h.stars} звезды` : "Отель"}</span>
            <span>Большой Сочи</span>
          </div>
          <h1>{h.name}</h1>
          <button className="hotel-address" onClick={() => onSection("where")}>
            <MapPin size={17} />
            {h.address}
            <span>На карте ↗</span>
          </button>
        </div>
        <div className="hotel-intro-actions">
          <div className="hotel-guest-rating">
            <span>
              <Star size={19} fill="currentColor" />
              {h.rating.toLocaleString("ru", { minimumFractionDigits: 1 })}
            </span>
            <small>{h.reviewCount ? formatReviewCount(h.reviewCount) : "Демо-оценка"}</small>
          </div>
          <button
            className={`hotel-square-button${favorite ? " is-selected" : ""}`}
            onClick={onFavorite}
            aria-pressed={favorite}
            aria-label={favorite ? "Убрать из избранного" : "Добавить в избранное"}
          >
            <Heart size={21} fill={favorite ? "currentColor" : "none"} />
          </button>
          <button className="hotel-compare-action" aria-pressed={inComparison} onClick={onCompare}>
            <Scale size={19} />
            {inComparison ? "В сравнении" : "Сравнить"}
          </button>
        </div>
      </Reveal>
      <Reveal className="hotel-showcase" delay={0.06}>
        <div className={`hotel-gallery${photos.length === 1 ? " hotel-gallery--single" : ""}`}>
          {photos.map((photo, index) => (
            <button
              key={`${photo}-${index}`}
              className={`hotel-gallery-photo hotel-gallery-photo--${index}`}
              onClick={() => onPhoto(index)}
              aria-label={`Открыть фото ${index + 1}`}
            >
              <Photo k={photo} alt={`${h.name}, фото ${index + 1}`} />
            </button>
          ))}
          <button className="hotel-gallery-all" onClick={() => onPhoto(0)}>
            <Images size={17} />
            Все фотографии{h.photos.length > 0 && <span>{h.photos.length}</span>}
          </button>
          {hotel.walk.find((place) => place.kind === "beach") && (
            <span className="hotel-gallery-location">
              <Waves size={16} />
              {h.toSea}
            </span>
          )}
        </div>
        <aside className="hotel-booking-card" aria-label="Ваше совпадение и выбор номера">
          <div className="hotel-booking-top">
            <span>
              <ShieldCheck size={16} />
              Совпадение с вашим запросом
            </span>
            <MatchRing value={score} size={76} stroke={6} />
          </div>
          <div>
            <p className="hotel-booking-label">Под ваш запрос</p>
            <h2>{h.bestRoom}</h2>
          </div>
          <div className="hotel-match-bars">
            {criteria.slice(0, 3).map((criterion) => (
              <div key={criterion}>
                <p>
                  <span>{CRITERIA[criterion].short}</span>
                  <b>
                    {hotel.unknownCriteria?.includes(criterion)
                      ? "уточняем"
                      : `${hotel.scores[criterion]}%`}
                  </b>
                </p>
                <span className="hotel-match-track">
                  <span
                    style={{
                      width: `${hotel.unknownCriteria?.includes(criterion) ? 0 : hotel.scores[criterion]}%`,
                    }}
                  />
                </span>
              </div>
            ))}
          </div>
          <div className="hotel-booking-bottom">
            <p>
              Цена за ночь{" "}
              <span>
                {h.priceFrom > 0 ? (
                  <>
                    от <b>{rub(h.priceFrom)}</b>
                  </>
                ) : (
                  <b>Уточняется</b>
                )}
              </span>
            </p>
            <button onClick={() => onSection("rooms")}>
              Выбрать номер
              <ArrowRight size={19} />
            </button>
            <small>Условия и пожелания — в карточке тарифа</small>
          </div>
        </aside>
      </Reveal>
      <nav className="hotel-section-nav" aria-label="Об отеле">
        <a href="#hotel-about">Об отеле</a>
        <a href="#window">Ваше окно</a>
        <a href="#rooms">
          Номера <span>{h.rooms.length}</span>
        </a>
        <a href="#hotel-facts">Факты и источники</a>
        <a href="#where">Расположение</a>
      </nav>
      <Reveal
        className={`hotel-about${h.amenities.length ? "" : " hotel-about--simple"}`}
        delay={0.1}
      >
        <section id="hotel-about" className="hotel-about-copy">
          <h2>Об отеле</h2>
          <p>{hotel.description || h.tagline}</p>
        </section>
        {h.amenities.length > 0 && (
          <section className="hotel-about-amenities" aria-label="Удобства отеля">
            <h3>Удобства</h3>
            <ul className="hotel-amenities">
              {h.amenities.map((item, index) => (
                <li key={`${item}-${index}`}>
                  <Check size={15} aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        {hotel.searchMatch?.tradeoff && (
          <div className="hotel-tradeoff">
            <Info size={17} aria-hidden="true" />
            <p>
              <b>Стоит учесть</b>
              {hotel.searchMatch.tradeoff}
            </p>
          </div>
        )}
      </Reveal>
    </>
  );
}
