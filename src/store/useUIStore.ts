import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MidiFileData } from '../utils/midiImport';

export type StudioTab = 'harmony' | 'beats';
/** What the Play button (and Space) plays */
export type PlayMode = 'pattern' | 'song';

interface UIStore {
  studioTab: StudioTab;
  playMode: PlayMode;
  setPlayMode: (mode: PlayMode) => void;
  trackHeaderWidth: number;
  /** Melodic track that receives live keyboard input (null = theory piano preview) */
  armedTrackId: string | null;
  /** When true and the sequencer is playing, live keys are written into the armed track */
  recording: boolean;
  /** Octave offset for live keyboard playing */
  liveOctave: number;
  /** Keep live notes in the key chosen in Harmony (computer keys and MIDI) */
  scaleLock: boolean;
  setScaleLock: (on: boolean) => void;
  /** The user turned the MIDI keyboard on; reconnects on the next visit if the browser allows */
  midiEnabled: boolean;
  setMidiEnabled: (on: boolean) => void;
  /** Which MIDI input to listen to ('all' = every connected one) */
  midiInputId: string;
  setMidiInputId: (id: string) => void;
  /** Single-character shortcuts (1–8, [ ], \, R, and the piano's letter keys). Can be turned off in Help. */
  singleKeyShortcuts: boolean;
  setSingleKeyShortcuts: (on: boolean) => void;
  /** Scroll the grid to keep the playing step in view */
  followPlayhead: boolean;
  setFollowPlayhead: (on: boolean) => void;
  /** Help guide open (lifted here so the welcome bar can open it) */
  helpOpen: boolean;
  setHelpOpen: (open: boolean) => void;
  /** A parsed MIDI file waiting in the import dialog (null when closed) */
  midiImport: (MidiFileData & { fileName: string }) | null;
  setMidiImport: (file: (MidiFileData & { fileName: string }) | null) => void;
  /** Beats / Harmony side panel shown */
  sidePanelOpen: boolean;
  setSidePanelOpen: (open: boolean) => void;
  sidePanelWidth: number;
  setSidePanelWidth: (w: number) => void;
  songHeight: number;
  setSongHeight: (h: number) => void;
  setStudioTab: (tab: StudioTab) => void;
  setTrackHeaderWidth: (w: number) => void;
  setArmedTrack: (id: string | null) => void;
  toggleRecording: () => void;
  setRecording: (on: boolean) => void;
  setLiveOctave: (o: number) => void;
}

export const DEFAULT_HEADER_WIDTH = 240;
export const MIN_HEADER_WIDTH = 120;
export const MAX_HEADER_WIDTH = 300;

export const MIN_PANEL_WIDTH = 280;
export const MAX_PANEL_WIDTH = 700;
export const DEFAULT_PANEL_WIDTH = 280;

export const MIN_SONG_HEIGHT = 60;
export const MAX_SONG_HEIGHT = 400;
export const DEFAULT_SONG_HEIGHT = 180;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export const useUIStore = create<UIStore>()(persist((set) => ({
  studioTab: 'beats',
  playMode: 'pattern',
  setPlayMode: (mode) => set({ playMode: mode }),
  trackHeaderWidth: DEFAULT_HEADER_WIDTH,
  armedTrackId: null,
  recording: false,
  liveOctave: 4,
  scaleLock: false,
  setScaleLock: (on) => set({ scaleLock: on }),
  midiEnabled: false,
  setMidiEnabled: (on) => set({ midiEnabled: on }),
  midiInputId: 'all',
  setMidiInputId: (id) => set({ midiInputId: id }),
  singleKeyShortcuts: true,
  setSingleKeyShortcuts: (on) => set({ singleKeyShortcuts: on }),
  followPlayhead: true,
  setFollowPlayhead: (on) => set({ followPlayhead: on }),
  helpOpen: false,
  setHelpOpen: (open) => set({ helpOpen: open }),
  midiImport: null,
  setMidiImport: (file) => set({ midiImport: file }),
  sidePanelOpen: true,
  setSidePanelOpen: (open) => set({ sidePanelOpen: open }),
  sidePanelWidth: DEFAULT_PANEL_WIDTH,
  setSidePanelWidth: (w) => set({ sidePanelWidth: clamp(w, MIN_PANEL_WIDTH, MAX_PANEL_WIDTH) }),
  songHeight: DEFAULT_SONG_HEIGHT,
  setSongHeight: (h) => set({ songHeight: clamp(h, MIN_SONG_HEIGHT, MAX_SONG_HEIGHT) }),
  setStudioTab: (tab) => set({ studioTab: tab }),
  setTrackHeaderWidth: (w) => set({ trackHeaderWidth: clamp(w, MIN_HEADER_WIDTH, MAX_HEADER_WIDTH) }),
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
    sidePanelOpen: s.sidePanelOpen,
    sidePanelWidth: s.sidePanelWidth,
    songHeight: s.songHeight,
    playMode: s.playMode,
    scaleLock: s.scaleLock,
    midiEnabled: s.midiEnabled,
    midiInputId: s.midiInputId,
  }),
}));
