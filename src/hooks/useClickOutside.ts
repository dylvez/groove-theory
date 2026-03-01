import { useEffect, useRef, useCallback, type RefObject } from 'react';

/**
 * Returns a ref to attach to the dropdown container.
 * Calls `handler` when a pointerdown event occurs outside the ref element.
 */
export function useClickOutside<T extends HTMLElement>(
  handler: () => void,
  active: boolean = true,
): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  const stableHandler = useCallback(handler, [handler]);

  useEffect(() => {
    if (!active) return;
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        stableHandler();
      }
    };
    // Capture phase so it fires before the click propagates
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [stableHandler, active]);

  return ref;
}
