import { useState, useCallback } from 'react';
import { useTransportStore } from '../../store/useTransportStore';
import { useSequencerStore } from '../../store/useSequencerStore';
import { useUIStore } from '../../store/useUIStore';
import { useSongStore } from '../../store/useSongStore';
import { useAudioInit } from '../../audio/useAudioInit';
import type { TimeSignature, StepResolution } from '../../types';
import { PATTERN_COLORS, PATTERN_BAR_OPTIONS, patternTextColor } from '../../constants/patterns';
import { getStepsPerMeasure } from '../../utils/patternHelpers';
import { choosePlayMode, effectivePlayMode, togglePlayback } from '../../utils/playback';
import { PatternMenu } from './PatternMenu';
import { MixerPanel } from './MixerPanel';
import { TapTempo } from './TapTempo';
import { LevelMeter } from './LevelMeter';
import { LiveInputControl } from './LiveInputControl';

function IconButton({ onClick, disabled, title, label, children, active, accent = 'text-text-muted' }: {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  label: string;
  children: React.ReactNode;
  active?: boolean;
  accent?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={label}
      className={`px-2 py-1.5 min-h-7 min-w-7 justify-center rounded-md text-xs cursor-pointer transition-colors flex items-center gap-1 shrink-0
        disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-bg-cell ${
        active ? 'bg-accent-purple/25 text-accent-purple-fg' : `bg-bg-cell hover:bg-bg-cell-hover ${accent}`
      }`}
    >
      {children}
    </button>
  );
}

