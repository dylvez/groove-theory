import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { CRAMPED_QUERY } from './useCramped';

/** Open popovers, newest last — only the newest one reacts to Escape */
const openStack: symbol[] = [];

/** Space kept between a floating popover and the edge of the window */
const EDGE = 8;
/** Least room, in px, worth scrolling a popover in rather than covering its button */
const MIN_ROOM = 200;

/** Whether any part of `target` can be seen, given the scroll areas around it */
function inView(target: Element): boolean {
  const r = target.getBoundingClientRect();
  let top = 0, left = 0, bottom = window.innerHeight, right = window.innerWidth;
  for (let a = target.parentElement; a; a = a.parentElement) {
    const s = getComputedStyle(a);
    if (s.overflowX === 'visible' && s.overflowY === 'visible') continue;
    const k = a.getBoundingClientRect();
    top = Math.max(top, k.top);
    left = Math.max(left, k.left);
    bottom = Math.min(bottom, k.bottom);
    right = Math.min(right, k.right);
  }
  return r.bottom > top && r.top < bottom && r.right > left && r.left < right;
}

/**
 * Lift a popover above everything else on the page and keep it inside the
 * window, so nothing can cover it or cut it off: not the grid's scroll area
 * (or its scroll bars), the sequencer column's edge, or the pinned rows and
 * app header that have stacking layers of their own.
 *
 * It goes into the browser's top layer (the Popover API), which draws it
 * above everything without moving it in the DOM, so tab order and reading
 * order stay as they are. While a modal dialog is open (a confirmation opened
 * from the popover, say) it steps back out, so the dialog is on top.
 *
 * An absolutely positioned popover is first laid out where its own CSS puts
 * it, which is where it belongs. Then it becomes position: fixed and is moved
 * back to that spot with `translate`. Its left/top are never touched, so React
 * can keep setting them. A popover that's already position: fixed (placed at
 * the pointer, say) only gets the fitting. Either way it then:
 *  - follows that spot when the areas around it scroll
 *  - when it would run off the bottom of the window, moves above the button
 *    that opened it; if it fits neither side, scrolls inside itself on the
 *    roomier side (or, with little room either side, slides up over the
 *    button). It also moves to keep clear of the other edges
 *  - closes if that button scrolls out of sight
 * In cramped windows it's a bottom sheet placed by index.css, and only lifted.
 * Returns a function that undoes all of this.
 */
