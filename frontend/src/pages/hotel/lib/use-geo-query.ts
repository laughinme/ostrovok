import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/api";

export function useGeoQuery<T>(
  hotelId: string,
  endpoint: string,
  available = true,
  keepPrevious = false,
) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "250px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const query = useQuery({
    queryKey: ["hotel-geo", hotelId, endpoint],
    queryFn: ({ signal }) =>
      api<T>(`/hotels/${encodeURIComponent(hotelId)}/${endpoint}`, { signal }),
    enabled: visible && available,
    placeholderData: (previous, previousQuery) =>
      keepPrevious && previousQuery?.queryKey[1] === hotelId ? previous : undefined,
    staleTime: 300000,
    retry: 1,
  });
  return { ref, visible, ...query };
}
