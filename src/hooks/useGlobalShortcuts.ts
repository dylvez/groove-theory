import { useEffect } from 'react';
import { useSequencerStore } from '../store/useSequencerStore';
import { useTransportStore } from '../store/useTransportStore';
import { useSongStore } from '../store/useSongStore';
import { useUIStore } from '../store/useUIStore';
import { AudioEngine } from '../audio/AudioEngine';
import { PATTERN_IDS } from '../constants/patterns';

function isTypingTarget(t: EventTarget | null): boolean {
  return t instanceof HTMLInputElement || t instanceof HTMLSelectElement || t instanceof HTMLTextAreaElement
    || (t instanceof HTMLElement && t.isContentEditable);
}

/**
 * App-wide keyboard shortcuts:
 *   Space            play / stop
 *   1 2 3 4          select pattern A–D
 *   ⌘/Ctrl+Z         undo · ⌘/Ctrl+Shift+Z (or ⌘/Ctrl+Y) redo
 *   ⌘/Ctrl+C / V     copy / paste pattern
 *   [ / ]            shift pattern left / right one step
 *   R                toggle record (when a track is armed)
 *   Escape           disarm live keys
 */
export function useGlobalShortcuts() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
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
        const transport = useTransportStore.getState();
        const song = useSongStore.getState();
        if (transport.state === 'playing') {
          transport.stop();
        } else {
          if (song.songState === 'playing') song.stopSong();
          AudioEngine.getInstance().init().then(() => useTransportStore.getState().play());
        }
        return;
      }

      if (key >= '1' && key <= '4') {
        const id = PATTERN_IDS[parseInt(key, 10) - 1];
        if (id) { e.preventDefault(); seq.setActivePattern(id); }
        return;
      }
      if (key === '[') { e.preventDefault(); seq.shiftPattern(-1); return; }
      if (key === ']') { e.preventDefault(); seq.shiftPattern(1); return; }

      const ui = useUIStore.getState();
      if (key === 'r' && ui.armedTrackId) { e.preventDefault(); ui.toggleRecording(); return; }
      if (key === 'escape' && ui.armedTrackId) { ui.setArmedTrack(null); return; }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
