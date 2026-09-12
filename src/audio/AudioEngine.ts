import * as Tone from 'tone';
import { DrumEngine } from './DrumEngine';
import { SynthEngine } from './SynthEngine';
import { Mixer } from './Mixer';
import type { DrumSynthParams, MelodicSynthParams, SynthType, StepResolution } from '../types';
import type { MixerSettings } from '../store/useMixerStore';
import { useMixerStore } from '../store/useMixerStore';

export interface DrumStepData {
  sampleKey: string;
  /** 0 = off, otherwise velocity 0–1 */
  velocity: number;
  muted: boolean;
  synthParams: DrumSynthParams;
  volume: number;
  reverbSend: number;
  delaySend: number;
}

export interface MelodicStepData {
  trackId: string;
  note: string | null;
  active: boolean;
  velocity: number;
  /** Note length in steps */
  length: number;
  muted: boolean;
  synthType: SynthType;
  synthParams: MelodicSynthParams;
  volume: number;
  reverbSend: number;
  delaySend: number;
}

/** Seconds per step for a given BPM and resolution. */
export function stepSeconds(bpm: number, resolution: StepResolution): number {
  const divisions = resolution === '32n' ? 8 : 4;
  return 60 / bpm / divisions;
}

/** Ticks per step on the Tone transport (PPQ-based). */
export function stepTicks(resolution: StepResolution): number {
  const divisions = resolution === '32n' ? 8 : 4;
  return Tone.getTransport().PPQ / divisions;
}

export class AudioEngine {
  private static instance: AudioEngine | null = null;
  public mixer: Mixer;
  public drumEngine: DrumEngine;
  public synthEngine: SynthEngine;
  private repeatEventId: number | null = null;
  private stepCallback: ((step: number) => void) | null = null;
  private unsubscribeMixer: (() => void) | null = null;

  private constructor() {
    this.mixer = new Mixer(useMixerStore.getState());
    this.drumEngine = new DrumEngine(this.mixer);
    this.synthEngine = new SynthEngine(this.mixer);

    // Keep the live mixer in sync with the persisted mixer settings
    this.unsubscribeMixer = useMixerStore.subscribe((state, prev) => {
      const changed: Partial<MixerSettings> = {};
      (['masterVolume', 'reverbDecay', 'reverbLevel', 'delayTime', 'delayFeedback', 'delayLevel', 'compressor'] as const)
        .forEach(k => { if (state[k] !== prev[k]) (changed as Record<string, unknown>)[k] = state[k]; });
      if (Object.keys(changed).length) this.mixer.apply(changed);
    });
  }

  static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  async init() {
    await Tone.start();
  }

  setStepCallback(cb: (step: number) => void) {
    this.stepCallback = cb;
  }

  scheduleRepeat(
    getDrumSteps: () => DrumStepData[][],
    getMelodicSteps: () => MelodicStepData[][],
    getNumSteps: () => number,
    getLoop: () => boolean = () => true,
    onEnd?: () => void,
    getSwing: () => number = () => 0,
    getStepResolution: () => StepResolution = () => '16n'
  ) {
    this.clearSchedule();

    let currentStep = 0;
    const initialResolution = getStepResolution();

    this.repeatEventId = Tone.getTransport().scheduleRepeat((time) => {
      const numSteps = getNumSteps();
      const resolution = getStepResolution();

      // Stop at end of pattern when loop is off
      if (!getLoop() && currentStep >= numSteps) {
        Tone.getDraw().schedule(() => { onEnd?.(); }, time);
        return;
      }

      const step = currentStep % numSteps;

      // Calculate swing offset for odd-numbered steps (off-beats)
      const swing = getSwing();
      const stepDuration = stepSeconds(Tone.getTransport().bpm.value, resolution);
      const swingOffset = (step % 2 === 1) ? swing * stepDuration * 0.5 : 0;
      const triggerTime = time + swingOffset;

      // Trigger drum sounds
      const drumData = getDrumSteps();
      for (const track of drumData) {
        if (track.length > 0) {
          const t0 = track[0];
          this.drumEngine.ensureSynth(t0.sampleKey, t0.synthParams, t0.volume, t0.reverbSend, t0.delaySend);
        }
        const stepData = track[step];
        if (stepData && stepData.velocity > 0 && !stepData.muted) {
          this.drumEngine.trigger(stepData.sampleKey, triggerTime, stepData.velocity);
        }
      }

      // Trigger melodic sounds
      const melodicData = getMelodicSteps();
      for (const track of melodicData) {
        if (track.length > 0) {
          const t0 = track[0];
          this.synthEngine.ensureSynth(t0.trackId, t0.synthType, t0.synthParams, t0.volume, t0.reverbSend, t0.delaySend);
        }
        const stepData = track[step];
        if (stepData && stepData.active && stepData.note && !stepData.muted) {
          const len = Math.max(1, stepData.length || 1);
          // Slight gap so identical consecutive notes re-articulate cleanly
          const duration = Math.max(0.03, len * stepDuration - 0.01);
          this.synthEngine.playNote(stepData.trackId, stepData.note, duration, triggerTime, stepData.velocity);
        }
      }

      // UI callback stays on grid (no swing offset) for visual clarity
      Tone.getDraw().schedule(() => {
        this.stepCallback?.(step);
      }, time);

      currentStep++;
    }, initialResolution);
  }

