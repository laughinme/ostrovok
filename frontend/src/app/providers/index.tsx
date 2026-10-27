'use client';

import type { ReactNode } from 'react';
import { SearchProvider } from '@/features/search-hotels';
import { SelectionProvider } from '@/features/select-hotels';

export function Providers({ children }: { children: ReactNode }) {
  return <SearchProvider><SelectionProvider>{children}</SelectionProvider></SearchProvider>;
}
