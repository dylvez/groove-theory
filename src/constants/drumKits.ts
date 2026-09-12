import type { DrumSynthParams } from '../types';
import { DEFAULT_DRUM_PARAMS } from './drums';

export interface DrumKitSends {
  reverb?: number;
  delay?: number;
}

export interface DrumKit {
  id: string;
  name: string;
  description: string;
  /** Per-sample synth parameters. Missing keys fall back to the Classic kit. */
  params: Partial<Record<string, DrumSynthParams>>;
  /** Per-sample effect sends. Missing keys default to none. */
  sends?: Partial<Record<string, DrumKitSends>>;
}

const membrane = (
  p: Partial<Omit<Extract<DrumSynthParams, { synthKind: 'membrane' }>, 'synthKind'>>,
): DrumSynthParams => ({
  synthKind: 'membrane',
  attack: 0.001, decay: 0.4, sustain: 0, release: 0.4,
  pitchDecay: 0.05, octaves: 6, oscillatorType: 'sine', frequency: 60,
  ...p,
});

const noise = (
  p: Partial<Omit<Extract<DrumSynthParams, { synthKind: 'noise' }>, 'synthKind'>>,
): DrumSynthParams => ({
  synthKind: 'noise',
  noiseType: 'white', attack: 0.001, decay: 0.15, sustain: 0, release: 0.1,
  ...p,
});

const metal = (
  p: Partial<Omit<Extract<DrumSynthParams, { synthKind: 'metal' }>, 'synthKind'>>,
): DrumSynthParams => ({
  synthKind: 'metal',
  attack: 0.001, decay: 0.05, release: 0.01,
  frequency: 400, harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5,
  ...p,
});

