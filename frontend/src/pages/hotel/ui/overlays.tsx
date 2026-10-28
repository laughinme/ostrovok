import { AnimatePresence, motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { api, type components } from "@/shared/api";
import { RequestState } from "@/shared/ui";
import { detailFactFromApi } from "../model/api-hotel-details";
import { useEffect, type ReactNode } from "react";
import type { Fact, HotelDetails } from "../model/types";
import { useDialog } from "../lib/use-dialog";
import { Conf, Icon, SrcTag } from "./detail-ui";
import { Building, Panorama, Photo } from "./visuals";
export function Drawer({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean;
  onClose(): void;
  label: string;
  children: ReactNode;
}) {
  useDialog(open, onClose);
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="drawer"
            role="dialog"
            aria-modal="true"
            aria-label={label}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 36 }}
          >
            <button className="icon-btn close" onClick={onClose} aria-label="Закрыть">
              <Icon name="close" />
            </button>
            {children}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
export function WhyPanel({ fact: summary, hotel }: { fact: Fact; hotel: HotelDetails }) {
  const detail = useQuery({
    queryKey: ["fact", summary.id],
    queryFn: ({ signal }) =>
      api<components["schemas"]["FactDetailOut"]>(`/facts/${summary.id}`, { signal }),
    enabled: !!hotel.api,
    staleTime: 30000,
  });
  const fact = detail.data ? detailFactFromApi(detail.data, detail.data) : summary;
  const p = Math.round(fact.confidence * 100);
  return (
    <div className="why">
      {hotel.api && (
        <RequestState
          pending={detail.isPending}
          error={detail.error}
          retry={() => {
            void detail.refetch();
          }}
        />
      )}
      <div className="lbl">Почему мы так думаем</div>
      <div className="stmt">
        {fact.statement}: {fact.scopeText}
      </div>
      <div className="why-conf">
        <Conf p={fact.confidence} />
        <SrcTag kind={fact.source}>{fact.sourceLabel}</SrcTag>
      </div>
      <div className="bar">
        <span style={{ width: `${p}%` }} />
      </div>
      <p className="meter-t">
        {fact.source === "computed" ? (
          <>
            <b className="num">{p}</b> из 100 — уверенность оценки.
          </>
        ) : (
          <>
            Уверенность <b className="num">{String(fact.confidence).replace(".", ",")}</b>: оценка
            из карточки отеля.
          </>
        )}
      </p>
      {fact.evidence === "horizon" && (
        <div className="evidence">
          <Panorama facade={hotel.bestFacade} floor={Math.max(4, hotel.bestFloor - 2)} />
        </div>
      )}
      {fact.evidence === "noise" && (
        <div className="evidence light">
          <Building
            floors={hotel.totalFloors}
            name={hotel.name}
            sides={Object.fromEntries(
              Object.entries(hotel.noise.night).map(([key, [color, text]]) => [
                key,
                { color, text },
              ]),
            )}
          />
        </div>
      )}
      <dl>
        <div>
          <dt className="lbl">Метод</dt>
          <dd>{fact.method}</dd>
        </div>
        <div>
          <dt className="lbl">Источники</dt>
          <dd>
            <ul>
              {fact.sources.map(([a, b], index) => (
                <li key={`${a}-${b}-${index}`}>
                  {a}
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </dd>
        </div>
        <div>
          <dt className="lbl">Что может пойти не так</dt>
          <dd>{fact.caveats}</dd>
        </div>
        <div>
          <dt className="lbl">История</dt>
          <dd>{fact.history}</dd>
        </div>
      </dl>
    </div>
  );
}
export type GalleryItem =
  | {
      kind: "photo";
      key: string;
    }
  | {
      kind: "view";
    }
  | {
      kind: "noise";
    };
export function Lightbox({
  items,
  index,
  hotel,
  onClose,
  onIndex,
}: {
  items: GalleryItem[];
  index: number | null;
  hotel: HotelDetails;
  onClose(): void;
  onIndex(i: number): void;
}) {
  useDialog(index != null, onClose);
  useEffect(() => {
    if (index == null) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") onIndex((index + 1) % items.length);
      if (e.key === "ArrowLeft") onIndex((index + items.length - 1) % items.length);
    };
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, [index, items.length, onIndex]);
  const it = index != null ? items[index] : null;
  return (
    <AnimatePresence>
      {it && index != null && (
        <motion.div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Фотографии"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button className="icon-btn lb-close" onClick={onClose} aria-label="Закрыть">
            <Icon name="close" size={22} />
          </button>
          <div className="lb-stage">
            {it.kind === "photo" && <Photo k={it.key} alt={`${hotel.name}, фото`} credit={false} />}
            {it.kind === "view" && <Panorama facade={hotel.bestFacade} floor={hotel.bestFloor} />}
            {it.kind === "noise" && (
              <div className="light">
                <Building
                  floors={hotel.totalFloors}
                  name={hotel.name}
                  sides={Object.fromEntries(
                    Object.entries(hotel.noise.night).map(([key, [color, text]]) => [
                      key,
                      { color, text },
                    ]),
                  )}
                />
              </div>
            )}
          </div>
          <div className="lb-bar">
            <button
              className="icon-btn"
              onClick={() => onIndex((index + items.length - 1) % items.length)}
              aria-label="Предыдущее"
            >
              <Icon name="back" />
            </button>
            <span className="num">
              {index + 1} / {items.length}
            </span>
            <button
              className="icon-btn"
              onClick={() => onIndex((index + 1) % items.length)}
              aria-label="Следующее"
            >
              <Icon name="arrow" />
            </button>
            <span className="lb-credit">
              {it.kind === "view"
                ? "Расчёт вида из окна по рельефу и зданиям"
                : it.kind === "noise"
                  ? "Расчёт шума по сторонам здания"
                  : "Фотографии отеля"}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
