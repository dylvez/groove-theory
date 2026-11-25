import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { focusableIn } from './usePopover';

/**
 * Modal dialog behaviour: focus moves in on open (to `initialFocus`, else the
 * first control), Tab cycles inside, Escape closes, and focus returns to
 * whatever had it before.
 */
export function useModal<T extends HTMLElement>(
  onClose: () => void,
  initialFocus?: RefObject<HTMLElement | null>,
): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  const closeRef = useRef(onClose);
  useLayoutEffect(() => { closeRef.current = onClose; });
  const [opener] = useState<HTMLElement | null>(() =>
    typeof document !== 'undefined' && document.activeElement instanceof HTMLElement ? document.activeElement : null
  );

  useEffect(() => {
    const root = ref.current;
    (initialFocus?.current ?? (root ? focusableIn(root)[0] : null))?.focus();

    const onKey = (e: KeyboardEvent) => {
      const el = ref.current;
      if (!el) return;
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusableIn(el);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !el.contains(active))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (active === last || !el.contains(active))) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      if (opener?.isConnected) opener.focus();
    };
    // Runs once per open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return ref;
}
