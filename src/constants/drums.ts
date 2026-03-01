import type { DrumSynthParams, MelodicSynthParams } from '../types';

export interface DrumKitSound {
  key: string;
  name: string;
  color: string;
}

export const DRUM_KIT: DrumKitSound[] = [
  { key: 'kick', name: 'Kick', color: '#f97316' },
  { key: 'snare', name: 'Snare', color: '#06b6d4' },
  { key: 'hihat-closed', name: 'Hi-Hat', color: '#22c55e' },
  { key: 'hihat-open', name: 'Open HH', color: '#a855f7' },
  { key: 'crash', name: 'Crash', color: '#d946ef' },
  { key: 'ride', name: 'Ride', color: '#14b8a6' },
  { key: 'rim', name: 'Rim', color: '#ec4899' },
  { key: 'clap', name: 'Clap', color: '#f59e0b' },
  { key: 'tom-low', name: 'Low Tom', color: '#3b82f6' },
  { key: 'tom-mid', name: 'Mid Tom', color: '#ef4444' },
  { key: 'tom-high', name: 'High Tom', color: '#f59e0b' },
];

/** The default drums used in new patterns */
export const DEFAULT_DRUM_KEYS = [
  'kick', 'snare', 'hihat-closed', 'hihat-open', 'rim',
];

export const DEFAULT_NUM_STEPS = 32;

export const DEFAULT_DRUM_PARAMS: Record<string, DrumSynthParams> = {
  'kick': {
    synthKind: 'membrane', attack: 0.001, decay: 0.4, sustain: 0, release: 0.4,
    pitchDecay: 0.05, octaves: 6, oscillatorType: 'sine', frequency: 60,
  },
  'snare': {
    synthKind: 'noise', noiseType: 'white', attack: 0.001, decay: 0.15, sustain: 0, release: 0.1,
  },
  'hihat-closed': {
    synthKind: 'metal', attack: 0.001, decay: 0.05, release: 0.01,
    frequency: 400, harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5,
  },
  'hihat-open': {
    synthKind: 'metal', attack: 0.001, decay: 0.3, release: 0.01,
    frequency: 400, harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5,
  },
  'clap': {
    synthKind: 'noise', noiseType: 'pink', attack: 0.001, decay: 0.12, sustain: 0, release: 0.08,
  },
  'tom-low': {
    synthKind: 'membrane', attack: 0.001, decay: 0.3, sustain: 0, release: 0.3,
    pitchDecay: 0.04, octaves: 4, oscillatorType: 'sine', frequency: 80,
  },
  'tom-mid': {
    synthKind: 'membrane', attack: 0.001, decay: 0.3, sustain: 0, release: 0.3,
    pitchDecay: 0.04, octaves: 4, oscillatorType: 'sine', frequency: 120,
  },
  'tom-high': {
    synthKind: 'membrane', attack: 0.001, decay: 0.3, sustain: 0, release: 0.3,
    pitchDecay: 0.04, octaves: 4, oscillatorType: 'sine', frequency: 180,
  },
  'crash': {
    synthKind: 'metal', attack: 0.001, decay: 1.5, release: 0.3,
    frequency: 300, harmonicity: 5.1, modulationIndex: 40, resonance: 3500, octaves: 1.5,
  },
  'ride': {
    synthKind: 'metal', attack: 0.001, decay: 0.6, release: 0.1,
    frequency: 500, harmonicity: 5.1, modulationIndex: 20, resonance: 5000, octaves: 1.0,
  },
  'rim': {
    synthKind: 'membrane', attack: 0.001, decay: 0.06, sustain: 0, release: 0.05,
    pitchDecay: 0.01, octaves: 2, oscillatorType: 'triangle', frequency: 400,
  },
};

export const DEFAULT_MELODIC_PARAMS: MelodicSynthParams = {
  attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.4, oscillatorType: 'triangle',
};
