import * as Tone from 'tone';
import { DrumEngine } from './DrumEngine';
import { SynthEngine } from './SynthEngine';
import type { DrumSynthParams, MelodicSynthParams, SynthType } from '../types';

export interface DrumStepData {
  sampleKey: string;
  active: boolean;
  muted: boolean;
  synthParams: DrumSynthParams;
  volume: number;
}

export interface MelodicStepData {
  trackId: string;
  note: string | null;
  active: boolean;
  muted: boolean;
  synthType: SynthType;
  synthParams: MelodicSynthParams;
  volume: number;
}

export class AudioEngine {
  private static instance: AudioEngine | null = null;
  public drumEngine: DrumEngine;
  public synthEngine: SynthEngine;
  private repeatEventId: number | null = null;
  private stepCallback: ((step: number) => void) | null = null;

  private constructor() {
    this.drumEngine = new DrumEngine();
    this.synthEngine = new SynthEngine();
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
    getSwing: () => number = () => 0
  ) {
    this.clearSchedule();

    let currentStep = 0;

    this.repeatEventId = Tone.getTransport().scheduleRepeat((time) => {
      const numSteps = getNumSteps();

      // Stop at end of pattern when loop is off
      if (!getLoop() && currentStep >= numSteps) {
        Tone.getDraw().schedule(() => { onEnd?.(); }, time);
        return;
      }

      const step = currentStep % numSteps;

      // Calculate swing offset for odd-numbered steps (off-beats)
      const swing = getSwing();
      const sixteenthDuration = 60 / Tone.getTransport().bpm.value / 4;
      const swingOffset = (step % 2 === 1) ? swing * sixteenthDuration * 0.5 : 0;
      const triggerTime = time + swingOffset;

      // Trigger drum sounds
      const drumData = getDrumSteps();
      for (const track of drumData) {
        // Ensure synth exists for this drum on first step
        if (track.length > 0) {
          this.drumEngine.ensureSynth(track[0].sampleKey, track[0].synthParams, track[0].volume);
        }
        const stepData = track[step];
        if (stepData && stepData.active && !stepData.muted) {
          this.drumEngine.trigger(stepData.sampleKey, triggerTime);
        }
      }

      // Trigger melodic sounds
      const melodicData = getMelodicSteps();
      for (const track of melodicData) {
        // Ensure synth exists for this melodic track
        if (track.length > 0) {
          this.synthEngine.ensureSynth(track[0].trackId, track[0].synthType, track[0].synthParams, track[0].volume);
        }
        const stepData = track[step];
        if (stepData && stepData.active && stepData.note && !stepData.muted) {
          this.synthEngine.playNote(stepData.trackId, stepData.note, '16n', triggerTime);
        }
      }

      // UI callback stays on grid (no swing offset) for visual clarity
      Tone.getDraw().schedule(() => {
        this.stepCallback?.(step);
      }, time);

      currentStep++;
    }, '16n');
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

  clearSchedule() {
    if (this.repeatEventId !== null) {
      Tone.getTransport().clear(this.repeatEventId);
      this.repeatEventId = null;
    }
  }

  setBpm(bpm: number) {
    Tone.getTransport().bpm.value = bpm;
  }

  start() {
    Tone.getTransport().start();
  }

  stop() {
    Tone.getTransport().stop();
    Tone.getTransport().position = 0;
    this.stepCallback?.(0);
  }

  getTransportState(): string {
    return Tone.getTransport().state;
  }

  dispose() {
    this.clearSchedule();
    this.drumEngine.dispose();
    this.synthEngine.dispose();
    AudioEngine.instance = null;
  }
}