export const DRUM_KITS: DrumKit[] = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'The original Groove Theory kit — clean, balanced, all-purpose.',
    params: { ...DEFAULT_DRUM_PARAMS },
    sends: {
      snare: { reverb: 0.12 },
      clap: { reverb: 0.15 },
      crash: { reverb: 0.2 },
    },
  },
  {
    id: '808',
    name: '808',
    description: 'Deep booming kick, snappy snare, crisp tight hats. Hip-hop and trap.',
    params: {
      kick: membrane({ frequency: 42, decay: 0.9, release: 0.9, pitchDecay: 0.09, octaves: 8, oscillatorType: 'sine' }),
      snare: noise({ noiseType: 'white', decay: 0.11, release: 0.06 }),
      clap: noise({ noiseType: 'pink', decay: 0.16, release: 0.12 }),
      'hihat-closed': metal({ frequency: 620, decay: 0.035, harmonicity: 6.5, modulationIndex: 40, resonance: 6500, octaves: 1.2 }),
      'hihat-open': metal({ frequency: 620, decay: 0.42, release: 0.05, harmonicity: 6.5, modulationIndex: 40, resonance: 6500, octaves: 1.2 }),
      rim: membrane({ frequency: 520, decay: 0.04, release: 0.03, pitchDecay: 0.005, octaves: 1.5, oscillatorType: 'square' }),
      'tom-low': membrane({ frequency: 70, decay: 0.5, release: 0.5, pitchDecay: 0.06, octaves: 5 }),
      'tom-mid': membrane({ frequency: 105, decay: 0.45, release: 0.45, pitchDecay: 0.06, octaves: 5 }),
      'tom-high': membrane({ frequency: 160, decay: 0.4, release: 0.4, pitchDecay: 0.06, octaves: 5 }),
      crash: metal({ frequency: 320, decay: 1.8, release: 0.4, modulationIndex: 45, resonance: 3800, octaves: 1.6 }),
      ride: metal({ frequency: 560, decay: 0.7, release: 0.15, modulationIndex: 18, resonance: 5200, octaves: 1.0 }),
    },
    sends: {
      snare: { reverb: 0.1 },
      clap: { reverb: 0.22 },
      crash: { reverb: 0.2 },
    },
  },
  {
    id: 'lofi',
    name: 'Lo-Fi',
    description: 'Dusty, soft and warm. Pink-noise snares, muted hats, round kick.',
    params: {
      kick: membrane({ frequency: 55, decay: 0.32, release: 0.3, pitchDecay: 0.03, octaves: 4, oscillatorType: 'triangle' }),
      snare: noise({ noiseType: 'pink', decay: 0.18, release: 0.12, attack: 0.004 }),
      clap: noise({ noiseType: 'brown', decay: 0.14, release: 0.1, attack: 0.003 }),
      'hihat-closed': metal({ frequency: 300, decay: 0.045, harmonicity: 3.2, modulationIndex: 12, resonance: 2200, octaves: 0.8 }),
      'hihat-open': metal({ frequency: 300, decay: 0.25, release: 0.04, harmonicity: 3.2, modulationIndex: 12, resonance: 2200, octaves: 0.8 }),
      rim: membrane({ frequency: 330, decay: 0.05, release: 0.04, pitchDecay: 0.01, octaves: 1.5, oscillatorType: 'triangle' }),
      'tom-low': membrane({ frequency: 75, decay: 0.28, release: 0.25, pitchDecay: 0.03, octaves: 3, oscillatorType: 'triangle' }),
      'tom-mid': membrane({ frequency: 110, decay: 0.26, release: 0.24, pitchDecay: 0.03, octaves: 3, oscillatorType: 'triangle' }),
      'tom-high': membrane({ frequency: 165, decay: 0.24, release: 0.22, pitchDecay: 0.03, octaves: 3, oscillatorType: 'triangle' }),
      crash: metal({ frequency: 260, decay: 1.1, release: 0.3, modulationIndex: 20, resonance: 2600, octaves: 1.2 }),
      ride: metal({ frequency: 420, decay: 0.5, release: 0.1, modulationIndex: 10, resonance: 3000, octaves: 0.8 }),
    },
    sends: {
      kick: { reverb: 0.05 },
      snare: { reverb: 0.28 },
      clap: { reverb: 0.3 },
      'hihat-closed': { reverb: 0.08 },
      'hihat-open': { reverb: 0.12 },
      rim: { reverb: 0.2, delay: 0.15 },
      crash: { reverb: 0.3 },
    },
  },
  {
    id: 'techno',
    name: 'Techno',
    description: 'Punchy, tight and bright. Built for four-on-the-floor at speed.',
    params: {
      kick: membrane({ frequency: 50, decay: 0.28, release: 0.2, pitchDecay: 0.035, octaves: 7, oscillatorType: 'sine' }),
      snare: noise({ noiseType: 'white', decay: 0.09, release: 0.05 }),
      clap: noise({ noiseType: 'white', decay: 0.1, release: 0.14, attack: 0.002 }),
      'hihat-closed': metal({ frequency: 720, decay: 0.03, harmonicity: 8, modulationIndex: 60, resonance: 7500, octaves: 1.4 }),
      'hihat-open': metal({ frequency: 720, decay: 0.35, release: 0.08, harmonicity: 8, modulationIndex: 60, resonance: 7500, octaves: 1.4 }),
      rim: membrane({ frequency: 800, decay: 0.03, release: 0.02, pitchDecay: 0.002, octaves: 1, oscillatorType: 'square' }),
      'tom-low': membrane({ frequency: 90, decay: 0.3, release: 0.25, pitchDecay: 0.05, octaves: 5 }),
      'tom-mid': membrane({ frequency: 135, decay: 0.28, release: 0.24, pitchDecay: 0.05, octaves: 5 }),
      'tom-high': membrane({ frequency: 200, decay: 0.26, release: 0.22, pitchDecay: 0.05, octaves: 5 }),
      crash: metal({ frequency: 380, decay: 1.6, release: 0.3, modulationIndex: 55, resonance: 4200, octaves: 1.8 }),
      ride: metal({ frequency: 600, decay: 0.6, release: 0.1, modulationIndex: 26, resonance: 6000, octaves: 1.1 }),
    },
    sends: {
      snare: { reverb: 0.15 },
      clap: { reverb: 0.3, delay: 0.1 },
      'hihat-open': { reverb: 0.1 },
      rim: { delay: 0.35 },
      crash: { reverb: 0.25 },
    },
  },
  {
    id: 'acoustic',
    name: 'Acoustic',
    description: 'Softer attack, longer bodies and a touch of room on everything.',
    params: {
      kick: membrane({ frequency: 68, decay: 0.42, release: 0.35, pitchDecay: 0.025, octaves: 3, oscillatorType: 'triangle' }),
      snare: noise({ noiseType: 'pink', decay: 0.2, release: 0.18, sustain: 0.05, attack: 0.002 }),
      clap: noise({ noiseType: 'pink', decay: 0.15, release: 0.15, attack: 0.004 }),
      'hihat-closed': metal({ frequency: 480, decay: 0.06, harmonicity: 4.2, modulationIndex: 22, resonance: 3600, octaves: 1.1 }),
      'hihat-open': metal({ frequency: 480, decay: 0.55, release: 0.15, harmonicity: 4.2, modulationIndex: 22, resonance: 3600, octaves: 1.1 }),
      rim: membrane({ frequency: 440, decay: 0.07, release: 0.06, pitchDecay: 0.008, octaves: 1.5, oscillatorType: 'triangle' }),
      'tom-low': membrane({ frequency: 82, decay: 0.55, release: 0.5, pitchDecay: 0.04, octaves: 2.5, oscillatorType: 'sine' }),
      'tom-mid': membrane({ frequency: 118, decay: 0.5, release: 0.45, pitchDecay: 0.04, octaves: 2.5, oscillatorType: 'sine' }),
      'tom-high': membrane({ frequency: 170, decay: 0.45, release: 0.4, pitchDecay: 0.04, octaves: 2.5, oscillatorType: 'sine' }),
      crash: metal({ frequency: 290, decay: 2.2, release: 0.5, modulationIndex: 34, resonance: 3200, octaves: 1.5 }),
      ride: metal({ frequency: 500, decay: 1.2, release: 0.2, modulationIndex: 16, resonance: 4200, octaves: 0.9 }),
    },
    sends: {
      kick: { reverb: 0.08 },
      snare: { reverb: 0.3 },
      clap: { reverb: 0.28 },
      'hihat-closed': { reverb: 0.12 },
      'hihat-open': { reverb: 0.18 },
      rim: { reverb: 0.25 },
      'tom-low': { reverb: 0.22 },
      'tom-mid': { reverb: 0.22 },
      'tom-high': { reverb: 0.22 },
      crash: { reverb: 0.35 },
      ride: { reverb: 0.2 },
    },
  },
];

export function getDrumKit(id: string): DrumKit | undefined {
  return DRUM_KITS.find(k => k.id === id);
}
