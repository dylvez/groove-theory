import type { MelodicStep, NoteName, NoteWithOctave } from '../types';
import { getChordNotesWithOctave } from './musicTheory';
import { stepFromNotes } from './melodicNotes';

export type ApplyVoicing = 'chords' | 'roots';
export type ApplyRhythm = 'held' | 'beats';
export type ChordLength = 'beat' | 'twoBeats' | 'bar' | 'twoBars';

export interface ResolvedChord {
  numeral: string;
  root: NoteName;
  intervals: number[];
}

export const CHORD_LENGTH_LABELS: Record<ChordLength, string> = {
  beat: '1 beat',
  twoBeats: '2 beats',
  bar: '1 bar',
  twoBars: '2 bars',
};

export function chordLengthSteps(len: ChordLength, stepsPerBeat: number, stepsPerBar: number): number {
  switch (len) {
    case 'beat': return stepsPerBeat;
    case 'twoBeats': return stepsPerBeat * 2;
    case 'bar': return stepsPerBar;
    case 'twoBars': return stepsPerBar * 2;
  }
}

/** Longest chord length that still fits the whole progression in the pattern */
export function bestChordLength(chordCount: number, numSteps: number, stepsPerBeat: number, stepsPerBar: number): ChordLength {
  const options: ChordLength[] = ['twoBars', 'bar', 'twoBeats', 'beat'];
  return options.find(o => chordCount * chordLengthSteps(o, stepsPerBeat, stepsPerBar) <= numSteps) ?? 'beat';
}

/**
 * Turn a chord progression into synth steps for a whole pattern. The
 * progression repeats if it's shorter than the pattern and is cut off if it's
 * longer. "beats" re-strikes each chord on every beat with a short note;
 * "held" plays it once and holds it for its full length.
 */
export function progressionToSteps(chords: ResolvedChord[], opts: {
  numSteps: number;
  stepsPerChord: number;
  stepsPerBeat: number;
  octave: number;
  voicing: ApplyVoicing;
  rhythm: ApplyRhythm;
  velocity?: number;
}): MelodicStep[] {
  const { numSteps, stepsPerChord, stepsPerBeat, octave, voicing, rhythm, velocity = 0.8 } = opts;
  const empty = (): MelodicStep => ({ active: false, note: null, velocity: 0.8 });
  const steps = Array.from({ length: numSteps }, empty);
  if (chords.length === 0 || stepsPerChord < 1) return steps;

  const cycle = chords.length * stepsPerChord;
  for (let s = 0; s < numSteps; s++) {
    const pos = s % cycle;
    const chord = chords[Math.floor(pos / stepsPerChord)];
    const within = pos % stepsPerChord;
    const onBeat = within % stepsPerBeat === 0;
    if (within !== 0 && !(rhythm === 'beats' && onBeat)) continue;

    const remaining = Math.min(stepsPerChord - within, numSteps - s);
    const length = rhythm === 'held' ? remaining : Math.max(1, Math.min(remaining, Math.floor(stepsPerBeat / 2)));
    const pitches: NoteWithOctave[] = voicing === 'roots'
      ? [`${chord.root}${octave}` as NoteWithOctave]
      : getChordNotesWithOctave(chord.root, { name: chord.numeral, symbol: '', intervals: chord.intervals }, octave);
    // The first hit of each chord is a little stronger
    const v = rhythm === 'beats' && within !== 0 ? Math.max(0.3, velocity - 0.2) : velocity;
    steps[s] = stepFromNotes(steps[s], pitches.map(note => ({ note, velocity: v, length })));
  }
  return steps;
}
