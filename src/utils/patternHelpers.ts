import type { Pattern, DrumTrack, MelodicTrack, MelodicStep, SynthType, TimeSignature, StepResolution } from '../types';
import { DRUM_KIT, DEFAULT_NUM_STEPS, DEFAULT_DRUM_PARAMS, DEFAULT_MELODIC_PARAMS, DEFAULT_DRUM_KEYS } from '../constants';

export function getStepsPerMeasure(ts: TimeSignature, resolution: StepResolution = '16n'): number {
  const beats = ts === '3/4' ? 3 : 4;
  const subdivisions = resolution === '32n' ? 8 : 4;
  return beats * subdivisions;
}

/** Sends used for brand-new drum tracks (mirrors the Classic kit) */
const DEFAULT_DRUM_SENDS: Record<string, { reverb?: number; delay?: number }> = {
  snare: { reverb: 0.12 },
  clap: { reverb: 0.15 },
  crash: { reverb: 0.2 },
};

let nextId = 1;
function uid(): string {
  return `id_${nextId++}_${Date.now().toString(36)}`;
}

export function createEmptyDrumTrack(sampleKey: string, name: string, color: string, numSteps: number = DEFAULT_NUM_STEPS): DrumTrack {
  return {
    id: uid(),
    name,
    sampleKey,
    steps: new Array(numSteps).fill(0),
    muted: false,
    solo: false,
    volume: -6,
    color,
    synthParams: DEFAULT_DRUM_PARAMS[sampleKey] ?? DEFAULT_DRUM_PARAMS['kick'],
    reverbSend: DEFAULT_DRUM_SENDS[sampleKey]?.reverb ?? 0,
    delaySend: DEFAULT_DRUM_SENDS[sampleKey]?.delay ?? 0,
  };
}

export function createEmptyMelodicTrack(
  name: string,
  numSteps: number = DEFAULT_NUM_STEPS,
  synthType: SynthType = 'synth',
): MelodicTrack {
  const steps: MelodicStep[] = Array.from({ length: numSteps }, () => ({
    active: false,
    note: null,
    velocity: 0.8,
  }));

  return {
    id: uid(),
    name,
    synthType,
    steps,
    muted: false,
    solo: false,
    volume: -6,
    octave: 4,
    synthParams: { ...DEFAULT_MELODIC_PARAMS },
    reverbSend: 0.2,
    delaySend: 0,
  };
}

export function createDefaultPattern(id: string, name: string): Pattern {
  const defaultKit = DRUM_KIT.filter(k => DEFAULT_DRUM_KEYS.includes(k.key));
  return {
    id,
    name,
    numSteps: DEFAULT_NUM_STEPS,
    timeSignature: '4/4',
    stepResolution: '16n',
    drumTracks: defaultKit.map(kit => createEmptyDrumTrack(kit.key, kit.name, kit.color)),
    melodicTracks: [
      { ...createEmptyMelodicTrack('Bass', DEFAULT_NUM_STEPS, 'monoSynth'), octave: 3 },
      createEmptyMelodicTrack('Melody 1', DEFAULT_NUM_STEPS, 'synth'),
      createEmptyMelodicTrack('Melody 2', DEFAULT_NUM_STEPS, 'fmSynth'),
    ],
  };
}

