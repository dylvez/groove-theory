import { useRef, useState, useCallback } from 'react';
import { useTransportStore } from '../../store/useTransportStore';
import { announce } from '../../utils/announce';

/** Tap a button in time; BPM is set from the average interval of the last taps. */
export function TapTempo() {
  const setBpm = useTransportStore(s => s.setBpm);
  const taps = useRef<number[]>([]);
  const [flash, setFlash] = useState(false);

  const tap = useCallback(() => {
    const now = performance.now();
    const list = taps.current;
    // Reset if it's been a while since the last tap
    if (list.length && now - list[list.length - 1] > 2000) list.length = 0;
    list.push(now);
    if (list.length > 8) list.shift();
    if (list.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < list.length; i++) intervals.push(list[i] - list[i - 1]);
      const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const next = Math.round(60000 / avg);
      setBpm(next);
      announce(`${next} BPM`);
    }
    setFlash(true);
    setTimeout(() => setFlash(false), 90);
  }, [setBpm]);

  return (
    <button
      onClick={tap}
      aria-label="Tap tempo"
      className={`pill shrink-0 ${flash ? '!bg-text-primary !text-bg-primary !border-text-primary' : ''}`}
      title="Tap tempo — click in time with the beat"
    >
      Tap
    </button>
  );
}
