import type { SavedGroove } from '../types/groove';
import type { Pattern, DrumTrack, MelodicStep, StepValue, TimeSignature } from '../types/sequencer';
import { BEATS } from './beats';
import { DEFAULT_DRUM_PARAMS, DEFAULT_MELODIC_PARAMS, DRUM_KIT } from './drums';
import { SCALES } from './scales';
import { CHORDS } from './chords';
import type { SongBlock } from '../store/useSongStore';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _pid = 0;
function pid(): string { return `preset_${++_pid}`; }

function drumColor(key: string): string {
  return DRUM_KIT.find(k => k.key === key)?.color ?? '#888';
}

function drumName(key: string): string {
  return DRUM_KIT.find(k => k.key === key)?.name ?? key;
}

function boolToSteps(bools: boolean[]): StepValue[] {
  return bools.map(b => (b ? 1 : 0) as StepValue);
}

function emptySteps(n: number): StepValue[] {
  return new Array(n).fill(0);
}

function emptyMelodicSteps(n: number): MelodicStep[] {
  return Array.from({ length: n }, () => ({ active: false, note: null, velocity: 0.8 }));
}

function makeDrumTrack(sampleKey: string, steps: StepValue[]): DrumTrack {
  return {
    id: pid(),
    name: drumName(sampleKey),
    sampleKey,
    steps,
    muted: false,
    solo: false,
    volume: -6,
    color: drumColor(sampleKey),
    synthParams: DEFAULT_DRUM_PARAMS[sampleKey] ?? DEFAULT_DRUM_PARAMS['kick'],
  };
}

function defaultMelodicTracks(numSteps: number) {
  return [
    { id: pid(), name: 'Bass', synthType: 'monoSynth' as const, steps: emptyMelodicSteps(numSteps), muted: false, solo: false, volume: -6, octave: 3, synthParams: { ...DEFAULT_MELODIC_PARAMS } },
    { id: pid(), name: 'Melody 1', synthType: 'synth' as const, steps: emptyMelodicSteps(numSteps), muted: false, solo: false, volume: -6, octave: 4, synthParams: { ...DEFAULT_MELODIC_PARAMS } },
    { id: pid(), name: 'Melody 2', synthType: 'fmSynth' as const, steps: emptyMelodicSteps(numSteps), muted: false, solo: false, volume: -6, octave: 4, synthParams: { ...DEFAULT_MELODIC_PARAMS } },
  ];
}

/** Convert a BeatDefinition (by name) into drum tracks for a Pattern */
function beatToDrumTracks(beatName: string, numSteps: number): DrumTrack[] {
  const beat = BEATS.find(b => b.name === beatName);
  if (!beat) return [makeDrumTrack('kick', emptySteps(numSteps))];

  const tracks: DrumTrack[] = [];
  const seenKeys = new Set<string>();

  for (const t of beat.tracks) {
    // Convert boolean steps, pad/truncate to numSteps
    const converted = boolToSteps(t.steps);
    const steps: StepValue[] = new Array(numSteps).fill(0);
    for (let i = 0; i < Math.min(converted.length, numSteps); i++) {
      steps[i] = converted[i];
    }
    // Avoid duplicate sampleKeys in the same pattern
    const key = t.instrument;
    if (seenKeys.has(key)) {
      // Merge into existing track
      const existing = tracks.find(tr => tr.sampleKey === key);
      if (existing) {
        for (let i = 0; i < numSteps; i++) {
          if (steps[i]) existing.steps[i] = 1;
        }
      }
      continue;
    }
    seenKeys.add(key);
    tracks.push(makeDrumTrack(key, steps));
  }

  // Ensure default drum keys exist (kick, snare, hihat-closed, hihat-open, rim)
  for (const key of ['kick', 'snare', 'hihat-closed', 'hihat-open', 'rim']) {
    if (!seenKeys.has(key)) {
      tracks.push(makeDrumTrack(key, emptySteps(numSteps)));
    }
  }

  return tracks;
}

function makePattern(
  id: string,
  name: string,
  beatName: string,
  numSteps: number = 32,
  timeSignature: TimeSignature = '4/4',
): Pattern {
  return {
    id,
    name,
    numSteps,
    timeSignature,
    drumTracks: beatToDrumTracks(beatName, numSteps),
    melodicTracks: defaultMelodicTracks(numSteps),
  };
}

function sb(patternId: string, repeats: number, label?: string): SongBlock {
  return { id: pid(), patternId, repeats, muted: false, sectionLabel: label };
}

// ---------------------------------------------------------------------------
// Scale/chord shortcuts
// ---------------------------------------------------------------------------

const MAJOR_SCALE = SCALES[0]; // Major / Ionian
const MINOR_SCALE = SCALES[1]; // Natural Minor / Aeolian
const BLUES_SCALE = SCALES[11]; // Blues
const DORIAN_SCALE = SCALES[4]; // Dorian

