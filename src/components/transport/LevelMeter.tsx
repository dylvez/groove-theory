import { useEffect, useRef } from 'react';
import { AudioEngine } from '../../audio/AudioEngine';
import { useTransportStore } from '../../store/useTransportStore';
import { useSongStore } from '../../store/useSongStore';

const MIN_DB = -48;

/**
 * Master output meter. Reads the mixer's meter on each animation frame and
 * paints a segmented bar; turns amber near 0 dB and red when the limiter is working.
 */
export function LevelMeter() {
  const barRef = useRef<HTMLDivElement>(null);
  const peakRef = useRef<HTMLDivElement>(null);
  const isPlaying = useTransportStore(s => s.state) === 'playing';
  const isSongPlaying = useSongStore(s => s.songState) === 'playing';
  const active = isPlaying || isSongPlaying;

  useEffect(() => {
    let raf = 0;
    let peak = MIN_DB;
    let peakHold = 0;
    const tick = () => {
      const db = AudioEngine.getInstance().getMasterLevel();
      const level = Number.isFinite(db) ? Math.max(MIN_DB, Math.min(6, db)) : MIN_DB;
      const pct = ((level - MIN_DB) / (6 - MIN_DB)) * 100;
      if (level >= peak) { peak = level; peakHold = 40; }
      else if (peakHold > 0) peakHold--;
      else peak = Math.max(MIN_DB, peak - 0.6);
      const peakPct = ((peak - MIN_DB) / (6 - MIN_DB)) * 100;

      if (barRef.current) {
        barRef.current.style.width = `${pct}%`;
        barRef.current.style.background = level > 0
          ? 'linear-gradient(90deg,#22c55e 0%,#f59e0b 75%,#ef4444 100%)'
          : level > -8
          ? 'linear-gradient(90deg,#22c55e 0%,#f59e0b 100%)'
          : '#22c55e';
      }
      if (peakRef.current) {
        peakRef.current.style.left = `${peakPct}%`;
        peakRef.current.style.opacity = peak > MIN_DB + 1 ? '1' : '0';
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      aria-hidden="true"
      className={`relative w-24 h-2.5 rounded-full bg-bg-primary/80 border border-border/60 overflow-hidden shrink-0 hidden 2xl:block transition-opacity ${active ? 'opacity-100' : 'opacity-50'}`}
      title="Master output level"
    >
      <div ref={barRef} className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-75" style={{ width: '0%' }} />
      <div ref={peakRef} className="absolute inset-y-0 w-0.5 bg-white/80 transition-opacity" style={{ left: '0%', opacity: 0 }} />
      {/* 0 dB tick */}
      <div className="absolute inset-y-0 w-px bg-white/20" style={{ left: `${((0 - MIN_DB) / (6 - MIN_DB)) * 100}%` }} />
    </div>
  );
}
