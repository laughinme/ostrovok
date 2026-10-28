'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { KNOWN_FROM_START } from '@/entities/intent';
import type { IntentChip } from '@/entities/intent';

interface SearchState {
  query: string;
  setQuery(q: string): void;
  chips: IntentChip[];
  setChips(c: IntentChip[] | ((c: IntentChip[]) => IntentChip[])): void;
  known: Set<string>;
  learn(key: string): void;
}

const Ctx = createContext<SearchState | null>(null);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState('');
  const [chips, setChips] = useState<IntentChip[]>([]);
  const [known, setKnown] = useState(() => new Set(KNOWN_FROM_START));
  const learn = useCallback((key: string) => setKnown((k) => new Set(k).add(key)), []);
  const value = useMemo(() => ({ query, setQuery, chips, setChips, known, learn }), [query, chips, known, learn]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSearchState() {
  const s = useContext(Ctx);
  if (!s) throw new Error('SearchProvider missing');
  return s;
}
