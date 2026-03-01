import type { SavedGroove } from '../types/groove';
import type { Pattern, DrumTrack, MelodicTrack, MelodicStep, StepValue, TimeSignature, SynthType, MelodicSynthParams } from '../types/sequencer';
import type { NoteWithOctave } from '../types/music';
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

/** Create melodic steps from sparse [stepIndex, note, velocity?] hits */
function mel(numSteps: number, hits: [number, NoteWithOctave, number?][]): MelodicStep[] {
  const steps = emptyMelodicSteps(numSteps);
  for (const [i, note, vel] of hits) {
    if (i < numSteps) steps[i] = { active: true, note, velocity: vel ?? 0.8 };
  }
  return steps;
}

function makeDrumTrack(sampleKey: string, steps: StepValue[]): DrumTrack {
  return {
    id: pid(), name: drumName(sampleKey), sampleKey, steps,
    muted: false, solo: false, volume: -6, color: drumColor(sampleKey),
    synthParams: DEFAULT_DRUM_PARAMS[sampleKey] ?? DEFAULT_DRUM_PARAMS['kick'],
  };
}

function makeMelodicTrack(
  name: string, synthType: SynthType, steps: MelodicStep[],
  octave: number = 4, synthParams?: Partial<MelodicSynthParams>,
): MelodicTrack {
  return {
    id: pid(), name, synthType, steps, muted: false, solo: false, volume: -6, octave,
    synthParams: { ...DEFAULT_MELODIC_PARAMS, ...synthParams },
  };
}

function defaultMelodicTracks(numSteps: number): MelodicTrack[] {
  return [
    makeMelodicTrack('Bass', 'monoSynth', emptyMelodicSteps(numSteps), 3),
    makeMelodicTrack('Melody 1', 'synth', emptyMelodicSteps(numSteps), 4),
    makeMelodicTrack('Melody 2', 'fmSynth', emptyMelodicSteps(numSteps), 4),
  ];
}

function beatToDrumTracks(beatName: string, numSteps: number): DrumTrack[] {
  const beat = BEATS.find(b => b.name === beatName);
  if (!beat) return [makeDrumTrack('kick', emptySteps(numSteps))];
  const tracks: DrumTrack[] = [];
  const seenKeys = new Set<string>();
  for (const t of beat.tracks) {
    const converted = boolToSteps(t.steps);
    const steps: StepValue[] = new Array(numSteps).fill(0);
    for (let i = 0; i < Math.min(converted.length, numSteps); i++) steps[i] = converted[i];
    const key = t.instrument;
    if (seenKeys.has(key)) {
      const existing = tracks.find(tr => tr.sampleKey === key);
      if (existing) for (let i = 0; i < numSteps; i++) { if (steps[i]) existing.steps[i] = 1; }
      continue;
    }
    seenKeys.add(key);
    tracks.push(makeDrumTrack(key, steps));
  }
  for (const key of ['kick', 'snare', 'hihat-closed', 'hihat-open', 'rim']) {
    if (!seenKeys.has(key)) tracks.push(makeDrumTrack(key, emptySteps(numSteps)));
  }
  return tracks;
}

/** Beat-only pattern (empty melodics) */
function makePattern(id: string, name: string, beatName: string, numSteps: number = 32, timeSignature: TimeSignature = '4/4'): Pattern {
  return { id, name, numSteps, timeSignature, drumTracks: beatToDrumTracks(beatName, numSteps), melodicTracks: defaultMelodicTracks(numSteps) };
}

/** Pattern with custom melodic content */
function songPat(id: string, name: string, beatName: string, melodics: MelodicTrack[], numSteps: number = 32, timeSignature: TimeSignature = '4/4'): Pattern {
  return { id, name, numSteps, timeSignature, drumTracks: beatToDrumTracks(beatName, numSteps), melodicTracks: melodics };
}

function sb(patternId: string, repeats: number, label?: string): SongBlock {
  return { id: pid(), patternId, repeats, muted: false, sectionLabel: label };
}

// ---------------------------------------------------------------------------
// Scale/chord shortcuts
// ---------------------------------------------------------------------------

const MAJOR_SCALE = SCALES[0];
const MINOR_SCALE = SCALES[1];
const BLUES_SCALE = SCALES[11];
const DORIAN_SCALE = SCALES[4];
const PHRYGIAN_SCALE = SCALES[5];
const MIXOLYDIAN_SCALE = SCALES[7];

const MAJOR_CHORD = CHORDS[0];
const MINOR_CHORD = CHORDS[1];
const MAJOR7_CHORD = CHORDS[4];
const MINOR7_CHORD = CHORDS[5];

// ═══════════════════════════════════════════════════════════════════════════
// BEAT-ONLY PRESETS (drums only, empty melodics)
// ═══════════════════════════════════════════════════════════════════════════

