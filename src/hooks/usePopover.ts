import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';

/** Open popovers, newest last — only the newest one reacts to Escape */
const openStack: symbol[] = [];

const FOCUSABLE = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function focusableIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE))
    .filter(el => el.offsetParent !== null || el === document.activeElement);
}

interface PopoverOptions {
  /** Move focus to the first control when the popover opens (default true) */
  focusFirst?: boolean;
  /** Close when Tab moves focus out of the popover (default true) */
  closeOnTabOut?: boolean;
}

/**
 * Behaviour shared by every dropdown, menu and floating panel:
 *  - pointer down outside closes it (a press on the button that opened it is
 *    left to that button's own toggle)
 *  - Escape closes it and puts focus back on the opener
 *  - focus moves into it on open, and tabbing past either end closes it and
 *    continues from the opener, so portaled popovers stay in a sensible
 *    tab order
 */
export function usePopover<T extends HTMLElement>(
  onClose: () => void,
  { focusFirst = true, closeOnTabOut = true }: PopoverOptions = {},
): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  const closeRef = useRef(onClose);
  useLayoutEffect(() => { closeRef.current = onClose; });
  // Whatever had focus when the popover first rendered. Captured once, at
  // render time, so StrictMode's double-run effects can't overwrite it with
  // an element inside the popover.
  const [opener] = useState<HTMLElement | null>(() =>
    typeof document !== 'undefined' && document.activeElement instanceof HTMLElement && document.activeElement !== document.body
      ? document.activeElement
      : null
  );

  useEffect(() => {
    const id = Symbol('popover');
    openStack.push(id);
    const root = ref.current;

    if (focusFirst && root && !root.contains(document.activeElement)) {
      // Let autoFocus inputs win; otherwise focus the first control
      const first = focusableIn(root)[0];
      first?.focus({ preventScroll: true });
    }

    const returnFocus = () => {
      if (opener && opener.isConnected) opener.focus({ preventScroll: true });
    };

    // A modal dialog opened from inside this popover (a delete confirmation,
    // say) owns the pointer and keyboard until it closes
    const modalAbove = () => {
      const el = ref.current;
      return Array.from(document.querySelectorAll('[aria-modal="true"]')).some(m => !el || !m.contains(el));
    };

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!ref.current || ref.current.contains(target) || modalAbove()) return;
      if (opener && opener.contains(target)) return;
      // The button that toggles this popover handles its own click (Safari doesn't
      // focus buttons on click, so `opener` can be null)
      if (target instanceof Element && target.closest('[aria-expanded="true"]')) return;
      closeRef.current();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const el = ref.current;
      if (!el || modalAbove()) return;
      if (e.key === 'Escape') {
        if (openStack[openStack.length - 1] !== id) return;
        // Escape belongs to the popover, not to global shortcuts underneath
        e.stopPropagation();
        e.preventDefault();
        closeRef.current();
        returnFocus();
        return;
      }
      if (e.key === 'Tab' && closeOnTabOut && el.contains(document.activeElement)) {
        const items = focusableIn(el);
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          closeRef.current();
          returnFocus();
        } else if (!e.shiftKey && document.activeElement === last) {
          // Put focus on the opener and let the browser's own Tab continue from there
          closeRef.current();
          returnFocus();
        }
      }
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      const i = openStack.indexOf(id);
      if (i >= 0) openStack.splice(i, 1);
      // Closed by picking something inside it: focus would otherwise drop to <body>
      requestAnimationFrame(() => {
        if (!document.activeElement || document.activeElement === document.body) returnFocus();
      });
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown, true);
    };
    // Runs once per open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return ref;
}
