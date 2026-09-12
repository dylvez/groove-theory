import type { SynthType } from '../types';

/** Hex alpha suffix (two chars) for a velocity level, for `#rrggbbaa` colors */
export function velocityAlpha(v: number): string {
  const a = Math.round((0.35 + 0.65 * Math.max(0, Math.min(1, v))) * 255);
  return a.toString(16).padStart(2, '0');
}

/** Track color per synth engine */
export const SYNTH_COLORS: Record<SynthType, string> = {
  synth: '#a855f7',
  fmSynth: '#3b82f6',
  amSynth: '#06b6d4',
  monoSynth: '#22c55e',
};
