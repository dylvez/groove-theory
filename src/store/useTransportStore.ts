import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TransportState } from '../types';
import * as history from './history';

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

export const useTransportStore = create<TransportStore>()(
  persist(
    (set, get) => {
      // Tempo and swing are part of the groove, so they share the undo history.
      // A slider drag or typing in the field is one undo step (coalesced).
      const setTempo = (key: 'bpm' | 'swing', value: number) => history.coalesced(key, () => {
        const { bpm, swing } = get();
        if (get()[key] === value) return;
        set({ [key]: value });
        history.recordChange({ transport: { bpm, swing } });
      });

      history.registerTransportHistory(
        () => ({ bpm: get().bpm, swing: get().swing }),
        ({ bpm, swing }) => set({ bpm, swing }),
      );

      return {
        bpm: 120,
        swing: 0,
        state: 'stopped',
        currentStep: 0,
        loop: true,

        setBpm: (bpm) => setTempo('bpm', Math.max(40, Math.min(300, Number.isFinite(bpm) ? bpm : 120))),
        setSwing: (swing) => setTempo('swing', Math.max(0, Math.min(1, Number.isFinite(swing) ? swing : 0))),
        play: () => set({ state: 'playing' }),
        stop: () => set({ state: 'stopped', currentStep: 0 }),
        toggleLoop: () => set((s) => ({ loop: !s.loop })),
        setCurrentStep: (step) => set({ currentStep: step }),
      };
    },
    {
      // Tempo, swing and loop belong with the groove, so they survive a reload
      name: 'groove-theory-transport',
      version: 1,
      partialize: (s) => ({ bpm: s.bpm, swing: s.swing, loop: s.loop }),
    }
  )
);