const classicRock: SavedGroove = {
  version: 1, name: 'Classic Rock', savedAt: '2025-01-01T00:00:00.000Z',
  patterns: [makePattern('pattern-a', 'A', 'Standard Rock Beat'), makePattern('pattern-b', 'B', 'Half-Time'), makePattern('pattern-c', 'C', 'Breakbeat (Amen Break)'), makePattern('pattern-d', 'D', 'Four on the Floor')],
  activePatternId: 'pattern-a', bpm: 110, swing: 0, rootNote: 'E',
  selectedScale: MAJOR_SCALE, selectedChord: MAJOR_CHORD, chordRoot: 'E', chordInversion: 0,
  progression: [
    { id: pid(), scaleDegree: 0, chordDefinition: MAJOR_CHORD, duration: 1 },
    { id: pid(), scaleDegree: 3, chordDefinition: MAJOR_CHORD, duration: 1 },
    { id: pid(), scaleDegree: 4, chordDefinition: MAJOR_CHORD, duration: 1 },
    { id: pid(), scaleDegree: 0, chordDefinition: MAJOR_CHORD, duration: 1 },
  ],
  songBlocks: [sb('pattern-b', 2, 'Intro'), sb('pattern-a', 4, 'Verse'), sb('pattern-c', 4, 'Chorus'), sb('pattern-a', 4, 'Verse'), sb('pattern-c', 4, 'Chorus'), sb('pattern-d', 2, 'Bridge'), sb('pattern-c', 4, 'Chorus'), sb('pattern-b', 2, 'Outro')],
};

const boomBap: SavedGroove = {
  version: 1, name: 'Boom-Bap Beat', savedAt: '2025-01-01T00:00:00.000Z',
  patterns: [makePattern('pattern-a', 'A', 'Boom-Bap'), makePattern('pattern-b', 'B', 'Trap / 808'), makePattern('pattern-c', 'C', 'Breakbeat (Amen Break)'), makePattern('pattern-d', 'D', 'Half-Time')],
  activePatternId: 'pattern-a', bpm: 90, swing: 0.15, rootNote: 'A',
  selectedScale: MINOR_SCALE, selectedChord: MINOR_CHORD, chordRoot: 'A', chordInversion: 0,
  progression: [
    { id: pid(), scaleDegree: 0, chordDefinition: MINOR_CHORD, duration: 2 },
    { id: pid(), scaleDegree: 3, chordDefinition: MINOR_CHORD, duration: 1 },
    { id: pid(), scaleDegree: 4, chordDefinition: MINOR_CHORD, duration: 1 },
  ],
  songBlocks: [sb('pattern-a', 4, 'Intro'), sb('pattern-a', 4, 'Verse'), sb('pattern-c', 4, 'Hook'), sb('pattern-a', 4, 'Verse'), sb('pattern-c', 4, 'Hook'), sb('pattern-b', 4, 'Bridge'), sb('pattern-c', 4, 'Hook'), sb('pattern-d', 2, 'Outro')],
};

const danceFloor: SavedGroove = {
  version: 1, name: 'Dance Floor', savedAt: '2025-01-01T00:00:00.000Z',
  patterns: [makePattern('pattern-a', 'A', 'House'), makePattern('pattern-b', 'B', 'Four on the Floor'), makePattern('pattern-c', 'C', 'Drum & Bass'), makePattern('pattern-d', 'D', 'Ska Upbeat')],
  activePatternId: 'pattern-a', bpm: 124, swing: 0, rootNote: 'G',
  selectedScale: MAJOR_SCALE, selectedChord: MAJOR_CHORD, chordRoot: 'G', chordInversion: 0,
  progression: [
    { id: pid(), scaleDegree: 0, chordDefinition: MAJOR_CHORD, duration: 1 },
    { id: pid(), scaleDegree: 5, chordDefinition: MINOR_CHORD, duration: 1 },
    { id: pid(), scaleDegree: 3, chordDefinition: MAJOR_CHORD, duration: 1 },
    { id: pid(), scaleDegree: 4, chordDefinition: MAJOR_CHORD, duration: 1 },
  ],
  songBlocks: [sb('pattern-a', 4, 'Intro'), sb('pattern-b', 4, 'Build'), sb('pattern-a', 4, 'Drop'), sb('pattern-d', 4, 'Breakdown'), sb('pattern-b', 4, 'Build'), sb('pattern-a', 4, 'Drop'), sb('pattern-c', 4, 'Bridge'), sb('pattern-a', 4, 'Final Drop')],
};

const funkPocket: SavedGroove = {
  version: 1, name: 'Funk Pocket', savedAt: '2025-01-01T00:00:00.000Z',
  patterns: [makePattern('pattern-a', 'A', 'Funk'), makePattern('pattern-b', 'B', 'Motown'), makePattern('pattern-c', 'C', 'Reggae One Drop'), makePattern('pattern-d', 'D', 'Bossa Nova')],
  activePatternId: 'pattern-a', bpm: 104, swing: 0.1, rootNote: 'E',
  selectedScale: DORIAN_SCALE, selectedChord: MINOR_CHORD, chordRoot: 'E', chordInversion: 0,
  progression: [
    { id: pid(), scaleDegree: 0, chordDefinition: MINOR_CHORD, duration: 2 },
    { id: pid(), scaleDegree: 3, chordDefinition: MAJOR_CHORD, duration: 2 },
  ],
  songBlocks: [sb('pattern-a', 4, 'Groove'), sb('pattern-b', 4, 'Verse'), sb('pattern-a', 4, 'Chorus'), sb('pattern-b', 4, 'Verse'), sb('pattern-a', 4, 'Chorus'), sb('pattern-c', 4, 'Breakdown'), sb('pattern-d', 4, 'Bridge'), sb('pattern-a', 4, 'Outro')],
};