const MAJOR_CHORD = CHORDS[0];
const MINOR_CHORD = CHORDS[1];

// ---------------------------------------------------------------------------
// Preset 1: Classic Rock
// ---------------------------------------------------------------------------

const classicRock: SavedGroove = {
  version: 1,
  name: 'Classic Rock',
  savedAt: '2025-01-01T00:00:00.000Z',
  patterns: [
    makePattern('pattern-a', 'A', 'Standard Rock Beat'),
    makePattern('pattern-b', 'B', 'Half-Time'),
    makePattern('pattern-c', 'C', 'Breakbeat (Amen Break)'),
    makePattern('pattern-d', 'D', 'Four on the Floor'),
  ],
  activePatternId: 'pattern-a',
  bpm: 110,
  swing: 0,
  rootNote: 'E',
  selectedScale: MAJOR_SCALE,
  selectedChord: MAJOR_CHORD,
  chordRoot: 'E',
  chordInversion: 0,
  progression: [
    { id: pid(), scaleDegree: 0, chordDefinition: MAJOR_CHORD, duration: 1 },
    { id: pid(), scaleDegree: 3, chordDefinition: MAJOR_CHORD, duration: 1 },
    { id: pid(), scaleDegree: 4, chordDefinition: MAJOR_CHORD, duration: 1 },
    { id: pid(), scaleDegree: 0, chordDefinition: MAJOR_CHORD, duration: 1 },
  ],
  songBlocks: [
    sb('pattern-b', 2, 'Intro'),
    sb('pattern-a', 4, 'Verse'),
    sb('pattern-c', 4, 'Chorus'),
    sb('pattern-a', 4, 'Verse'),
    sb('pattern-c', 4, 'Chorus'),
    sb('pattern-d', 2, 'Bridge'),
    sb('pattern-c', 4, 'Chorus'),
    sb('pattern-b', 2, 'Outro'),
  ],
};

// ---------------------------------------------------------------------------
// Preset 2: Boom-Bap Beat
// ---------------------------------------------------------------------------

const boomBap: SavedGroove = {
  version: 1,
  name: 'Boom-Bap Beat',
  savedAt: '2025-01-01T00:00:00.000Z',
  patterns: [
    makePattern('pattern-a', 'A', 'Boom-Bap'),
    makePattern('pattern-b', 'B', 'Trap / 808'),
    makePattern('pattern-c', 'C', 'Breakbeat (Amen Break)'),
    makePattern('pattern-d', 'D', 'Half-Time'),
  ],
  activePatternId: 'pattern-a',
  bpm: 90,
  swing: 0.15,
  rootNote: 'A',
  selectedScale: MINOR_SCALE,
  selectedChord: MINOR_CHORD,
  chordRoot: 'A',
  chordInversion: 0,
  progression: [
    { id: pid(), scaleDegree: 0, chordDefinition: MINOR_CHORD, duration: 2 },
    { id: pid(), scaleDegree: 3, chordDefinition: MINOR_CHORD, duration: 1 },
    { id: pid(), scaleDegree: 4, chordDefinition: MINOR_CHORD, duration: 1 },
  ],
  songBlocks: [
    sb('pattern-a', 4, 'Intro'),
    sb('pattern-a', 4, 'Verse'),
    sb('pattern-c', 4, 'Hook'),
    sb('pattern-a', 4, 'Verse'),
    sb('pattern-c', 4, 'Hook'),
    sb('pattern-b', 4, 'Bridge'),
    sb('pattern-c', 4, 'Hook'),
    sb('pattern-d', 2, 'Outro'),
  ],
};

// ---------------------------------------------------------------------------
// Preset 3: Dance Floor
// ---------------------------------------------------------------------------

const danceFloor: SavedGroove = {
  version: 1,
  name: 'Dance Floor',
  savedAt: '2025-01-01T00:00:00.000Z',
  patterns: [
    makePattern('pattern-a', 'A', 'House'),
    makePattern('pattern-b', 'B', 'Four on the Floor'),
    makePattern('pattern-c', 'C', 'Drum & Bass'),
    makePattern('pattern-d', 'D', 'Ska Upbeat'),
  ],
  activePatternId: 'pattern-a',
  bpm: 124,
  swing: 0,
  rootNote: 'G',
  selectedScale: MAJOR_SCALE,
  selectedChord: MAJOR_CHORD,
  chordRoot: 'G',
  chordInversion: 0,
  progression: [
    { id: pid(), scaleDegree: 0, chordDefinition: MAJOR_CHORD, duration: 1 },
    { id: pid(), scaleDegree: 5, chordDefinition: MINOR_CHORD, duration: 1 },
    { id: pid(), scaleDegree: 3, chordDefinition: MAJOR_CHORD, duration: 1 },
    { id: pid(), scaleDegree: 4, chordDefinition: MAJOR_CHORD, duration: 1 },
  ],
  songBlocks: [
    sb('pattern-a', 4, 'Intro'),
    sb('pattern-b', 4, 'Build'),
    sb('pattern-a', 4, 'Drop'),
    sb('pattern-d', 4, 'Breakdown'),
    sb('pattern-b', 4, 'Build'),
    sb('pattern-a', 4, 'Drop'),
    sb('pattern-c', 4, 'Bridge'),
    sb('pattern-a', 4, 'Final Drop'),
  ],
};

