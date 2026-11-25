import * as Tone from 'tone';
import type { DrumSynthParams, MembraneSynthParams, MetalSynthParams } from '../types';
import type { Mixer, Channel } from './Mixer';

type DrumSynth = Tone.MembraneSynth | Tone.NoiseSynth | Tone.MetalSynth;

export function createDrumSynth(params: DrumSynthParams): DrumSynth {
  switch (params.synthKind) {
    case 'membrane':
      return new Tone.MembraneSynth({
        pitchDecay: params.pitchDecay,
        octaves: params.octaves,
        oscillator: { type: params.oscillatorType },
        envelope: {
          attack: params.attack,
          decay: params.decay,
          sustain: params.sustain,
          release: params.release,
        },
      });

    case 'noise':
      return new Tone.NoiseSynth({
        noise: { type: params.noiseType },
        envelope: {
          attack: params.attack,
          decay: params.decay,
          sustain: params.sustain,
          release: params.release,
        },
      });

    case 'metal': {
      const synth = new Tone.MetalSynth({
        envelope: {
          attack: params.attack,
          decay: params.decay,
          release: params.release,
        },
        harmonicity: params.harmonicity,
        modulationIndex: params.modulationIndex,
        resonance: params.resonance,
        octaves: params.octaves,
      });
      synth.frequency.value = params.frequency;
      return synth;
    }
  }
}

function applyDrumParams(synth: DrumSynth, params: DrumSynthParams) {
  if (params.synthKind === 'membrane' && synth instanceof Tone.MembraneSynth) {
    synth.envelope.attack = params.attack;
    synth.envelope.decay = params.decay;
    synth.envelope.sustain = params.sustain;
    synth.envelope.release = params.release;
    synth.pitchDecay = params.pitchDecay;
    synth.octaves = params.octaves;
    synth.oscillator.type = params.oscillatorType;
  } else if (params.synthKind === 'noise' && synth instanceof Tone.NoiseSynth) {
    synth.noise.type = params.noiseType;
    synth.envelope.attack = params.attack;
    synth.envelope.decay = params.decay;
    synth.envelope.sustain = params.sustain;
    synth.envelope.release = params.release;
  } else if (params.synthKind === 'metal' && synth instanceof Tone.MetalSynth) {
    synth.envelope.attack = params.attack;
    synth.envelope.decay = params.decay;
    synth.envelope.release = params.release;
    synth.frequency.value = params.frequency;
    synth.harmonicity = params.harmonicity;
    synth.modulationIndex = params.modulationIndex;
    synth.resonance = params.resonance;
    synth.octaves = params.octaves;
  }
}

interface DrumVoice {
  synth: DrumSynth;
  channel: Channel;
  params: DrumSynthParams;
  volume: number;
  reverbSend: number;
  delaySend: number;
  pan: number;
  /** Latest scheduled hit, so hits reach the (monophonic) synth in time order */
  lastStart: number;
}

export interface DrumVoiceSettings {
  params: DrumSynthParams;
  volume?: number;
  reverbSend?: number;
  delaySend?: number;
}

/**
 * Owns one synth per drum sample key, each routed through its own mixer channel.
 * `ensureSynth` is cheap to call every step: it creates the voice on first use and
 * re-syncs parameters only when the (immutable) params object or levels change.
 */
export class DrumEngine {
  private voices = new Map<string, DrumVoice>();

  private mixer: Mixer;

  constructor(mixer: Mixer) {
    this.mixer = mixer;
  }

  ensureSynth(sampleKey: string, params: DrumSynthParams, volume: number = -6, reverbSend: number = 0, delaySend: number = 0, pan: number = 0) {
    const existing = this.voices.get(sampleKey);
    if (!existing) {
      const channel = this.mixer.createChannel(volume, reverbSend, delaySend, pan);
      const synth = createDrumSynth(params);
      synth.connect(channel.input);
      this.voices.set(sampleKey, { synth, channel, params, volume, reverbSend, delaySend, pan, lastStart: 0 });
      return;
    }
    if (existing.params !== params) this.updateParams(sampleKey, params);
    if (existing.volume !== volume) this.setVolume(sampleKey, volume);
    if (existing.reverbSend !== reverbSend || existing.delaySend !== delaySend) {
      this.setSends(sampleKey, reverbSend, delaySend, true);
    }
    if (existing.pan !== pan) this.setPan(sampleKey, pan, true);
  }

  updateParams(sampleKey: string, params: DrumSynthParams) {
    const voice = this.voices.get(sampleKey);
    if (!voice) return;
    if (voice.params.synthKind !== params.synthKind) {
      voice.synth.dispose();
      voice.synth = createDrumSynth(params);
      voice.synth.connect(voice.channel.input);
    } else {
      applyDrumParams(voice.synth, params);
    }
    voice.params = params;
  }

  /**
   * Play a hit. Scheduled hits (`ordered`) are kept in time order per voice:
   * these synths are monophonic, and Tone cancels a later start if an earlier
   * one is scheduled after it (a late repeat followed by an early step can do
   * that). Auditions pass `ordered: false` so they're never held back.
   */
  trigger(sampleKey: string, time: number, velocity: number = 1, ordered = true) {
    const voice = this.voices.get(sampleKey);
    if (!voice) return;
    if (ordered) {
      if (time <= voice.lastStart) time = voice.lastStart + 0.002;
      voice.lastStart = time;
    }
    const { synth, params } = voice;
    const vel = Math.max(0.05, Math.min(1, velocity));

    if (synth instanceof Tone.NoiseSynth) {
      synth.triggerAttackRelease('16n', time, vel);
    } else if (synth instanceof Tone.MetalSynth) {
      // MetalSynth is monophonic in Tone 15: (note, duration, time, velocity)
      const freq = (params as MetalSynthParams)?.frequency ?? 400;
      // MetalSynth runs hot compared to the membrane/noise voices — tame it
      synth.triggerAttackRelease(freq, '32n', time, vel * 0.55);
    } else if (synth instanceof Tone.MembraneSynth) {
      const freq = (params as MembraneSynthParams)?.frequency ?? 60;
      synth.triggerAttackRelease(freq, '8n', time, vel);
    }
  }

  setVolume(sampleKey: string, db: number) {
    const voice = this.voices.get(sampleKey);
    if (!voice) return;
    voice.volume = db;
    voice.channel.setVolume(db);
  }

  setPan(sampleKey: string, pan: number, immediate = false) {
    const voice = this.voices.get(sampleKey);
    if (!voice) return;
    voice.pan = pan;
    voice.channel.setPan(pan, immediate);
  }

  setSends(sampleKey: string, reverb: number, delay: number, immediate = false) {
    const voice = this.voices.get(sampleKey);
    if (!voice) return;
    voice.reverbSend = reverb;
    voice.delaySend = delay;
    voice.channel.setSends(reverb, delay, immediate);
  }

  has(sampleKey: string): boolean {
    return this.voices.has(sampleKey);
  }

  dispose() {
    this.voices.forEach(v => {
      v.synth.dispose();
      v.channel.dispose();
    });
    this.voices.clear();
  }
}