const bluesShuffle: SavedGroove = {
  version: 1, name: 'Blues Shuffle', savedAt: '2025-01-01T00:00:00.000Z',
  patterns: [makePattern('pattern-a', 'A', 'Shuffle', 24, '3/4'), makePattern('pattern-b', 'B', 'Train Beat'), makePattern('pattern-c', 'C', 'Standard Rock Beat'), makePattern('pattern-d', 'D', '3/4 Ballad', 24, '3/4')],
  activePatternId: 'pattern-a', bpm: 116, swing: 0.2, rootNote: 'A',
  selectedScale: BLUES_SCALE, selectedChord: MAJOR_CHORD, chordRoot: 'A', chordInversion: 0,
  progression: [
    { id: pid(), scaleDegree: 0, chordDefinition: MAJOR_CHORD, duration: 2 },
    { id: pid(), scaleDegree: 3, chordDefinition: MAJOR_CHORD, duration: 1 },
    { id: pid(), scaleDegree: 4, chordDefinition: MAJOR_CHORD, duration: 1 },
  ],
  songBlocks: [sb('pattern-a', 4, 'Intro'), sb('pattern-b', 4, 'Verse'), sb('pattern-c', 4, 'Chorus'), sb('pattern-b', 4, 'Verse'), sb('pattern-c', 4, 'Chorus'), sb('pattern-a', 4, 'Solo'), sb('pattern-d', 2, 'Outro')],
};

// ═══════════════════════════════════════════════════════════════════════════
// FULL SONG PRESETS (drums + bass + melodies + arrangement)
// ═══════════════════════════════════════════════════════════════════════════

