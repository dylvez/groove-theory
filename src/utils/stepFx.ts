import type { DrumTrack, MelodicStep, StepFx } from '../types';

/**
 * Per-step chance, repeats and timing ("feel"). Shared by the editors, the
 * live player, the song player and both exports, so they all agree.
 */

export const CHANCE_OPTIONS = [1, 0.75, 0.5, 0.25, 0.1] as const;
export const REPEAT_OPTIONS = [1, 2, 3, 4] as const;
/** Largest timing shift, as a fraction of a step either way */
export const MAX_NUDGE = 0.5;
export const NUDGE_STEP = 0.05;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Drop defaults and out-of-range values; undefined when nothing is left */
export function cleanFx(fx: StepFx | null | undefined): StepFx | undefined {
  if (!fx) return undefined;
  const out: StepFx = {};
  if (fx.chance !== undefined && fx.chance < 1) out.chance = clamp(Math.round(fx.chance * 100) / 100, 0.01, 1);
  if (fx.repeats !== undefined && fx.repeats > 1) out.repeats = clamp(Math.round(fx.repeats), 1, 4);
  if (fx.nudge !== undefined) {
    const n = clamp(Math.round(fx.nudge / NUDGE_STEP) * NUDGE_STEP, -MAX_NUDGE, MAX_NUDGE);
    if (Math.abs(n) > 1e-9) out.nudge = Number(n.toFixed(2));
  }
  return Object.keys(out).length ? out : undefined;
}

/** The feel of drum step `i` */
export function drumFx(track: DrumTrack, i: number): StepFx | undefined {
  return track.fx?.[i] ?? undefined;
}

/** The feel of a synth step (none when the step is off) */
export function melodicFx(step: MelodicStep): StepFx | undefined {
  return step.active ? step.fx : undefined;
}

/** A track's fx list padded (or trimmed) to `length`, for index-aligned edits */
export function fullFx(track: DrumTrack, length = track.steps.length): (StepFx | null)[] {
  return Array.from({ length }, (_, i) => track.fx?.[i] ?? null);
}

/** Store an fx list compactly: undefined when every step is plain */
export function compactFx(list: (StepFx | null | undefined)[]): (StepFx | null)[] | undefined {
  const cleaned = list.map(f => cleanFx(f) ?? null);
  return cleaned.some(Boolean) ? cleaned : undefined;
}

/** Same track with its fx list replaced (the key is dropped when empty) */
export function withFx(track: DrumTrack, list: (StepFx | null | undefined)[]): DrumTrack {
  const fx = compactFx(list);
  if (fx) return { ...track, fx };
  if (!('fx' in track)) return track;
  const rest = { ...track };
  delete rest.fx;
  return rest;
}

/**
 * Moving between 1/16 and 1/32 steps halves or doubles a step's length. Scale
 * the timing shift so the hit stays at the same point in time.
 */
export function rescaleFx(fx: StepFx | null | undefined, factor: number): StepFx | null {
  if (!fx) return null;
  return cleanFx({ ...fx, nudge: fx.nudge !== undefined ? fx.nudge * factor : undefined }) ?? null;
}

export function hasFx(fx: StepFx | null | undefined): boolean {
  return !!cleanFx(fx);
}

/**
 * When the hits of one pass of a step sound, as fractions of a step from its
 * grid position (negative = early). Empty when the chance roll says skip.
 */
export function stepHits(fx: StepFx | null | undefined, rand: () => number = Math.random): number[] {
  const f = cleanFx(fx);
  if (f?.chance !== undefined && rand() >= f.chance) return [];
  const repeats = f?.repeats ?? 1;
  const nudge = f?.nudge ?? 0;
  return Array.from({ length: repeats }, (_, k) => nudge + k / repeats);
}

/**
 * Length in steps of hit `k` of `hits` for a note `length` steps long: each
 * repeat lasts its slice of the first step; the last one holds the rest.
 */
export function hitLength(length: number, k: number, hits: number): number {
  if (hits <= 1) return length;
  return k < hits - 1 ? 1 / hits : Math.max(1 / hits, length - (hits - 1) / hits);
}

/** True when the first hit lands before the step's grid position */
export function isEarly(fx: StepFx | null | undefined): boolean {
  return (cleanFx(fx)?.nudge ?? 0) < 0;
}

// --- Words ---------------------------------------------------------------

export function chanceLabel(chance: number): string {
  return `${Math.round(chance * 100)}%`;
}

export function nudgeLabel(nudge: number): string {
  if (Math.abs(nudge) < 1e-9) return 'on the grid';
  return `${Math.round(Math.abs(nudge) * 100)}% ${nudge < 0 ? 'early' : 'late'}`;
}

/** Plain description for labels and tooltips, e.g. "50% chance, 3 repeats, 20% late"; '' when plain */
export function describeFx(fx: StepFx | null | undefined): string {
  const f = cleanFx(fx);
  if (!f) return '';
  const parts: string[] = [];
  if (f.chance !== undefined) parts.push(`${chanceLabel(f.chance)} chance`);
  if (f.repeats !== undefined) parts.push(`${f.repeats} repeats`);
  if (f.nudge !== undefined) parts.push(nudgeLabel(f.nudge));
  return parts.join(', ');
}
