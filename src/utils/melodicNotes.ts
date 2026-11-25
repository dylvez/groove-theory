import type { MelodicStep, NoteEvent, NoteName, NoteWithOctave } from '../types';
import { NOTE_NAMES } from '../constants/notes';

/**
 * Chord-aware helpers for synth steps. A step stores its lowest note in
 * `note`/`velocity`/`length` and any others in `more`; everything else in the
 * app should go through these functions so that detail stays in one place.
 */

export const MIN_OCTAVE = 0;
export const MAX_OCTAVE = 7;

/** MIDI note number, C4 = 60 */
export function noteToMidi(note: NoteWithOctave): number {
  const m = note.match(/^([A-G]#?)(\d)$/);
  if (!m) return 60;
  return (parseInt(m[2], 10) + 1) * 12 + NOTE_NAMES.indexOf(m[1] as NoteName);
}

export function midiToNote(midi: number): NoteWithOctave {
  const clamped = Math.max((MIN_OCTAVE + 1) * 12, Math.min((MAX_OCTAVE + 2) * 12 - 1, Math.round(midi)));
  return `${NOTE_NAMES[clamped % 12]}${Math.floor(clamped / 12) - 1}` as NoteWithOctave;
}

/** Every note that starts on this step, lowest first */
export function stepNotes(step: MelodicStep): NoteEvent[] {
  if (!step.active || !step.note) return [];
  return [
    { note: step.note, velocity: step.velocity, length: Math.max(1, step.length ?? 1) },
    ...(step.more ?? []),
  ];
}

/** Rebuild a step from a list of notes (any order, duplicates by pitch removed) */
export function stepFromNotes(prev: MelodicStep, notes: NoteEvent[]): MelodicStep {
  const byPitch = new Map<number, NoteEvent>();
  for (const n of notes) byPitch.set(noteToMidi(n.note), n);
  const sorted = [...byPitch.entries()].sort((a, b) => a[0] - b[0]).map(([, n]) => n);
  if (sorted.length === 0) return { active: false, note: null, velocity: prev.velocity || 0.8 };
  const [first, ...rest] = sorted;
  return {
    active: true,
    note: first.note,
    velocity: first.velocity,
    length: Math.max(1, first.length),
    ...(rest.length ? { more: rest.map(n => ({ ...n, length: Math.max(1, n.length) })) } : {}),
    // Chance / repeats / timing belong to the step, so they survive note edits
    ...(prev.active && prev.fx ? { fx: prev.fx } : {}),
  };
}

/** Longest note on the step (for drawing held-note tails in the lane) */
export function stepLength(step: MelodicStep): number {
  return stepNotes(step).reduce((m, n) => Math.max(m, n.length), 1);
}

/** Move every note on the step by a number of semitones */
export function transposeStep(step: MelodicStep, semitones: number): MelodicStep {
  if (!semitones || !step.active) return step;
  return stepFromNotes(step, stepNotes(step).map(n => ({ ...n, note: midiToNote(noteToMidi(n.note) + semitones) })));
}

/** The note of a given pitch on this step, if any */
export function findNote(step: MelodicStep, note: NoteWithOctave): NoteEvent | undefined {
  const midi = noteToMidi(note);
  return stepNotes(step).find(n => noteToMidi(n.note) === midi);
}

/**
 * The note covering a cell (pitch, step) in a track, either starting there
 * or held from an earlier step. A later note of the same pitch cuts a held
 * note short, matching how the lane draws tails.
 */
export function noteCovering(
  steps: MelodicStep[], pitch: number, step: number,
): { start: number; event: NoteEvent } | null {
  for (let s = step; s >= 0; s--) {
    const ev = stepNotes(steps[s]).find(n => noteToMidi(n.note) === pitch);
    if (ev) return s + ev.length - 1 >= step ? { start: s, event: ev } : null;
  }
  return null;
}
