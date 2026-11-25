import type { NoteName, NoteWithOctave, ScaleDefinition } from '../types';
import { NOTE_NAMES } from '../constants/notes';
import { AudioEngine } from '../audio/AudioEngine';
import { useUIStore } from '../store/useUIStore';
import { useSequencerStore } from '../store/useSequencerStore';
import { useTransportStore } from '../store/useTransportStore';
import { midiToNote } from './melodicNotes';

/**
 * Live notes into the armed synth track, from the computer keyboard or a MIDI
 * keyboard. Each held note is keyed by its source ("key:a", "midi:60"), so a
 * key up / note off releases exactly what it started.
 *
 * While REC is on and the pattern is playing, a note is written into the
 * armed track at the nearest step, and how long it's held sets its length.
 */

interface Held {
  trackId: string;
  note: NoteWithOctave;
  /** Step it was recorded on, or null when not recording */
  step: number | null;
}

const held = new Map<string, Held>();

function armed() {
  const pattern = useSequencerStore.getState().getActivePattern();
  const id = useUIStore.getState().armedTrackId;
  return { pattern, track: id ? pattern.melodicTracks.find(t => t.id === id) ?? null : null };
}

function recordingNow() {
  return useUIStore.getState().recording && useTransportStore.getState().state === 'playing';
}

/** Start a note. Returns false when no synth track is armed. */
export function liveNoteOn(source: string, note: NoteWithOctave, velocity: number): boolean {
  if (held.has(source)) return true;
  const { pattern, track } = armed();
  if (!track) return false;

  const engine = AudioEngine.getInstance();
  engine.init().then(() => {
    engine.prepareMelodicVoice(track.id, track.synthType, track.synthParams, track.volume, track.reverbSend ?? 0, track.delaySend ?? 0, track.pan ?? 0);
    engine.synthEngine.noteOn(track.id, note, velocity);
  });

  let step: number | null = null;
  if (recordingNow()) {
    step = engine.getCurrentStep(pattern.numSteps, pattern.stepResolution);
    // Notes held together record as a chord (a Mono Synth keeps one note)
    useSequencerStore.getState().addMelodicNote(track.id, step, note, {
      velocity: Math.round(velocity * 100) / 100, length: 1, mono: track.synthType === 'monoSynth',
    });
  }
  held.set(source, { trackId: track.id, note, step });
  return true;
}

export function liveNoteOff(source: string) {
  const entry = held.get(source);
  if (!entry) return;
  held.delete(source);

  const engine = AudioEngine.getInstance();
  engine.synthEngine.noteOff(entry.trackId, entry.note);

  // Stretch the recorded note to how long it was held
  if (entry.step !== null && recordingNow()) {
    const pattern = useSequencerStore.getState().getActivePattern();
    if (!pattern.melodicTracks.some(t => t.id === entry.trackId)) return;
    const nowStep = engine.getCurrentStep(pattern.numSteps, pattern.stepResolution);
    let len = nowStep - entry.step;
    if (len < 0) len += pattern.numSteps;
    len = Math.max(1, Math.min(pattern.numSteps, len));
    if (len > 1) useSequencerStore.getState().setMelodicNoteLength(entry.trackId, entry.step, entry.note, len);
  }
}

/** Let go of every held note from one source ("key:" or "midi:") */
export function releaseLive(prefix: string) {
  for (const source of [...held.keys()]) {
    if (source.startsWith(prefix)) liveNoteOff(source);
  }
}

// --- Scale lock --------------------------------------------------------------

/** Home row, left to right: with scale lock on these play the scale */
export const HOME_ROW = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';'];

/**
 * With scale lock on, the home row plays the scale upwards from the root in
 * the live octave (A = root), carrying on into the next octave. The upper row
 * is silent.
 */
export function scaleKeyNote(key: string, root: NoteName, scale: ScaleDefinition, octave: number): NoteWithOctave | null {
  const i = HOME_ROW.indexOf(key);
  if (i < 0 || scale.intervals.length === 0) return null;
  const n = scale.intervals.length;
  const midi = (octave + 1) * 12 + NOTE_NAMES.indexOf(root) + scale.intervals[i % n] + 12 * Math.floor(i / n);
  // Above B7 the app has no notes; stay silent rather than repeat the top one
  return midi > 107 ? null : midiToNote(midi);
}

/** The nearest note in the scale (a tie goes down). Used for MIDI keyboards. */
export function snapToScale(midi: number, root: NoteName, scale: ScaleDefinition): number {
  const rootIndex = NOTE_NAMES.indexOf(root);
  const inScale = (m: number) => scale.intervals.includes((((m - rootIndex) % 12) + 12) % 12);
  for (let d = 0; d <= 6; d++) {
    if (inScale(midi - d)) return midi - d;
    if (inScale(midi + d)) return midi + d;
  }
  return midi;
}
