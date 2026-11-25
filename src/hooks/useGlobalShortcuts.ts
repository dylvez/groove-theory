import { useEffect } from 'react';
import { useSequencerStore } from '../store/useSequencerStore';
import { useUIStore } from '../store/useUIStore';
import { PATTERN_IDS, patternLetter } from '../constants/patterns';
import { announce } from '../utils/announce';
import { toggleSidePanel } from '../utils/sidePanel';
import { togglePlayback } from '../utils/playback';
import { isModalOpen } from './useModal';

function isTypingTarget(t: EventTarget | null): boolean {
  return t instanceof HTMLInputElement || t instanceof HTMLSelectElement || t instanceof HTMLTextAreaElement
    || (t instanceof HTMLElement && t.isContentEditable);
}

/**
 * App-wide keyboard shortcuts:
 *   Space            play / stop (the pattern or the song, as the Play switch says)
 *   1 … 8            select pattern A–H
 *   ⌘/Ctrl+Z         undo · ⌘/Ctrl+Shift+Z (or ⌘/Ctrl+Y) redo
 *   ⌘/Ctrl+C / V     copy / paste pattern
 *   [ / ]            shift pattern left / right one step
 *   \                show / hide the Beats and Harmony side panel
 *   R                toggle record (when a track is armed)
 *   Escape           disarm live keys
 *
 * The single-character ones (1–8, [ ], \, R) can be switched off in Help, for
 * speech-input users and anyone who triggers them by accident (WCAG 2.1.4).
 */
export function useGlobalShortcuts() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target) || isModalOpen()) return;
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      const seq = useSequencerStore.getState();

      if (mod && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) seq.redo(); else seq.undo();
        return;
      }
      if (mod && key === 'y') {
        e.preventDefault();
        seq.redo();
        return;
      }
      if (mod && key === 'c') {
        // Let real text selections copy normally
        if (window.getSelection()?.toString()) return;
        e.preventDefault();
        seq.copyActivePattern();
        return;
      }
      if (mod && key === 'v') {
        e.preventDefault();
        seq.pasteToActivePattern();
        return;
      }
      if (mod) return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlayback();
        return;
      }

      const ui = useUIStore.getState();
      if (key === 'escape' && ui.armedTrackId) { ui.setArmedTrack(null); announce('Live keys off'); return; }
      if (!ui.singleKeyShortcuts || e.altKey) return;

      if (key >= '1' && key <= String(PATTERN_IDS.length)) {
        const id = PATTERN_IDS[parseInt(key, 10) - 1];
        if (id) { e.preventDefault(); seq.setActivePattern(id); announce(`Pattern ${patternLetter(id)}`); }
        return;
      }
      if (key === '\\') { e.preventDefault(); toggleSidePanel(); return; }
      if (key === '[') { e.preventDefault(); seq.shiftPattern(-1); announce('Shifted left'); return; }
      if (key === ']') { e.preventDefault(); seq.shiftPattern(1); announce('Shifted right'); return; }

      if (key === 'r' && ui.armedTrackId) {
        e.preventDefault();
        ui.toggleRecording();
        announce(useUIStore.getState().recording ? 'Recording' : 'Recording stopped');
        return;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