export function TransportBar() {
  const { bpm, swing, state, loop, setBpm, setSwing, toggleLoop } = useTransportStore();
  const { ready, init } = useAudioInit();
  const trackHeaderWidth = useUIStore(s => s.trackHeaderWidth);
  const armedTrackId = useUIStore(s => s.armedTrackId);
  const recording = useUIStore(s => s.recording);
  const toggleRecording = useUIStore(s => s.toggleRecording);
  const liveOctave = useUIStore(s => s.liveOctave);
  const setLiveOctave = useUIStore(s => s.setLiveOctave);
  const followPlayhead = useUIStore(s => s.followPlayhead);
  const setFollowPlayhead = useUIStore(s => s.setFollowPlayhead);
  const patterns = useSequencerStore(s => s.patterns);
  const activePatternId = useSequencerStore(s => s.activePatternId);
  const setActivePattern = useSequencerStore(s => s.setActivePattern);
  const setMeasures = useSequencerStore(s => s.setMeasures);
  const undo = useSequencerStore(s => s.undo);
  const redo = useSequencerStore(s => s.redo);
  const undoDepth = useSequencerStore(s => s.undoDepth);
  const redoDepth = useSequencerStore(s => s.redoDepth);
  const setTimeSignature = useSequencerStore(s => s.setTimeSignature);
  const setStepResolution = useSequencerStore(s => s.setStepResolution);

  const [menuOpen, setMenuOpen] = useState(false);
  const [mixerOpen, setMixerOpen] = useState(false);

  const activePattern = patterns.find(p => p.id === activePatternId) || patterns[0];
  const activeTimeSignature = activePattern?.timeSignature ?? '4/4';
  const activeStepResolution = activePattern?.stepResolution ?? '16n';
  const stepsPerMeasure = getStepsPerMeasure(activeTimeSignature, activeStepResolution);
  const currentMeasures = Math.round((activePattern?.numSteps ?? 32) / stepsPerMeasure);
  const armedTrack = armedTrackId ? activePattern?.melodicTracks.find(t => t.id === armedTrackId) : null;

  const songState = useSongStore(s => s.songState);
  const songBlocks = useSongStore(s => s.blocks.length);
  const playMode = useUIStore(s => s.playMode);
  const mode = effectivePlayMode(playMode, songBlocks);
  const playing = state === 'playing' || songState === 'playing';

  const handlePlay = async () => {
    if (!ready) await init();
    await togglePlayback();
  };

  const handleTimeSignatureToggle = () => {
    const next: TimeSignature = activeTimeSignature === '4/4' ? '3/4' : '4/4';
    setTimeSignature(next);
  };

  const handleStepResolutionToggle = () => {
    const next: StepResolution = activeStepResolution === '16n' ? '32n' : '16n';
    setStepResolution(next);
  };

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const closeMixer = useCallback(() => setMixerOpen(false), []);

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-2 px-4 sm:px-6 py-2 bg-bg-tertiary border-b-2 border-border shrink-0">
      <h2 className="sr-only">Transport</h2>
      {/* Left section — width matches track headers for alignment */}
      {/* At least as wide as the track headers so controls line up with the grid; grows for eight slots */}
      <div className="shrink-0" style={{ minWidth: trackHeaderWidth + 4 }}>
        <div className="inline-flex items-center gap-1.5 bg-accent-purple/10 rounded-lg px-1.5 py-1 border border-accent-purple/20">
          <span id="pattern-label" className="sr-only">Pattern</span>
          <div role="group" aria-labelledby="pattern-label" className="flex gap-0.5">
            {patterns.map((p, idx) => {
              const color = PATTERN_COLORS[p.id] ?? '#f97316';
              return (
                <button
                  key={p.id}
                  onClick={() => setActivePattern(p.id)}
                  title={`Pattern ${p.name} (press ${idx + 1})`}
                  aria-pressed={p.id === activePatternId}
                  aria-label={`Pattern ${p.name}`}
                  aria-keyshortcuts={String(idx + 1)}
                  className={`w-6 h-8 rounded-md text-sm font-bold flex items-center justify-center cursor-pointer transition-colors ${
                    p.id === activePatternId
                      ? 'text-on-accent'
                      : 'hover:opacity-80'
                  }`}
                  style={p.id === activePatternId
                    ? { backgroundColor: color }
                    : { backgroundColor: `${color}20`, color: patternTextColor(p.id) }
                  }
                >
                  {p.name}
                </button>
              );
            })}
          </div>
          <div className="relative">
            <button
              onClick={() => setMenuOpen(v => !v)}
              title="Pattern actions — copy, shift, humanize, clear"
              aria-label="Pattern actions"
              aria-expanded={menuOpen}
              aria-haspopup="dialog"
              className={`w-7 h-8 rounded-md text-base font-bold flex items-center justify-center cursor-pointer transition-colors ${
                menuOpen ? 'bg-accent-purple/30 text-accent-purple-fg' : 'text-text-muted hover:text-text-primary hover:bg-bg-cell'
              }`}
            >
              <span aria-hidden="true">⋯</span>
            </button>
            {menuOpen && <PatternMenu onClose={closeMenu} />}
          </div>
        </div>
      </div>

      {/* Undo / Redo */}
      <IconButton onClick={undo} disabled={undoDepth === 0} label="Undo" title={undoDepth > 0 ? `Undo (${undoDepth})` : 'Nothing to undo'}>
        <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
          <path fillRule="evenodd" d="M2.22 4.22a.75.75 0 0 1 1.06 0L5 5.94V3.5a.75.75 0 0 1 .75-.75h4.5a4.25 4.25 0 0 1 0 8.5H6.5a.75.75 0 0 1 0-1.5h3.75a2.75 2.75 0 1 0 0-5.5H6.5v2.44L4.78 4.97l-1.5-1.5a.75.75 0 0 1 0-1.06l1.5-1.5Z" clipRule="evenodd" />
        </svg>
      </IconButton>
      <IconButton onClick={redo} disabled={redoDepth === 0} label="Redo" title={redoDepth > 0 ? `Redo (${redoDepth})` : 'Nothing to redo'}>
        <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3" style={{ transform: 'scaleX(-1)' }}>
          <path fillRule="evenodd" d="M2.22 4.22a.75.75 0 0 1 1.06 0L5 5.94V3.5a.75.75 0 0 1 .75-.75h4.5a4.25 4.25 0 0 1 0 8.5H6.5a.75.75 0 0 1 0-1.5h3.75a2.75 2.75 0 1 0 0-5.5H6.5v2.44L4.78 4.97l-1.5-1.5a.75.75 0 0 1 0-1.06l1.5-1.5Z" clipRule="evenodd" />
        </svg>
      </IconButton>

      {/* Separator */}
      <div aria-hidden="true" className="w-px h-5 bg-border shrink-0" />

      {/* Measures toggle */}
      <span id="bars-label" className="text-xs text-text-secondary uppercase tracking-wider hidden 2xl:block">Bars</span>
      <div role="group" aria-label="Pattern length" className="flex gap-1">
        {PATTERN_BAR_OPTIONS.map(m => (
          <button
            key={m}
            onClick={() => setMeasures(m)}
            title={`${m} bars`}
            aria-label={`${m} bars`}
            aria-pressed={currentMeasures === m}
            className={`w-7 h-8 rounded-md text-sm font-bold flex items-center justify-center cursor-pointer transition-colors ${
              currentMeasures === m
                ? 'bg-accent-purple/25 text-accent-purple-fg border border-accent-purple/40'
                : 'bg-bg-cell text-text-secondary hover:bg-bg-cell-hover border border-transparent'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Time signature + resolution */}
      <button
        onClick={handleTimeSignatureToggle}
        aria-label={`Time signature ${activeTimeSignature}. Switch to ${activeTimeSignature === '4/4' ? '3/4' : '4/4'}`}
        className="px-2 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer bg-accent-orange/20 text-accent-orange-fg border border-accent-orange/40 hover:bg-accent-orange/30 shrink-0"
        title="Toggle time signature"
      >
        {activeTimeSignature}
      </button>
      <button
        onClick={handleStepResolutionToggle}
        aria-label={`Step size ${activeStepResolution === '32n' ? '1/32' : '1/16'} notes. Switch to ${activeStepResolution === '32n' ? '1/16' : '1/32'}`}
        className={`px-2 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer shrink-0 ${
          activeStepResolution === '32n'
            ? 'bg-accent-green/20 text-accent-green-fg border border-accent-green/40 hover:bg-accent-green/30'
            : 'bg-accent-orange/20 text-accent-orange-fg border border-accent-orange/40 hover:bg-accent-orange/30'
        }`}
        title="Toggle step resolution (16th or 32nd notes)"
      >
        {activeStepResolution === '32n' ? '1/32' : '1/16'}
      </button>

      {/* Separator */}
      <div aria-hidden="true" className="w-px h-6 bg-border shrink-0" />

      {/* Play/Stop: the only one in the app; the switch beside it picks pattern or song */}
      <button
        id="main-play"
        onClick={handlePlay}
        title={playing ? 'Stop (Space)' : mode === 'song' ? 'Play the song (Space)' : 'Loop the pattern (Space)'}
        aria-label={playing ? 'Stop' : mode === 'song' ? 'Play song' : 'Play pattern'}
        aria-keyshortcuts="Space"
        className={`w-9 h-9 rounded-lg flex items-center justify-center text-base font-bold transition-colors cursor-pointer shrink-0 ${
          playing
            ? 'bg-accent-red text-on-accent'
            : 'bg-accent-green text-on-accent'
        }`}
      >
        <span aria-hidden="true">{playing ? '■' : '▶'}</span>
      </button>
      <div role="group" aria-label="Play mode" className="flex gap-0.5 p-0.5 rounded-md bg-bg-cell border border-border-control shrink-0">
        <button
          onClick={() => choosePlayMode('pattern')}
          aria-pressed={mode === 'pattern'}
          title="Play loops the selected pattern"
          className={`h-6 px-2 rounded text-[11px] font-bold cursor-pointer transition-colors ${
            mode === 'pattern' ? 'bg-accent-purple/30 text-accent-purple-fg' : 'text-text-secondary hover:text-text-primary hover:bg-bg-cell-hover'
          }`}
        >
          Pattern
        </button>
        <button
          onClick={() => choosePlayMode('song')}
          aria-pressed={mode === 'song'}
          aria-disabled={songBlocks === 0 || undefined}
          title={songBlocks === 0 ? 'Add blocks to the song to play it' : 'Play plays the song arrangement'}
          className={`h-6 px-2 rounded text-[11px] font-bold transition-colors ${
            songBlocks === 0
              ? 'text-text-muted cursor-not-allowed'
              : mode === 'song'
              ? 'bg-accent-purple/30 text-accent-purple-fg cursor-pointer'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-cell-hover cursor-pointer'
          }`}
        >
          Song
        </button>
      </div>

      {/* Record (live keys) */}
      <button
        onClick={toggleRecording}
        disabled={!armedTrackId}
        aria-label="Record live keys"
        aria-pressed={recording}
        aria-keyshortcuts="R"
        title={
          !armedTrackId
            ? 'Arm a synth track (● on its header) to play it with your keyboard and record'
            : recording ? 'Recording live keys into the armed track — press R to stop' : 'Record live keys into the armed track (R)'
        }
        className={`w-9 h-9 rounded-lg flex items-center justify-center text-base font-bold transition-colors cursor-pointer shrink-0 border ${
          recording
            ? 'bg-accent-red text-on-accent border-accent-red animate-pulse'
            : armedTrackId
            ? 'bg-accent-red/15 text-accent-red-fg border-accent-red/40 hover:bg-accent-red/30'
            : 'bg-bg-cell text-text-muted/40 border-border/50 cursor-not-allowed'
        }`}
      >
        <span aria-hidden="true">●</span>
      </button>

      {/* Scale lock, octave and MIDI keyboard */}
      <LiveInputControl />

      {/* Live keys indicator */}
      {armedTrack && (
        <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-md bg-accent-red/10 border border-accent-red/30 text-[11px] text-text-secondary shrink-0">
          <span className="text-accent-red-fg font-bold uppercase tracking-wider">Keys</span>
          <span className="truncate max-w-24">{armedTrack.name}</span>
          <span className="text-text-muted">·</span>
          <button onClick={() => setLiveOctave(liveOctave - 1)} aria-label="Live keys octave down" aria-keyshortcuts="Z" className="w-6 h-6 rounded bg-bg-cell text-text-muted hover:text-text-primary cursor-pointer" title="Octave down (Z)">−</button>
          <span className="font-mono" aria-live="polite" aria-label={`Octave ${liveOctave}`}>C{liveOctave}</span>
          <button onClick={() => setLiveOctave(liveOctave + 1)} aria-label="Live keys octave up" aria-keyshortcuts="X" className="w-6 h-6 rounded bg-bg-cell text-text-muted hover:text-text-primary cursor-pointer" title="Octave up (X)">+</button>
        </div>
      )}

      {/* BPM */}
      <div className="flex items-center gap-1.5 shrink-0">
        <label htmlFor="transport-bpm" className="text-xs text-text-secondary uppercase tracking-wider">BPM</label>
        <input
          id="transport-bpm"
          type="number"
          min={40}
          max={300}
          value={bpm}
          onChange={(e) => setBpm(parseInt(e.target.value) || 120)}
          className="w-14 px-1.5 py-1 min-h-7 bg-bg-cell border border-border-control rounded-md text-center text-xs text-text-primary focus:border-accent-orange"
        />
        <input
          type="range"
          min={40}
          max={300}
          value={bpm}
          aria-label="Tempo"
          aria-valuetext={`${bpm} BPM`}
          onChange={(e) => setBpm(parseInt(e.target.value))}
          className="w-20 h-6 accent-accent-orange hidden 2xl:block"
        />
        <TapTempo />
      </div>

      {/* Swing */}
      <div className="flex items-center gap-1.5 shrink-0">
        <label htmlFor="transport-swing" className="text-xs text-text-secondary uppercase tracking-wider">Swing</label>
        <input
          id="transport-swing"
          type="number"
          min={0}
          max={75}
          value={Math.round(swing * 100)}
          onChange={(e) => setSwing((parseInt(e.target.value) || 0) / 100)}
          aria-describedby="transport-swing-unit"
          className="w-12 px-1.5 py-1 min-h-7 bg-bg-cell border border-border-control rounded-md text-center text-xs text-text-primary focus:border-accent-orange"
        />
        <span id="transport-swing-unit" className="sr-only">percent</span>
        <input
          type="range"
          min={0}
          max={75}
          value={Math.round(swing * 100)}
          aria-label="Swing amount"
          aria-valuetext={`${Math.round(swing * 100)}%`}
          onChange={(e) => setSwing(parseInt(e.target.value) / 100)}
          className="w-16 h-6 accent-accent-orange hidden 2xl:block"
        />
      </div>

      {/* Loop */}
      <button
        onClick={toggleLoop}
        aria-pressed={loop}
        title={loop ? 'Looping the pattern — click to play it once' : 'Play the pattern once — click to loop'}
        className={`px-2 py-1 min-h-7 rounded-md text-xs font-medium transition-colors cursor-pointer shrink-0 ${
          loop
            ? 'bg-accent-blue/20 text-accent-blue-fg border border-accent-blue/40'
            : 'bg-bg-cell text-text-muted border border-border-control'
        }`}
      >
        LOOP
      </button>

      {/* Follow playhead */}
      <button
        onClick={() => setFollowPlayhead(!followPlayhead)}
        aria-pressed={followPlayhead}
        title={followPlayhead ? 'The grid scrolls to keep the playing step in view — click to stop following' : 'Keep the playing step in view while playing'}
        className={`px-2 py-1 min-h-7 rounded-md text-xs font-medium transition-colors cursor-pointer shrink-0 ${
          followPlayhead
            ? 'bg-accent-blue/20 text-accent-blue-fg border border-accent-blue/40'
            : 'bg-bg-cell text-text-muted border border-border-control'
        }`}
      >
        FOLLOW
      </button>

      {/* Right cluster: FX + meter */}
      <div className="ml-auto flex items-center gap-2 shrink-0 pl-2">
        <LevelMeter />
        <div className="relative">
          <button
            onClick={() => setMixerOpen(v => !v)}
            title="Mixer & effects — reverb, delay, master bus"
            aria-label="Mixer and effects"
            aria-expanded={mixerOpen}
            aria-haspopup="dialog"
            className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider border cursor-pointer transition-colors ${
              mixerOpen
                ? 'bg-accent-cyan/25 text-accent-cyan-fg border-accent-cyan/50'
                : 'bg-accent-cyan/10 text-accent-cyan-fg border-accent-cyan/30 hover:bg-accent-cyan/20'
            }`}
          >
            FX
          </button>
          {mixerOpen && <MixerPanel onClose={closeMixer} />}
        </div>
      </div>
    </div>
  );
}
