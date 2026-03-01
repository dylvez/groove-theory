import * as Tone from 'tone';
import type { SynthType, MelodicSynthParams } from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SynthVoice = any;

export function getSynthVoice(synthType: SynthType): SynthVoice {
  switch (synthType) {
    case 'fmSynth': return Tone.FMSynth;
    case 'amSynth': return Tone.AMSynth;
    case 'monoSynth': return Tone.MonoSynth;
    case 'synth':
    default: return Tone.Synth;
  }
}

export function createPolySynth(synthType: SynthType, params: MelodicSynthParams): Tone.PolySynth {
  const Voice = getSynthVoice(synthType);
  const poly = new Tone.PolySynth(Voice, {
    oscillator: { type: params.oscillatorType },
    envelope: {
      attack: params.attack,
      decay: params.decay,
      sustain: params.sustain,
      release: params.release,
    },
  }).toDestination();
  poly.maxPolyphony = synthType === 'monoSynth' ? 1 : 8;
  poly.volume.value = -6;
  return poly;
}

export class SynthEngine {
  private synths = new Map<string, Tone.PolySynth>();
  private synthTypes = new Map<string, SynthType>();
  private previewSynth: Tone.PolySynth;

  constructor() {
    this.previewSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.4 },
    }).toDestination();
    this.previewSynth.maxPolyphony = 8;
    this.previewSynth.volume.value = -6;
  }

  /** Play a note using the shared preview synth (for theory tools) */
  previewNote(note: string, duration: string = '8n', time?: number) {
    this.previewSynth.triggerAttackRelease(note, duration, time);
  }

  /** Play a chord using the shared preview synth (for theory tools) */
  previewChord(notes: string[], duration: string = '4n', time?: number) {
    this.previewSynth.triggerAttackRelease(notes, duration, time);
  }

  ensureSynth(trackId: string, synthType: SynthType, params: MelodicSynthParams, volume?: number) {
    if (!this.synths.has(trackId)) {
      const poly = createPolySynth(synthType, params);
      if (volume !== undefined) poly.volume.value = volume;
      this.synths.set(trackId, poly);
      this.synthTypes.set(trackId, synthType);
    }
  }

  changeSynthType(trackId: string, synthType: SynthType, params: MelodicSynthParams) {
    this.disposeSynth(trackId);
    this.synths.set(trackId, createPolySynth(synthType, params));
    this.synthTypes.set(trackId, synthType);
  }

  updateParams(trackId: string, params: MelodicSynthParams) {
    const synth = this.synths.get(trackId);
    if (!synth) return;
    try {
      synth.set({
        oscillator: { type: params.oscillatorType },
        envelope: {
          attack: params.attack,
          decay: params.decay,
          sustain: params.sustain,
          release: params.release,
        },
      });
    } catch {
      // If set fails (e.g. oscillator type mismatch), recreate
      const synthType = this.synthTypes.get(trackId) ?? 'synth';
      this.changeSynthType(trackId, synthType, params);
    }
  }

  playNote(trackId: string, note: string, duration: string = '8n', time?: number) {
    const synth = this.synths.get(trackId);
    if (!synth) return;
    synth.triggerAttackRelease(note, duration, time);
  }

  playChord(trackId: string, notes: string[], duration: string = '4n', time?: number) {
    const synth = this.synths.get(trackId);
    if (!synth) return;
    synth.triggerAttackRelease(notes, duration, time);
  }

  setVolume(trackId: string, db: number) {
    const synth = this.synths.get(trackId);
    if (synth) synth.volume.value = db;
  }

  disposeSynth(trackId: string) {
    this.synths.get(trackId)?.dispose();
    this.synths.delete(trackId);
    this.synthTypes.delete(trackId);
  }

  dispose() {
    this.synths.forEach(s => s.dispose());
    this.synths.clear();
    this.synthTypes.clear();
    this.previewSynth.dispose();
  }
}
