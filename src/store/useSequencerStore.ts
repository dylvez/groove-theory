import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Pattern, StepValue, NoteWithOctave, DrumSynthParams, MelodicSynthParams, SynthType, TimeSignature } from '../types';
import { DEFAULT_DRUM_PARAMS, DEFAULT_MELODIC_PARAMS } from '../constants';
import { createDefaultPattern, createEmptyDrumTrack, createEmptyMelodicTrack } from '../utils/patternHelpers';

// --- Undo stack (module-level, not persisted) ---
const _undoStack: Pattern[][] = [];
let _isUndoing = false;
let _initialized = false;
const MAX_UNDO = 50;

interface SequencerStore {
  patterns: Pattern[];
  activePatternId: string;
  /** Reactive counter so UI can subscribe to undo availability */
  undoDepth: number;

  getActivePattern: () => Pattern;
  toggleDrumStep: (trackId: string, stepIndex: number) => void;
  setMelodicStep: (trackId: string, stepIndex: number, note: NoteWithOctave | null) => void;
  toggleMelodicStep: (trackId: string, stepIndex: number) => void;
  muteTrack: (trackId: string, type: 'drum' | 'melodic') => void;
  soloTrack: (trackId: string, type: 'drum' | 'melodic') => void;
  setTrackVolume: (trackId: string, type: 'drum' | 'melodic', volume: number) => void;
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
  setMelodicOctave: (trackId: string, octave: number) => void;
  setTimeSignature: (ts: TimeSignature) => void;
  setMeasures: (measures: 2 | 4) => void;
  loadPatterns: (patterns: Pattern[], activePatternId: string) => void;
  fillDrumTrack: (trackId: string) => void;
  fillMelodicTrack: (trackId: string) => void;
  fillAllDrums: () => void;
  fillAllSynths: () => void;
  undo: () => void;
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
        const curPatterns = get().patterns;
        if (curPatterns !== prevPatterns && _initialized && !_isUndoing) {
          _undoStack.push(structuredClone(prevPatterns));
          if (_undoStack.length > MAX_UNDO) _undoStack.shift();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          _set({ undoDepth: _undoStack.length } as any);
        }
      };

      return {
      patterns: defaultPatterns,
      activePatternId: 'pattern-a',
      undoDepth: 0,

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
                    i === stepIndex ? ((s === 0 ? 1 : 0) as StepValue) : s
                  ),
                }
              ),
            }
          ),
        })),

      setMelodicStep: (trackId, stepIndex, note) =>
        set((state) => ({
          patterns: state.patterns.map(p =>
            p.id !== state.activePatternId ? p : {
              ...p,
              melodicTracks: p.melodicTracks.map(t =>
                t.id !== trackId ? t : {
                  ...t,
                  steps: t.steps.map((s, i) =>
                    i === stepIndex ? { ...s, active: note !== null, note } : s
                  ),
                }
              ),
            }
          ),
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

      setTrackVolume: (trackId, type, volume) =>
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
        })),

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
          patterns: state.patterns.map(p =>
            p.id !== state.activePatternId ? p : {
              ...p,
              drumTracks: [...p.drumTracks, createEmptyDrumTrack(sampleKey, name, color, p.numSteps)],
            }
          ),
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

      updateDrumSynthParams: (trackId, params) =>
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
        })),

      updateMelodicSynthParams: (trackId, params) =>
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
        })),

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
                  steps: t.steps.map(s => {
                    if (!s.active || !s.note) return s;
                    const noteName = s.note.replace(/\d+$/, '');
                    return { ...s, note: `${noteName}${octave}` as NoteWithOctave };
                  }),
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
          const oldStepsPerMeasure = active.timeSignature === '3/4' ? 12 : 16;
          const currentMeasures = Math.round(active.numSteps / oldStepsPerMeasure);
          const newStepsPerMeasure = ts === '3/4' ? 12 : 16;
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

      setMeasures: (measures) =>
        set((state) => {
          const active = state.patterns.find(p => p.id === state.activePatternId);
          if (!active) return state;
          const stepsPerMeasure = active.timeSignature === '3/4' ? 12 : 16;
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
          const stepsPerMeasure = pattern.timeSignature === '3/4' ? 12 : 16;
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
                    if (t.steps.slice(start, end).some(s => s === 1)) {
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
          const stepsPerMeasure = pattern.timeSignature === '3/4' ? 12 : 16;
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
          const stepsPerMeasure = pattern.timeSignature === '3/4' ? 12 : 16;
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
                    if (t.steps.slice(start, end).some(s => s === 1)) {
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
          const stepsPerMeasure = pattern.timeSignature === '3/4' ? 12 : 16;
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

      undo: () => {
        if (_undoStack.length === 0) return;
        _isUndoing = true;
        const prev = _undoStack.pop()!;
        set({ patterns: prev, undoDepth: _undoStack.length });
        _isUndoing = false;
      },
    };
    },
    {
      name: 'groove-theory-sequencer',
      version: 5,
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
