import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type DelayTime = '16n' | '8n' | '8n.' | '4n';

export interface MixerSettings {
  /** Master output level in dB */
  masterVolume: number;
  /** Reverb tail length in seconds */
  reverbDecay: number;
  /** Reverb return level 0–1 */
  reverbLevel: number;
  /** Delay time as a note value (tempo-synced) */
  delayTime: DelayTime;
  /** Delay feedback 0–0.9 */
  delayFeedback: number;
  /** Delay return level 0–1 */
  delayLevel: number;
  /** Master bus compressor ("glue") on/off */
  compressor: boolean;
}

interface MixerStore extends MixerSettings {
  setMixer: (partial: Partial<MixerSettings>) => void;
  resetMixer: () => void;
}

export const DEFAULT_MIXER: MixerSettings = {
  masterVolume: 0,
  reverbDecay: 2.2,
  reverbLevel: 0.6,
  delayTime: '8n.',
  delayFeedback: 0.35,
  delayLevel: 0.5,
  compressor: true,
};

export const useMixerStore = create<MixerStore>()(
  persist(
    (set) => ({
      ...DEFAULT_MIXER,
      setMixer: (partial) => set(partial),
      resetMixer: () => set({ ...DEFAULT_MIXER }),
    }),
    {
      name: 'groove-theory-mixer',
      version: 1,
      partialize: (s) => ({
        masterVolume: s.masterVolume,
        reverbDecay: s.reverbDecay,
        reverbLevel: s.reverbLevel,
        delayTime: s.delayTime,
        delayFeedback: s.delayFeedback,
        delayLevel: s.delayLevel,
        compressor: s.compressor,
      }),
    }
  )
);
