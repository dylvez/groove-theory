import { create } from 'zustand';

export type StudioTab = 'harmony' | 'beats';

interface UIStore {
  theoryPanelOpen: boolean;
  studioTab: StudioTab;
  trackHeaderWidth: number;
  toggleTheoryPanel: () => void;
  setStudioTab: (tab: StudioTab) => void;
  setTrackHeaderWidth: (w: number) => void;
}

const MIN_HEADER_WIDTH = 120;
const MAX_HEADER_WIDTH = 300;

export const useUIStore = create<UIStore>((set) => ({
  theoryPanelOpen: true,
  studioTab: 'harmony',
  trackHeaderWidth: 216,
  toggleTheoryPanel: () => set((s) => ({ theoryPanelOpen: !s.theoryPanelOpen })),
  setStudioTab: (tab) => set({ studioTab: tab }),
  setTrackHeaderWidth: (w) => set({ trackHeaderWidth: Math.max(MIN_HEADER_WIDTH, Math.min(MAX_HEADER_WIDTH, w)) }),
}));
