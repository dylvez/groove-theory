import { create } from 'zustand';

export type StudioTab = 'harmony' | 'beats';

interface UIStore {
  studioTab: StudioTab;
  trackHeaderWidth: number;
  setStudioTab: (tab: StudioTab) => void;
  setTrackHeaderWidth: (w: number) => void;
}

const MIN_HEADER_WIDTH = 120;
const MAX_HEADER_WIDTH = 300;

export const useUIStore = create<UIStore>((set) => ({
  studioTab: 'harmony',
  trackHeaderWidth: 216,
  setStudioTab: (tab) => set({ studioTab: tab }),
  setTrackHeaderWidth: (w) => set({ trackHeaderWidth: Math.max(MIN_HEADER_WIDTH, Math.min(MAX_HEADER_WIDTH, w)) }),
}));