// ---------------------------------------------------------------------------
// Song 1: Midnight in Tokyo — lo-fi / city pop, D Dorian, 82 BPM
// ---------------------------------------------------------------------------
const midnightInTokyo: SavedGroove = {
  version: 1, name: 'Midnight in Tokyo', savedAt: '2025-01-01T00:00:00.000Z',
  patterns: [
    // A — Chill verse: boom-bap with walking bass & mellow keys
    songPat('pattern-a', 'A', 'Boom-Bap', [
      makeMelodicTrack('Bass', 'monoSynth', mel(32, [
        [0, 'D3'], [4, 'F3'], [8, 'A3'], [10, 'G3'],
        [12, 'F3'], [14, 'E3'], [16, 'D3'], [20, 'C3'],
        [24, 'A2'], [26, 'C3'], [28, 'D3'], [30, 'E3'],
      ]), 3, { attack: 0.02, decay: 0.3, sustain: 0.4, release: 0.5 }),
      makeMelodicTrack('Keys', 'fmSynth', mel(32, [
        [0, 'D4', 0.5], [4, 'F4', 0.6], [8, 'A4', 0.7], [12, 'G4', 0.5],
        [16, 'F4', 0.6], [22, 'E4', 0.5], [28, 'D4', 0.4],
      ]), 4, { attack: 0.05, decay: 0.4, sustain: 0.3, release: 0.8 }),
      makeMelodicTrack('Lead', 'synth', mel(32, [
        [2, 'A4', 0.4], [6, 'G4', 0.3], [14, 'F4', 0.4],
        [18, 'E4', 0.5], [24, 'D4', 0.6], [30, 'C4', 0.3],
      ]), 4, { attack: 0.1, decay: 0.3, sustain: 0.2, release: 1.0 }),
    ]),
    // B — Breakdown: half-time, sparse bass, atmospheric pad
    songPat('pattern-b', 'B', 'Half-Time', [
      makeMelodicTrack('Bass', 'monoSynth', mel(32, [
        [0, 'D3'], [8, 'C3'], [16, 'A2'], [24, 'G2'],
      ]), 3),
      makeMelodicTrack('Pad', 'fmSynth', mel(32, [
        [0, 'D4', 0.3], [8, 'F4', 0.3], [16, 'A4', 0.3], [24, 'E4', 0.3],
      ]), 4, { attack: 0.3, decay: 0.5, sustain: 0.6, release: 1.2 }),
      makeMelodicTrack('Lead', 'synth', mel(32, [
        [4, 'A4', 0.5], [12, 'G4', 0.4], [20, 'F4', 0.5], [28, 'E4', 0.4],
      ]), 4, { attack: 0.1, decay: 0.4, sustain: 0.2, release: 0.8 }),
    ]),
    // C — Hook: breakbeat energy, driving bass, catchy melody
    songPat('pattern-c', 'C', 'Breakbeat (Amen Break)', [
      makeMelodicTrack('Bass', 'monoSynth', mel(32, [
        [0, 'D3'], [2, 'D3'], [4, 'F3'], [6, 'F3'],
        [8, 'G3'], [10, 'A3'], [12, 'G3'], [14, 'F3'],
        [16, 'D3'], [18, 'D3'], [20, 'E3'], [22, 'F3'],
        [24, 'G3'], [26, 'A3'], [28, 'G3'], [30, 'F3'],
      ]), 3),
      makeMelodicTrack('Lead', 'synth', mel(32, [
        [0, 'A4', 0.8], [4, 'G4', 0.7], [6, 'A4', 0.6],
        [8, 'D5', 0.9], [12, 'C5', 0.7], [14, 'A4', 0.6],
        [16, 'A4', 0.8], [20, 'G4', 0.7], [22, 'F4', 0.6],
        [24, 'E4', 0.8], [28, 'D4', 0.7], [30, 'E4', 0.6],
      ]), 4),
      makeMelodicTrack('Arp', 'fmSynth', mel(32, [
        [0, 'D5', 0.4], [2, 'F5', 0.3], [4, 'A5', 0.4], [6, 'G5', 0.3],
        [8, 'F5', 0.4], [10, 'E5', 0.3], [12, 'D5', 0.4], [14, 'C5', 0.3],
        [16, 'D5', 0.4], [18, 'E5', 0.3], [20, 'F5', 0.4], [22, 'G5', 0.3],
        [24, 'A5', 0.4], [26, 'G5', 0.3], [28, 'F5', 0.4], [30, 'E5', 0.3],
      ]), 5, { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.3 }),
    ]),
    // D — Outro: motown feel, gentle resolution
    songPat('pattern-d', 'D', 'Motown', [
      makeMelodicTrack('Bass', 'monoSynth', mel(32, [
        [0, 'D3'], [8, 'G3'], [16, 'A3'], [24, 'D3'],
      ]), 3),
      makeMelodicTrack('Keys', 'fmSynth', mel(32, [
        [0, 'F4', 0.4], [4, 'A4', 0.4], [8, 'G4', 0.4],
        [16, 'A4', 0.4], [20, 'D5', 0.3], [24, 'A4', 0.3],
      ]), 4, { attack: 0.1, decay: 0.5, sustain: 0.4, release: 1.0 }),
      makeMelodicTrack('Lead', 'synth', emptyMelodicSteps(32), 4),
    ]),
  ],
  activePatternId: 'pattern-a', bpm: 82, swing: 0.12, rootNote: 'D',
  selectedScale: DORIAN_SCALE, selectedChord: MINOR7_CHORD, chordRoot: 'D', chordInversion: 0,
  progression: [
    { id: pid(), scaleDegree: 0, chordDefinition: MINOR7_CHORD, duration: 2 },
    { id: pid(), scaleDegree: 3, chordDefinition: MAJOR7_CHORD, duration: 1 },
    { id: pid(), scaleDegree: 4, chordDefinition: MINOR_CHORD, duration: 1 },
  ],
  songBlocks: [
    sb('pattern-b', 2, 'Intro'), sb('pattern-a', 4, 'Verse 1'), sb('pattern-c', 4, 'Hook'),
    sb('pattern-a', 4, 'Verse 2'), sb('pattern-c', 4, 'Hook'), sb('pattern-b', 4, 'Breakdown'),
    sb('pattern-c', 4, 'Final Hook'), sb('pattern-d', 2, 'Outro'),
  ],
};

