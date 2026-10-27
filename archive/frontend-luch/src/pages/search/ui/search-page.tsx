import { SearchProgress } from "@/widgets/search-progress";
export function SearchPage({ query = "Тихий отель у моря" }: { query?: string | undefined }) {
  return <SearchProgress key={query} query={query} />;
}
