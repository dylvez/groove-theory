import type { Pattern, DrumTrack, MelodicTrack, MelodicStep, SynthType } from '../types';
import { DRUM_KIT, DEFAULT_NUM_STEPS, DEFAULT_DRUM_PARAMS, DEFAULT_MELODIC_PARAMS, DEFAULT_DRUM_KEYS } from '../constants';

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
  };
}

export function createDefaultPattern(id: string, name: string): Pattern {
  const defaultKit = DRUM_KIT.filter(k => DEFAULT_DRUM_KEYS.includes(k.key));
  return {
    id,
    name,
    numSteps: DEFAULT_NUM_STEPS,
    timeSignature: '4/4',
    drumTracks: defaultKit.map(kit => createEmptyDrumTrack(kit.key, kit.name, kit.color)),
    melodicTracks: [
      { ...createEmptyMelodicTrack('Bass', DEFAULT_NUM_STEPS, 'monoSynth'), octave: 3 },
      createEmptyMelodicTrack('Melody 1', DEFAULT_NUM_STEPS, 'synth'),
      createEmptyMelodicTrack('Melody 2', DEFAULT_NUM_STEPS, 'fmSynth'),
    ],
  };
}

