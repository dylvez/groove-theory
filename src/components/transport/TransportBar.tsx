import { useEffect, useCallback } from 'react';
import { useTransportStore } from '../../store/useTransportStore';
import { useSequencerStore } from '../../store/useSequencerStore';
import { useUIStore } from '../../store/useUIStore';
import { useSongStore } from '../../store/useSongStore';
import { useAudioInit } from '../../audio/useAudioInit';
import type { TimeSignature } from '../../types';
import { PATTERN_COLORS } from '../../constants/patterns';

export function TransportBar() {
  const { bpm, swing, state, loop, setBpm, setSwing, play, stop, toggleLoop } = useTransportStore();
  const { ready, init } = useAudioInit();
  const trackHeaderWidth = useUIStore(s => s.trackHeaderWidth);

  const patterns = useSequencerStore(s => s.patterns);
  const activePatternId = useSequencerStore(s => s.activePatternId);
  const setActivePattern = useSequencerStore(s => s.setActivePattern);
  const clearActivePattern = useSequencerStore(s => s.clearActivePattern);
  const setMeasures = useSequencerStore(s => s.setMeasures);
  const undo = useSequencerStore(s => s.undo);
  const undoDepth = useSequencerStore(s => s.undoDepth);

  const handleUndo = useCallback(() => { undo(); }, [undo]);

  // Global Ctrl+Z / Cmd+Z keyboard shortcut for undo
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo]);

  const activeTimeSignature = useSequencerStore(s => {
    const p = s.patterns.find(p => p.id === s.activePatternId) || s.patterns[0];
    return p?.timeSignature ?? '4/4';
  });
  const setTimeSignature = useSequencerStore(s => s.setTimeSignature);

  const activePattern = patterns.find(p => p.id === activePatternId) || patterns[0];
  const stepsPerMeasure = (activePattern?.timeSignature ?? '4/4') === '3/4' ? 12 : 16;
  const currentMeasures = Math.round((activePattern?.numSteps ?? 32) / stepsPerMeasure);

  const songState = useSongStore(s => s.songState);
  const stopSong = useSongStore(s => s.stopSong);

  const handlePlay = async () => {
    if (!ready) await init();
    if (state === 'playing') {
      stop();
    } else {
      // Stop song playback if active (mutual exclusion)
      if (songState === 'playing') {
        stopSong();
      }
      play();
    }
  };

  const handleTimeSignatureToggle = () => {
    const next: TimeSignature = activeTimeSignature === '4/4' ? '3/4' : '4/4';
    setTimeSignature(next);
  };

  return (
    <div className="flex items-center gap-3 px-4 sm:px-6 py-2 bg-bg-tertiary border-b-2 border-border shrink-0">
      {/* Left section — aligned with track headers */}
      <div className="flex items-center gap-3 shrink-0 bg-accent-purple/10 rounded-lg px-3 py-1 border border-accent-purple/20" style={{ width: trackHeaderWidth + 4 }}>
        <span className="text-xs text-text-secondary uppercase tracking-wider">Pattern</span>
        <div className="flex gap-1">
          {patterns.map(p => {
            const color = PATTERN_COLORS[p.id] ?? '#f97316';
            return (
              <button
                key={p.id}
                onClick={() => setActivePattern(p.id)}
                className={`w-8 h-8 rounded-md text-sm font-bold flex items-center justify-center cursor-pointer transition-colors ${
                  p.id === activePatternId
                    ? 'text-white'
                    : 'text-text-secondary hover:opacity-80'
                }`}
                style={p.id === activePatternId
                  ? { backgroundColor: color }
                  : { backgroundColor: `${color}20`, color }
                }
              >
                {p.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Clear / Undo */}
      <button
        onClick={clearActivePattern}
        title="Clear active pattern"
        className="px-2.5 py-1.5 rounded-md text-xs text-text-muted bg-bg-cell hover:bg-bg-cell-hover cursor-pointer transition-colors flex items-center gap-1"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
          <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5A.75.75 0 0 1 9.95 6Z" clipRule="evenodd" />
        </svg>
        <span className="hidden sm:inline">Clear</span>
      </button>
      <button
        onClick={handleUndo}
        disabled={undoDepth === 0}
        title={undoDepth > 0 ? `Undo (${undoDepth} steps)` : 'Nothing to undo'}
        className="px-2.5 py-1.5 rounded-md text-xs text-text-muted bg-bg-cell hover:bg-bg-cell-hover cursor-pointer transition-colors flex items-center gap-1
          disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-bg-cell"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
          <path fillRule="evenodd" d="M2.22 4.22a.75.75 0 0 1 1.06 0L5 5.94V3.5a.75.75 0 0 1 .75-.75h4.5a4.25 4.25 0 0 1 0 8.5H6.5a.75.75 0 0 1 0-1.5h3.75a2.75 2.75 0 1 0 0-5.5H6.5v2.44L4.78 4.97l-1.5-1.5a.75.75 0 0 1 0-1.06l1.5-1.5Z" clipRule="evenodd" />
        </svg>
        <span className="hidden sm:inline">Undo</span>
      </button>

      {/* Separator */}
      <div className="w-px h-5 bg-border shrink-0" />

      {/* Measures toggle */}
      <span className="text-xs text-text-secondary uppercase tracking-wider">Bars</span>
      <div className="flex gap-1">
        {([2, 4] as const).map(m => (
          <button
            key={m}
            onClick={() => setMeasures(m)}
            className={`w-8 h-8 rounded-md text-sm font-bold flex items-center justify-center cursor-pointer transition-colors ${
              currentMeasures === m
                ? 'bg-accent-purple/25 text-accent-purple border border-accent-purple/40'
                : 'bg-bg-cell text-text-secondary hover:bg-bg-cell-hover border border-transparent'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Separator */}
      <div className="w-px h-6 bg-border shrink-0" />

      {/* Play/Stop */}
      <button
        onClick={handlePlay}
        className={`w-9 h-9 rounded-lg flex items-center justify-center text-base font-bold transition-colors cursor-pointer shrink-0 ${
          state === 'playing'
            ? 'bg-accent-red text-white'
            : 'bg-accent-green text-white'
        }`}
      >
        {state === 'playing' ? '\u25A0' : '\u25B6'}
      </button>

      {/* BPM */}
      <div className="flex items-center gap-2 shrink-0">
        <label className="text-xs text-text-secondary uppercase tracking-wider hidden sm:block">BPM</label>
        <input
          type="number"
          min={40}
          max={300}
          value={bpm}
          onChange={(e) => setBpm(parseInt(e.target.value) || 120)}
          className="w-14 px-1.5 py-1 bg-bg-cell border border-border rounded-md text-center text-xs text-text-primary focus:outline-none focus:border-accent-orange"
        />
        <input
          type="range"
          min={40}
          max={300}
          value={bpm}
          onChange={(e) => setBpm(parseInt(e.target.value))}
          className="w-24 accent-accent-orange hidden md:block"
        />
      </div>

      {/* Swing */}
      <div className="flex items-center gap-2 shrink-0">
        <label className="text-xs text-text-secondary uppercase tracking-wider hidden sm:block">Swing</label>
        <input
          type="number"
          min={0}
          max={75}
          value={Math.round(swing * 100)}
          onChange={(e) => setSwing((parseInt(e.target.value) || 0) / 100)}
          className="w-14 px-1.5 py-1 bg-bg-cell border border-border rounded-md text-center text-xs text-text-primary focus:outline-none focus:border-accent-orange"
        />
        <input
          type="range"
          min={0}
          max={75}
          value={Math.round(swing * 100)}
          onChange={(e) => setSwing(parseInt(e.target.value) / 100)}
          className="w-20 accent-accent-orange hidden md:block"
        />
        <span className="text-[10px] text-text-muted hidden md:block">%</span>
      </div>

      {/* Time signature toggle */}
      <button
        onClick={handleTimeSignatureToggle}
        className="px-2.5 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer bg-accent-orange/20 text-accent-orange border border-accent-orange/40 hover:bg-accent-orange/30 shrink-0"
        title="Toggle time signature"
      >
        {activeTimeSignature}
      </button>

      {/* Loop */}
      <button
        onClick={toggleLoop}
        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer shrink-0 ${
          loop
            ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/40'
            : 'bg-bg-cell text-text-muted border border-border'
        }`}
      >
        LOOP
      </button>

    </div>
  );
}