// ---------------------------------------------------------------------------
// Song 2: Solar Flare — energetic house/EDM, F Mixolydian, 126 BPM
// ---------------------------------------------------------------------------
const solarFlare: SavedGroove = {
  version: 1, name: 'Solar Flare', savedAt: '2025-01-01T00:00:00.000Z',
  patterns: [
    // A — Main drop: house beat, pumping bass, bright arp
    songPat('pattern-a', 'A', 'House', [
      makeMelodicTrack('Bass', 'monoSynth', mel(32, [
        [0, 'F2'], [2, 'F2'], [4, 'F2'], [8, 'F2'],
        [10, 'A2'], [12, 'C3'], [14, 'A2'],
        [16, 'F2'], [18, 'F2'], [20, 'F2'], [24, 'D#2'],
        [26, 'F2'], [28, 'G2'], [30, 'A2'],
      ]), 2, { attack: 0.005, decay: 0.2, sustain: 0.3, release: 0.2 }),
      makeMelodicTrack('Arp', 'synth', mel(32, [
        [0, 'C5', 0.6], [2, 'F5', 0.5], [4, 'A5', 0.6], [6, 'C6', 0.5],
        [8, 'A5', 0.6], [10, 'F5', 0.5], [12, 'C5', 0.6], [14, 'D#5', 0.5],
        [16, 'F5', 0.6], [18, 'A5', 0.5], [20, 'C6', 0.6], [22, 'A5', 0.5],
        [24, 'G5', 0.6], [26, 'F5', 0.5], [28, 'D#5', 0.6], [30, 'C5', 0.5],
      ]), 5, { attack: 0.01, decay: 0.08, sustain: 0.1, release: 0.15 }),
      makeMelodicTrack('Stab', 'fmSynth', mel(32, [
        [0, 'F4', 0.7], [8, 'D#4', 0.6], [16, 'C4', 0.7], [24, 'D#4', 0.6],
      ]), 4, { attack: 0.01, decay: 0.15, sustain: 0.05, release: 0.2 }),
    ]),
    // B — Build: four on floor, rising arp, no bass drop yet
    songPat('pattern-b', 'B', 'Four on the Floor', [
      makeMelodicTrack('Bass', 'monoSynth', mel(32, [
        [0, 'F2'], [8, 'F2'], [16, 'F2'], [24, 'F2'],
      ]), 2),
      makeMelodicTrack('Arp', 'synth', mel(32, [
        [0, 'C4', 0.3], [4, 'F4', 0.35], [8, 'A4', 0.4], [12, 'C5', 0.45],
        [16, 'F5', 0.5], [20, 'A5', 0.55], [24, 'C6', 0.6], [28, 'F6', 0.7],
      ]), 4, { attack: 0.01, decay: 0.1, sustain: 0.2, release: 0.2 }),
      makeMelodicTrack('Pad', 'fmSynth', mel(32, [
        [0, 'F4', 0.3], [16, 'C4', 0.3],
      ]), 4, { attack: 0.5, decay: 0.3, sustain: 0.6, release: 1.5 }),
    ]),
    // C — Breakdown: stripped drums, atmospheric
    songPat('pattern-c', 'C', 'Ska Upbeat', [
      makeMelodicTrack('Bass', 'monoSynth', mel(32, [
        [0, 'F2'], [16, 'D#2'],
      ]), 2, { attack: 0.05, decay: 0.5, sustain: 0.5, release: 0.8 }),
      makeMelodicTrack('Pad', 'fmSynth', mel(32, [
        [0, 'A4', 0.4], [8, 'C5', 0.4], [16, 'G4', 0.4], [24, 'D#4', 0.4],
      ]), 4, { attack: 0.4, decay: 0.5, sustain: 0.6, release: 1.5 }),
      makeMelodicTrack('Lead', 'synth', mel(32, [
        [0, 'F5', 0.6], [4, 'G5', 0.5], [8, 'A5', 0.7],
        [16, 'G5', 0.6], [20, 'F5', 0.5], [24, 'D#5', 0.7], [28, 'C5', 0.5],
      ]), 5, { attack: 0.05, decay: 0.3, sustain: 0.3, release: 0.6 }),
    ]),
    // D — Alt drop: D&B crossover energy
    songPat('pattern-d', 'D', 'Drum & Bass', [
      makeMelodicTrack('Bass', 'monoSynth', mel(32, [
        [0, 'F2'], [3, 'F2'], [6, 'A2'], [8, 'C3'],
        [12, 'A2'], [14, 'F2'], [16, 'D#2'], [19, 'D#2'],
        [22, 'F2'], [24, 'G2'], [28, 'A2'], [30, 'C3'],
      ]), 2, { attack: 0.005, decay: 0.15, sustain: 0.2, release: 0.15 }),
      makeMelodicTrack('Lead', 'synth', mel(32, [
        [0, 'C5', 0.8], [4, 'D#5', 0.7], [8, 'F5', 0.9],
        [12, 'D#5', 0.7], [16, 'C5', 0.8], [20, 'A4', 0.7],
        [24, 'G4', 0.8], [28, 'A4', 0.7],
      ]), 5),
      makeMelodicTrack('Arp', 'fmSynth', mel(32, [
        [0, 'F5', 0.3], [2, 'A5', 0.3], [4, 'C6', 0.3], [6, 'A5', 0.3],
        [8, 'F5', 0.3], [10, 'C5', 0.3], [12, 'D#5', 0.3], [14, 'F5', 0.3],
        [16, 'A5', 0.3], [18, 'C6', 0.3], [20, 'A5', 0.3], [22, 'F5', 0.3],
        [24, 'D#5', 0.3], [26, 'C5', 0.3], [28, 'D#5', 0.3], [30, 'F5', 0.3],
      ]), 5, { attack: 0.005, decay: 0.05, sustain: 0.05, release: 0.1 }),
    ]),
  ],
  activePatternId: 'pattern-a', bpm: 126, swing: 0, rootNote: 'F',
  selectedScale: MIXOLYDIAN_SCALE, selectedChord: MAJOR_CHORD, chordRoot: 'F', chordInversion: 0,
  progression: [
    { id: pid(), scaleDegree: 0, chordDefinition: MAJOR_CHORD, duration: 1 },
    { id: pid(), scaleDegree: 6, chordDefinition: MAJOR_CHORD, duration: 1 },
    { id: pid(), scaleDegree: 4, chordDefinition: MINOR_CHORD, duration: 1 },
    { id: pid(), scaleDegree: 3, chordDefinition: MAJOR_CHORD, duration: 1 },
  ],
  songBlocks: [
    sb('pattern-b', 4, 'Build'), sb('pattern-a', 4, 'Drop'), sb('pattern-c', 4, 'Breakdown'),
    sb('pattern-b', 4, 'Build'), sb('pattern-a', 4, 'Drop'), sb('pattern-d', 4, 'DnB Drop'),
    sb('pattern-c', 2, 'Wind Down'), sb('pattern-a', 4, 'Final Drop'),
  ],
};