  // --- Pass-through methods for live parameter editing ---

  updateDrumParams(sampleKey: string, params: DrumSynthParams) {
    this.drumEngine.updateParams(sampleKey, params);
  }

  updateMelodicParams(trackId: string, params: MelodicSynthParams) {
    this.synthEngine.updateParams(trackId, params);
  }

  changeMelodicSynthType(trackId: string, synthType: SynthType, params: MelodicSynthParams) {
    this.synthEngine.changeSynthType(trackId, synthType, params);
  }

  setDrumVolume(sampleKey: string, db: number) {
    this.drumEngine.setVolume(sampleKey, db);
  }

  setMelodicVolume(trackId: string, db: number) {
    this.synthEngine.setVolume(trackId, db);
  }

  setDrumSends(sampleKey: string, reverb: number, delay: number) {
    this.drumEngine.setSends(sampleKey, reverb, delay);
  }

  setMelodicSends(trackId: string, reverb: number, delay: number) {
    this.synthEngine.setSends(trackId, reverb, delay);
  }

  /** Audition a drum immediately (used by track headers and pads). */
  auditionDrum(sampleKey: string, params: DrumSynthParams, volume: number, reverbSend = 0, delaySend = 0, velocity = 1) {
    this.drumEngine.ensureSynth(sampleKey, params, volume, reverbSend, delaySend);
    this.drumEngine.trigger(sampleKey, Tone.now(), velocity);
  }

  /** Make sure a melodic track's voice exists so it can be played live. */
  prepareMelodicVoice(trackId: string, synthType: SynthType, params: MelodicSynthParams, volume: number, reverbSend = 0, delaySend = 0) {
    this.synthEngine.ensureSynth(trackId, synthType, params, volume, reverbSend, delaySend);
  }

  clearSchedule() {
    if (this.repeatEventId !== null) {
      Tone.getTransport().clear(this.repeatEventId);
      this.repeatEventId = null;
    }
  }

  setBpm(bpm: number) {
    Tone.getTransport().bpm.value = bpm;
    this.mixer.syncTempo();
  }

  start() {
    Tone.getTransport().start();
  }

  stop() {
    Tone.getTransport().stop();
    Tone.getTransport().position = 0;
    this.synthEngine.releaseAll();
    this.stepCallback?.(0);
  }

  getTransportState(): string {
    return Tone.getTransport().state;
  }

  /** Current transport position quantized to a step index (for live recording). */
  getCurrentStep(numSteps: number, resolution: StepResolution): number {
    const ticks = Tone.getTransport().ticks;
    const perStep = stepTicks(resolution);
    return Math.round(ticks / perStep) % numSteps;
  }

  /** Master output level in dB. */
  getMasterLevel(): number {
    return this.mixer.getLevel();
  }

  dispose() {
    this.clearSchedule();
    this.unsubscribeMixer?.();
    this.drumEngine.dispose();
    this.synthEngine.dispose();
    this.mixer.dispose();
    AudioEngine.instance = null;
  }
}
