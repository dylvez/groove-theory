import { create } from 'zustand';
import type { TransportState } from '../types';

interface TransportStore {
  bpm: number;
  swing: number;
  state: TransportState;
  currentStep: number;
  loop: boolean;
  setBpm: (bpm: number) => void;
  setSwing: (swing: number) => void;
  play: () => void;
  stop: () => void;
  toggleLoop: () => void;
  setCurrentStep: (step: number) => void;
}

export const useTransportStore = create<TransportStore>((set) => ({
  bpm: 120,
  swing: 0,
  state: 'stopped',
  currentStep: 0,
  loop: true,

  setBpm: (bpm) => set({ bpm: Math.max(40, Math.min(300, bpm)) }),
  setSwing: (swing) => set({ swing: Math.max(0, Math.min(1, swing)) }),
  play: () => set({ state: 'playing' }),
  stop: () => set({ state: 'stopped', currentStep: 0 }),
  toggleLoop: () => set((s) => ({ loop: !s.loop })),
  setCurrentStep: (step) => set({ currentStep: step }),
}));
