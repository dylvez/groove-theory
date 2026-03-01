import { useEffect } from 'react';
import type { NoteWithOctave } from '../types';
import { KEYBOARD_MAP } from '../constants';

interface UseKeyboardInputOptions {
  baseOctave: number;
  onNoteOn: (note: NoteWithOctave) => void;
  onNoteOff?: (note: NoteWithOctave) => void;
  enabled?: boolean;
}

export function useKeyboardInput({ baseOctave, onNoteOn, onNoteOff, enabled = true }: UseKeyboardInputOptions) {
  useEffect(() => {
    if (!enabled) return;

    const activeNotes = new Set<string>();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.repeat || e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      const mapping = KEYBOARD_MAP[e.key.toLowerCase()];
      if (!mapping) return;

      const note: NoteWithOctave = `${mapping.note}${baseOctave + mapping.octaveOffset}` as NoteWithOctave;
      if (activeNotes.has(note)) return;

      activeNotes.add(note);
      onNoteOn(note);
    }

    function handleKeyUp(e: KeyboardEvent) {
      const mapping = KEYBOARD_MAP[e.key.toLowerCase()];
      if (!mapping) return;

      const note: NoteWithOctave = `${mapping.note}${baseOctave + mapping.octaveOffset}` as NoteWithOctave;
      activeNotes.delete(note);
      onNoteOff?.(note);
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [baseOctave, onNoteOn, onNoteOff, enabled]);
}
