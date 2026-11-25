import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Pattern, StepValue, NoteWithOctave, DrumSynthParams, MelodicSynthParams, SynthType, TimeSignature, StepResolution, MelodicStep } from '../types';
import { VELOCITY_LEVELS, DEFAULT_VELOCITY } from '../types';
import { DEFAULT_DRUM_PARAMS, DEFAULT_MELODIC_PARAMS, getDrumKit, getSynthPreset } from '../constants';
import { createDefaultPattern, createEmptyDrumTrack, createEmptyMelodicTrack, getStepsPerMeasure } from '../utils/patternHelpers';
import * as history from './history';
import { announce } from '../utils/announce';
import { stepNotes, stepFromNotes, transposeStep, noteToMidi } from '../utils/melodicNotes';

// Undo history lives in ./history (shared with the song arrangement).
// Don't record anything until persisted state has been rehydrated.
let _initialized = false;

// --- Pattern clipboard (module-level, not persisted) ---
let _clipboard: Pattern | null = null;

const emptyMelodicStep = (): MelodicStep => ({ active: false, note: null, velocity: 0.8 });

/** Next velocity level after `current` (cycles 1 → 0.6 → 0.3 → 1) */
function nextVelocity(current: number): number {
  // Find the closest level, then advance
  let closest = 0;
  let best = Infinity;
  VELOCITY_LEVELS.forEach((lvl, i) => {
    const d = Math.abs(lvl - current);
    if (d < best) { best = d; closest = i; }
  });
  return VELOCITY_LEVELS[(closest + 1) % VELOCITY_LEVELS.length];
}

/** Replace one synth step in the active pattern */
function mapMelodicStep(
  state: { patterns: Pattern[]; activePatternId: string },
  trackId: string,
  stepIndex: number,
  fn: (s: MelodicStep, numSteps: number) => MelodicStep,
): { patterns: Pattern[] } {
  return {
    patterns: state.patterns.map(p =>
      p.id !== state.activePatternId ? p : {
        ...p,
        melodicTracks: p.melodicTracks.map(t =>
          t.id !== trackId ? t : {
            ...t,
            steps: t.steps.map((s, i) => (i === stepIndex ? fn(s, p.numSteps) : s)),
          }
        ),
      }
    ),
  };
}

function rotate<T>(arr: T[], by: number): T[] {
  const n = arr.length;
  if (n === 0) return arr;
  const k = ((by % n) + n) % n;
  return [...arr.slice(n - k), ...arr.slice(0, n - k)];
}

interface SequencerStore {
  patterns: Pattern[];
  activePatternId: string;
  /** Reactive counter so UI can subscribe to undo availability */
  undoDepth: number;
  /** Reactive counter so UI can subscribe to redo availability */
  redoDepth: number;
  /** Reactive flag: is there a pattern on the clipboard? */
  hasClipboard: boolean;

  getActivePattern: () => Pattern;
  toggleDrumStep: (trackId: string, stepIndex: number) => void;
  /** Set a drum step to an explicit velocity (0 = off) */
  setDrumStep: (trackId: string, stepIndex: number, velocity: number) => void;
  /** Cycle an active drum step through velocity levels */
  cycleDrumVelocity: (trackId: string, stepIndex: number) => void;
  setMelodicStep: (trackId: string, stepIndex: number, note: NoteWithOctave | null, opts?: { velocity?: number; length?: number }) => void;
  /** Length for every note on the step */
  setMelodicStepLength: (trackId: string, stepIndex: number, length: number) => void;
  /** Cycle velocity for every note on the step */
  cycleMelodicVelocity: (trackId: string, stepIndex: number) => void;
  /** Add the note if absent, remove it if present. `mono` replaces any other notes on the step. */
  toggleMelodicNote: (trackId: string, stepIndex: number, note: NoteWithOctave, opts?: { length?: number; velocity?: number; mono?: boolean }) => void;
  /** Add (or update) one note on a step, keeping the others */
  addMelodicNote: (trackId: string, stepIndex: number, note: NoteWithOctave, opts?: { length?: number; velocity?: number; mono?: boolean }) => void;
  removeMelodicNote: (trackId: string, stepIndex: number, note: NoteWithOctave) => void;
  setMelodicNoteLength: (trackId: string, stepIndex: number, note: NoteWithOctave, length: number) => void;
  cycleMelodicNoteVelocity: (trackId: string, stepIndex: number, note: NoteWithOctave) => void;
  toggleMelodicStep: (trackId: string, stepIndex: number) => void;
  muteTrack: (trackId: string, type: 'drum' | 'melodic') => void;
  soloTrack: (trackId: string, type: 'drum' | 'melodic') => void;
  setTrackVolume: (trackId: string, type: 'drum' | 'melodic', volume: number) => void;
  setTrackSends: (trackId: string, type: 'drum' | 'melodic', reverbSend: number, delaySend: number) => void;
  /** Apply a drum kit's sounds to every drum track in the active pattern */
  applyDrumKit: (kitId: string) => void;
  /** Apply a named synth preset to a melodic track */
  applySynthPreset: (trackId: string, presetId: string) => void;
  setActivePattern: (id: string) => void;
  clearActivePattern: () => void;
  clearAllPatterns: () => void;
  addDrumTrack: (sampleKey: string, name: string, color: string) => void;
  removeDrumTrack: (trackId: string) => void;
  addMelodicTrack: (synthType?: SynthType, name?: string) => void;
  removeMelodicTrack: (trackId: string) => void;
  renameTrack: (trackId: string, type: 'drum' | 'melodic', newName: string) => void;
  updateDrumSynthParams: (trackId: string, params: Partial<DrumSynthParams>) => void;
  updateMelodicSynthParams: (trackId: string, params: Partial<MelodicSynthParams>) => void;
  setMelodicSynthType: (trackId: string, synthType: SynthType) => void;
  setDrumSteps: (trackId: string, steps: StepValue[]) => void;
  /** Replace every step of a synth track at once (e.g. writing a chord progression) */
  setMelodicSteps: (trackId: string, steps: MelodicStep[]) => void;
  setMelodicOctave: (trackId: string, octave: number) => void;
  setTimeSignature: (ts: TimeSignature) => void;
  setStepResolution: (resolution: StepResolution) => void;
  setMeasures: (measures: 2 | 4) => void;
  loadPatterns: (patterns: Pattern[], activePatternId: string) => void;
  fillDrumTrack: (trackId: string) => void;
  fillMelodicTrack: (trackId: string) => void;
  fillAllDrums: () => void;
  fillAllSynths: () => void;
  /** Copy the active pattern's contents into another slot */
  copyPatternTo: (targetPatternId: string) => void;
  /** Put the active pattern on the clipboard */
  copyActivePattern: () => void;
  /** Replace the active pattern's contents with the clipboard */
  pasteToActivePattern: () => void;
  /** Rotate every track in the active pattern by N steps */
  shiftPattern: (steps: number) => void;
  /** Randomize velocities slightly for a human feel */
  humanizePattern: (amount?: number) => void;
  undo: () => void;
  redo: () => void;
}

