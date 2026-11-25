import { withUndoGroup } from '../../store/history';
import { announce } from '../../utils/announce';
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import * as Tone from 'tone';
import { BEATS, DEFAULT_DRUM_PARAMS, DRUM_KIT } from '../../constants';
import {
  BEAT_ABOUT_GROOVE, BEAT_SONGS, BUILDING_BLOCKS, FILL_PATTERNS,
  CUSTOM_BEAT_PRESETS, CUSTOM_BEAT_OPTIONS,
} from '../../constants/beatContent';
import type { BuildingBlock, FillPattern } from '../../constants/beatContent';
import type { StepValue } from '../../types';
import { useTheoryStore } from '../../store/useTheoryStore';
import { useTransportStore } from '../../store/useTransportStore';
import { useSequencerStore } from '../../store/useSequencerStore';
import { AudioEngine } from '../../audio/AudioEngine';
import { CollapsibleSection } from './CollapsibleSection';

// ── Variation type ─────────────────────────────────────────────────────
type Variation = 'basic' | 'variation' | 'fill';

// ── Helper: merge step layers with OR logic ────────────────────────────
function mergeStepLayers(layers: Record<string, number[]>[]): Record<string, number[]> {
  const merged: Record<string, number[]> = {};
  for (const layer of layers) {
    for (const [inst, steps] of Object.entries(layer)) {
      if (!merged[inst]) {
        merged[inst] = [...steps];
      } else {
        for (let i = 0; i < steps.length; i++) {
          if (steps[i]) merged[inst][i] = 1;
        }
      }
    }
  }
  return merged;
}

// ── Instrument color map for rhythm visualization ──────────────────────
const INST_COLORS: Record<string, string> = {
  kick: '#f97316', 'tom-low': '#3b82f6', 'tom-mid': '#ef4444', 'tom-high': '#f59e0b',
  snare: '#06b6d4', clap: '#f59e0b',
  'hihat-closed': '#22c55e', 'hihat-open': '#a855f7',
  crash: '#d946ef', ride: '#14b8a6', rim: '#ec4899',
};

function getInstColor(inst: string): string {
  return INST_COLORS[inst] ?? '#888';
}

// ════════════════════════════════════════════════════════════════════════
// BeatExplorer Component
// ════════════════════════════════════════════════════════════════════════

