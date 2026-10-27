import { useSyncExternalStore } from 'react';

// Лендинги A и B сохранены как запасные. По умолчанию показываем только салатовый C;
// остальные включаются кнопкой в подвале или ссылкой с ?variants=1.
const KEY = 'okno-variants';
const listeners = new Set<() => void>();

function read(): boolean {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
}

export function setVariantsEnabled(on: boolean) {
  try { if (on) localStorage.setItem(KEY, '1'); else localStorage.removeItem(KEY); } catch { /* приватный режим */ }
  listeners.forEach((l) => l());
}

// ссылка вида /?variants=1 включает режим один раз и дальше хранится в localStorage
if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('variants') === '1') setVariantsEnabled(true);

export function useVariantsEnabled(): boolean {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, read, () => false);
}
