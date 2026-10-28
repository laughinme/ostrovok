import { queryOptions } from '@tanstack/react-query';
import { apiGet } from '@/shared/api';
import type { Hotel } from '../model/types';

export const hotelQueries = {
  all: () => queryOptions({
    queryKey: ['hotels'],
    queryFn: ({ signal }) => apiGet<Hotel[]>('/hotels', signal),
  }),
  detail: (id: string) => queryOptions({
    queryKey: ['hotels', id],
    queryFn: ({ signal }) => apiGet<Hotel>(`/hotels/${encodeURIComponent(id)}`, signal),
  }),
};
