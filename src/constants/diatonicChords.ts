export interface DiatonicChordEntry {
  degree: number;          // 0-based index into scale
  numeral: string;         // Roman numeral with case/symbol (e.g., "I", "ii", "vii°")
  intervalOffset: number;  // semitones from scale root to chord root
  quality: string;         // matches CHORDS[].name (e.g., "Major", "Minor", "Diminished")
}

export interface DiatonicChordMap {
  scaleName: string;
  chords: DiatonicChordEntry[];
}

export const DIATONIC_CHORD_MAP: DiatonicChordMap[] = [
  {
    scaleName: 'Major',
    chords: [
      { degree: 0, numeral: 'I',    intervalOffset: 0,  quality: 'Major' },
      { degree: 1, numeral: 'ii',   intervalOffset: 2,  quality: 'Minor' },
      { degree: 2, numeral: 'iii',  intervalOffset: 4,  quality: 'Minor' },
      { degree: 3, numeral: 'IV',   intervalOffset: 5,  quality: 'Major' },
      { degree: 4, numeral: 'V',    intervalOffset: 7,  quality: 'Major' },
      { degree: 5, numeral: 'vi',   intervalOffset: 9,  quality: 'Minor' },
      { degree: 6, numeral: 'vii°', intervalOffset: 11, quality: 'Diminished' },
    ],
  },
  {
    scaleName: 'Natural Minor',
    chords: [
      { degree: 0, numeral: 'i',    intervalOffset: 0,  quality: 'Minor' },
      { degree: 1, numeral: 'ii°',  intervalOffset: 2,  quality: 'Diminished' },
      { degree: 2, numeral: 'III',  intervalOffset: 3,  quality: 'Major' },
      { degree: 3, numeral: 'iv',   intervalOffset: 5,  quality: 'Minor' },
      { degree: 4, numeral: 'v',    intervalOffset: 7,  quality: 'Minor' },
      { degree: 5, numeral: 'VI',   intervalOffset: 8,  quality: 'Major' },
      { degree: 6, numeral: 'VII',  intervalOffset: 10, quality: 'Major' },
    ],
  },
  {
    scaleName: 'Dorian',
    chords: [
      { degree: 0, numeral: 'i',    intervalOffset: 0,  quality: 'Minor' },
      { degree: 1, numeral: 'ii',   intervalOffset: 2,  quality: 'Minor' },
      { degree: 2, numeral: 'III',  intervalOffset: 3,  quality: 'Major' },
      { degree: 3, numeral: 'IV',   intervalOffset: 5,  quality: 'Major' },
      { degree: 4, numeral: 'v',    intervalOffset: 7,  quality: 'Minor' },
      { degree: 5, numeral: 'vi°',  intervalOffset: 9,  quality: 'Diminished' },
      { degree: 6, numeral: 'VII',  intervalOffset: 10, quality: 'Major' },
    ],
  },
  {
    scaleName: 'Mixolydian',
    chords: [
      { degree: 0, numeral: 'I',    intervalOffset: 0,  quality: 'Major' },
      { degree: 1, numeral: 'ii',   intervalOffset: 2,  quality: 'Minor' },
      { degree: 2, numeral: 'iii°', intervalOffset: 4,  quality: 'Diminished' },
      { degree: 3, numeral: 'IV',   intervalOffset: 5,  quality: 'Major' },
      { degree: 4, numeral: 'v',    intervalOffset: 7,  quality: 'Minor' },
      { degree: 5, numeral: 'vi',   intervalOffset: 9,  quality: 'Minor' },
      { degree: 6, numeral: 'VII',  intervalOffset: 10, quality: 'Major' },
    ],
  },
  {
    scaleName: 'Phrygian',
    chords: [
      { degree: 0, numeral: 'i',    intervalOffset: 0,  quality: 'Minor' },
      { degree: 1, numeral: '♭II',  intervalOffset: 1,  quality: 'Major' },
      { degree: 2, numeral: '♭III', intervalOffset: 3,  quality: 'Major' },
      { degree: 3, numeral: 'iv',   intervalOffset: 5,  quality: 'Minor' },
      { degree: 4, numeral: 'v°',   intervalOffset: 7,  quality: 'Diminished' },
      { degree: 5, numeral: '♭VI',  intervalOffset: 8,  quality: 'Major' },
      { degree: 6, numeral: '♭vii', intervalOffset: 10, quality: 'Minor' },
    ],
  },
  {
    scaleName: 'Lydian',
    chords: [
      { degree: 0, numeral: 'I',    intervalOffset: 0,  quality: 'Major' },
      { degree: 1, numeral: 'II',   intervalOffset: 2,  quality: 'Major' },
      { degree: 2, numeral: 'iii',  intervalOffset: 4,  quality: 'Minor' },
      { degree: 3, numeral: '♯iv°', intervalOffset: 6,  quality: 'Diminished' },
      { degree: 4, numeral: 'V',    intervalOffset: 7,  quality: 'Major' },
      { degree: 5, numeral: 'vi',   intervalOffset: 9,  quality: 'Minor' },
      { degree: 6, numeral: 'vii',  intervalOffset: 11, quality: 'Minor' },
    ],
  },
  {
    scaleName: 'Locrian',
    chords: [
      { degree: 0, numeral: 'i°',   intervalOffset: 0,  quality: 'Diminished' },
      { degree: 1, numeral: '♭II',  intervalOffset: 1,  quality: 'Major' },
      { degree: 2, numeral: '♭iii', intervalOffset: 3,  quality: 'Minor' },
      { degree: 3, numeral: 'iv',   intervalOffset: 5,  quality: 'Minor' },
      { degree: 4, numeral: '♭V',   intervalOffset: 6,  quality: 'Major' },
      { degree: 5, numeral: '♭vi',  intervalOffset: 8,  quality: 'Minor' },
      { degree: 6, numeral: '♭vii', intervalOffset: 10, quality: 'Minor' },
    ],
  },
  {
    scaleName: 'Harmonic Minor',
    chords: [
      { degree: 0, numeral: 'i',    intervalOffset: 0,  quality: 'Minor' },
      { degree: 1, numeral: 'ii°',  intervalOffset: 2,  quality: 'Diminished' },
      { degree: 2, numeral: 'III+', intervalOffset: 3,  quality: 'Augmented' },
      { degree: 3, numeral: 'iv',   intervalOffset: 5,  quality: 'Minor' },
      { degree: 4, numeral: 'V',    intervalOffset: 7,  quality: 'Major' },
      { degree: 5, numeral: 'VI',   intervalOffset: 8,  quality: 'Major' },
      { degree: 6, numeral: 'vii°', intervalOffset: 11, quality: 'Diminished' },
    ],
  },
  {
    scaleName: 'Melodic Minor',
    chords: [
      { degree: 0, numeral: 'i',    intervalOffset: 0,  quality: 'Minor' },
      { degree: 1, numeral: 'ii',   intervalOffset: 2,  quality: 'Minor' },
      { degree: 2, numeral: '♭III+', intervalOffset: 3, quality: 'Augmented' },
      { degree: 3, numeral: 'IV',   intervalOffset: 5,  quality: 'Major' },
      { degree: 4, numeral: 'V',    intervalOffset: 7,  quality: 'Major' },
      { degree: 5, numeral: 'vi°',  intervalOffset: 9,  quality: 'Diminished' },
      { degree: 6, numeral: 'vii°', intervalOffset: 11, quality: 'Diminished' },
    ],
  },
  {
    scaleName: 'Pentatonic Major',
    chords: [
      { degree: 0, numeral: 'I',   intervalOffset: 0, quality: 'Major' },
      { degree: 1, numeral: 'ii',  intervalOffset: 2, quality: 'Minor' },
      { degree: 2, numeral: 'iii', intervalOffset: 4, quality: 'Minor' },
      { degree: 3, numeral: 'V',   intervalOffset: 7, quality: 'Major' },
      { degree: 4, numeral: 'vi',  intervalOffset: 9, quality: 'Minor' },
    ],
  },
  {
    scaleName: 'Pentatonic Minor',
    chords: [
      { degree: 0, numeral: 'i',    intervalOffset: 0,  quality: 'Minor' },
      { degree: 1, numeral: 'III',  intervalOffset: 3,  quality: 'Major' },
      { degree: 2, numeral: 'iv',   intervalOffset: 5,  quality: 'Minor' },
      { degree: 3, numeral: 'v',    intervalOffset: 7,  quality: 'Minor' },
      { degree: 4, numeral: 'VII',  intervalOffset: 10, quality: 'Major' },
    ],
  },
  {
    scaleName: 'Blues',
    chords: [
      { degree: 0, numeral: 'i',    intervalOffset: 0,  quality: 'Minor' },
      { degree: 1, numeral: 'III',  intervalOffset: 3,  quality: 'Major' },
      { degree: 2, numeral: 'iv',   intervalOffset: 5,  quality: 'Minor' },
      { degree: 3, numeral: 'V',    intervalOffset: 7,  quality: 'Major' },
      { degree: 4, numeral: 'VII',  intervalOffset: 10, quality: 'Major' },
    ],
  },
];

/** Lookup diatonic chords for a given scale name. Returns null if not mapped. */
export function getDiatonicChordsForScale(scaleName: string): DiatonicChordMap | null {
  return DIATONIC_CHORD_MAP.find(m => m.scaleName === scaleName) ?? null;
}
