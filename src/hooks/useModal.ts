import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { focusableIn } from './usePopover';

/** Open modals, newest last. Only the newest one handles keys. */
const modalStack: symbol[] = [];

/** True while any modal dialog is open; app-wide shortcuts stand down then. */
export function isModalOpen(): boolean {
  return modalStack.length > 0;
}

/**
 * Modal dialog behaviour: focus moves in on open (to `initialFocus`, else the
 * first control), Tab cycles inside, Escape closes, and focus returns to
 * whatever had it before. Modals can stack (a confirm over a dialog); only the
 * top one responds to the keyboard.
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
    const id = Symbol('modal');
    modalStack.push(id);
    const root = ref.current;
    (initialFocus?.current ?? (root ? focusableIn(root)[0] : null))?.focus();

    const onKey = (e: KeyboardEvent) => {
      const el = ref.current;
      if (!el || modalStack[modalStack.length - 1] !== id) return;
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
      const i = modalStack.indexOf(id);
      if (i >= 0) modalStack.splice(i, 1);
      document.removeEventListener('keydown', onKey, true);
      if (opener?.isConnected) { opener.focus(); return; }
      // The opener is gone (say, a list item that was just deleted): land in
      // the menu or dialog it belonged to rather than at the top of the page
      requestAnimationFrame(() => {
        if (document.activeElement && document.activeElement !== document.body) return;
        const host = document.querySelector<HTMLElement>('[role="dialog"], [role="alertdialog"]');
        if (host) focusableIn(host)[0]?.focus();
      });
    };
    // Runs once per open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return ref;
}
