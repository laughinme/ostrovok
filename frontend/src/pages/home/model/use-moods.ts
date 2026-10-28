import { useQuery } from "@tanstack/react-query";
import { api, getApiMode, type components } from "@/shared/api";
import { MOODS } from "./catalog";
import type { IntentChip } from "./types";

export interface Mood {
  id: string;
  title: string;
  proof: string;
  photo: string;
  chips: readonly IntentChip[];
  apiChips?: components["schemas"]["IntentChipModel"][];
  month?: number;
}

const photos = ["lux-hero", "lux-h2", "lux-h3", "lux-h1a"];
export function useMoods() {
  const demo = getApiMode() === "demo";
  const query = useQuery({
    queryKey: ["moods"],
    queryFn: ({ signal }) => api<components["schemas"]["MoodOut"][]>("/moods", { signal }),
    enabled: !demo,
  });
  const moods: Mood[] = demo
    ? MOODS.map((mood) => ({ ...mood, proof: `Демо · ${mood.proof}` }))
    : (query.data ?? [])
        .filter((mood) => ["sunset", "sleep", "family", "mountains"].includes(mood.id))
        .map((mood, index) => ({
          id: mood.id,
          title: mood.title,
          proof: mood.countLabel,
          photo: photos[index % photos.length]!,
          chips: [],
          apiChips: mood.chips,
          month: mood.month,
        }));
  return { moods, error: query.error, pending: !demo && query.isPending, retry: query.refetch };
}
