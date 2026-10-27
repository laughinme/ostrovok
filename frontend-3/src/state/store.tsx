import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { KNOWN_FROM_START } from '../data/characteristics';
import type { IntentChip } from '../data/types';

interface Store {
  query: string;
  setQuery(q: string): void;
  chips: IntentChip[];
  setChips(c: IntentChip[] | ((c: IntentChip[]) => IntentChip[])): void;
  known: Set<string>;
  learn(key: string): void;
  compare: string[];
  toggleCompare(id: string): void;
  favorites: string[];
  toggleFavorite(id: string): void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState('');
  const [chips, setChips] = useState<IntentChip[]>([]);
  const [known, setKnown] = useState(() => new Set(KNOWN_FROM_START));
  const [compare, setCompare] = useState<string[]>(['mayak', 'kiparis', 'lazur']);
  const [favorites, setFavorites] = useState<string[]>([]);
  const learn = useCallback((key: string) => setKnown((k) => new Set(k).add(key)), []);
  const toggleCompare = useCallback((id: string) => setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id].slice(-3))), []);
  const toggleFavorite = useCallback((id: string) => setFavorites((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id])), []);
  const value = useMemo(() => ({ query, setQuery, chips, setChips, known, learn, compare, toggleCompare, favorites, toggleFavorite }), [query, chips, known, learn, compare, toggleCompare, favorites, toggleFavorite]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider missing');
  return s;
}
