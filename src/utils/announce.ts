/**
 * Polite screen reader announcements for things that change without moving
 * focus (saved, undone, pattern switched…). One shared, visually hidden live
 * region is created on first use.
 */
let region: HTMLElement | null = null;
let clearTimer: ReturnType<typeof setTimeout> | undefined;

function getRegion(): HTMLElement {
  if (region && region.isConnected) return region;
  region = document.createElement('div');
  region.setAttribute('role', 'status');
  region.setAttribute('aria-live', 'polite');
  region.className = 'sr-only';
  document.body.appendChild(region);
  return region;
}

export function announce(message: string): void {
  if (typeof document === 'undefined') return;
  const el = getRegion();
  // Clear first so repeating the same message is announced again
  el.textContent = '';
  window.setTimeout(() => { el.textContent = message; }, 30);
  clearTimeout(clearTimer);
  clearTimer = setTimeout(() => { el.textContent = ''; }, 5000);
}
