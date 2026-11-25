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
export function readableTextOn(color: string, alpha = 1, backdrop = '#0f0f13'): string {
  const fg = hexToRgb(color);
  const bg = hexToRgb(backdrop);
  const mixed = fg.map((c, i) => Math.round(c * alpha + bg[i] * (1 - alpha))) as [number, number, number];
  const L = luminance(mixed);
  const onWhite = 1.05 / (L + 0.05);
  const onDark = (L + 0.05) / (luminance(hexToRgb('#0f0f13')) + 0.05);
  return onWhite >= onDark ? '#ffffff' : '#0f0f13';
}

/** Alpha (0–1) that velocityAlpha() encodes */
export function velocityOpacity(v: number): number {
  return 0.35 + 0.65 * Math.max(0, Math.min(1, v));
}