// ---------------------------------------------------------------------------
// Song 3: Carnival de Luna — Latin/bossa, G Major, 108 BPM
// ---------------------------------------------------------------------------
const carnivalDeLuna: SavedGroove = {
  version: 1, name: 'Carnival de Luna', savedAt: '2025-01-01T00:00:00.000Z',
  patterns: [
    // A — Bossa groove: syncopated bass, warm melody
    songPat('pattern-a', 'A', 'Bossa Nova', [
      makeMelodicTrack('Bass', 'monoSynth', mel(32, [
        [0, 'G2'], [6, 'B2'], [8, 'D3'], [14, 'C3'],
        [16, 'B2'], [22, 'A2'], [24, 'G2'], [30, 'D3'],
      ]), 2, { attack: 0.02, decay: 0.3, sustain: 0.4, release: 0.4 }),
      makeMelodicTrack('Melody', 'synth', mel(32, [
        [0, 'B4', 0.6], [4, 'D5', 0.7], [8, 'E5', 0.6], [12, 'D5', 0.5],
        [16, 'B4', 0.6], [20, 'A4', 0.7], [24, 'G4', 0.6], [28, 'A4', 0.5],
      ]), 4, { attack: 0.05, decay: 0.3, sustain: 0.3, release: 0.6 }),
      makeMelodicTrack('Chords', 'fmSynth', mel(32, [
        [0, 'G4', 0.3], [4, 'B4', 0.3], [8, 'D4', 0.3],
        [16, 'E4', 0.3], [20, 'G4', 0.3], [24, 'A4', 0.3],
      ]), 4, { attack: 0.08, decay: 0.4, sustain: 0.3, release: 0.8 }),
    ]),
    // B — Verse: funk drums, rhythmic bass, call-and-response
    songPat('pattern-b', 'B', 'Funk', [
      makeMelodicTrack('Bass', 'monoSynth', mel(32, [
        [0, 'G2'], [3, 'G2'], [6, 'B2'], [8, 'C3'],
        [10, 'B2'], [12, 'A2'], [14, 'G2'],
        [16, 'E2'], [19, 'E2'], [22, 'G2'], [24, 'A2'],
        [26, 'B2'], [28, 'C3'], [30, 'D3'],
      ]), 2),
      makeMelodicTrack('Melody', 'synth', mel(32, [
        [0, 'D5', 0.7], [4, 'E5', 0.6], [8, 'G5', 0.8],
        [12, 'F#5', 0.6], [14, 'E5', 0.5],
        [16, 'D5', 0.7], [20, 'B4', 0.6], [24, 'A4', 0.7], [28, 'B4', 0.6],
      ]), 4),
      makeMelodicTrack('Perc Synth', 'fmSynth', mel(32, [
        [2, 'G5', 0.3], [6, 'A5', 0.3], [10, 'B5', 0.3], [14, 'A5', 0.3],
        [18, 'G5', 0.3], [22, 'A5', 0.3], [26, 'B5', 0.3], [30, 'D6', 0.3],
      ]), 5, { attack: 0.005, decay: 0.06, sustain: 0.02, release: 0.1 }),
    ]),
    // C — Chorus: motown energy, big melody
    songPat('pattern-c', 'C', 'Motown', [
      makeMelodicTrack('Bass', 'monoSynth', mel(32, [
        [0, 'G2'], [2, 'G2'], [4, 'B2'], [6, 'D3'],
        [8, 'E3'], [10, 'D3'], [12, 'B2'], [14, 'A2'],
        [16, 'G2'], [18, 'A2'], [20, 'B2'], [22, 'C3'],
        [24, 'D3'], [26, 'C3'], [28, 'B2'], [30, 'A2'],
      ]), 2),
      makeMelodicTrack('Lead', 'synth', mel(32, [
        [0, 'G5', 0.9], [2, 'A5', 0.7], [4, 'B5', 0.9], [8, 'D6', 0.8],
        [12, 'B5', 0.7], [14, 'A5', 0.6],
        [16, 'G5', 0.9], [20, 'E5', 0.7], [24, 'D5', 0.8], [28, 'E5', 0.7],
      ]), 5),
      makeMelodicTrack('Harmony', 'fmSynth', mel(32, [
        [0, 'D5', 0.5], [4, 'G5', 0.5], [8, 'B5', 0.5],
        [16, 'D5', 0.5], [20, 'B4', 0.5], [24, 'A4', 0.5],
      ]), 4, { attack: 0.05, decay: 0.3, sustain: 0.4, release: 0.6 }),
    ]),
    // D — Bridge: waltz feel, spacious
    songPat('pattern-d', 'D', 'Jazz Waltz', [
      makeMelodicTrack('Bass', 'monoSynth', mel(24, [
        [0, 'G2'], [8, 'E2'], [12, 'C3'], [20, 'D3'],
      ]), 2),
      makeMelodicTrack('Melody', 'synth', mel(24, [
        [0, 'B4', 0.6], [4, 'D5', 0.7], [8, 'E5', 0.6],
        [12, 'G5', 0.7], [16, 'E5', 0.6], [20, 'D5', 0.5],
      ]), 4, { attack: 0.1, decay: 0.4, sustain: 0.3, release: 0.8 }),
      makeMelodicTrack('Pad', 'fmSynth', mel(24, [
        [0, 'G4', 0.3], [12, 'C4', 0.3],
      ]), 4, { attack: 0.4, decay: 0.4, sustain: 0.5, release: 1.2 }),
    ], 24, '3/4'),
  ],
  activePatternId: 'pattern-a', bpm: 108, swing: 0.08, rootNote: 'G',
  selectedScale: MAJOR_SCALE, selectedChord: MAJOR7_CHORD, chordRoot: 'G', chordInversion: 0,
  progression: [
    { id: pid(), scaleDegree: 0, chordDefinition: MAJOR7_CHORD, duration: 1 },
    { id: pid(), scaleDegree: 3, chordDefinition: MAJOR7_CHORD, duration: 1 },
    { id: pid(), scaleDegree: 1, chordDefinition: MINOR7_CHORD, duration: 1 },
    { id: pid(), scaleDegree: 4, chordDefinition: MAJOR_CHORD, duration: 1 },
  ],
  songBlocks: [
    sb('pattern-a', 4, 'Intro'), sb('pattern-b', 4, 'Verse 1'), sb('pattern-c', 4, 'Chorus'),
    sb('pattern-b', 4, 'Verse 2'), sb('pattern-c', 4, 'Chorus'), sb('pattern-d', 4, 'Bridge'),
    sb('pattern-c', 4, 'Final Chorus'), sb('pattern-a', 2, 'Outro'),
  ],
};

