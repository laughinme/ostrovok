import { useSearchFilters } from "@/features/hotel-search";
import { RequestState } from "@/shared/ui";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export function SearchPage({ query = "Тихий отель у моря" }: { query?: string | undefined }) {
  const { pending, error } = useSearchFilters(query);
  const navigate = useNavigate();
  useEffect(() => {
    if (!pending || error) void navigate({ to: "/results", search: { q: query }, replace: true });
  }, [pending, error, navigate, query]);
  return <RequestState pending={pending} error={error} />;
}
