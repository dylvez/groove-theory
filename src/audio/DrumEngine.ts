import * as Tone from 'tone';
import type { DrumSynthParams, MembraneSynthParams } from '../types';

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
      }).toDestination();

    case 'noise':
      return new Tone.NoiseSynth({
        noise: { type: params.noiseType },
        envelope: {
          attack: params.attack,
          decay: params.decay,
          sustain: params.sustain,
          release: params.release,
        },
      }).toDestination();

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
      }).toDestination();
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

export class DrumEngine {
  private synths = new Map<string, DrumSynth>();
  private currentParams = new Map<string, DrumSynthParams>();

  ensureSynth(sampleKey: string, params: DrumSynthParams, volume?: number) {
    if (!this.synths.has(sampleKey)) {
      const synth = createDrumSynth(params);
      if (volume !== undefined) synth.volume.value = volume;
      this.synths.set(sampleKey, synth);
      this.currentParams.set(sampleKey, { ...params });
    }
  }

  updateParams(sampleKey: string, params: DrumSynthParams) {
    const synth = this.synths.get(sampleKey);
    if (!synth) {
      this.currentParams.set(sampleKey, params);
      return;
    }

    const current = this.currentParams.get(sampleKey);
    if (current?.synthKind !== params.synthKind) {
      // synthKind changed — dispose and recreate
      synth.dispose();
      this.synths.set(sampleKey, createDrumSynth(params));
    } else {
      applyDrumParams(synth, params);
    }
    this.currentParams.set(sampleKey, params);
  }

  trigger(sampleKey: string, time: number) {
    const synth = this.synths.get(sampleKey);
    if (!synth) return;

    const params = this.currentParams.get(sampleKey);

    if (synth instanceof Tone.NoiseSynth) {
      synth.triggerAttackRelease('16n', time);
    } else if (synth instanceof Tone.MetalSynth) {
      synth.triggerAttackRelease('32n', time);
    } else if (synth instanceof Tone.MembraneSynth) {
      const freq = (params as MembraneSynthParams)?.frequency ?? 60;
      synth.triggerAttackRelease(freq, '8n', time);
    }
  }

  setVolume(sampleKey: string, db: number) {
    const synth = this.synths.get(sampleKey);
    if (synth) synth.volume.value = db;
  }

  dispose() {
    this.synths.forEach(s => s.dispose());
    this.synths.clear();
    this.currentParams.clear();
  }
}