// ---------------------------------------------------------------------------
// Preset 4: Funk Pocket
// ---------------------------------------------------------------------------

const funkPocket: SavedGroove = {
  version: 1,
  name: 'Funk Pocket',
  savedAt: '2025-01-01T00:00:00.000Z',
  patterns: [
    makePattern('pattern-a', 'A', 'Funk'),
    makePattern('pattern-b', 'B', 'Motown'),
    makePattern('pattern-c', 'C', 'Reggae One Drop'),
    makePattern('pattern-d', 'D', 'Bossa Nova'),
  ],
  activePatternId: 'pattern-a',
  bpm: 104,
  swing: 0.1,
  rootNote: 'E',
  selectedScale: DORIAN_SCALE,
  selectedChord: MINOR_CHORD,
  chordRoot: 'E',
  chordInversion: 0,
  progression: [
    { id: pid(), scaleDegree: 0, chordDefinition: MINOR_CHORD, duration: 2 },
    { id: pid(), scaleDegree: 3, chordDefinition: MAJOR_CHORD, duration: 2 },
  ],
  songBlocks: [
    sb('pattern-a', 4, 'Groove'),
    sb('pattern-b', 4, 'Verse'),
    sb('pattern-a', 4, 'Chorus'),
    sb('pattern-b', 4, 'Verse'),
    sb('pattern-a', 4, 'Chorus'),
    sb('pattern-c', 4, 'Breakdown'),
    sb('pattern-d', 4, 'Bridge'),
    sb('pattern-a', 4, 'Outro'),
  ],
};

// ---------------------------------------------------------------------------
// Preset 5: Blues Shuffle
// ---------------------------------------------------------------------------

const bluesShuffle: SavedGroove = {
  version: 1,
  name: 'Blues Shuffle',
  savedAt: '2025-01-01T00:00:00.000Z',
  patterns: [
    makePattern('pattern-a', 'A', 'Shuffle', 24, '3/4'),
    makePattern('pattern-b', 'B', 'Train Beat'),
    makePattern('pattern-c', 'C', 'Standard Rock Beat'),
    makePattern('pattern-d', 'D', '3/4 Ballad', 24, '3/4'),
  ],
  activePatternId: 'pattern-a',
  bpm: 116,
  swing: 0.2,
  rootNote: 'A',
  selectedScale: BLUES_SCALE,
  selectedChord: MAJOR_CHORD,
  chordRoot: 'A',
  chordInversion: 0,
  progression: [
    { id: pid(), scaleDegree: 0, chordDefinition: MAJOR_CHORD, duration: 2 },
    { id: pid(), scaleDegree: 3, chordDefinition: MAJOR_CHORD, duration: 1 },
    { id: pid(), scaleDegree: 4, chordDefinition: MAJOR_CHORD, duration: 1 },
  ],
  songBlocks: [
    sb('pattern-a', 4, 'Intro'),
    sb('pattern-b', 4, 'Verse'),
    sb('pattern-c', 4, 'Chorus'),
    sb('pattern-b', 4, 'Verse'),
    sb('pattern-c', 4, 'Chorus'),
    sb('pattern-a', 4, 'Solo'),
    sb('pattern-d', 2, 'Outro'),
  ],
};

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export interface PresetGrooveEntry {
  id: string;
  name: string;
  genre: string;
  bpm: number;
  groove: SavedGroove;
}

export const PRESET_GROOVES: PresetGrooveEntry[] = [
  { id: 'preset-classic-rock', name: 'Classic Rock', genre: 'Rock', bpm: 110, groove: classicRock },
  { id: 'preset-boom-bap', name: 'Boom-Bap Beat', genre: 'Hip-Hop', bpm: 90, groove: boomBap },
  { id: 'preset-dance-floor', name: 'Dance Floor', genre: 'House / EDM', bpm: 124, groove: danceFloor },
  { id: 'preset-funk-pocket', name: 'Funk Pocket', genre: 'Funk / Soul', bpm: 104, groove: funkPocket },
  { id: 'preset-blues-shuffle', name: 'Blues Shuffle', genre: 'Blues', bpm: 116, groove: bluesShuffle },
];
