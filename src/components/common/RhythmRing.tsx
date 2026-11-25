import { memo, useMemo } from 'react';
import { RING_COLORS, type RingData } from '../../utils/rhythmRing';

/**
 * Rhythm rings: a groove drawn as concentric rings of dots, one dot per step
 * of the first bar, clockwise from the top. From the inside out: kick, snare
 * (and claps, rims), hats (open hats and cymbals in purple), synth notes.
 * Used for the logo, the pattern buttons, song blocks and preset covers.
 * Always decorative: the same facts are in the controls' own labels.
 */

interface RhythmRingProps {
  ring: RingData;
  size: number;
  /** Lit: full colour with a soft glow (selected, or playing) */
  lit?: boolean;
  className?: string;
}

export const RhythmRing = memo(function RhythmRing({ ring, size, lit = false, className }: RhythmRingProps) {
  const dots = useMemo(() => {
    const c = size / 2;
    const out: { x: number; y: number; r: number; fill: string; glow: boolean }[] = [];
    const rows: [number, (i: number) => string | null][] = [
      [0.17, i => (ring.kick.includes(i) ? RING_COLORS.kick : null)],
      [0.27, i => (ring.snare.includes(i) ? RING_COLORS.snare : null)],
      [0.37, i => (ring.open.includes(i) ? RING_COLORS.open : ring.hat.includes(i) ? RING_COLORS.hat : null)],
      [0.46, i => (ring.synth.includes(i) ? RING_COLORS.synth : null)],
    ];
    for (const [rf, colorAt] of rows) {
      const r = size * rf;
      for (let i = 0; i < ring.slots; i++) {
        const a = (i / ring.slots) * Math.PI * 2 - Math.PI / 2;
        const col = colorAt(i);
        out.push({
          x: c + r * Math.cos(a),
          y: c + r * Math.sin(a),
          r: col ? Math.max(1.1, size * 0.0375) : Math.max(0.55, size * 0.012),
          fill: col ?? 'rgb(255 255 255 / 0.28)',
          glow: !!col && lit,
        });
      }
    }
    return out;
  }, [ring, size, lit]);

  return (
    <svg aria-hidden="true" width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className}>
      {dots.map((d, i) => (
        <circle
          key={i}
          cx={d.x}
          cy={d.y}
          r={d.r}
          fill={d.fill}
          fillOpacity={lit || d.fill.startsWith('rgb') ? 1 : 0.75}
          style={d.glow ? { filter: `drop-shadow(0 0 ${Math.max(1, size * 0.04)}px ${d.fill})` } : undefined}
        />
      ))}
    </svg>
  );
});

/**
 * The logo: sixteen ticks, one per step of a bar. The long ticks are a kick
 * (orange) and snare (blue) pattern, so the mark is itself a groove.
 */
export function RingMark({ size = 30, glow = true, className }: { size?: number; glow?: boolean; className?: string }) {
  const K = [0, 6, 8];
  const S = [4, 12];
  const c = size / 2;
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className}>
      {Array.from({ length: 16 }, (_, i) => {
        const hit = K.includes(i) ? RING_COLORS.kick : S.includes(i) ? RING_COLORS.snare : null;
        const h = hit ? size * 0.26 : size * 0.12;
        const w = size * 0.08;
        const top = size * 0.03;
        return (
          <rect
            key={i}
            x={c - w / 2}
            y={top}
            width={w}
            height={h}
            rx={w / 2}
            fill={hit ?? '#6b6e80'}
            transform={`rotate(${i * 22.5} ${c} ${c})`}
            style={hit && glow ? { filter: `drop-shadow(0 0 ${size * 0.08}px ${hit})` } : undefined}
          />
        );
      })}
    </svg>
  );
}
