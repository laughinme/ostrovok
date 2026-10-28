import {
  ArrowRight,
  Baby,
  Check,
  CircleHelp,
  Laptop,
  MapPin,
  Mic,
  PawPrint,
  Paperclip,
  Sparkles,
  Sun,
  Waves,
} from "lucide-react";
import PHOTOS from "../model/photos.json";
import { photoInfo, demoPhotos } from "@/entities/hotel";

const ICONS = {
  arrow: ArrowRight,
  kid: Baby,
  paperclip: Paperclip,
  check: Check,
  question: CircleHelp,
  laptop: Laptop,
  pin: MapPin,
  mic: Mic,
  paw: PawPrint,
  spark: Sparkles,
  sun: Sun,
  wave: Waves,
};

export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const Component = ICONS[name as keyof typeof ICONS] ?? Sparkles;
  return <Component className="ic" size={size} strokeWidth={1.7} aria-hidden="true" />;
}

export function Photo({ k, alt }: { k: string; alt: string; credit?: boolean }) {
  const photo = (PHOTOS as Record<string, { src: string }>)[k];
  const src = photo?.src ?? demoPhotos("zakatny-bereg")[0]!;
  const info = photoInfo(src);
  return (
    <figure className="ph">
      <img src={src} alt={alt} loading="lazy" width={1024} height={768} />
      {info?.kind === "ai" && <figcaption className="photo-origin">AI-иллюстрация</figcaption>}
    </figure>
  );
}

export function Mark({ v }: { v: "yes" | "partial" }) {
  return <i className={`mk ${v === "yes" ? "y" : "p"}`}>{v === "yes" ? "✓" : "≈"}</i>;
}

export function SrcTag({
  kind,
  children,
}: {
  kind: "computed" | "hotelier";
  children: React.ReactNode;
}) {
  return <span className={`src-k ${kind === "computed" ? "calc" : "hotel"}`}>{children}</span>;
}
