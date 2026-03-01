import type { ScaleDefinition } from '../types';

export const SCALES: ScaleDefinition[] = [
  { name: 'Major', intervals: [0, 2, 4, 5, 7, 9, 11], mode: 'Ionian' },
  { name: 'Natural Minor', intervals: [0, 2, 3, 5, 7, 8, 10], mode: 'Aeolian' },
  { name: 'Harmonic Minor', intervals: [0, 2, 3, 5, 7, 8, 11] },
  { name: 'Melodic Minor', intervals: [0, 2, 3, 5, 7, 9, 11] },
  { name: 'Dorian', intervals: [0, 2, 3, 5, 7, 9, 10], mode: 'Dorian' },
  { name: 'Phrygian', intervals: [0, 1, 3, 5, 7, 8, 10], mode: 'Phrygian' },
  { name: 'Lydian', intervals: [0, 2, 4, 6, 7, 9, 11], mode: 'Lydian' },
  { name: 'Mixolydian', intervals: [0, 2, 4, 5, 7, 9, 10], mode: 'Mixolydian' },
  { name: 'Locrian', intervals: [0, 1, 3, 5, 6, 8, 10], mode: 'Locrian' },
  { name: 'Pentatonic Major', intervals: [0, 2, 4, 7, 9] },
  { name: 'Pentatonic Minor', intervals: [0, 3, 5, 7, 10] },
  { name: 'Blues', intervals: [0, 3, 5, 6, 7, 10] },
  { name: 'Chromatic', intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
];

export const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

export const SCALE_DEGREE_NAMES = [
  'Tonic', 'Supertonic', 'Mediant', 'Subdominant',
  'Dominant', 'Submediant', 'Leading Tone',
];
