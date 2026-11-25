import { useState, useCallback, useMemo, memo } from 'react';
import { useTransportStore } from '../../store/useTransportStore';
import { useSequencerStore } from '../../store/useSequencerStore';
import { useUIStore } from '../../store/useUIStore';
import { useSongStore } from '../../store/useSongStore';
import { useAudioInit } from '../../audio/useAudioInit';
import type { Pattern } from '../../types';
import { PATTERN_COLORS } from '../../constants/patterns';
import { choosePlayMode, effectivePlayMode, togglePlayback } from '../../utils/playback';
import { RhythmRing } from '../common/RhythmRing';
import { ringFromPattern } from '../../utils/rhythmRing';
import { MixerPanel } from './MixerPanel';
import { TapTempo } from './TapTempo';
import { LevelMeter } from './LevelMeter';
import { LiveInputControl } from './LiveInputControl';

/** A pattern slot: a circle with a tiny ring of its own rhythm */
const PatternButton = memo(function PatternButton({ pattern, index, active, onPick }: {
  pattern: Pattern;
  index: number;
  active: boolean;
  onPick: (id: string) => void;
}) {
  const color = PATTERN_COLORS[pattern.id] ?? '#f97316';
  const ring = useMemo(() => ringFromPattern(pattern), [pattern]);
  return (
    <button
      onClick={() => onPick(pattern.id)}
      title={`Pattern ${pattern.name} (press ${index + 1})`}
      aria-pressed={active}
      aria-label={`Pattern ${pattern.name}`}
      aria-keyshortcuts={String(index + 1)}
      className="relative w-[34px] h-[34px] shrink-0 rounded-full bg-[#0f0f15] flex items-center justify-center font-display text-[11px] font-bold cursor-pointer transition-shadow"
      style={{
        border: active ? `1.5px solid ${color}` : '1px solid var(--color-border-soft)',
        boxShadow: active ? `0 0 14px ${color}8c` : undefined,
        color: active ? '#fff' : 'var(--color-text-secondary)',
      }}
    >
      <RhythmRing ring={ring} size={28} lit={active} className="absolute left-[2px] top-[2px] pointer-events-none" />
      <span className="relative">{pattern.name}</span>
    </button>
  );
});

