import type { MelodicSynthParams, SynthType } from '../types';

export interface SynthPreset {
  id: string;
  name: string;
  description: string;
  synthType: SynthType;
  params: MelodicSynthParams;
  /** Suggested octave for the track (applied on load) */
  octave?: number;
  reverbSend?: number;
  delaySend?: number;
}

export const SYNTH_PRESETS: SynthPreset[] = [
  {
    id: 'pluck',
    name: 'Pluck',
    description: 'Short, bright and percussive. Great for arpeggios and hooks.',
    synthType: 'synth',
    params: { attack: 0.004, decay: 0.18, sustain: 0, release: 0.25, oscillatorType: 'triangle', filterCutoff: 6500, filterResonance: 1.2 },
    octave: 4,
    reverbSend: 0.22,
    delaySend: 0.15,
  },
  {
    id: 'keys',
    name: 'Electric Keys',
    description: 'Soft FM piano tone with a gentle bloom.',
    synthType: 'fmSynth',
    params: { attack: 0.008, decay: 0.7, sustain: 0.25, release: 0.9, oscillatorType: 'sine', filterCutoff: 4200, filterResonance: 0.8 },
    octave: 4,
    reverbSend: 0.3,
  },
  {
    id: 'pad',
    name: 'Warm Pad',
    description: 'Slow, lush and wide. Hold long notes under a progression.',
    synthType: 'synth',
    params: { attack: 0.55, decay: 0.6, sustain: 0.85, release: 1.8, oscillatorType: 'sawtooth', filterCutoff: 1800, filterResonance: 0.9 },
    octave: 4,
    reverbSend: 0.55,
    delaySend: 0.1,
  },
  {
    id: 'lead',
    name: 'Square Lead',
    description: 'Hollow, singing lead with delay tails.',
    synthType: 'synth',
    params: { attack: 0.02, decay: 0.2, sustain: 0.55, release: 0.3, oscillatorType: 'square', filterCutoff: 3800, filterResonance: 1.5 },
    octave: 5,
    reverbSend: 0.2,
    delaySend: 0.35,
  },
  {
    id: 'sub',
    name: 'Sub Bass',
    description: 'Clean sine low-end. Sits under everything.',
    synthType: 'monoSynth',
    params: { attack: 0.01, decay: 0.3, sustain: 0.85, release: 0.2, oscillatorType: 'sine', filterCutoff: 600, filterResonance: 0.5 },
    octave: 2,
  },
  {
    id: 'acid',
    name: 'Acid Bass',
    description: 'Squelchy resonant saw bass. Push the filter for bite.',
    synthType: 'monoSynth',
    params: { attack: 0.005, decay: 0.22, sustain: 0.15, release: 0.12, oscillatorType: 'sawtooth', filterCutoff: 900, filterResonance: 7 },
    octave: 2,
    delaySend: 0.12,
  },
  {
    id: 'bell',
    name: 'Bell',
    description: 'Glassy FM bell with long shimmering decay.',
    synthType: 'fmSynth',
    params: { attack: 0.001, decay: 1.4, sustain: 0, release: 1.6, oscillatorType: 'sine', filterCutoff: 9000, filterResonance: 0.7 },
    octave: 5,
    reverbSend: 0.45,
    delaySend: 0.2,
  },
  {
    id: 'organ',
    name: 'Organ',
    description: 'Instant-on sustained tone for chords and stabs.',
    synthType: 'amSynth',
    params: { attack: 0.01, decay: 0.1, sustain: 1, release: 0.08, oscillatorType: 'sine', filterCutoff: 5500, filterResonance: 0.6 },
    octave: 4,
    reverbSend: 0.18,
  },
];

export function getSynthPreset(id: string): SynthPreset | undefined {
  return SYNTH_PRESETS.find(p => p.id === id);
}
