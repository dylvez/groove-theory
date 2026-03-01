import type { NoteWithOctave } from './music';

export type StepValue = 0 | 1;

// --- Drum synth parameter types (discriminated union) ---

export interface MembraneSynthParams {
  synthKind: 'membrane';
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  pitchDecay: number;
  octaves: number;
  oscillatorType: 'sine' | 'square' | 'triangle' | 'sawtooth';
  frequency: number;
}

export interface NoiseSynthParams {
  synthKind: 'noise';
  noiseType: 'white' | 'pink' | 'brown';
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

export interface MetalSynthParams {
  synthKind: 'metal';
  attack: number;
  decay: number;
  release: number;
  frequency: number;
  harmonicity: number;
  modulationIndex: number;
  resonance: number;
  octaves: number;
}

export type DrumSynthParams = MembraneSynthParams | NoiseSynthParams | MetalSynthParams;

// --- Melodic synth parameter types ---

export type SynthType = 'synth' | 'fmSynth' | 'amSynth' | 'monoSynth';

export interface MelodicSynthParams {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  oscillatorType: 'sine' | 'square' | 'triangle' | 'sawtooth';
}

// --- Track types ---

export interface DrumTrack {
  id: string;
  name: string;
  sampleKey: string;
  steps: StepValue[];
  muted: boolean;
  solo: boolean;
  volume: number;
  color: string;
  synthParams: DrumSynthParams;
}

export interface MelodicStep {
  active: boolean;
  note: NoteWithOctave | null;
  velocity: number;
}

export interface MelodicTrack {
  id: string;
  name: string;
  synthType: SynthType;
  steps: MelodicStep[];
  muted: boolean;
  solo: boolean;
  volume: number;
  octave: number;
  synthParams: MelodicSynthParams;
}

export interface Pattern {
  id: string;
  name: string;
  numSteps: number;
  timeSignature: TimeSignature;
  drumTracks: DrumTrack[];
  melodicTracks: MelodicTrack[];
}

export type TimeSignature = '4/4' | '3/4';

export type TransportState = 'stopped' | 'playing';
