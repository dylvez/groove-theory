import { useEffect, useRef } from 'react';
import type { NoteWithOctave } from '../types';
import { KEYBOARD_MAP } from '../constants';
import { AudioEngine } from '../audio/AudioEngine';
import { useUIStore } from '../store/useUIStore';
import { useSequencerStore } from '../store/useSequencerStore';
import { useTransportStore } from '../store/useTransportStore';

function isTypingTarget(t: EventTarget | null): boolean {
  return t instanceof HTMLInputElement || t instanceof HTMLSelectElement || t instanceof HTMLTextAreaElement
    || (t instanceof HTMLElement && t.isContentEditable);
}

/**
 * Live keyboard performance into the armed melodic track.
 *
 * - A W S E D F T G Y H U J K O L P ; play notes (two octaves from `liveOctave`)
 * - Z / X shift the live octave down / up
 * - When REC is on and the sequencer is playing, each key press is quantized
 *   to the nearest step and written into the armed track. Holding a key sets
 *   the note length.
 */
export function useLiveKeys() {
  const armedTrackId = useUIStore(s => s.armedTrackId);
  const held = useRef(new Map<string, { note: NoteWithOctave; step: number | null }>());

  useEffect(() => {
    if (!armedTrackId) return;
    const engine = AudioEngine.getInstance();
    const heldMap = held.current;

    const getTrack = () => {
      const pattern = useSequencerStore.getState().getActivePattern();
      return { pattern, track: pattern.melodicTracks.find(t => t.id === armedTrackId) ?? null };
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.toLowerCase();
      const ui = useUIStore.getState();

      if (key === 'z') { ui.setLiveOctave(ui.liveOctave - 1); e.preventDefault(); return; }
      if (key === 'x') { ui.setLiveOctave(ui.liveOctave + 1); e.preventDefault(); return; }

      const mapping = KEYBOARD_MAP[key];
      if (!mapping) return;
      e.preventDefault();

      const { pattern, track } = getTrack();
      if (!track) return;
      const note = `${mapping.note}${ui.liveOctave + mapping.octaveOffset}` as NoteWithOctave;
      if (heldMap.has(key)) return;

      engine.init().then(() => {
        engine.prepareMelodicVoice(track.id, track.synthType, track.synthParams, track.volume, track.reverbSend ?? 0, track.delaySend ?? 0);
        engine.synthEngine.noteOn(track.id, note, 0.85);
      });

      let step: number | null = null;
      const transport = useTransportStore.getState();
      if (ui.recording && transport.state === 'playing') {
        step = engine.getCurrentStep(pattern.numSteps, pattern.stepResolution);
        useSequencerStore.getState().setMelodicStep(track.id, step, note, { velocity: 0.85, length: 1 });
      }
      heldMap.set(key, { note, step });
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const entry = heldMap.get(key);
      if (!entry) return;
      heldMap.delete(key);

      const { pattern, track } = getTrack();
      if (!track) return;
      engine.synthEngine.noteOff(track.id, entry.note);

      // Extend the recorded note to how long the key was held
      if (entry.step !== null && useUIStore.getState().recording && useTransportStore.getState().state === 'playing') {
        const nowStep = engine.getCurrentStep(pattern.numSteps, pattern.stepResolution);
        let len = nowStep - entry.step;
        if (len < 0) len += pattern.numSteps;
        len = Math.max(1, Math.min(pattern.numSteps, len));
        if (len > 1) useSequencerStore.getState().setMelodicStepLength(track.id, entry.step, len);
      }
    };

    const onBlur = () => {
      const { track } = getTrack();
      if (track) engine.synthEngine.releaseAll(track.id);
      heldMap.clear();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      onBlur();
    };
  }, [armedTrackId]);
}
