'use client';

import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { getQueryClient } from '@/shared/api/query-client';
import { SearchProvider } from '@/features/search-hotels';
import { SelectionProvider } from '@/features/select-hotels';

export function Providers({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={getQueryClient()}><SearchProvider><SelectionProvider>{children}</SelectionProvider></SearchProvider></QueryClientProvider>;
}
