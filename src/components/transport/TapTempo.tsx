import { useRef, useState, useCallback } from 'react';
import { useTransportStore } from '../../store/useTransportStore';

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
      setBpm(Math.round(60000 / avg));
    }
    setFlash(true);
    setTimeout(() => setFlash(false), 90);
  }, [setBpm]);

  return (
    <button
      onClick={tap}
      className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border cursor-pointer transition-colors shrink-0 ${
        flash
          ? 'bg-accent-orange text-white border-accent-orange'
          : 'bg-bg-cell text-text-muted border-border hover:text-accent-orange hover:border-accent-orange/50'
      }`}
      title="Tap tempo — click in time with the beat"
    >
      Tap
    </button>
  );
}
