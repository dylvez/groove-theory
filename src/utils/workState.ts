import { useSequencerStore } from '../store/useSequencerStore';
import { useSongStore } from '../store/useSongStore';
import { useTransportStore } from '../store/useTransportStore';

/**
 * Tracks whether the current work differs from what was last saved or loaded,
 * so loading something else can warn before replacing it.
 *
 * The baseline is a short hash kept in localStorage, so a reload right after
 * saving doesn't count as unsaved work.
 */

const BASELINE_KEY = 'groove-theory-saved-signature';

function hash(text: string): string {
  // FNV-1a, 32-bit — only used to compare two states, not for security
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

function signature(): string {
  const { patterns } = useSequencerStore.getState();
  const { blocks } = useSongStore.getState();
  const { bpm, swing } = useTransportStore.getState();
  return hash(JSON.stringify({ patterns, blocks, bpm, swing }));
}

function hasContent(): boolean {
  const { patterns } = useSequencerStore.getState();
  const { blocks } = useSongStore.getState();
  if (blocks.length > 0) return true;
  return patterns.some(p =>
    p.drumTracks.some(t => t.steps.some(v => v > 0)) ||
    p.melodicTracks.some(t => t.steps.some(s => s.active))
  );
}

/** Call after the current state has been saved, exported or freshly loaded. */
export function markWorkSaved(): void {
  try {
    localStorage.setItem(BASELINE_KEY, signature());
  } catch {
    // Storage full or blocked — the next load will just ask once more
  }
}

export function hasUnsavedWork(): boolean {
  if (!hasContent()) return false;
  let baseline: string | null = null;
  try {
    baseline = localStorage.getItem(BASELINE_KEY);
  } catch {
    baseline = null;
  }
  return signature() !== baseline;
}

/**
 * Ask before replacing unsaved work. Returns true when it's fine to go ahead.
 * `what` completes the sentence "… will replace your current work".
 */
export function confirmReplaceWork(what: string): boolean {
  if (!hasUnsavedWork()) return true;
  return window.confirm(
    `${what} will replace your current work, which hasn't been saved.\n\n` +
    'You can get it back afterwards with Undo (Ctrl+Z or ⌘Z), but tempo and swing are not restored.\n\nContinue?'
  );
}
