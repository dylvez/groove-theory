import * as Tone from 'tone';
import type { SynthType, MelodicSynthParams } from '../types';
import type { Mixer, Channel } from './Mixer';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SynthVoice = any;

/** Cutoff used when a track has no explicit filter setting (effectively open). */
export const DEFAULT_FILTER_CUTOFF = 12000;
export const DEFAULT_FILTER_Q = 0.8;

export function getSynthVoice(synthType: SynthType): SynthVoice {
  switch (synthType) {
    case 'fmSynth': return Tone.FMSynth;
    case 'amSynth': return Tone.AMSynth;
    case 'monoSynth': return Tone.MonoSynth;
    case 'synth':
    default: return Tone.Synth;
  }
}

function voiceOptions(synthType: SynthType, params: MelodicSynthParams) {
  const base = {
    oscillator: { type: params.oscillatorType },
    envelope: {
      attack: params.attack,
      decay: params.decay,
      sustain: params.sustain,
      release: params.release,
    },
  };
  if (synthType === 'monoSynth') {
    // MonoSynth has its own internal filter; keep it wide open and let our
    // shared post-filter do the shaping so all synth types behave alike.
    return {
      ...base,
      filter: { type: 'lowpass', Q: 0.5, rolloff: -12 },
      filterEnvelope: { attack: 0.001, decay: 0.1, sustain: 1, release: 0.1, baseFrequency: 18000, octaves: 0 },
    };
  }
  return base;
}

export function createPolySynth(synthType: SynthType, params: MelodicSynthParams): Tone.PolySynth {
  const Voice = getSynthVoice(synthType);
  const poly = new Tone.PolySynth(Voice, voiceOptions(synthType, params));
  poly.maxPolyphony = synthType === 'monoSynth' ? 1 : 8;
  poly.volume.value = -6;
  return poly;
}

export function createFilter(params: MelodicSynthParams): Tone.Filter {
  return new Tone.Filter({
    type: 'lowpass',
    frequency: params.filterCutoff ?? DEFAULT_FILTER_CUTOFF,
    Q: params.filterResonance ?? DEFAULT_FILTER_Q,
    rolloff: -24,
  });
}

interface MelodicVoice {
  poly: Tone.PolySynth;
  filter: Tone.Filter;
  channel: Channel;
  synthType: SynthType;
  params: MelodicSynthParams;
  volume: number;
  reverbSend: number;
  delaySend: number;
}

/**
 * Owns one polyphonic voice per melodic track:
 *   PolySynth → Filter → mixer channel
 */
export class SynthEngine {
  private voices = new Map<string, MelodicVoice>();
  private previewSynth: Tone.PolySynth;
  private previewChannel: Channel;

  private mixer: Mixer;