export function BeatExplorer() {
  const selectedBeat = useTheoryStore(s => s.selectedBeat);
  const setSelectedBeat = useTheoryStore(s => s.setSelectedBeat);
  const bpm = useTransportStore(s => s.bpm);
  const setBpm = useTransportStore(s => s.setBpm);

  const activeTimeSignature = useSequencerStore(s => {
    const p = s.patterns.find(p => p.id === s.activePatternId) || s.patterns[0];
    return p?.timeSignature ?? '4/4';
  });
  const activeNumSteps = useSequencerStore(s => {
    const p = s.patterns.find(p => p.id === s.activePatternId) || s.patterns[0];
    return p?.numSteps ?? 32;
  });

  // ── Playback state ───────────────────────────────────────────────────
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const scheduleRef = useRef<number | null>(null);

  // ── Variation state (Feature C) ──────────────────────────────────────
  const [variation, setVariation] = useState<Variation>('variation');

  // ── Groove builder state (Feature F) ─────────────────────────────────
  const [grooveBlocks, setGrooveBlocks] = useState<BuildingBlock[]>([]);

  // ── Custom beat state (Feature H) ────────────────────────────────────
  const [customKick, setCustomKick] = useState('four-on-floor');
  const [customSnare, setCustomSnare] = useState('backbeat');
  const [customHihat, setCustomHihat] = useState('8ths-closed');
  const [customAccent, setCustomAccent] = useState('none');

  // ── Derived: variation steps ─────────────────────────────────────────
  const variationSteps = useMemo(() => {
    const fullSteps = selectedBeat.tracks;
    const isTriplet = selectedBeat.timeSignature === '4/4' && selectedBeat.subdivision === 24;
    const stepsPerBar = isTriplet ? 12 : selectedBeat.subdivision / 2;

    if (variation === 'basic') {
      // Bar 1 only
      return fullSteps.map(t => ({
        ...t,
        steps: t.steps.slice(0, stepsPerBar),
      }));
    }
    if (variation === 'fill') {
      // Bar 1 + generated fill bar
      return fullSteps.map(t => {
        const bar1 = t.steps.slice(0, stepsPerBar);
        // Generate a fill: increase density in the last half of bar 2
        const fillBar = new Array(stepsPerBar).fill(false);
        if (t.instrument === 'snare' || t.instrument === 'clap') {
          // Build up snare in the second half
          for (let i = Math.floor(stepsPerBar / 2); i < stepsPerBar; i++) {
            fillBar[i] = true;
          }
        } else if (t.instrument === 'kick') {
          // Sparse kick in fill
          fillBar[0] = true;
          fillBar[stepsPerBar - 1] = true;
        } else {
          // Copy bar 1 for other instruments
          for (let i = 0; i < stepsPerBar; i++) fillBar[i] = bar1[i];
        }
        return { ...t, steps: [...bar1, ...fillBar] };
      });
    }
    // variation = 'variation' — full 2-bar
    return fullSteps;
  }, [selectedBeat, variation]);

  const totalDisplaySteps = variation === 'basic'
    ? (selectedBeat.timeSignature === '4/4' && selectedBeat.subdivision === 24 ? 12 : selectedBeat.subdivision / 2)
    : selectedBeat.subdivision;

  const isTripletBeat = selectedBeat.timeSignature === '4/4' && selectedBeat.subdivision === 24;
  const stepsPerBeat = isTripletBeat ? 3 : 4;
  const stepsPerBar = isTripletBeat ? 12 : selectedBeat.subdivision / 2;

  // ── Playback ─────────────────────────────────────────────────────────
  const stopBeat = useCallback(() => {
    if (scheduleRef.current !== null) {
      Tone.getTransport().clear(scheduleRef.current);
      scheduleRef.current = null;
    }
    if (Tone.getTransport().state === 'started') {
      Tone.getTransport().stop();
      Tone.getTransport().position = 0;
    }
    setIsPlaying(false);
    setCurrentStep(-1);
  }, []);

  const playBeat = useCallback(async () => {
    const engine = AudioEngine.getInstance();
    await engine.init();
    stopBeat();

    for (const track of variationSteps) {
      const params = DEFAULT_DRUM_PARAMS[track.instrument];
      if (params) engine.drumEngine.ensureSynth(track.instrument, params);
    }

    const totalSteps = variation === 'basic' ? stepsPerBar : selectedBeat.subdivision;
    const isTriplet = selectedBeat.timeSignature === '4/4' && totalSteps === 24;
    const notation = isTriplet ? '8t' : '16n';
    let step = 0;

    Tone.getTransport().bpm.value = bpm;

    const id = Tone.getTransport().scheduleRepeat((time) => {
      const s = step % totalSteps;
      for (const track of variationSteps) {
        if (track.steps[s]) engine.drumEngine.trigger(track.instrument, time);
      }
      Tone.getDraw().schedule(() => setCurrentStep(s), time);
      step++;
    }, notation);

    scheduleRef.current = id;
    Tone.getTransport().start();
    setIsPlaying(true);
  }, [selectedBeat, variationSteps, variation, stepsPerBar, bpm, stopBeat]);

  const applyToTrack = useCallback(() => withUndoGroup(() => {
    const { getActivePattern, setDrumSteps, addDrumTrack } = useSequencerStore.getState();
    let pattern = getActivePattern();

    for (const beatTrack of variationSteps) {
      let drumTrack = pattern.drumTracks.find(t => t.sampleKey === beatTrack.instrument);
      if (!drumTrack) {
        const kitInfo = DRUM_KIT.find(k => k.key === beatTrack.instrument);
        if (!kitInfo) continue;
        addDrumTrack(kitInfo.key, kitInfo.name, kitInfo.color);
        pattern = getActivePattern();
        drumTrack = pattern.drumTracks.find(t => t.sampleKey === beatTrack.instrument);
        if (!drumTrack) continue;
      }
      const steps: StepValue[] = new Array(pattern.numSteps).fill(0);
      for (let i = 0; i < pattern.numSteps; i++) {
        steps[i] = (beatTrack.steps[i % beatTrack.steps.length] ? 1 : 0) as StepValue;
      }
      setDrumSteps(drumTrack.id, steps);
    }
    announce(`${selectedBeat.name} written to the drum tracks`);
  }), [variationSteps, selectedBeat.name]);

  // Stop playback on beat/variation change
  useEffect(() => { if (isPlaying) stopBeat(); }, [selectedBeat, variation]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => stopBeat(), []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (isPlaying) Tone.getTransport().bpm.value = bpm; }, [bpm, isPlaying]);

  const canApply = selectedBeat.timeSignature === activeTimeSignature;
  const applyTooltip = canApply
    ? selectedBeat.subdivision !== activeNumSteps
      ? 'Pattern will be tiled to fit the sequencer grid'
      : 'Write this pattern to drum tracks (missing instruments will be added)'
    : `Switch sequencer to ${selectedBeat.timeSignature} to apply this pattern`;

  // ── Content lookups ──────────────────────────────────────────────────
  const aboutGroove = BEAT_ABOUT_GROOVE[selectedBeat.name];
  const songs = BEAT_SONGS[selectedBeat.name];

  // ── Groove builder merged pattern ────────────────────────────────────
  const grooveMerged = useMemo(() => {
    if (grooveBlocks.length === 0) return null;
    const layers = grooveBlocks.map(b => ({ [b.instrument]: b.steps }));
    return mergeStepLayers(layers);
  }, [grooveBlocks]);

  // ── Fill suggestions based on groove ─────────────────────────────────
  const fillSuggestions = useMemo((): FillPattern[] => {
    if (!grooveMerged) return [];
    const activeInstruments = new Set(Object.keys(grooveMerged));
    // Pick fills that use compatible instruments, max 3 with varied intensity
    const compatible = FILL_PATTERNS.filter(f => {
      const fillInstruments = Object.keys(f.steps);
      return fillInstruments.some(inst => activeInstruments.has(inst) || inst === 'snare' || inst === 'kick');
    });
    // Return up to 3, trying to vary intensity
    const result: FillPattern[] = [];
    for (const intensity of ['light', 'medium', 'heavy'] as const) {
      const match = compatible.find(f => f.intensity === intensity && !result.includes(f));
      if (match) result.push(match);
    }
    return result;
  }, [grooveMerged]);

  // ── Custom beat merged ───────────────────────────────────────────────
  const customMerged = useMemo(() => {
    const layers: Record<string, number[]>[] = [];
    const kickPreset = CUSTOM_BEAT_PRESETS.kick[customKick];
    const snarePreset = CUSTOM_BEAT_PRESETS.snare[customSnare];
    const hihatPreset = CUSTOM_BEAT_PRESETS.hihat[customHihat];
    const accentPreset = CUSTOM_BEAT_PRESETS.accent[customAccent];
    if (kickPreset) layers.push(kickPreset);
    if (snarePreset) layers.push(snarePreset);
    if (hihatPreset) layers.push(hihatPreset);
    if (accentPreset) layers.push(accentPreset);
    return mergeStepLayers(layers);
  }, [customKick, customSnare, customHihat, customAccent]);

  // ── Apply building-block or custom-beat merged pattern to tracks ─────
  const applyMergedToTrack = useCallback((merged: Record<string, number[]>) => withUndoGroup(() => {
    const { getActivePattern, setDrumSteps, addDrumTrack } = useSequencerStore.getState();
    let pattern = getActivePattern();

    for (const [instrument, blockSteps] of Object.entries(merged)) {
      let drumTrack = pattern.drumTracks.find(t => t.sampleKey === instrument);
      if (!drumTrack) {
        const kitInfo = DRUM_KIT.find(k => k.key === instrument);
        if (!kitInfo) continue;
        addDrumTrack(kitInfo.key, kitInfo.name, kitInfo.color);
        pattern = getActivePattern();
        drumTrack = pattern.drumTracks.find(t => t.sampleKey === instrument);
        if (!drumTrack) continue;
      }
      const steps: StepValue[] = new Array(pattern.numSteps).fill(0);
      for (let i = 0; i < pattern.numSteps; i++) {
        steps[i] = (blockSteps[i % blockSteps.length] ? 1 : 0) as StepValue;
      }
      setDrumSteps(drumTrack.id, steps);
    }
    announce('Written to the drum tracks');
  }), []);

  // ── Play a 16-step pattern (for building blocks, custom beat, fills) ─
  const playMergedPattern = useCallback(async (merged: Record<string, number[]>) => {
    const engine = AudioEngine.getInstance();
    await engine.init();
    stopBeat();

    for (const inst of Object.keys(merged)) {
      const params = DEFAULT_DRUM_PARAMS[inst];
      if (params) engine.drumEngine.ensureSynth(inst, params);
    }

    const totalSteps = 16;
    let step = 0;
    Tone.getTransport().bpm.value = bpm;

    const id = Tone.getTransport().scheduleRepeat((time) => {
      const s = step % totalSteps;
      for (const [inst, steps] of Object.entries(merged)) {
        if (steps[s]) engine.drumEngine.trigger(inst, time);
      }
      step++;
    }, '16n');

    scheduleRef.current = id;
    Tone.getTransport().start();
    setIsPlaying(true);
  }, [bpm, stopBeat]);

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════

  return (
    <div className="flex flex-col gap-4">
      {/* ── 1. Beat Explorer (existing) ────────────────────────────────── */}
      <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Beat Explorer</h3>

      {/* Beat selector */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-text-muted">Pattern</label>
        <select
          aria-label="Pattern"
          value={selectedBeat.name}
          onChange={(e) => {
            const beat = BEATS.find(b => b.name === e.target.value);
            if (beat) { setSelectedBeat(beat); setVariation('variation'); }
          }}
          className="px-3 py-1.5 bg-bg-cell border border-border rounded-md text-sm text-text-primary focus:outline-none focus:border-accent-green"
        >
          {BEATS.map(b => (
            <option key={b.name} value={b.name}>{b.name} ({b.timeSignature})</option>
          ))}
        </select>
      </div>

      {/* Beat name + buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="text-lg font-bold text-text-primary">{selectedBeat.name}</div>
        <button
          onClick={isPlaying ? stopBeat : playBeat}
          className={`px-3 py-1.5 rounded-md text-sm font-medium border cursor-pointer transition-colors ${
            isPlaying
              ? 'bg-accent-red/20 text-accent-red-fg border-accent-red/30 hover:bg-accent-red/30'
              : 'bg-accent-green/20 text-accent-green-fg border-accent-green/30 hover:bg-accent-green/30'
          }`}
        >
          {isPlaying ? 'Stop' : 'Play'}
        </button>
        <button
          onClick={applyToTrack}
          disabled={!canApply}
          className="px-3 py-1.5 rounded-md text-sm font-medium border cursor-pointer transition-colors bg-accent-green/20 text-accent-green-fg border-accent-green/30 hover:bg-accent-green/30 disabled:opacity-40 disabled:cursor-not-allowed"
          title={applyTooltip}
        >
          Apply to Track
        </button>
      </div>

      {/* ── 2. About This Groove (Feature A) ───────────────────────────── */}
      <div>
        <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">About this groove</h4>
        <p className="text-xs text-text-secondary leading-relaxed">{selectedBeat.description}</p>
        {aboutGroove && (
          <p className="text-xs text-text-secondary leading-relaxed mt-2">{aboutGroove}</p>
        )}
      </div>

      {/* ── 3. Songs with This Beat (Feature B) ────────────────────────── */}
      {songs && songs.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Songs with this beat</h4>
          <p className="text-xs text-text-secondary leading-relaxed">
            {songs.map((song, i) => (
              <span key={i}>
                {i > 0 && ' | '}
                <a href={song.url} target="_blank" rel="noopener noreferrer" className="text-accent underline">
                  {song.title}
                </a>
                {' '}(
                <span className="text-text-primary">{song.artist}</span>,{' '}
                <button
                  onClick={() => { setBpm(song.bpm); announce(`Tempo set to ${song.bpm} BPM`); }}
                  className="inline-flex items-center min-h-6 px-0.5 -my-1 text-accent-blue-fg font-bold underline decoration-dotted hover:decoration-solid cursor-pointer"
                  title={`Set BPM to ${song.bpm}`}
                  aria-label={`${song.bpm} BPM — set the tempo to ${song.bpm}`}
                >
                  {song.bpm} BPM
                </button>
                )
              </span>
            ))}
          </p>
        </div>
      )}

      {/* ── 4. Tags row (existing) ─────────────────────────────────────── */}
      <div className="flex gap-1.5 flex-wrap">
        <span className="px-2 py-0.5 rounded text-xs bg-accent-green/15 text-accent-green-fg border border-accent-green/20">
          {selectedBeat.genre}
        </span>
        <span className="px-2 py-0.5 rounded text-xs bg-bg-cell text-text-muted">
          {selectedBeat.timeSignature}
        </span>
        <span className="px-2 py-0.5 rounded text-xs bg-bg-cell text-text-muted">
          {selectedBeat.suggestedBpm.min}–{selectedBeat.suggestedBpm.max} BPM
        </span>
      </div>

      {/* ── 5. Variation controls (Feature C) ──────────────────────────── */}
      <div className="flex gap-1.5">
        {(['basic', 'variation', 'fill'] as Variation[]).map(v => (
          <button
            key={v}
            onClick={() => setVariation(v)}
            className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition-colors border ${
              variation === v
                ? 'bg-accent-purple/25 text-accent-purple-fg border-accent-purple/40'
                : 'bg-bg-cell text-text-secondary border-border hover:bg-bg-cell-hover'
            }`}
          >
            {v === 'basic' ? 'Basic' : v === 'variation' ? 'Variation' : 'Fill'}
          </button>
        ))}
      </div>

      {/* ── 6. Rhythm Map (Feature D — collapsible) ────────────────────── */}
      <CollapsibleSection title="Rhythm Map">
        <BeatTextAlternative tracks={variationSteps} total={totalDisplaySteps} stepsPerBeat={stepsPerBeat} />
        <div aria-hidden="true" className="flex flex-col gap-1.5">
          {variationSteps.map((track, ti) => (
            <div key={`${track.instrument}-${ti}`} className="flex items-center gap-1.5">
              <span className="w-7 shrink-0 text-[11px] text-text-muted font-mono text-right pr-0.5 truncate" title={track.label}>
                {track.label}
              </span>
              <div className="flex-1 flex h-3 rounded-sm overflow-hidden bg-bg-cell/30">
                {Array.from({ length: totalDisplaySteps }, (_, i) => {
                  const active = track.steps[i];
                  const isBeatStart = i % stepsPerBeat === 0;
                  const isOffbeat = i % stepsPerBeat !== 0;
                  return (
                    <div
                      key={i}
                      className="flex-1 relative"
                      style={{
                        borderLeft: isBeatStart && i > 0 ? '1px solid rgba(255,255,255,0.1)' : undefined,
                      }}
                    >
                      {active && (
                        <div
                          className="absolute inset-0.5 rounded-[1px]"
                          style={{ backgroundColor: getInstColor(track.instrument) }}
                          title={`${track.label} - ${isOffbeat ? 'syncopated' : `beat ${Math.floor(i / stepsPerBeat) + 1}`}`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {/* Legend */}
          <div className="flex flex-wrap gap-2 mt-1">
            {variationSteps.map((track, i) => (
              <div key={`${track.instrument}-${i}`} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-[1px]" style={{ backgroundColor: getInstColor(track.instrument) }} />
                <span className="text-[11px] text-text-muted">{track.label}</span>
              </div>
            ))}
          </div>
        </div>
      </CollapsibleSection>

      {/* ── 7. Grid Preview (existing, enhanced) ───────────────────────── */}
      <BeatTextAlternative tracks={variationSteps} total={totalDisplaySteps} stepsPerBeat={stepsPerBeat} />
      <div aria-hidden="true" className="flex flex-col gap-1 overflow-x-auto pb-1">
        {variationSteps.map((track, ti) => (
          <div key={`${track.instrument}-${ti}`} className="flex items-center gap-1">
            <span className="w-8 shrink-0 text-[11px] text-text-muted font-mono text-right pr-1">
              {track.label}
            </span>
            <div className="flex gap-px">
              {Array.from({ length: totalDisplaySteps }, (_, i) => {
                const active = track.steps[i];
                const isBeatStart = i % stepsPerBeat === 0;
                const isBarStart = i > 0 && i % stepsPerBar === 0;
                return (
                  <div
                    key={i}
                    className={`w-4 h-4 rounded-sm transition-colors ${isBarStart ? 'ml-2' : ''} ${
                      active
                        ? currentStep === i ? 'scale-110' : ''
                        : currentStep === i
                          ? 'bg-bg-cell-hover'
                          : isBeatStart ? 'bg-bg-cell' : 'bg-bg-cell/60'
                    }`}
                    style={active ? { backgroundColor: getInstColor(track.instrument) + (currentStep === i ? '' : 'b3') } : undefined}
                  />
                );
              })}
            </div>
          </div>
        ))}
        {/* Beat numbers */}
        <div className="flex items-center gap-1">
          <span className="w-8 shrink-0" />
          <div className="flex gap-px">
            {Array.from({ length: totalDisplaySteps }, (_, i) => {
              const isBarStart = i > 0 && i % stepsPerBar === 0;
              return (
                <div key={i} className={`w-4 h-3 flex items-center justify-center ${isBarStart ? 'ml-2' : ''}`}>
                  {i % stepsPerBeat === 0 && (
                    <span className="text-[11px] text-text-muted">
                      {Math.floor(i / stepsPerBeat) + 1}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 8. Building Blocks (Feature E) ─────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Building Blocks</h4>
        <div className="flex flex-wrap gap-1.5">
          {BUILDING_BLOCKS.map(block => (
            <div key={block.name} className="relative group">
            <button
              onClick={() => playMergedPattern({ [block.instrument]: block.steps })}
              className="relative flex flex-col items-center justify-center w-16 h-16 bg-bg-cell border border-border rounded-lg hover:border-accent-green/60 transition-colors cursor-pointer"
              title={block.description}
            >
              <span className="text-xs font-bold text-text-primary">{block.shortLabel}</span>
              <span className="text-[11px] text-text-muted"><span className="sr-only">, </span>{block.instrumentLabel}</span>
            </button>
            {/* Add to groove builder — shown on hover or keyboard focus */}
            <button
              onClick={() => {
                setGrooveBlocks(prev => [...prev, block]);
                announce(`Added ${block.name} to the groove builder`);
              }}
              aria-label={`Add ${block.name} to the groove builder`}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-accent-green text-on-accent text-sm font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity hover:bg-accent-green/80 cursor-pointer"
              title="Add to Groove Builder"
            >
              <span aria-hidden="true">+</span>
            </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── 9. Groove Builder (Feature F) ──────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Groove Builder</h4>
        {grooveBlocks.length === 0 ? (
          <p className="text-xs text-text-muted italic">
            Hover over or tab to a building block and press <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-accent-green text-on-accent text-[11px] font-bold leading-none align-text-bottom not-italic">+</span> to build a groove.
          </p>
        ) : (
          <>
            {/* Chips */}
            <div className="flex flex-wrap gap-1.5 min-h-[40px]">
              {grooveBlocks.map((block, i) => (
                <div
                  key={`${block.name}-${i}`}
                  className="flex items-center gap-1 bg-bg-cell border border-border rounded px-2 py-1 text-xs group"
                >
                  <span className="text-text-primary font-medium">{block.shortLabel}</span>
                  <span className="text-text-muted">({block.instrumentLabel})</span>
                  <button
                    onClick={() => setGrooveBlocks(prev => prev.filter((_, idx) => idx !== i))}
                    className="text-text-muted hover:text-red-400 ml-0.5 cursor-pointer transition-colors"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            {/* Mini grid preview of merged groove */}
            {grooveMerged && (
              <div className="flex flex-col gap-px">
                {Object.entries(grooveMerged).map(([inst, steps]) => (
                  <div key={inst} className="flex items-center gap-1">
                    <span className="w-7 shrink-0 text-[11px] text-text-muted font-mono text-right truncate">
                      {DRUM_KIT.find(k => k.key === inst)?.name?.slice(0, 4) ?? inst.slice(0, 4)}
                    </span>
                    <div className="flex gap-px">
                      {steps.map((s, i) => (
                        <div
                          key={i}
                          className={`w-3 h-3 rounded-[1px] ${i % 4 === 0 && i > 0 ? 'ml-0.5' : ''}`}
                          style={{ backgroundColor: s ? getInstColor(inst) + 'b3' : 'rgba(255,255,255,0.04)' }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Controls */}
            <div className="flex gap-2 items-center">
              <button
                onClick={() => grooveMerged && (isPlaying ? stopBeat() : playMergedPattern(grooveMerged))}
                className="px-3 py-1 rounded-md bg-accent-cyan/20 text-accent-cyan-fg text-xs font-medium border border-accent-cyan/30 hover:bg-accent-cyan/30 cursor-pointer transition-colors"
              >
                {isPlaying ? 'Stop' : 'Play Groove'}
              </button>
              <button
                onClick={() => grooveMerged && applyMergedToTrack(grooveMerged)}
                className="px-3 py-1 rounded-md bg-accent-green/20 text-accent-green-fg text-xs font-medium border border-accent-green/30 hover:bg-accent-green/30 cursor-pointer transition-colors"
              >
                Apply to Track
              </button>
              <button
                onClick={() => setGrooveBlocks([])}
                className="px-3 py-1 rounded-md bg-bg-cell text-text-muted text-xs hover:bg-bg-cell-hover cursor-pointer transition-colors"
              >
                Clear
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── 10. Fill Helper (Feature G) ────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Fill Helper</h4>
        {fillSuggestions.length === 0 ? (
          <p className="text-xs text-text-muted italic">Build a groove above to generate fill suggestions.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {fillSuggestions.map(fill => (
              <div key={fill.name} className="bg-bg-cell border border-border rounded-md p-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-text-primary">{fill.name}</span>
                  <span className="text-[11px] text-text-muted">{fill.duration} · {fill.intensity}</span>
                </div>
                <p className="text-[11px] text-text-secondary mt-1">{fill.description}</p>
                {/* Mini fill grid */}
                <div className="flex flex-col gap-px mt-1.5">
                  {Object.entries(fill.steps).map(([inst, steps]) => (
                    <div key={inst} className="flex items-center gap-1">
                      <span className="w-6 shrink-0 text-[11px] text-text-muted font-mono text-right truncate">
                        {inst.slice(0, 4)}
                      </span>
                      <div className="flex gap-px">
                        {steps.map((s, i) => (
                          <div
                            key={i}
                            className={`w-2.5 h-2.5 rounded-[1px] ${i % 4 === 0 && i > 0 ? 'ml-0.5' : ''}`}
                            style={{ backgroundColor: s ? getInstColor(inst) + 'b3' : 'rgba(255,255,255,0.04)' }}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-1.5">
                  <button
                    onClick={() => playMergedPattern(fill.steps)}
                    className="text-xs text-accent-blue-fg hover:underline cursor-pointer"
                  >
                    Play
                  </button>
                  <button
                    onClick={() => {
                      // Insert fill as additional blocks
                      for (const [inst, steps] of Object.entries(fill.steps)) {
                        const kitInfo = DRUM_KIT.find(k => k.key === inst);
                        setGrooveBlocks(prev => [...prev, {
                          name: fill.name,
                          shortLabel: fill.name.slice(0, 4),
                          instrument: inst,
                          instrumentLabel: kitInfo?.name ?? inst,
                          description: fill.description,
                          steps,
                        }]);
                      }
                    }}
                    className="text-xs text-accent-green-fg hover:underline cursor-pointer"
                  >
                    Insert
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 11. Custom Beat Explorer (Feature H — collapsible) ──────────── */}
      <CollapsibleSection title="Custom Beat">
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-text-secondary">Kick Pattern</label>
              <select
          aria-label="Kick Pattern"
                value={customKick}
                onChange={(e) => setCustomKick(e.target.value)}
                className="w-full px-2 py-1.5 bg-bg-cell border border-border rounded-md text-xs text-text-primary focus:outline-none focus:border-accent-green"
              >
                {CUSTOM_BEAT_OPTIONS.kick.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-text-secondary">Snare Pattern</label>
              <select
          aria-label="Snare Pattern"
                value={customSnare}
                onChange={(e) => setCustomSnare(e.target.value)}
                className="w-full px-2 py-1.5 bg-bg-cell border border-border rounded-md text-xs text-text-primary focus:outline-none focus:border-accent-green"
              >
                {CUSTOM_BEAT_OPTIONS.snare.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-text-secondary">Hi-Hat Pattern</label>
              <select
          aria-label="Hi-Hat Pattern"
                value={customHihat}
                onChange={(e) => setCustomHihat(e.target.value)}
                className="w-full px-2 py-1.5 bg-bg-cell border border-border rounded-md text-xs text-text-primary focus:outline-none focus:border-accent-green"
              >
                {CUSTOM_BEAT_OPTIONS.hihat.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-text-secondary">Accent</label>
              <select
          aria-label="Accent"
                value={customAccent}
                onChange={(e) => setCustomAccent(e.target.value)}
                className="w-full px-2 py-1.5 bg-bg-cell border border-border rounded-md text-xs text-text-primary focus:outline-none focus:border-accent-green"
              >
                {CUSTOM_BEAT_OPTIONS.accent.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Custom beat name */}
          <p className="text-[11px] text-text-muted">
            {[
              CUSTOM_BEAT_OPTIONS.kick.find(o => o.value === customKick)?.label,
              CUSTOM_BEAT_OPTIONS.snare.find(o => o.value === customSnare)?.label,
              CUSTOM_BEAT_OPTIONS.hihat.find(o => o.value === customHihat)?.label,
              CUSTOM_BEAT_OPTIONS.accent.find(o => o.value === customAccent)?.label,
            ].filter(l => l && l !== 'None').join(' + ')}
          </p>

          {/* Custom beat mini grid */}
          <div className="flex flex-col gap-px">
            {Object.entries(customMerged).map(([inst, steps]) => (
              <div key={inst} className="flex items-center gap-1">
                <span className="w-8 shrink-0 text-[11px] text-text-muted font-mono text-right truncate">
                  {DRUM_KIT.find(k => k.key === inst)?.name?.slice(0, 5) ?? inst.slice(0, 5)}
                </span>
                <div className="flex gap-px">
                  {steps.map((s, i) => (
                    <div
                      key={i}
                      className={`w-3.5 h-3.5 rounded-[1px] ${i % 4 === 0 && i > 0 ? 'ml-1' : ''}`}
                      style={{ backgroundColor: s ? getInstColor(inst) + 'b3' : 'rgba(255,255,255,0.04)' }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            <button
              onClick={() => isPlaying ? stopBeat() : playMergedPattern(customMerged)}
              className={`px-3 py-1 rounded-md text-xs font-medium border cursor-pointer transition-colors ${
                isPlaying
                  ? 'bg-accent-red/20 text-accent-red-fg border-accent-red/30 hover:bg-accent-red/30'
                  : 'bg-accent-green/20 text-accent-green-fg border-accent-green/30 hover:bg-accent-green/30'
              }`}
            >
              {isPlaying ? 'Stop' : 'Play'}
            </button>
            <button
              onClick={() => applyMergedToTrack(customMerged)}
              className="px-3 py-1 rounded-md bg-accent-green/20 text-accent-green-fg text-xs font-medium border border-accent-green/30 hover:bg-accent-green/30 cursor-pointer transition-colors"
            >
              Apply to Track
            </button>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}

/**
 * Screen reader version of the visual step previews: which beats each
 * instrument plays, e.g. "Kick: beat 1, beat 3, beat 4 and".
 */
function BeatTextAlternative({ tracks, total, stepsPerBeat }: {
  tracks: { label: string; steps: ArrayLike<number | boolean> }[];
  total: number;
  stepsPerBeat: number;
}) {
  const subNames = stepsPerBeat === 4 ? ['', ' e', ' and', ' a'] : stepsPerBeat === 3 ? ['', ' trip', ' let'] : null;
  const describe = (i: number) => {
    const beat = Math.floor(i / stepsPerBeat) + 1;
    const sub = i % stepsPerBeat;
    return subNames ? `${beat}${subNames[sub] ?? ''}` : `${beat}.${sub + 1}`;
  };
  return (
    <ul className="sr-only">
      {tracks.map((t, ti) => {
        const hits: string[] = [];
        for (let i = 0; i < total; i++) if (t.steps[i]) hits.push(describe(i));
        return <li key={ti}>{t.label}: {hits.length ? hits.join(', ') : 'silent'}</li>;
      })}
    </ul>
  );
}
