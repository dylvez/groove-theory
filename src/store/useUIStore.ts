import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  /** Single-character shortcuts (1–4, [ ], R, and the piano's letter keys). Can be turned off in Help. */
  singleKeyShortcuts: boolean;
  setSingleKeyShortcuts: (on: boolean) => void;
  /** Scroll the grid to keep the playing step in view */
  followPlayhead: boolean;
  setFollowPlayhead: (on: boolean) => void;
  /** Help guide open (lifted here so the welcome bar can open it) */
  helpOpen: boolean;
  setHelpOpen: (open: boolean) => void;
  setStudioTab: (tab: StudioTab) => void;
  setTrackHeaderWidth: (w: number) => void;
  setArmedTrack: (id: string | null) => void;
  toggleRecording: () => void;
  setRecording: (on: boolean) => void;
  setLiveOctave: (o: number) => void;
}

export const DEFAULT_HEADER_WIDTH = 240;
const MIN_HEADER_WIDTH = 120;
const MAX_HEADER_WIDTH = 300;

export const useUIStore = create<UIStore>()(persist((set) => ({
  studioTab: 'beats',
  trackHeaderWidth: DEFAULT_HEADER_WIDTH,
  armedTrackId: null,
  recording: false,
  liveOctave: 4,
  singleKeyShortcuts: true,
  setSingleKeyShortcuts: (on) => set({ singleKeyShortcuts: on }),
  followPlayhead: true,
  setFollowPlayhead: (on) => set({ followPlayhead: on }),
  helpOpen: false,
  setHelpOpen: (open) => set({ helpOpen: open }),
  setStudioTab: (tab) => set({ studioTab: tab }),
  setTrackHeaderWidth: (w) => set({ trackHeaderWidth: Math.max(MIN_HEADER_WIDTH, Math.min(MAX_HEADER_WIDTH, w)) }),
  setArmedTrack: (id) => set((s) => ({ armedTrackId: id, recording: id === null ? false : s.recording })),
  toggleRecording: () => set((s) => ({ recording: !s.recording })),
  setRecording: (on) => set({ recording: on }),
  setLiveOctave: (o) => set({ liveOctave: Math.max(1, Math.min(7, o)) }),
}), {
  name: 'groove-theory-ui',
  version: 2,
  // v2: the default name column grew from 216 to 240 px for the piano-roll toggle
  migrate: (persisted, version) => {
    const s = (persisted ?? {}) as Partial<UIStore>;
    if (version < 2 && s.trackHeaderWidth === 216) s.trackHeaderWidth = DEFAULT_HEADER_WIDTH;
    return s as UIStore;
  },
  // Only preferences — not transient state like the armed track
  partialize: (s) => ({
    singleKeyShortcuts: s.singleKeyShortcuts,
    trackHeaderWidth: s.trackHeaderWidth,
    studioTab: s.studioTab,
    followPlayhead: s.followPlayhead,
  }),
}));
