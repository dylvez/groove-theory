export const PATTERN_IDS = ['pattern-a', 'pattern-b', 'pattern-c', 'pattern-d'] as const;
export type PatternId = (typeof PATTERN_IDS)[number];

export const PATTERN_COLORS: Record<string, string> = {
  'pattern-a': '#f97316',
  'pattern-b': '#3b82f6',
  'pattern-c': '#a855f7',
  'pattern-d': '#22c55e',
};

/** Lighter shades of the pattern colours for text, ≥4.5:1 on dark surfaces and tints */
export const PATTERN_TEXT_COLORS: Record<string, string> = {
  'pattern-a': '#fdba74',
  'pattern-b': '#93c5fd',
  'pattern-c': '#d8b4fe',
  'pattern-d': '#4ade80',
};

export function patternTextColor(id: string): string {
  return PATTERN_TEXT_COLORS[id] ?? '#f1f1f5';
}
