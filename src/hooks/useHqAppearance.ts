import { useEffect, useState } from 'react';

export const HQ_TEXT_SIZES = [
  { value: 'comfortable', label: 'Comfortable', detail: '18 px' },
  { value: 'large', label: 'Large', detail: '20 px' },
  { value: 'largest', label: 'Extra large', detail: '22 px' },
] as const;
export type HqTextSize = typeof HQ_TEXT_SIZES[number]['value'];
const KEY = 'hq.text-size';
const EVENT = 'hq-appearance-change';
let mountedLayouts = 0;
let visitSize: HqTextSize = 'comfortable';

function readSize(): HqTextSize {
  try {
    const saved = localStorage.getItem(KEY);
    visitSize = HQ_TEXT_SIZES.some(s => s.value === saved) ? saved as HqTextSize : visitSize;
  } catch { /* Use this visit's preference when storage is unavailable. */ }
  return visitSize;
}

/** Root scope also reaches portaled menus/dialogs, and is removed on public routes. */
export function useHqAppearanceScope() {
  useEffect(() => {
    mountedLayouts += 1;
    document.documentElement.classList.add('hq-ui');
    document.documentElement.dataset.hqText = readSize();
    return () => {
      mountedLayouts -= 1;
      if (mountedLayouts === 0) {
        document.documentElement.classList.remove('hq-ui');
        delete document.documentElement.dataset.hqText;
      }
    };
  }, []);
}

export function useHqTextSize() {
  const [size, setSize] = useState<HqTextSize>(readSize);
  useEffect(() => {
    const sync = (event: Event) => {
      if (event instanceof StorageEvent && event.key !== KEY && event.key !== null) return;
      const next = event instanceof CustomEvent ? event.detail as HqTextSize : readSize();
      visitSize = next;
      setSize(next);
      if (document.documentElement.classList.contains('hq-ui')) document.documentElement.dataset.hqText = next;
    };
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener(EVENT, sync); window.removeEventListener('storage', sync); };
  }, []);
  const update = (next: HqTextSize) => {
    setSize(next);
    visitSize = next;
    try { localStorage.setItem(KEY, next); } catch { /* Still applies for this visit. */ }
    document.documentElement.dataset.hqText = next;
    window.dispatchEvent(new CustomEvent(EVENT, { detail: next }));
  };
  return [size, update] as const;
}
