import type { SynthType } from '../types';

/** Hex alpha suffix (two chars) for a velocity level, for `#rrggbbaa` colors */
export function velocityAlpha(v: number): string {
  const a = Math.round(velocityOpacity(v) * 255);
  return a.toString(16).padStart(2, '0');
}

/** Track color per synth engine */
export const SYNTH_COLORS: Record<SynthType, string> = {
  synth: '#a855f7',
  fmSynth: '#3b82f6',
  amSynth: '#06b6d4',
  monoSynth: '#22c55e',
};

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

function luminance([r, g, b]: [number, number, number]): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/**
 * White or near-black, whichever reads better on `color` drawn at `alpha`
 * over the page background. One of the two always reaches at least 4.5:1.
 */
export function readableTextOn(color: string, alpha = 1, backdrop = '#09090d'): string {
  const fg = hexToRgb(color);
  const bg = hexToRgb(backdrop);
  const mixed = fg.map((c, i) => Math.round(c * alpha + bg[i] * (1 - alpha))) as [number, number, number];
  const L = luminance(mixed);
  const onWhite = 1.05 / (L + 0.05);
  const onDark = (L + 0.05) / (luminance(hexToRgb('#09090d')) + 0.05);
  return onWhite >= onDark ? '#ffffff' : '#09090d';
}

/** Alpha (0–1) that velocityAlpha() encodes */
export function velocityOpacity(v: number): number {
  return 0.35 + 0.65 * Math.max(0, Math.min(1, v));
}

// --- Night Glow: light only where there's sound ----------------------------

/**
 * How brightly a step glows: 1 while the playhead is on it, then a fading
 * afterglow for the two steps just played (0.55, 0.25), else 0. Wraps round
 * the loop, so step 0 lights the last steps' afterglow.
 */
export function glowLevel(stepIndex: number, currentStep: number, playing: boolean, numSteps: number): number {
  if (!playing) return 0;
  const behind = (currentStep - stepIndex + numSteps) % numSteps;
  return behind === 0 ? 1 : behind === 1 ? 0.55 : behind === 2 ? 0.25 : 0;
}

/** Two-digit hex alpha for 0–1 */
export function hexAlpha(a: number): string {
  return Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, '0');
}

/** Box shadow for a step that has a hit: a bloom under the playhead, a fading afterglow behind it */
export function hitShadow(color: string, level: number): string {
  if (level >= 1) return `0 0 0 2px #ffffff, 0 0 22px ${color}${hexAlpha(0.95)}, 0 0 6px #ffffff`;
  if (level > 0) return `0 0 ${Math.round(18 * level)}px ${color}${hexAlpha(0.8 * level)}, inset 0 1px 0 rgb(255 255 255 / 0.3)`;
  return 'inset 0 1px 0 rgb(255 255 255 / 0.22)';
}

/** Empty steps under the playhead light up as a column */
export const PLAYHEAD_CELL = { backgroundColor: '#30303e', borderColor: '#a3a3bd' } as const;
