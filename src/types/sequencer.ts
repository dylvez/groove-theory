import type { NoteWithOctave } from './music';

/**
 * Drum step value. 0 = off, otherwise a velocity in (0, 1].
 * Legacy patterns store 1 for every hit, which maps to full velocity.
 */
export type StepValue = number;

/** Velocity levels cycled by shift-clicking a step */
export const VELOCITY_LEVELS = [1, 0.6, 0.3] as const;
export const DEFAULT_VELOCITY = 1;

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
  /** Low-pass filter cutoff in Hz (optional, defaults to fully open) */
  filterCutoff?: number;
  /** Low-pass filter resonance / Q (optional) */
  filterResonance?: number;
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
  /** Reverb send level 0–1 (optional, default 0) */
  reverbSend?: number;
  /** Delay send level 0–1 (optional, default 0) */
  delaySend?: number;
}

export interface MelodicStep {
  active: boolean;
  note: NoteWithOctave | null;
  velocity: number;
  /** Note length in steps (optional, default 1) */
  length?: number;
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
  /** Reverb send level 0–1 (optional, default 0) */
  reverbSend?: number;
  /** Delay send level 0–1 (optional, default 0) */
  delaySend?: number;
}

export interface Pattern {
  id: string;
  name: string;
  numSteps: number;
  timeSignature: TimeSignature;
  stepResolution: StepResolution;
  /** Drum kit last applied to this pattern (optional, defaults to 'classic') */
  kitId?: string;
  drumTracks: DrumTrack[];
  melodicTracks: MelodicTrack[];
}

export type TimeSignature = '4/4' | '3/4';

export type StepResolution = '16n' | '32n';

export type TransportState = 'stopped' | 'playing';
