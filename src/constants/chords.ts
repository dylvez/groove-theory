import type { ChordDefinition } from '../types';

export const CHORDS: ChordDefinition[] = [
  { name: 'Major', symbol: '', intervals: [0, 4, 7] },
  { name: 'Minor', symbol: 'm', intervals: [0, 3, 7] },
  { name: 'Diminished', symbol: 'dim', intervals: [0, 3, 6] },
  { name: 'Augmented', symbol: 'aug', intervals: [0, 4, 8] },
  { name: 'Major 7th', symbol: 'maj7', intervals: [0, 4, 7, 11] },
  { name: 'Minor 7th', symbol: 'm7', intervals: [0, 3, 7, 10] },
  { name: 'Dominant 7th', symbol: '7', intervals: [0, 4, 7, 10] },
  { name: 'Diminished 7th', symbol: 'dim7', intervals: [0, 3, 6, 9] },
  { name: 'Half-Diminished 7th', symbol: 'm7b5', intervals: [0, 3, 6, 10] },
  { name: 'Suspended 2nd', symbol: 'sus2', intervals: [0, 2, 7] },
  { name: 'Suspended 4th', symbol: 'sus4', intervals: [0, 5, 7] },
];

// Diatonic triads for major scale: I ii iii IV V vi vii°
export const MAJOR_DIATONIC_TRIADS: { degree: number; chord: ChordDefinition; numeral: string }[] = [
  { degree: 0, chord: CHORDS[0], numeral: 'I' },    // Major
  { degree: 1, chord: CHORDS[1], numeral: 'ii' },   // Minor
  { degree: 2, chord: CHORDS[1], numeral: 'iii' },  // Minor
  { degree: 3, chord: CHORDS[0], numeral: 'IV' },   // Major
  { degree: 4, chord: CHORDS[0], numeral: 'V' },    // Major
  { degree: 5, chord: CHORDS[1], numeral: 'vi' },   // Minor
  { degree: 6, chord: CHORDS[2], numeral: 'vii°' }, // Diminished
];

// Diatonic triads for natural minor scale: i ii° III iv v VI VII
export const MINOR_DIATONIC_TRIADS: { degree: number; chord: ChordDefinition; numeral: string }[] = [
  { degree: 0, chord: CHORDS[1], numeral: 'i' },    // Minor
  { degree: 1, chord: CHORDS[2], numeral: 'ii°' },  // Diminished
  { degree: 2, chord: CHORDS[0], numeral: 'III' },  // Major
  { degree: 3, chord: CHORDS[1], numeral: 'iv' },   // Minor
  { degree: 4, chord: CHORDS[1], numeral: 'v' },    // Minor
  { degree: 5, chord: CHORDS[0], numeral: 'VI' },   // Major
  { degree: 6, chord: CHORDS[0], numeral: 'VII' },  // Major
];