// ---------------------------------------------------------------------------
// Song 4: Neon Dystopia — dark synthwave, A Phrygian, 98 BPM
// ---------------------------------------------------------------------------
const neonDystopia: SavedGroove = {
  version: 1, name: 'Neon Dystopia', savedAt: '2025-01-01T00:00:00.000Z',
  patterns: [
    // A — Main groove: trap drums, dark pulsing bass, eerie lead
    songPat('pattern-a', 'A', 'Trap / 808', [
      makeMelodicTrack('Bass', 'monoSynth', mel(32, [
        [0, 'A1'], [3, 'A1'], [6, 'A1'], [8, 'G1'],
        [12, 'A1'], [14, 'A#1'], [16, 'A1'], [19, 'A1'],
        [22, 'G1'], [24, 'F1'], [28, 'E1'], [30, 'A1'],
      ]), 1, { attack: 0.005, decay: 0.4, sustain: 0.5, release: 0.3 }),
      makeMelodicTrack('Lead', 'synth', mel(32, [
        [0, 'E5', 0.7], [4, 'F5', 0.6], [8, 'A5', 0.8],
        [12, 'G5', 0.6], [14, 'F5', 0.5],
        [16, 'E5', 0.7], [20, 'C5', 0.6], [24, 'A4', 0.8], [28, 'B4', 0.5],
      ]), 5, { attack: 0.02, decay: 0.2, sustain: 0.3, release: 0.5 }),
      makeMelodicTrack('Atmosphere', 'fmSynth', mel(32, [
        [0, 'A3', 0.3], [8, 'F3', 0.25], [16, 'E3', 0.3], [24, 'G3', 0.25],
      ]), 3, { attack: 0.5, decay: 0.5, sustain: 0.4, release: 1.5 }),
    ]),
    // B — Verse: half-time, sub bass, atmospheric
    songPat('pattern-b', 'B', 'Half-Time', [
      makeMelodicTrack('Sub Bass', 'monoSynth', mel(32, [
        [0, 'A1'], [8, 'F1'], [16, 'E1'], [24, 'G1'],
      ]), 1, { attack: 0.05, decay: 0.6, sustain: 0.5, release: 0.6 }),
      makeMelodicTrack('Pad', 'fmSynth', mel(32, [
        [0, 'A3', 0.3], [16, 'E3', 0.3],
      ]), 3, { attack: 0.6, decay: 0.4, sustain: 0.5, release: 2.0 }),
      makeMelodicTrack('Pluck', 'synth', mel(32, [
        [4, 'E4', 0.4], [8, 'F4', 0.3], [12, 'A4', 0.4],
        [20, 'G4', 0.3], [24, 'F4', 0.4], [28, 'E4', 0.3],
      ]), 4, { attack: 0.01, decay: 0.15, sustain: 0.05, release: 0.3 }),
    ]),
    // C — Drop: D&B intensity, aggressive bass, intense melody
    songPat('pattern-c', 'C', 'Drum & Bass', [
      makeMelodicTrack('Bass', 'monoSynth', mel(32, [
        [0, 'A1'], [2, 'A1'], [4, 'C2'], [6, 'A1'],
        [8, 'F1'], [10, 'F1'], [12, 'G1'], [14, 'A1'],
        [16, 'A1'], [18, 'B1'], [20, 'C2'], [22, 'A1'],
        [24, 'E1'], [26, 'E1'], [28, 'F1'], [30, 'G1'],
      ]), 1, { attack: 0.003, decay: 0.15, sustain: 0.3, release: 0.15 }),
      makeMelodicTrack('Lead', 'synth', mel(32, [
        [0, 'A5', 0.9], [4, 'C6', 0.8], [6, 'A5', 0.7],
        [8, 'F5', 0.9], [12, 'G5', 0.7],
        [16, 'A5', 0.9], [20, 'E5', 0.8],
        [24, 'F5', 0.9], [28, 'E5', 0.8], [30, 'C5', 0.7],
      ]), 5),
      makeMelodicTrack('Arp', 'fmSynth', mel(32, [
        [0, 'A4', 0.4], [2, 'C5', 0.3], [4, 'E5', 0.4], [6, 'C5', 0.3],
        [8, 'A4', 0.4], [10, 'F4', 0.3], [12, 'G4', 0.4], [14, 'A4', 0.3],
        [16, 'C5', 0.4], [18, 'E5', 0.3], [20, 'C5', 0.4], [22, 'A4', 0.3],
        [24, 'F4', 0.4], [26, 'E4', 0.3], [28, 'F4', 0.4], [30, 'G4', 0.3],
      ]), 4, { attack: 0.005, decay: 0.06, sustain: 0.05, release: 0.1 }),
    ]),
    // D — Outro: stripped, haunting
    songPat('pattern-d', 'D', 'Reggae One Drop', [
      makeMelodicTrack('Bass', 'monoSynth', mel(32, [
        [0, 'A1'], [8, 'E1'], [16, 'F1'], [24, 'E1'],
      ]), 1, { attack: 0.1, decay: 0.8, sustain: 0.4, release: 1.0 }),
      makeMelodicTrack('Lead', 'synth', mel(32, [
        [0, 'E5', 0.5], [8, 'F5', 0.4], [16, 'A5', 0.5], [24, 'E5', 0.4],
      ]), 5, { attack: 0.2, decay: 0.5, sustain: 0.3, release: 1.2 }),
      makeMelodicTrack('Pad', 'fmSynth', mel(32, [
        [0, 'A3', 0.2], [16, 'F3', 0.2],
      ]), 3, { attack: 0.8, decay: 0.5, sustain: 0.5, release: 2.0 }),
    ]),
  ],
  activePatternId: 'pattern-a', bpm: 98, swing: 0.05, rootNote: 'A',
  selectedScale: PHRYGIAN_SCALE, selectedChord: MINOR_CHORD, chordRoot: 'A', chordInversion: 0,
  progression: [
    { id: pid(), scaleDegree: 0, chordDefinition: MINOR_CHORD, duration: 1 },
    { id: pid(), scaleDegree: 1, chordDefinition: MAJOR_CHORD, duration: 1 },
    { id: pid(), scaleDegree: 6, chordDefinition: MINOR_CHORD, duration: 1 },
    { id: pid(), scaleDegree: 4, chordDefinition: MAJOR_CHORD, duration: 1 },
  ],
  songBlocks: [
    sb('pattern-b', 4, 'Intro'), sb('pattern-a', 4, 'Main'), sb('pattern-b', 4, 'Verse'),
    sb('pattern-c', 4, 'Drop'), sb('pattern-b', 4, 'Verse'), sb('pattern-c', 4, 'Drop'),
    sb('pattern-a', 4, 'Reprise'), sb('pattern-d', 2, 'Outro'),
  ],
};

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export type PresetCategory = 'song' | 'beat';

