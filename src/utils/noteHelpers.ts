import type { NoteName } from '../types';

export function isBlackKey(note: NoteName): boolean {
  return note.includes('#');
}

export function formatNote(note: NoteName): string {
  return note.replace('#', '\u266F');
}
