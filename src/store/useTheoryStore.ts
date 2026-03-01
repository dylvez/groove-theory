import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { NoteName, ScaleDefinition, ChordDefinition, ProgressionSlot } from '../types';
import { SCALES, CHORDS, BEATS } from '../constants';
import type { BeatDefinition } from '../constants';

interface TheoryStore {
  rootNote: NoteName;
  selectedScale: ScaleDefinition;
  selectedChord: ChordDefinition;
  chordRoot: NoteName;
  chordInversion: number;
  progression: ProgressionSlot[];
  selectedBeat: BeatDefinition;
  highlightMode: 'scale' | 'chord' | 'none';
  selectedDegreeIndex: number | null;

  setSelectedBeat: (beat: BeatDefinition) => void;
  setRootNote: (note: NoteName) => void;
  setSelectedScale: (scale: ScaleDefinition) => void;
  setSelectedChord: (chord: ChordDefinition) => void;
  setChordRoot: (note: NoteName) => void;
  setChordInversion: (inv: number) => void;
  setHighlightMode: (mode: 'scale' | 'chord' | 'none') => void;
  setSelectedDegreeIndex: (index: number | null) => void;
  addProgressionSlot: (slot: ProgressionSlot) => void;
  removeProgressionSlot: (id: string) => void;
  clearProgression: () => void;
  setProgression: (slots: ProgressionSlot[]) => void;
  loadTheoryState: (state: {
    rootNote: NoteName;
    selectedScale: ScaleDefinition;
    selectedChord: ChordDefinition;
    chordRoot: NoteName;
    chordInversion: number;
    progression: ProgressionSlot[];
  }) => void;
}

export const useTheoryStore = create<TheoryStore>()(
  persist(
    (set) => ({
      rootNote: 'C',
      selectedScale: SCALES[0], // Major
      selectedChord: CHORDS[0], // Major triad
      chordRoot: 'C',
      chordInversion: 0,
      selectedBeat: BEATS[0],
      progression: [],
      highlightMode: 'scale',
      selectedDegreeIndex: null,

      setSelectedBeat: (beat) => set({ selectedBeat: beat }),
      setRootNote: (note) => set({ rootNote: note, chordRoot: note, selectedDegreeIndex: null }),
      setSelectedScale: (scale) => set({ selectedScale: scale, selectedDegreeIndex: null }),
      setSelectedChord: (chord) => set({ selectedChord: chord }),
      setChordRoot: (note) => set({ chordRoot: note }),
      setChordInversion: (inv) => set({ chordInversion: inv }),
      setHighlightMode: (mode) => set({ highlightMode: mode }),
      setSelectedDegreeIndex: (index) => set({ selectedDegreeIndex: index }),
      addProgressionSlot: (slot) => set((s) => ({ progression: [...s.progression, slot] })),
      removeProgressionSlot: (id) => set((s) => ({ progression: s.progression.filter(p => p.id !== id) })),
      clearProgression: () => set({ progression: [] }),
      setProgression: (slots) => set({ progression: slots }),
      loadTheoryState: ({ rootNote, selectedScale, selectedChord, chordRoot, chordInversion, progression }) =>
        set({ rootNote, selectedScale, selectedChord, chordRoot, chordInversion, progression, selectedDegreeIndex: null }),
    }),
    {
      name: 'groove-theory-theory',
    }
  )
);
