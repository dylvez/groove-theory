/** Pattern slots A–H. Older saves and presets with fewer are padded on load. */
export const PATTERN_IDS = [
  'pattern-a', 'pattern-b', 'pattern-c', 'pattern-d',
  'pattern-e', 'pattern-f', 'pattern-g', 'pattern-h',
] as const;
export type PatternId = (typeof PATTERN_IDS)[number];

/** Letter shown for a slot: 'pattern-c' → 'C' */
export function patternLetter(id: string): string {
  return id.replace(/^pattern-/, '').toUpperCase();
}

/** Bar counts a pattern can have */
export const PATTERN_BAR_OPTIONS = [1, 2, 4, 8] as const;
export type PatternBars = (typeof PATTERN_BAR_OPTIONS)[number];

export const PATTERN_COLORS: Record<string, string> = {
  'pattern-a': '#f97316',
  'pattern-b': '#3b82f6',
  'pattern-c': '#a855f7',
  'pattern-d': '#22c55e',
  'pattern-e': '#ec4899',
  'pattern-f': '#06b6d4',
  'pattern-g': '#f59e0b',
  'pattern-h': '#ef4444',
};

/** Lighter shades of the pattern colours for text, ≥4.5:1 on dark surfaces and tints */
export const PATTERN_TEXT_COLORS: Record<string, string> = {
  'pattern-a': '#fdba74',
  'pattern-b': '#93c5fd',
  'pattern-c': '#d8b4fe',
  'pattern-d': '#4ade80',
  'pattern-e': '#f9a8d4',
  'pattern-f': '#22d3ee',
  'pattern-g': '#fbbf24',
  'pattern-h': '#fca5a5',
};

export function patternTextColor(id: string): string {
  return PATTERN_TEXT_COLORS[id] ?? '#f1f1f5';
}