  constructor(mixer: Mixer) {
    this.mixer = mixer;
    this.previewChannel = mixer.createChannel(-8, 0.2, 0);
    this.previewSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.4 },
    });
    this.previewSynth.maxPolyphony = 8;
    this.previewSynth.connect(this.previewChannel.input);
  }

  /** Play a note using the shared preview synth (for theory tools) */
  previewNote(note: string, duration: string = '8n', time?: number) {
    this.previewSynth.triggerAttackRelease(note, duration, time);
  }

  /** Play a chord using the shared preview synth (for theory tools) */
  previewChord(notes: string[], duration: string = '4n', time?: number) {
    this.previewSynth.triggerAttackRelease(notes, duration, time);
  }

  ensureSynth(
    trackId: string,
    synthType: SynthType,
    params: MelodicSynthParams,
    volume: number = -6,
    reverbSend: number = 0,
    delaySend: number = 0,
  ) {
    const existing = this.voices.get(trackId);
    if (!existing) {
      const channel = this.mixer.createChannel(volume, reverbSend, delaySend);
      const poly = createPolySynth(synthType, params);
      const filter = createFilter(params);
      poly.chain(filter, channel.input);
      this.voices.set(trackId, { poly, filter, channel, synthType, params, volume, reverbSend, delaySend });
      return;
    }
    if (existing.synthType !== synthType) {
      this.changeSynthType(trackId, synthType, params, true);
    } else if (existing.params !== params) {
      this.updateParams(trackId, params, true);
    }
    if (existing.volume !== volume) this.setVolume(trackId, volume);
    if (existing.reverbSend !== reverbSend || existing.delaySend !== delaySend) {
      this.setSends(trackId, reverbSend, delaySend, true);
    }
  }

  changeSynthType(trackId: string, synthType: SynthType, params: MelodicSynthParams, immediate = false) {
    const voice = this.voices.get(trackId);
    if (!voice) return;
    voice.poly.releaseAll();
    voice.poly.dispose();
    voice.poly = createPolySynth(synthType, params);
    voice.poly.connect(voice.filter);
    voice.synthType = synthType;
    voice.params = params;
    this.applyFilter(voice, params, immediate);
  }

  updateParams(trackId: string, params: MelodicSynthParams, immediate = false) {
    const voice = this.voices.get(trackId);
    if (!voice) return;
    voice.params = params;
    try {
      voice.poly.set({
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
      this.changeSynthType(trackId, voice.synthType, params, immediate);
      return;
    }
    this.applyFilter(voice, params, immediate);
  }

  private applyFilter(voice: MelodicVoice, params: MelodicSynthParams, immediate = false) {
    const cutoff = params.filterCutoff ?? DEFAULT_FILTER_CUTOFF;
    const q = params.filterResonance ?? DEFAULT_FILTER_Q;
    if (immediate) {
      voice.filter.frequency.value = cutoff;
      voice.filter.Q.value = q;
    } else {
      voice.filter.frequency.rampTo(cutoff, 0.02);
      voice.filter.Q.rampTo(q, 0.02);
    }
  }

  /**
   * Trigger a note. `duration` may be a Tone notation string ('16n') or seconds.
   */
  playNote(trackId: string, note: string, duration: string | number = '8n', time?: number, velocity: number = 0.8) {
    const voice = this.voices.get(trackId);
    if (!voice) return;
    voice.poly.triggerAttackRelease(note, duration, time, Math.max(0.05, Math.min(1, velocity)));
  }

  playChord(trackId: string, notes: string[], duration: string | number = '4n', time?: number, velocity: number = 0.8) {
    const voice = this.voices.get(trackId);
    if (!voice) return;
    voice.poly.triggerAttackRelease(notes, duration, time, velocity);
  }

  /** Live (keyboard) note on — held until `noteOff`. */
  noteOn(trackId: string, note: string, velocity: number = 0.8) {
    const voice = this.voices.get(trackId);
    if (!voice) return;
    voice.poly.triggerAttack(note, undefined, velocity);
  }

  noteOff(trackId: string, note: string) {
    const voice = this.voices.get(trackId);
    if (!voice) return;
    voice.poly.triggerRelease(note);
  }

  releaseAll(trackId?: string) {
    if (trackId) {
      this.voices.get(trackId)?.poly.releaseAll();
    } else {
      this.voices.forEach(v => v.poly.releaseAll());
    }
  }

  setVolume(trackId: string, db: number) {
    const voice = this.voices.get(trackId);
    if (!voice) return;
    voice.volume = db;
    voice.channel.setVolume(db);
  }

  setSends(trackId: string, reverb: number, delay: number, immediate = false) {
    const voice = this.voices.get(trackId);
    if (!voice) return;
    voice.reverbSend = reverb;
    voice.delaySend = delay;
    voice.channel.setSends(reverb, delay, immediate);
  }

  has(trackId: string): boolean {
    return this.voices.has(trackId);
  }

  disposeSynth(trackId: string) {
    const voice = this.voices.get(trackId);
    if (!voice) return;
    voice.poly.dispose();
    voice.filter.dispose();
    voice.channel.dispose();
    this.voices.delete(trackId);
  }

  dispose() {
    this.voices.forEach((_, id) => this.disposeSynth(id));
    this.voices.clear();
    this.previewSynth.dispose();
    this.previewChannel.dispose();
  }
}
