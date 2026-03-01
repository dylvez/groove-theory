export type NoteName = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B';
export type Octave = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type NoteWithOctave = `${NoteName}${Octave}`;
export type MidiNote = number;

export interface ScaleDefinition {
  name: string;
  intervals: number[];
  mode?: string;
}

export interface ChordDefinition {
  name: string;
  symbol: string;
  intervals: number[];
}

export interface ChordInstance {
  root: NoteName;
  definition: ChordDefinition;
  inversion: number;
  notes: NoteWithOctave[];
}

export interface ProgressionSlot {
  id: string;
  scaleDegree: number;
  chordDefinition: ChordDefinition;
  duration: number;
}

export interface ChordProgression {
  id: string;
  name: string;
  key: NoteName;
  scale: ScaleDefinition;
  slots: ProgressionSlot[];
}
