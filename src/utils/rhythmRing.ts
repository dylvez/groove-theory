import type { Pattern } from '../types';
import { getStepsPerMeasure } from './patternHelpers';

/** Data for the rhythm rings drawn by components/common/RhythmRing */
export interface RingData {
  /** Steps around the ring (12 for 3/4, else 16) */
  slots: number;
  kick: number[];
  snare: number[];
  hat: number[];
  open: number[];
  synth: number[];
}

export const RING_COLORS = {
  kick: '#f97316',
  snare: '#06b6d4',
  hat: '#22c55e',
  open: '#a855f7',
  synth: '#3b82f6',
};

const KICK = /^(kick|tom-low)/;
const SNARE = /^(snare|clap|rim|tom-mid|tom-high)/;
const OPEN = /^(hihat-open|crash)/;

/** The first bar of a pattern, folded to 12 or 16 positions */
export function ringFromPattern(p: Pattern): RingData {
  const perBar = getStepsPerMeasure(p.timeSignature, p.stepResolution);
  const fold = p.stepResolution === '32n' ? 2 : 1;
  const slots = perBar / fold;
  const hitsOf = (steps: ArrayLike<unknown>, on: (v: unknown) => boolean) => {
    const out = new Set<number>();
    for (let i = 0; i < Math.min(perBar, steps.length); i++) if (on(steps[i])) out.add(Math.floor(i / fold));
    return [...out];
  };
  const ring: RingData = { slots, kick: [], snare: [], hat: [], open: [], synth: [] };
  for (const t of p.drumTracks) {
    if (t.muted) continue;
    const hits = hitsOf(t.steps, v => (v as number) > 0);
    const key = t.sampleKey;
    const into = KICK.test(key) ? ring.kick : SNARE.test(key) ? ring.snare : OPEN.test(key) ? ring.open : ring.hat;
    for (const h of hits) if (!into.includes(h)) into.push(h);
  }
  for (const t of p.melodicTracks) {
    if (t.muted) continue;
    for (const h of hitsOf(t.steps, s => !!(s as { active?: boolean })?.active)) if (!ring.synth.includes(h)) ring.synth.push(h);
  }
  return ring;
}

