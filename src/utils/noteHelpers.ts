import type { NoteName, NoteWithOctave } from '../types';
import { NOTE_NAMES } from '../constants';

export function noteToMidi(note: NoteWithOctave): number {
  const match = note.match(/^([A-G]#?)(\d)$/);
  if (!match) return 60;
  const [, name, octStr] = match;
  const octave = parseInt(octStr);
  const semitone = NOTE_NAMES.indexOf(name as NoteName);
  return (octave + 1) * 12 + semitone;
}

export function midiToNote(midi: number): NoteWithOctave {
  const octave = Math.floor(midi / 12) - 1;
  const semitone = midi % 12;
  return `${NOTE_NAMES[semitone]}${octave}` as NoteWithOctave;
}

export function isBlackKey(note: NoteName): boolean {
  return note.includes('#');
}

export function formatNote(note: NoteName): string {
  return note.replace('#', '\u266F');
}

export function getNoteIndex(note: NoteName): number {
  return NOTE_NAMES.indexOf(note);
}

export function transposeNote(note: NoteName, semitones: number): NoteName {
  const index = NOTE_NAMES.indexOf(note);
  const newIndex = ((index + semitones) % 12 + 12) % 12;
  return NOTE_NAMES[newIndex];
}
