'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

interface SelectionState {
  compare: string[];
  toggleCompare(id: string): void;
  favorites: string[];
  toggleFavorite(id: string): void;
}

const Context = createContext<SelectionState | null>(null);

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [compare, setCompare] = useState<string[]>(['mayak', 'kiparis', 'lazur']);
  const [favorites, setFavorites] = useState<string[]>([]);
  const toggleCompare = useCallback((id: string) => setCompare((items) => items.includes(id) ? items.filter((x) => x !== id) : [...items, id].slice(-3)), []);
  const toggleFavorite = useCallback((id: string) => setFavorites((items) => items.includes(id) ? items.filter((x) => x !== id) : [...items, id]), []);
  const value = useMemo(() => ({ compare, toggleCompare, favorites, toggleFavorite }), [compare, toggleCompare, favorites, toggleFavorite]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useHotelSelection() {
  const state = useContext(Context);
  if (!state) throw new Error('SelectionProvider missing');
  return state;
}
