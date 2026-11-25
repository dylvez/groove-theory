import type { NoteName } from '../types';

export function isBlackKey(note: NoteName): boolean {
  return note.includes('#');
}

export function formatNote(note: NoteName): string {
  return note.replace('#', '\u266F');
}

/** How a note should be read aloud: "C#4" → "C sharp 4" */
export function spokenNote(note: string): string {
  return note.replace(/#/g, ' sharp ').replace(/b(?=\d|$)/, ' flat ').replace(/\s+/g, ' ').trim();
}