export interface PresetGrooveEntry {
  id: string;
  name: string;
  genre: string;
  bpm: number;
  category: PresetCategory;
  groove: SavedGroove;
}

export const PRESET_GROOVES: PresetGrooveEntry[] = [
  // Full songs (drums + bass + melodies + arrangement)
  { id: 'preset-midnight-tokyo', name: 'Midnight in Tokyo', genre: 'Lo-fi / City Pop', bpm: 82, category: 'song', groove: midnightInTokyo },
  { id: 'preset-solar-flare', name: 'Solar Flare', genre: 'House / EDM', bpm: 126, category: 'song', groove: solarFlare },
  { id: 'preset-carnival-luna', name: 'Carnival de Luna', genre: 'Latin / Bossa', bpm: 108, category: 'song', groove: carnivalDeLuna },
  { id: 'preset-neon-dystopia', name: 'Neon Dystopia', genre: 'Synthwave / Dark', bpm: 98, category: 'song', groove: neonDystopia },
  // Beat-only (drums + arrangement, empty melodics)
  { id: 'preset-classic-rock', name: 'Classic Rock', genre: 'Rock', bpm: 110, category: 'beat', groove: classicRock },
  { id: 'preset-boom-bap', name: 'Boom-Bap Beat', genre: 'Hip-Hop', bpm: 90, category: 'beat', groove: boomBap },
  { id: 'preset-dance-floor', name: 'Dance Floor', genre: 'House / EDM', bpm: 124, category: 'beat', groove: danceFloor },
  { id: 'preset-funk-pocket', name: 'Funk Pocket', genre: 'Funk / Soul', bpm: 104, category: 'beat', groove: funkPocket },
  { id: 'preset-blues-shuffle', name: 'Blues Shuffle', genre: 'Blues', bpm: 116, category: 'beat', groove: bluesShuffle },
];
