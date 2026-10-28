import {
  CRITERIA,
  formatReviewCount,
  PhotoCredit,
  photoInfo,
  type Criterion,
  type Hotel,
} from "@/entities/hotel";
import { MatchRing, Reveal } from "@/shared/ui";
import { ArrowRight, Heart, Images, MapPin, Scale, ShieldCheck, Waves } from "lucide-react";
import { Photo } from "./visuals";
import type { HotelDetails } from "../model/types";
import { rub } from "../lib/format";
export { HotelAbout } from "./hotel-about";

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
  const sources = Array.from(new Map(photos.map((src) => [photoInfo(src)?.author, src])).values());
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
            <span aria-label={`Оценка ${h.rating.toLocaleString("ru")} из 10`}>
              {h.rating.toLocaleString("ru", { minimumFractionDigits: 1 })}
            </span>
            <small>{formatReviewCount(h.reviewCount)}</small>
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
            Все фотографии
            {h.photos.length > 0 && <span>{h.photos.length}</span>}
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
      <div className="hotel-photo-sources">
        {sources.map((src) => (
          <PhotoCredit key={src} src={src} compact={photoInfo(src)?.kind === "ai"} />
        ))}
        {photos.some((src) => photoInfo(src)?.kind === "ai") && (
          <p>
            AI-кадры — вымышленные иллюстрации, не фотографии этого отеля. Интерьер и вид из номера
            нужно уточнить.
          </p>
        )}
      </div>
      <nav className="hotel-section-nav" aria-label="Об отеле">
        <a href="#hotel-about">Об отеле</a>
        <a href="#rooms">
          Номера <span>{h.rooms.length}</span>
        </a>
        <a href="#window">Ваше окно</a>
        <a href="#where">Расположение</a>
      </nav>
    </>
  );
}