const defaultPatterns: Pattern[] = [
  createDefaultPattern('pattern-a', 'A'),
  createDefaultPattern('pattern-b', 'B'),
  createDefaultPattern('pattern-c', 'C'),
  createDefaultPattern('pattern-d', 'D'),
];

export const useSequencerStore = create<SequencerStore>()(
  persist(
    (_set, get) => {
      // Wrap set to automatically track undo when patterns change.
      // This avoids the pitfalls of using subscribe + setState (re-entrancy,
      // persist middleware quirks) by keeping undo tracking inside the store.
      const set = (
        partial:
          | SequencerStore
          | Partial<SequencerStore>
          | ((state: SequencerStore) => SequencerStore | Partial<SequencerStore>),
        replace?: boolean,
      ) => {
        const prevPatterns = get().patterns;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        _set(partial as any, replace as any);
        if (get().patterns !== prevPatterns && _initialized) {
          history.recordChange({ patterns: prevPatterns });
        }
      };

      history.registerPatternHistory(
        () => get().patterns,
        (patterns) => _set({ patterns }),
      );
      history.onHistoryDepthChange((undoDepth, redoDepth) => _set({ undoDepth, redoDepth }));

      return {
      patterns: defaultPatterns,
      activePatternId: 'pattern-a',
      undoDepth: 0,
      redoDepth: 0,
      hasClipboard: false,

      getActivePattern: () => {
        const { patterns, activePatternId } = get();
        return patterns.find(p => p.id === activePatternId) || patterns[0];
      },

      toggleDrumStep: (trackId, stepIndex) =>
        set((state) => ({
          patterns: state.patterns.map(p =>
            p.id !== state.activePatternId ? p : {
              ...p,
              drumTracks: p.drumTracks.map(t =>
                t.id !== trackId ? t : {
                  ...t,
                  steps: t.steps.map((s, i) =>
                    i === stepIndex ? ((s > 0 ? 0 : DEFAULT_VELOCITY) as StepValue) : s
                  ),
                }
              ),
            }
          ),
        })),

      setDrumStep: (trackId, stepIndex, velocity) =>
        set((state) => ({
          patterns: state.patterns.map(p =>
            p.id !== state.activePatternId ? p : {
              ...p,
              drumTracks: p.drumTracks.map(t =>
                t.id !== trackId ? t : {
                  ...t,
                  steps: t.steps.map((s, i) =>
                    i === stepIndex ? Math.max(0, Math.min(1, velocity)) : s
                  ),
                }
              ),
            }
          ),
        })),

      cycleDrumVelocity: (trackId, stepIndex) =>
        set((state) => ({
          patterns: state.patterns.map(p =>
            p.id !== state.activePatternId ? p : {
              ...p,
              drumTracks: p.drumTracks.map(t =>
                t.id !== trackId ? t : {
                  ...t,
                  steps: t.steps.map((s, i) =>
                    i !== stepIndex ? s : (s > 0 ? nextVelocity(s) : DEFAULT_VELOCITY)
                  ),
                }
              ),
            }
          ),
        })),

      setMelodicStep: (trackId, stepIndex, note, opts) =>
        set((state) => ({
          patterns: state.patterns.map(p =>
            p.id !== state.activePatternId ? p : {
              ...p,
              melodicTracks: p.melodicTracks.map(t =>
                t.id !== trackId ? t : {
                  ...t,
                  // Sets a single note: any chord on the step is replaced
                  steps: t.steps.map((s, i) =>
                    i !== stepIndex ? s : {
                      active: note !== null,
                      note,
                      velocity: opts?.velocity ?? s.velocity,
                      length: note === null ? undefined : (opts?.length ?? s.length),
                    }
                  ),
                }
              ),
            }
          ),
        })),

      setMelodicStepLength: (trackId, stepIndex, length) =>
        set((state) => mapMelodicStep(state, trackId, stepIndex, (s, numSteps) => {
          const L = Math.max(1, Math.min(numSteps, Math.round(length)));
          if (!s.active) return { ...s, length: L };
          return stepFromNotes(s, stepNotes(s).map(n => ({ ...n, length: L })));
        })),

      cycleMelodicVelocity: (trackId, stepIndex) =>
        set((state) => mapMelodicStep(state, trackId, stepIndex, (s) => {
          if (!s.active) return s;
          const v = nextVelocity(s.velocity);
          return stepFromNotes(s, stepNotes(s).map(n => ({ ...n, velocity: v })));
        })),

      toggleMelodicNote: (trackId, stepIndex, note, opts) =>
        set((state) => mapMelodicStep(state, trackId, stepIndex, (s, numSteps) => {
          const midi = noteToMidi(note);
          const notes = stepNotes(s);
          if (notes.some(n => noteToMidi(n.note) === midi)) {
            return stepFromNotes(s, notes.filter(n => noteToMidi(n.note) !== midi));
          }
          const added = {
            note,
            velocity: opts?.velocity ?? 0.8,
            length: Math.max(1, Math.min(numSteps - stepIndex, opts?.length ?? 1)),
          };
          return stepFromNotes(s, opts?.mono ? [added] : [...notes, added]);
        })),

      addMelodicNote: (trackId, stepIndex, note, opts) =>
        set((state) => mapMelodicStep(state, trackId, stepIndex, (s, numSteps) => {
          const midi = noteToMidi(note);
          const others = opts?.mono ? [] : stepNotes(s).filter(n => noteToMidi(n.note) !== midi);
          return stepFromNotes(s, [...others, {
            note,
            velocity: opts?.velocity ?? 0.8,
            length: Math.max(1, Math.min(numSteps - stepIndex, opts?.length ?? 1)),
          }]);
        })),

      removeMelodicNote: (trackId, stepIndex, note) =>
        set((state) => mapMelodicStep(state, trackId, stepIndex, (s) => {
          const midi = noteToMidi(note);
          return stepFromNotes(s, stepNotes(s).filter(n => noteToMidi(n.note) !== midi));
        })),

      setMelodicNoteLength: (trackId, stepIndex, note, length) => history.coalesced(`note-length:${trackId}:${stepIndex}:${note}`, () =>
        set((state) => mapMelodicStep(state, trackId, stepIndex, (s, numSteps) => {
          const midi = noteToMidi(note);
          const L = Math.max(1, Math.min(numSteps - stepIndex, Math.round(length)));
          return stepFromNotes(s, stepNotes(s).map(n => (noteToMidi(n.note) === midi ? { ...n, length: L } : n)));
        }))),

      cycleMelodicNoteVelocity: (trackId, stepIndex, note) =>
        set((state) => mapMelodicStep(state, trackId, stepIndex, (s) => {
          const midi = noteToMidi(note);
          return stepFromNotes(s, stepNotes(s).map(n => (noteToMidi(n.note) === midi ? { ...n, velocity: nextVelocity(n.velocity) } : n)));
        })),

      toggleMelodicStep: (trackId, stepIndex) =>
        set((state) => ({
          patterns: state.patterns.map(p =>
            p.id !== state.activePatternId ? p : {
              ...p,
              melodicTracks: p.melodicTracks.map(t =>
                t.id !== trackId ? t : {
                  ...t,
                  steps: t.steps.map((s, i) =>
                    i === stepIndex ? { ...s, active: !s.active } : s
                  ),
                }
              ),
            }
          ),
        })),

      muteTrack: (trackId, type) =>
        set((state) => ({
          patterns: state.patterns.map(p =>
            p.id !== state.activePatternId ? p : {
              ...p,
              ...(type === 'drum' ? {
                drumTracks: p.drumTracks.map(t =>
                  t.id !== trackId ? t : { ...t, muted: !t.muted }
                ),
              } : {
                melodicTracks: p.melodicTracks.map(t =>
                  t.id !== trackId ? t : { ...t, muted: !t.muted }
                ),
              }),
            }
          ),
        })),

      soloTrack: (trackId, type) =>
        set((state) => ({
          patterns: state.patterns.map(p =>
            p.id !== state.activePatternId ? p : {
              ...p,
              ...(type === 'drum' ? {
                drumTracks: p.drumTracks.map(t =>
                  t.id !== trackId ? t : { ...t, solo: !t.solo }
                ),
              } : {
                melodicTracks: p.melodicTracks.map(t =>
                  t.id !== trackId ? t : { ...t, solo: !t.solo }
                ),
              }),
            }
          ),
        })),

      setTrackVolume: (trackId, type, volume) => history.coalesced(`volume:${trackId}`, () =>
        set((state) => ({
          patterns: state.patterns.map(p =>
            p.id !== state.activePatternId ? p : {
              ...p,
              ...(type === 'drum' ? {
                drumTracks: p.drumTracks.map(t =>
                  t.id !== trackId ? t : { ...t, volume }
                ),
              } : {
                melodicTracks: p.melodicTracks.map(t =>
                  t.id !== trackId ? t : { ...t, volume }
                ),
              }),
            }
          ),
        }))),

      setTrackSends: (trackId, type, reverbSend, delaySend) => history.coalesced(`sends:${trackId}`, () =>
        set((state) => ({
          patterns: state.patterns.map(p =>
            p.id !== state.activePatternId ? p : {
              ...p,
              ...(type === 'drum' ? {
                drumTracks: p.drumTracks.map(t =>
                  t.id !== trackId ? t : { ...t, reverbSend, delaySend }
                ),
              } : {
                melodicTracks: p.melodicTracks.map(t =>
                  t.id !== trackId ? t : { ...t, reverbSend, delaySend }
                ),
              }),
            }
          ),
        }))),

      applyDrumKit: (kitId) =>
        set((state) => {
          const kit = getDrumKit(kitId);
          if (!kit) return state;
          return {
            patterns: state.patterns.map(p =>
              p.id !== state.activePatternId ? p : {
                ...p,
                kitId: kit.id,
                drumTracks: p.drumTracks.map(t => {
                  const params = kit.params[t.sampleKey] ?? DEFAULT_DRUM_PARAMS[t.sampleKey] ?? t.synthParams;
                  const sends = kit.sends?.[t.sampleKey];
                  return {
                    ...t,
                    synthParams: { ...params } as DrumSynthParams,
                    reverbSend: sends?.reverb ?? 0,
                    delaySend: sends?.delay ?? 0,
                  };
                }),
              }
            ),
          };
        }),

      applySynthPreset: (trackId, presetId) =>
        set((state) => {
          const preset = getSynthPreset(presetId);
          if (!preset) return state;
          return {
            patterns: state.patterns.map(p =>
              p.id !== state.activePatternId ? p : {
                ...p,
                melodicTracks: p.melodicTracks.map(t => {
                  if (t.id !== trackId) return t;
                  const octave = preset.octave ?? t.octave;
                  // Move existing notes by the octave change, keeping their shape
                  const shift = (octave - t.octave) * 12;
                  return {
                    ...t,
                    synthType: preset.synthType,
                    synthParams: { ...preset.params },
                    reverbSend: preset.reverbSend ?? 0,
                    delaySend: preset.delaySend ?? 0,
                    octave,
                    steps: shift === 0 ? t.steps : t.steps.map(s => transposeStep(s, shift)),
                  };
                }),
              }
            ),
          };
        }),

      setActivePattern: (id) => _set({ activePatternId: id }),

      clearActivePattern: () =>
        set((state) => ({
          patterns: state.patterns.map(p =>
            p.id !== state.activePatternId ? p : {
              ...p,
              drumTracks: p.drumTracks.map(t => ({
                ...t,
                steps: new Array(p.numSteps).fill(0),
              })),
              melodicTracks: p.melodicTracks.map(t => ({
                ...t,
                steps: t.steps.map(() => ({ active: false, note: null, velocity: 0.8 })),
              })),
            }
          ),
        })),

      clearAllPatterns: () =>
        set(() => ({
          patterns: [
            createDefaultPattern('pattern-a', 'A'),
            createDefaultPattern('pattern-b', 'B'),
            createDefaultPattern('pattern-c', 'C'),
            createDefaultPattern('pattern-d', 'D'),
          ],
          activePatternId: 'pattern-a',
        })),

      addDrumTrack: (sampleKey, name, color) =>
        set((state) => ({
          patterns: state.patterns.map(p => {
            if (p.id !== state.activePatternId) return p;
            const track = createEmptyDrumTrack(sampleKey, name, color, p.numSteps);
            // New drums follow the pattern's current kit
            const kit = p.kitId ? getDrumKit(p.kitId) : undefined;
            if (kit && kit.id !== 'classic') {
              const params = kit.params[sampleKey];
              const sends = kit.sends?.[sampleKey];
              if (params) track.synthParams = { ...params } as DrumSynthParams;
              track.reverbSend = sends?.reverb ?? 0;
              track.delaySend = sends?.delay ?? 0;
            }
            return { ...p, drumTracks: [...p.drumTracks, track] };
          }),
        })),

      removeDrumTrack: (trackId) =>
        set((state) => ({
          patterns: state.patterns.map(p =>
            p.id !== state.activePatternId ? p : {
              ...p,
              drumTracks: p.drumTracks.filter(t => t.id !== trackId),
            }
          ),
        })),

      addMelodicTrack: (synthType = 'synth', name) =>
        set((state) => {
          const active = state.patterns.find(p => p.id === state.activePatternId);
          if (!active) return state;
          const count = active.melodicTracks.length + 1;
          const trackName = name ?? `Synth ${count}`;
          return {
            patterns: state.patterns.map(p =>
              p.id !== state.activePatternId ? p : {
                ...p,
                melodicTracks: [...p.melodicTracks, createEmptyMelodicTrack(trackName, p.numSteps, synthType)],
              }
            ),
          };
        }),

      removeMelodicTrack: (trackId) =>
        set((state) => ({
          patterns: state.patterns.map(p =>
            p.id !== state.activePatternId ? p : {
              ...p,
              melodicTracks: p.melodicTracks.filter(t => t.id !== trackId),
            }
          ),
        })),

      renameTrack: (trackId, type, newName) =>
        set((state) => ({
          patterns: state.patterns.map(p =>
            p.id !== state.activePatternId ? p : {
              ...p,
              ...(type === 'drum' ? {
                drumTracks: p.drumTracks.map(t =>
                  t.id !== trackId ? t : { ...t, name: newName }
                ),
              } : {
                melodicTracks: p.melodicTracks.map(t =>
                  t.id !== trackId ? t : { ...t, name: newName }
                ),
              }),
            }
          ),
        })),

      updateDrumSynthParams: (trackId, params) => history.coalesced(`drum:${trackId}:${Object.keys(params).join(',')}`, () =>
        set((state) => ({
          patterns: state.patterns.map(p =>
            p.id !== state.activePatternId ? p : {
              ...p,
              drumTracks: p.drumTracks.map(t =>
                t.id !== trackId ? t : {
                  ...t,
                  synthParams: { ...t.synthParams, ...params } as DrumSynthParams,
                }
              ),
            }
          ),
        }))),

      updateMelodicSynthParams: (trackId, params) => history.coalesced(`synth:${trackId}:${Object.keys(params).join(',')}`, () =>
        set((state) => ({
          patterns: state.patterns.map(p =>
            p.id !== state.activePatternId ? p : {
              ...p,
              melodicTracks: p.melodicTracks.map(t =>
                t.id !== trackId ? t : {
                  ...t,
                  synthParams: { ...t.synthParams, ...params },
                }
              ),
            }
          ),
        }))),

      setMelodicSynthType: (trackId, synthType) =>
        set((state) => ({
          patterns: state.patterns.map(p =>
            p.id !== state.activePatternId ? p : {
              ...p,
              melodicTracks: p.melodicTracks.map(t =>
                t.id !== trackId ? t : { ...t, synthType }
              ),
            }
          ),
        })),

      setMelodicSteps: (trackId, steps) =>
        set((state) => ({
          patterns: state.patterns.map(p =>
            p.id !== state.activePatternId ? p : {
              ...p,
              melodicTracks: p.melodicTracks.map(t =>
                t.id !== trackId ? t : {
                  ...t,
                  steps: Array.from({ length: p.numSteps }, (_, i) => steps[i] ?? { active: false, note: null, velocity: 0.8 }),
                }
              ),
            }
          ),
        })),

      setDrumSteps: (trackId, steps) =>
        set((state) => ({
          patterns: state.patterns.map(p =>
            p.id !== state.activePatternId ? p : {
              ...p,
              drumTracks: p.drumTracks.map(t =>
                t.id !== trackId ? t : { ...t, steps }
              ),
            }
          ),
        })),

      setMelodicOctave: (trackId, octave) =>
        set((state) => ({
          patterns: state.patterns.map(p =>
            p.id !== state.activePatternId ? p : {
              ...p,
              melodicTracks: p.melodicTracks.map(t =>
                t.id !== trackId ? t : {
                  ...t,
                  octave,
                  // Move notes by the octave change, keeping melodies and chords intact
                  steps: t.steps.map(s => transposeStep(s, (octave - t.octave) * 12)),
                }
              ),
            }
          ),
        })),

      setTimeSignature: (ts) =>
        set((state) => {
          const active = state.patterns.find(p => p.id === state.activePatternId);
          if (!active) return state;
          // Preserve the current measure count when switching time signatures
          const oldStepsPerMeasure = getStepsPerMeasure(active.timeSignature, active.stepResolution);
          const currentMeasures = Math.round(active.numSteps / oldStepsPerMeasure);
          const newStepsPerMeasure = getStepsPerMeasure(ts, active.stepResolution);
          const newNumSteps = newStepsPerMeasure * currentMeasures;
          return {
            patterns: state.patterns.map(p =>
              p.id !== state.activePatternId ? p : {
                ...p,
                timeSignature: ts,
                numSteps: newNumSteps,
                drumTracks: p.drumTracks.map(t => ({
                  ...t,
                  steps: t.steps.length < newNumSteps
                    ? [...t.steps, ...new Array(newNumSteps - t.steps.length).fill(0)]
                    : t.steps.slice(0, newNumSteps),
                })),
                melodicTracks: p.melodicTracks.map(t => ({
                  ...t,
                  steps: t.steps.length < newNumSteps
                    ? [...t.steps, ...Array.from({ length: newNumSteps - t.steps.length }, () => ({
                        active: false, note: null, velocity: 0.8,
                      }))]
                    : t.steps.slice(0, newNumSteps),
                })),
              }
            ),
          };
        }),

      setStepResolution: (resolution) =>
        set((state) => {
          const active = state.patterns.find(p => p.id === state.activePatternId);
          if (!active || active.stepResolution === resolution) return state;
          const oldSpm = getStepsPerMeasure(active.timeSignature, active.stepResolution);
          const newSpm = getStepsPerMeasure(active.timeSignature, resolution);
          const currentMeasures = Math.round(active.numSteps / oldSpm);
          const newNumSteps = newSpm * currentMeasures;
          const doubling = resolution === '32n'; // 16n→32n doubles, 32n→16n halves
          return {
            patterns: state.patterns.map(p =>
              p.id !== state.activePatternId ? p : {
                ...p,
                stepResolution: resolution,
                numSteps: newNumSteps,
                drumTracks: p.drumTracks.map(t => ({
                  ...t,
                  steps: doubling
                    ? t.steps.flatMap(s => [s, 0 as StepValue])
                    : t.steps.filter((_, i) => i % 2 === 0),
                })),
                melodicTracks: p.melodicTracks.map(t => ({
                  ...t,
                  steps: doubling
                    ? t.steps.flatMap(s => [s, emptyMelodicStep()])
                    : t.steps.filter((_, i) => i % 2 === 0),
                })),
              }
            ),
          };
        }),

      setMeasures: (measures) =>
        set((state) => {
          const active = state.patterns.find(p => p.id === state.activePatternId);
          if (!active) return state;
          const stepsPerMeasure = getStepsPerMeasure(active.timeSignature, active.stepResolution);
          const newNumSteps = stepsPerMeasure * measures;
          return {
            patterns: state.patterns.map(p =>
              p.id !== state.activePatternId ? p : {
                ...p,
                numSteps: newNumSteps,
                drumTracks: p.drumTracks.map(t => ({
                  ...t,
                  steps: t.steps.length < newNumSteps
                    ? [...t.steps, ...new Array(newNumSteps - t.steps.length).fill(0)]
                    : t.steps.slice(0, newNumSteps),
                })),
                melodicTracks: p.melodicTracks.map(t => ({
                  ...t,
                  steps: t.steps.length < newNumSteps
                    ? [...t.steps, ...Array.from({ length: newNumSteps - t.steps.length }, () => ({
                        active: false, note: null, velocity: 0.8,
                      }))]
                    : t.steps.slice(0, newNumSteps),
                })),
              }
            ),
          };
        }),

      fillDrumTrack: (trackId) =>
        set((state) => {
          const pattern = state.patterns.find(p => p.id === state.activePatternId);
          if (!pattern) return state;
          const stepsPerMeasure = getStepsPerMeasure(pattern.timeSignature, pattern.stepResolution);
          return {
            patterns: state.patterns.map(p =>
              p.id !== state.activePatternId ? p : {
                ...p,
                drumTracks: p.drumTracks.map(t => {
                  if (t.id !== trackId) return t;
                  const measures = Math.ceil(t.steps.length / stepsPerMeasure);
                  // Find first non-blank measure
                  let sourceBar = -1;
                  for (let m = 0; m < measures; m++) {
                    const start = m * stepsPerMeasure;
                    const end = Math.min(start + stepsPerMeasure, t.steps.length);
                    if (t.steps.slice(start, end).some(s => s > 0)) {
                      sourceBar = m;
                      break;
                    }
                  }
                  if (sourceBar === -1) return t;
                  const srcStart = sourceBar * stepsPerMeasure;
                  const srcSteps = t.steps.slice(srcStart, srcStart + stepsPerMeasure);
                  const newSteps = [...t.steps];
                  for (let m = 0; m < measures; m++) {
                    if (m === sourceBar) continue;
                    const barStart = m * stepsPerMeasure;
                    const barEnd = Math.min(barStart + stepsPerMeasure, t.steps.length);
                    const isBlank = t.steps.slice(barStart, barEnd).every(s => s === 0);
                    if (isBlank) {
                      for (let i = 0; i < stepsPerMeasure && barStart + i < newSteps.length; i++) {
                        newSteps[barStart + i] = srcSteps[i] ?? 0;
                      }
                    }
                  }
                  return { ...t, steps: newSteps as StepValue[] };
                }),
              }
            ),
          };
        }),

      fillMelodicTrack: (trackId) =>
        set((state) => {
          const pattern = state.patterns.find(p => p.id === state.activePatternId);
          if (!pattern) return state;
          const stepsPerMeasure = getStepsPerMeasure(pattern.timeSignature, pattern.stepResolution);
          return {
            patterns: state.patterns.map(p =>
              p.id !== state.activePatternId ? p : {
                ...p,
                melodicTracks: p.melodicTracks.map(t => {
                  if (t.id !== trackId) return t;
                  const measures = Math.ceil(t.steps.length / stepsPerMeasure);
                  let sourceBar = -1;
                  for (let m = 0; m < measures; m++) {
                    const start = m * stepsPerMeasure;
                    const end = Math.min(start + stepsPerMeasure, t.steps.length);
                    if (t.steps.slice(start, end).some(s => s.active)) {
                      sourceBar = m;
                      break;
                    }
                  }
                  if (sourceBar === -1) return t;
                  const srcStart = sourceBar * stepsPerMeasure;
                  const srcSteps = t.steps.slice(srcStart, srcStart + stepsPerMeasure);
                  const newSteps = [...t.steps];
                  for (let m = 0; m < measures; m++) {
                    if (m === sourceBar) continue;
                    const barStart = m * stepsPerMeasure;
                    const barEnd = Math.min(barStart + stepsPerMeasure, t.steps.length);
                    const isBlank = t.steps.slice(barStart, barEnd).every(s => !s.active);
                    if (isBlank) {
                      for (let i = 0; i < stepsPerMeasure && barStart + i < newSteps.length; i++) {
                        newSteps[barStart + i] = srcSteps[i] ? { ...srcSteps[i] } : { active: false, note: null, velocity: 0.8 };
                      }
                    }
                  }
                  return { ...t, steps: newSteps };
                }),
              }
            ),
          };
        }),

      fillAllDrums: () =>
        set((state) => {
          const pattern = state.patterns.find(p => p.id === state.activePatternId);
          if (!pattern) return state;
          const stepsPerMeasure = getStepsPerMeasure(pattern.timeSignature, pattern.stepResolution);
          return {
            patterns: state.patterns.map(p =>
              p.id !== state.activePatternId ? p : {
                ...p,
                drumTracks: p.drumTracks.map(t => {
                  const measures = Math.ceil(t.steps.length / stepsPerMeasure);
                  let sourceBar = -1;
                  for (let m = 0; m < measures; m++) {
                    const start = m * stepsPerMeasure;
                    const end = Math.min(start + stepsPerMeasure, t.steps.length);
                    if (t.steps.slice(start, end).some(s => s > 0)) {
                      sourceBar = m;
                      break;
                    }
                  }
                  if (sourceBar === -1) return t;
                  const srcStart = sourceBar * stepsPerMeasure;
                  const srcSteps = t.steps.slice(srcStart, srcStart + stepsPerMeasure);
                  const newSteps = [...t.steps];
                  for (let m = 0; m < measures; m++) {
                    if (m === sourceBar) continue;
                    const barStart = m * stepsPerMeasure;
                    const barEnd = Math.min(barStart + stepsPerMeasure, t.steps.length);
                    const isBlank = t.steps.slice(barStart, barEnd).every(s => s === 0);
                    if (isBlank) {
                      for (let i = 0; i < stepsPerMeasure && barStart + i < newSteps.length; i++) {
                        newSteps[barStart + i] = srcSteps[i] ?? 0;
                      }
                    }
                  }
                  return { ...t, steps: newSteps as StepValue[] };
                }),
              }
            ),
          };
        }),

      fillAllSynths: () =>
        set((state) => {
          const pattern = state.patterns.find(p => p.id === state.activePatternId);
          if (!pattern) return state;
          const stepsPerMeasure = getStepsPerMeasure(pattern.timeSignature, pattern.stepResolution);
          return {
            patterns: state.patterns.map(p =>
              p.id !== state.activePatternId ? p : {
                ...p,
                melodicTracks: p.melodicTracks.map(t => {
                  const measures = Math.ceil(t.steps.length / stepsPerMeasure);
                  let sourceBar = -1;
                  for (let m = 0; m < measures; m++) {
                    const start = m * stepsPerMeasure;
                    const end = Math.min(start + stepsPerMeasure, t.steps.length);
                    if (t.steps.slice(start, end).some(s => s.active)) {
                      sourceBar = m;
                      break;
                    }
                  }
                  if (sourceBar === -1) return t;
                  const srcStart = sourceBar * stepsPerMeasure;
                  const srcSteps = t.steps.slice(srcStart, srcStart + stepsPerMeasure);
                  const newSteps = [...t.steps];
                  for (let m = 0; m < measures; m++) {
                    if (m === sourceBar) continue;
                    const barStart = m * stepsPerMeasure;
                    const barEnd = Math.min(barStart + stepsPerMeasure, t.steps.length);
                    const isBlank = t.steps.slice(barStart, barEnd).every(s => !s.active);
                    if (isBlank) {
                      for (let i = 0; i < stepsPerMeasure && barStart + i < newSteps.length; i++) {
                        newSteps[barStart + i] = srcSteps[i] ? { ...srcSteps[i] } : { active: false, note: null, velocity: 0.8 };
                      }
                    }
                  }
                  return { ...t, steps: newSteps };
                }),
              }
            ),
          };
        }),

      loadPatterns: (patterns, activePatternId) =>
        set({ patterns, activePatternId }),

      copyPatternTo: (targetPatternId) =>
        set((state) => {
          const source = state.patterns.find(p => p.id === state.activePatternId);
          if (!source || source.id === targetPatternId) return state;
          return {
            patterns: state.patterns.map(p =>
              p.id !== targetPatternId ? p : {
                ...structuredClone(source),
                id: p.id,
                name: p.name,
              }
            ),
          };
        }),

      copyActivePattern: () => {
        const source = get().patterns.find(p => p.id === get().activePatternId);
        if (!source) return;
        _clipboard = structuredClone(source);
        _set({ hasClipboard: true });
      },

      pasteToActivePattern: () =>
        set((state) => {
          if (!_clipboard) return state;
          const clip = _clipboard;
          return {
            patterns: state.patterns.map(p =>
              p.id !== state.activePatternId ? p : {
                ...structuredClone(clip),
                id: p.id,
                name: p.name,
              }
            ),
          };
        }),

      shiftPattern: (steps) =>
        set((state) => ({
          patterns: state.patterns.map(p =>
            p.id !== state.activePatternId ? p : {
              ...p,
              drumTracks: p.drumTracks.map(t => ({ ...t, steps: rotate(t.steps, steps) })),
              melodicTracks: p.melodicTracks.map(t => ({ ...t, steps: rotate(t.steps, steps) })),
            }
          ),
        })),

      humanizePattern: (amount = 0.18) =>
        set((state) => ({
          patterns: state.patterns.map(p =>
            p.id !== state.activePatternId ? p : {
              ...p,
              drumTracks: p.drumTracks.map(t => ({
                ...t,
                steps: t.steps.map((s, i) => {
                  if (s <= 0) return s;
                  // Keep downbeats strong, soften the rest a little at random
                  const onBeat = i % 4 === 0;
                  const jitter = (Math.random() - 0.5) * 2 * amount;
                  const base = onBeat ? Math.max(s, 0.9) : s;
                  return Math.max(0.2, Math.min(1, +(base + jitter * (onBeat ? 0.3 : 1)).toFixed(2)));
                }),
              })),
              melodicTracks: p.melodicTracks.map(t => ({
                ...t,
                steps: t.steps.map(s => {
                  if (!s.active) return s;
                  return stepFromNotes(s, stepNotes(s).map(n => {
                    const jitter = (Math.random() - 0.5) * 2 * amount;
                    return { ...n, velocity: Math.max(0.25, Math.min(1, +(n.velocity + jitter).toFixed(2))) };
                  }));
                }),
              })),
            }
          ),
        })),

      undo: () => { if (history.undo()) announce('Undone'); },

      redo: () => { if (history.redo()) announce('Redone'); },
    };
    },
    {
      name: 'groove-theory-sequencer',
      version: 6,
      // Exclude undoDepth from persistence (it's ephemeral)
      partialize: (state) => ({
        patterns: state.patterns,
        activePatternId: state.activePatternId,
      }),
      migrate: (persistedState: unknown, version: number) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const state = persistedState as any;
        if (version < 2) {
          const patterns = state.patterns as Pattern[];
          state.patterns = patterns.map(p => ({
            ...p,
            drumTracks: p.drumTracks.map((t: any) => ({
              ...t,
              synthParams: t.synthParams ??
                (DEFAULT_DRUM_PARAMS[t.sampleKey] || DEFAULT_DRUM_PARAMS['kick']),
            })),
            melodicTracks: p.melodicTracks.map((t: any) => ({
              ...t,
              synthParams: t.synthParams ?? { ...DEFAULT_MELODIC_PARAMS },
            })),
          }));
        }
        if (version < 3) {
          // Expand patterns from 16 to 32 steps
          const patterns = state.patterns as Pattern[];
          state.patterns = patterns.map((p: any) => ({
            ...p,
            numSteps: 32,
            drumTracks: p.drumTracks.map((t: any) => ({
              ...t,
              steps: t.steps.length < 32
                ? [...t.steps, ...new Array(32 - t.steps.length).fill(0)]
                : t.steps,
            })),
            melodicTracks: p.melodicTracks.map((t: any) => ({
              ...t,
              steps: t.steps.length < 32
                ? [...t.steps, ...Array.from({ length: 32 - t.steps.length }, () => ({
                    active: false, note: null, velocity: 0.8,
                  }))]
                : t.steps,
            })),
          }));
        }
        if (version < 4) {
          // Add timeSignature to all patterns
          state.patterns = (state.patterns as any[]).map((p: any) => ({
            ...p,
            timeSignature: p.timeSignature ?? '4/4',
          }));
        }
        if (version < 5) {
          // Add Bass and Melody 2 tracks; rename "Synth 1" → "Melody 1"
          state.patterns = (state.patterns as any[]).map((p: any) => {
            const existing = p.melodicTracks || [];
            const numSteps = p.numSteps || 32;
            const emptySteps = () => Array.from({ length: numSteps }, () => ({
              active: false, note: null, velocity: 0.8,
            }));
            const defaultParams = { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.4, oscillatorType: 'triangle' };

            const hasBass = existing.some((t: any) => t.synthType === 'monoSynth');
            const needsMelody2 = existing.length < (hasBass ? 3 : 2);

            const toAdd: any[] = [];
            if (!hasBass) {
              toAdd.push({
                id: `bass_${p.id}_${Date.now().toString(36)}`,
                name: 'Bass', synthType: 'monoSynth', steps: emptySteps(),
                muted: false, solo: false, volume: -6, octave: 3,
                synthParams: { ...defaultParams },
              });
            }
            if (needsMelody2) {
              toAdd.push({
                id: `mel2_${p.id}_${Date.now().toString(36)}`,
                name: 'Melody 2', synthType: 'fmSynth', steps: emptySteps(),
                muted: false, solo: false, volume: -6, octave: 4,
                synthParams: { ...defaultParams },
              });
            }

            // Bass first, then existing tracks, then Melody 2
            const bassTrack = toAdd.find((t: any) => t.name === 'Bass');
            const mel2Track = toAdd.find((t: any) => t.name === 'Melody 2');
            const newMelodicTracks = [
              ...(bassTrack ? [bassTrack] : []),
              ...existing,
              ...(mel2Track ? [mel2Track] : []),
            ];

            return {
              ...p,
              melodicTracks: newMelodicTracks.map((t: any) =>
                t.name === 'Synth 1' ? { ...t, name: 'Melody 1' } : t
              ),
            };
          });
        }
        if (version < 6) {
          // Add stepResolution to all patterns
          state.patterns = (state.patterns as any[]).map((p: any) => ({
            ...p,
            stepResolution: p.stepResolution ?? '16n',
          }));
        }
        return state;
      },
    }
  )
);

// --- Initialize undo tracking after hydration completes ---
// Use zustand persist's public API (more reliable than onRehydrateStorage)
useSequencerStore.persist.onFinishHydration(() => {
  _initialized = true;
});
if (useSequencerStore.persist.hasHydrated()) {
  _initialized = true;
}
