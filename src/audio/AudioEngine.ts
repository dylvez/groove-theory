import * as Tone from 'tone';
import { DrumEngine } from './DrumEngine';
import { SynthEngine } from './SynthEngine';
import { Mixer } from './Mixer';
import type { NoteEvent, DrumSynthParams, MelodicSynthParams, SynthType, StepResolution, Pattern, StepFx } from '../types';
import type { MixerSettings } from '../store/useMixerStore';
import { useMixerStore } from '../store/useMixerStore';
import { stepNotes } from '../utils/melodicNotes';
import { drumFx, melodicFx, stepHits, hitLength, isEarly } from '../utils/stepFx';

export interface DrumStepData {
  sampleKey: string;
  /** 0 = off, otherwise velocity 0–1 */
  velocity: number;
  muted: boolean;
  synthParams: DrumSynthParams;
  volume: number;
  reverbSend: number;
  delaySend: number;
  pan: number;
  fx?: StepFx;
}

export interface MelodicStepData {
  trackId: string;
  /** Every note starting on this step (empty when the step is off) */
  notes: NoteEvent[];
  muted: boolean;
  synthType: SynthType;
  synthParams: MelodicSynthParams;
  volume: number;
  reverbSend: number;
  delaySend: number;
  pan: number;
  fx?: StepFx;
}

/** Every drum track's steps, ready for the player (solo and mute applied) */
export function drumStepData(pattern: Pattern): DrumStepData[][] {
  const hasSolo = pattern.drumTracks.some(t => t.solo);
  return pattern.drumTracks.map(track => {
    const muted = track.muted || (hasSolo && !track.solo);
    return track.steps.map((velocity, i) => ({
      sampleKey: track.sampleKey,
      velocity,
      muted,
      synthParams: track.synthParams,
      volume: track.volume,
      reverbSend: track.reverbSend ?? 0,
      delaySend: track.delaySend ?? 0,
      pan: track.pan ?? 0,
      fx: drumFx(track, i),
    }));
  });
}

/** Every synth track's steps, ready for the player (solo and mute applied) */
export function melodicStepData(pattern: Pattern): MelodicStepData[][] {
  const hasSolo = pattern.melodicTracks.some(t => t.solo);
  return pattern.melodicTracks.map(track => {
    const muted = track.muted || (hasSolo && !track.solo);
    return track.steps.map(step => ({
      trackId: track.id,
      notes: stepNotes(step),
      muted,
      synthType: track.synthType,
      synthParams: track.synthParams,
      volume: track.volume,
      reverbSend: track.reverbSend ?? 0,
      delaySend: track.delaySend ?? 0,
      pan: track.pan ?? 0,
      fx: melodicFx(step),
    }));
  });
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

      // Swing delays odd-numbered steps (off-beats)
      const swing = getSwing();
      const stepDuration = stepSeconds(Tone.getTransport().bpm.value, resolution);
      const gridTime = (s: number, t: number) => t + (s % 2 === 1 ? swing * stepDuration * 0.5 : 0);
      // Never in the past, in case an early hit can't be honoured in full
      const at = (t: number) => Math.max(t, Tone.now());

      // A step shifted early has to sound before its own callback, so it is
      // played from the step before. Not across the loop point, though: the
      // next pass might be a different pattern (song mode), so a pattern's
      // first step plays from its own callback, as early as the look-ahead allows.
      const next = step + 1 < numSteps ? step + 1 : -1;
      const playsNow = (fx: StepFx | undefined) => !isEarly(fx) || step === 0;

      const playDrum = (d: DrumStepData | undefined, grid: number) => {
        if (!d || d.velocity <= 0 || d.muted) return;
        for (const h of stepHits(d.fx)) this.drumEngine.trigger(d.sampleKey, at(grid + h * stepDuration), d.velocity);
      };
      const playMelodic = (m: MelodicStepData | undefined, grid: number) => {
        if (!m || m.muted || m.notes.length === 0) return;
        const hits = stepHits(m.fx);
        hits.forEach((h, k) => {
          const t = at(grid + h * stepDuration);
          for (const n of m.notes) {
            // Slight gap so identical consecutive notes re-articulate cleanly
            const duration = Math.max(0.03, hitLength(Math.max(1, n.length), k, hits.length) * stepDuration - 0.01);
            this.synthEngine.playNote(m.trackId, n.note, duration, t, n.velocity);
          }
        });
      };

      // Trigger drum sounds
      const drumData = getDrumSteps();
      for (const track of drumData) {
        if (track.length > 0) {
          const t0 = track[0];
          this.drumEngine.ensureSynth(t0.sampleKey, t0.synthParams, t0.volume, t0.reverbSend, t0.delaySend, t0.pan);
        }
        if (playsNow(track[step]?.fx)) playDrum(track[step], gridTime(step, time));
        if (next >= 0 && isEarly(track[next]?.fx)) playDrum(track[next], gridTime(next, time + stepDuration));
      }

      // Trigger melodic sounds
      const melodicData = getMelodicSteps();
      for (const track of melodicData) {
        if (track.length > 0) {
          const t0 = track[0];
          this.synthEngine.ensureSynth(t0.trackId, t0.synthType, t0.synthParams, t0.volume, t0.reverbSend, t0.delaySend, t0.pan);
        }
        if (playsNow(track[step]?.fx)) playMelodic(track[step], gridTime(step, time));
        if (next >= 0 && isEarly(track[next]?.fx)) playMelodic(track[next], gridTime(next, time + stepDuration));
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

  setDrumPan(sampleKey: string, pan: number) {
    this.drumEngine.setPan(sampleKey, pan);
  }

  setMelodicPan(trackId: string, pan: number) {
    this.synthEngine.setPan(trackId, pan);
  }

  /** Audition a drum immediately (used by track headers and pads). */
  auditionDrum(sampleKey: string, params: DrumSynthParams, volume: number, reverbSend = 0, delaySend = 0, velocity = 1, pan = 0) {
    this.drumEngine.ensureSynth(sampleKey, params, volume, reverbSend, delaySend, pan);
    this.drumEngine.trigger(sampleKey, Tone.now(), velocity, false);
  }

  /** Make sure a melodic track's voice exists so it can be played live. */
  prepareMelodicVoice(trackId: string, synthType: SynthType, params: MelodicSynthParams, volume: number, reverbSend = 0, delaySend = 0, pan = 0) {
    this.synthEngine.ensureSynth(trackId, synthType, params, volume, reverbSend, delaySend, pan);
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
