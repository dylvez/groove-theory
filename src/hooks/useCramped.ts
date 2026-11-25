import { useSyncExternalStore } from 'react';
import { useUIStore } from '../store/useUIStore';

/**
 * "Cramped": a narrow or short window, including desktop browsers zoomed to
 * 200% or more. The app then becomes an ordinary scrolling page with its
 * sections stacked (see the `cramped:` variant in index.css). Keep this query
 * the same as that variant.
 */
export const CRAMPED_QUERY = '(max-width: 767px), (max-height: 499px)';

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(CRAMPED_QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

export function useCramped(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(CRAMPED_QUERY).matches, () => false);
}

/** The track-name column's width, narrowed when cramped so some steps stay in view */
export function useTrackHeaderWidth(): number {
  const width = useUIStore(s => s.trackHeaderWidth);
  return useCramped() ? Math.min(width, 180) : width;
}