function floatFree(el: HTMLElement, opener: HTMLElement | null, close: () => void): () => void {
  let active = false;
  let wantLift = false;
  let lifted = false;
  let anchor: Element | null = null; // the box it's positioned in; none: the window
  let trigger: Element | null = null; // what it belongs to, for the scrolled-away check
  let natX = 0, natY = 0; // where its CSS puts it, relative to `anchor`
  let baseX = 0, baseY = 0; // where position: fixed alone puts it
  let seen = { left: el.style.left, top: el.style.top, cls: el.className };

  // Inline styles this sets, with what was there before, so they can be put back
  const saved = new Map<string, string>();
  const set = (prop: string, value: string) => {
    if (!saved.has(prop)) saved.set(prop, el.style.getPropertyValue(prop));
    el.style.setProperty(prop, value);
  };
  const unset = (prop: string) => {
    if (!saved.has(prop)) return;
    const before = saved.get(prop)!;
    saved.delete(prop);
    if (before) el.style.setProperty(prop, before);
    else el.style.removeProperty(prop);
  };
  const modalOpen = () =>
    Array.from(document.querySelectorAll('[aria-modal="true"]')).some(m => !m.contains(el));
  const lift = () => {
    if (lifted || typeof el.showPopover !== 'function' || modalOpen()) return;
    el.setAttribute('popover', 'manual');
    try {
      el.showPopover();
      lifted = true;
    } catch {
      el.removeAttribute('popover');
    }
  };
  const drop = () => {
    if (!lifted) return;
    lifted = false;
    try { el.hidePopover(); } catch { /* already hidden */ }
    el.removeAttribute('popover');
  };

  const clear = () => {
    drop();
    for (const prop of [...saved.keys()]) unset(prop);
  };

  const fit = () => {
    if (!active) return;
    const ar = anchor ? anchor.getBoundingClientRect() : { left: 0, top: 0 };
    let x = ar.left + natX;
    let y = ar.top + natY;
    // Its full height, without any cap set here (keeping where it's scrolled to)
    const scrolled = el.scrollTop;
    unset('max-height');
    unset('overflow-y');
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    if (y < EDGE) y = EDGE;
    let maxH = 0;
    if (y + h > vh - EDGE) {
      const o = trigger === opener && opener ? opener.getBoundingClientRect() : null;
      const gap = o ? Math.min(Math.max(y - o.bottom, 0), 16) : 0;
      const below = vh - EDGE - y;
      const above = o ? o.top - gap - EDGE : 0;
      if (o && above >= h) {
        // Fits above the button that opened it
        y = o.top - gap - h;
      } else if (Math.max(below, above) >= MIN_ROOM) {
        // Scrolls inside itself, on the side with more room
        if (above > below) { y = EDGE; maxH = above; } else maxH = below;
      } else {
        // Little room either side: slide up, over the button if need be
        y = Math.max(EDGE, vh - EDGE - h);
      }
    }
    if (!maxH && y + h > vh - EDGE) maxH = vh - EDGE - y;
    if (maxH) {
      set('max-height', `${maxH}px`);
      set('overflow-y', 'auto');
    }
    el.scrollTop = scrolled;
    x = Math.max(EDGE, Math.min(x, vw - EDGE - w));
    set('translate', `${x - baseX}px ${y - baseY}px`);
  };

  const measure = () => {
    const scrolled = el.scrollTop;
    remeasure();
    el.scrollTop = scrolled;
  };
  const remeasure = () => {
    clear();
    active = false;
    wantLift = false;
    if (window.matchMedia(CRAMPED_QUERY).matches) {
      wantLift = true;
      lift();
      return;
    }
    const position = getComputedStyle(el).position;
    if (position !== 'absolute' && position !== 'fixed') return;
    const r = el.getBoundingClientRect();
    anchor = position === 'absolute' ? el.offsetParent ?? document.body : null;
    const ar = anchor ? anchor.getBoundingClientRect() : { left: 0, top: 0 };
    natX = r.left - ar.left;
    natY = r.top - ar.top;
    // The opener is the trigger only if the popover opened right next to it.
    // Focus can be somewhere else entirely, after a right-click in Safari, say.
    const o = opener && opener.isConnected && !el.contains(opener) ? opener.getBoundingClientRect() : null;
    const nextToOpener = o && r.top >= o.top && r.top - o.bottom <= 24 && o.left < r.right && o.right > r.left;
    trigger = nextToOpener ? opener : anchor;
    if (position === 'absolute') {
      // Keep the width it had in place: as position: fixed it could grow wider
      set('width', `${r.width}px`);
      set('position', 'fixed');
    }
    wantLift = true;
    lift();
    const f = el.getBoundingClientRect();
    baseX = f.left;
    baseY = f.top;
    active = true;
    fit();
  };

  measure();

  const onScroll = (e: Event) => {
    if (!active || (e.target instanceof Node && el.contains(e.target))) return;
    if (trigger && !inView(trigger)) { close(); return; }
    fit();
  };
  // React moving it (a new left/top or class) means measuring it in place again
  const mutations = new MutationObserver(() => {
    const now = { left: el.style.left, top: el.style.top, cls: el.className };
    if (now.left === seen.left && now.top === seen.top && now.cls === seen.cls) return;
    seen = now;
    measure();
  });
  mutations.observe(el, { attributes: true, attributeFilter: ['style', 'class'] });
  // Content that grows or shrinks (a section opening, a message appearing)
  const resizes = new ResizeObserver(() => fit());
  resizes.observe(el);
  // A modal dialog opening or closing
  const modals = new MutationObserver(() => {
    if (modalOpen()) drop();
    else if (wantLift) lift();
  });
  modals.observe(document.body, { childList: true, subtree: true });
  document.addEventListener('scroll', onScroll, true);
  window.addEventListener('resize', measure);

  return () => {
    mutations.disconnect();
    resizes.disconnect();
    modals.disconnect();
    document.removeEventListener('scroll', onScroll, true);
    window.removeEventListener('resize', measure);
    clear();
  };
}

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
 *  - scroll areas around it can't cut it off, and it stays inside the window
 *    (floatFree)
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

  // Before the first paint, so it never shows cut off for a frame
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    return floatFree(el, opener, () => closeRef.current());
    // Runs once per open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