export function TransportBar() {
  const { bpm, swing, state, loop, setBpm, setSwing, toggleLoop } = useTransportStore();
  const { ready, init } = useAudioInit();
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

  const [mixerOpen, setMixerOpen] = useState(false);

  const activePattern = patterns.find(p => p.id === activePatternId) || patterns[0];
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

  const closeMixer = useCallback(() => setMixerOpen(false), []);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 sm:px-6 py-2.5 bg-bg-tertiary border-b border-border shrink-0">
      <h2 className="sr-only">Transport</h2>

      {/* Pattern slots */}
      <div role="group" aria-label="Pattern" className="flex gap-1">
        {patterns.map((p, idx) => (
          <PatternButton key={p.id} pattern={p} index={idx} active={p.id === activePatternId} onPick={setActivePattern} />
        ))}
      </div>

      {/* Play / Stop: the only one in the app; the switch beside it picks pattern or song */}
      <div className="flex items-center gap-2.5">
        <button
          id="main-play"
          onClick={handlePlay}
          title={playing ? 'Stop (Space)' : mode === 'song' ? 'Play the song (Space)' : 'Loop the pattern (Space)'}
          aria-label={playing ? 'Stop' : mode === 'song' ? 'Play song' : 'Play pattern'}
          aria-keyshortcuts="Space"
          className="w-[42px] h-[42px] rounded-full flex items-center justify-center bg-[#3ddc84] text-bg-primary cursor-pointer shrink-0 transition-shadow"
          style={{
            boxShadow: playing
              ? '0 0 0 4px rgb(61 220 132 / 0.16), 0 0 22px rgb(61 220 132 / 0.5)'
              : '0 0 0 1px rgb(61 220 132 / 0.35)',
          }}
        >
          {playing ? (
            <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12"><rect x="1" y="1" width="10" height="10" rx="1.5" fill="currentColor" /></svg>
          ) : (
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14"><path d="M4 2.2v9.6L12 7z" fill="currentColor" /></svg>
          )}
        </button>
        <div role="group" aria-label="Play mode" className="seg">
          <button onClick={() => choosePlayMode('pattern')} aria-pressed={mode === 'pattern'} title="Play loops the selected pattern" className="seg-item">
            Pattern
          </button>
          <button
            onClick={() => choosePlayMode('song')}
            aria-pressed={mode === 'song'}
            aria-disabled={songBlocks === 0 || undefined}
            title={songBlocks === 0 ? 'Add blocks to the song to play it' : 'Play plays the song arrangement'}
            className="seg-item"
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
          className={`w-[30px] h-[30px] rounded-full flex items-center justify-center border transition-colors cursor-pointer shrink-0 disabled:cursor-not-allowed ${
            recording
              ? 'bg-accent-red border-accent-red text-white shadow-[0_0_16px_rgb(239_68_68/0.6)] animate-pulse'
              : 'bg-bg-cell border-border-soft text-accent-red-fg hover:bg-bg-cell-hover disabled:text-text-muted/50'
          }`}
        >
          <svg aria-hidden="true" width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4.5" fill="currentColor" /></svg>
        </button>

        {/* Scale lock, octave and MIDI keyboard */}
        <LiveInputControl />

        {/* Live keys indicator */}
        {armedTrack && (
          <div className="hidden lg:flex items-center gap-1.5 h-[30px] px-2.5 rounded-full border border-accent-red/50 bg-accent-red/10 text-[11px] text-text-secondary shrink-0">
            <span className="label-caps !text-accent-red-fg">Keys</span>
            <span className="truncate max-w-24 text-text-primary">{armedTrack.name}</span>
            <button onClick={() => setLiveOctave(liveOctave - 1)} aria-label="Live keys octave down" aria-keyshortcuts="Z" className="w-6 h-6 rounded-full text-text-secondary hover:text-text-primary hover:bg-bg-cell cursor-pointer" title="Octave down (Z)">−</button>
            <span className="font-mono text-text-primary" aria-live="polite" aria-label={`Octave ${liveOctave}`}>C{liveOctave}</span>
            <button onClick={() => setLiveOctave(liveOctave + 1)} aria-label="Live keys octave up" aria-keyshortcuts="X" className="w-6 h-6 rounded-full text-text-secondary hover:text-text-primary hover:bg-bg-cell cursor-pointer" title="Octave up (X)">+</button>
          </div>
        )}
      </div>

      <div className="flex-1" />

      {/* Tempo and swing */}
      <div className="flex items-center gap-2 shrink-0">
        <label htmlFor="transport-bpm" className="label-caps">BPM</label>
        <input
          id="transport-bpm"
          type="number"
          min={40}
          max={300}
          value={bpm}
          onChange={(e) => setBpm(parseInt(e.target.value) || 120)}
          className="w-[58px] h-[30px] px-1 bg-[#111118] border border-border-control rounded-md text-center font-mono text-sm font-bold text-white focus:border-text-primary"
        />
        <input
          type="range"
          min={40}
          max={300}
          value={bpm}
          aria-label="Tempo"
          aria-valuetext={`${bpm} BPM`}
          onChange={(e) => setBpm(parseInt(e.target.value))}
          className="w-20 h-6 accent-[#f4f4f8] hidden min-[1900px]:block"
        />
        <TapTempo />
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <label htmlFor="transport-swing" className="label-caps">Swing</label>
        <input
          id="transport-swing"
          type="number"
          min={0}
          max={75}
          value={Math.round(swing * 100)}
          onChange={(e) => setSwing((parseInt(e.target.value) || 0) / 100)}
          aria-describedby="transport-swing-unit"
          className="w-[52px] h-[30px] px-1 bg-[#111118] border border-border-control rounded-md text-center font-mono text-sm font-bold text-white focus:border-text-primary"
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
          className="w-16 h-6 accent-[#f4f4f8] hidden min-[1900px]:block"
        />
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={toggleLoop}
          aria-pressed={loop}
          title={loop ? 'Looping the pattern — click to play it once' : 'Play the pattern once — click to loop'}
          className="tog"
        >
          Loop
        </button>
        <button
          onClick={() => setFollowPlayhead(!followPlayhead)}
          aria-pressed={followPlayhead}
          title={followPlayhead ? 'The grid scrolls to keep the playing step in view — click to stop following' : 'Keep the playing step in view while playing'}
          className="tog"
        >
          Follow
        </button>
      </div>

      {/* Meter + mixer */}
      <div className="flex items-center gap-3 shrink-0">
        <LevelMeter />
        <div className="relative">
          <button
            onClick={() => setMixerOpen(v => !v)}
            title="Mixer and effects: reverb, delay, master bus"
            aria-expanded={mixerOpen}
            aria-haspopup="dialog"
            className={`pill ${mixerOpen ? '!border-text-primary !bg-[#2a2a3a] !text-white' : ''}`}
          >
            Mixer
          </button>
          {mixerOpen && <MixerPanel onClose={closeMixer} />}
        </div>
      </div>
    </div>
  );
}
