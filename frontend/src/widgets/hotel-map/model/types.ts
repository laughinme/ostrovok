import type { Hotel } from "@/entities/hotel";

export interface CoastMapProps {
  items: { hotel: Hotel; score?: number }[];
  active?: string | null | undefined;
  onHover?: ((id: string | null) => void) | undefined;
  onSelect?: ((id: string) => void) | undefined;
}
