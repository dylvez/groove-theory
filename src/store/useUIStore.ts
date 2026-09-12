import { create } from 'zustand';

export type StudioTab = 'harmony' | 'beats';

interface UIStore {
  studioTab: StudioTab;
  trackHeaderWidth: number;
  /** Melodic track that receives live keyboard input (null = theory piano preview) */
  armedTrackId: string | null;
  /** When true and the sequencer is playing, live keys are written into the armed track */
  recording: boolean;
  /** Octave offset for live keyboard playing */
  liveOctave: number;
  setStudioTab: (tab: StudioTab) => void;
  setTrackHeaderWidth: (w: number) => void;
  setArmedTrack: (id: string | null) => void;
  toggleRecording: () => void;
  setRecording: (on: boolean) => void;
  setLiveOctave: (o: number) => void;
}

const MIN_HEADER_WIDTH = 120;
const MAX_HEADER_WIDTH = 300;

export const useUIStore = create<UIStore>((set) => ({
  studioTab: 'beats',
  trackHeaderWidth: 216,
  armedTrackId: null,
  recording: false,
  liveOctave: 4,
  setStudioTab: (tab) => set({ studioTab: tab }),
  setTrackHeaderWidth: (w) => set({ trackHeaderWidth: Math.max(MIN_HEADER_WIDTH, Math.min(MAX_HEADER_WIDTH, w)) }),
  setArmedTrack: (id) => set((s) => ({ armedTrackId: id, recording: id === null ? false : s.recording })),
  toggleRecording: () => set((s) => ({ recording: !s.recording })),
  setRecording: (on) => set({ recording: on }),
  setLiveOctave: (o) => set({ liveOctave: Math.max(1, Math.min(7, o)) }),
}));
