import { useEffect } from 'react';
import type { NoteWithOctave } from '../types';
import { KEYBOARD_MAP } from '../constants';
import { useUIStore } from '../store/useUIStore';
import { useTheoryStore } from '../store/useTheoryStore';
import { isModalOpen } from './useModal';
import { liveNoteOff, liveNoteOn, releaseLive, scaleKeyNote } from '../utils/liveInput';

function isTypingTarget(t: EventTarget | null): boolean {
  return t instanceof HTMLInputElement || t instanceof HTMLSelectElement || t instanceof HTMLTextAreaElement
    || (t instanceof HTMLElement && t.isContentEditable);
}

/** The note a computer key plays now, or null if it plays nothing */
function keyNote(key: string): NoteWithOctave | null {
  const ui = useUIStore.getState();
  if (ui.scaleLock) {
    const { rootNote, selectedScale } = useTheoryStore.getState();
    return scaleKeyNote(key, rootNote, selectedScale, ui.liveOctave);
  }
  const mapping = KEYBOARD_MAP[key];
  return mapping ? `${mapping.note}${ui.liveOctave + mapping.octaveOffset}` as NoteWithOctave : null;
}

/**
 * Live keyboard performance into the armed melodic track.
 *
 * - A W S E D F T G Y H U J K O L P ; play notes (two octaves from `liveOctave`)
 * - With scale lock on, the home row A S D F G H J K L ; plays the chosen
 *   scale from its root instead, and the upper row is silent
 * - Z / X shift the live octave down / up
 * - When REC is on and the sequencer is playing, each key press is quantized
 *   to the nearest step and written into the armed track. Holding a key sets
 *   the note length. (See utils/liveInput, shared with MIDI keyboards.)
 */
export function useLiveKeys() {
  const armedTrackId = useUIStore(s => s.armedTrackId);

  useEffect(() => {
    if (!armedTrackId) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey || isModalOpen()) return;
      const key = e.key.toLowerCase();
      const ui = useUIStore.getState();

      if (key === 'z') { ui.setLiveOctave(ui.liveOctave - 1); e.preventDefault(); return; }
      if (key === 'x') { ui.setLiveOctave(ui.liveOctave + 1); e.preventDefault(); return; }

      // Keys that play notes when unlocked stay quiet (and don't scroll) when locked
      if (!KEYBOARD_MAP[key]) return;
      e.preventDefault();
      const note = keyNote(key);
      if (note) liveNoteOn(`key:${key}`, note, 0.85);
    };

    const onKeyUp = (e: KeyboardEvent) => liveNoteOff(`key:${e.key.toLowerCase()}`);
    // A key let go while the window is in the background never sends keyup
    const onBlur = () => releaseLive('key:');

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      onBlur();
    };
  }, [armedTrackId]);
}
