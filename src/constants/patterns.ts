export const PATTERN_IDS = ['pattern-a', 'pattern-b', 'pattern-c', 'pattern-d'] as const;
export type PatternId = (typeof PATTERN_IDS)[number];

export const PATTERN_COLORS: Record<string, string> = {
  'pattern-a': '#f97316',
  'pattern-b': '#3b82f6',
  'pattern-c': '#a855f7',
  'pattern-d': '#22c55e',
};
