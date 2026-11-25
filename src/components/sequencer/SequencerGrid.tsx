import { useState, useEffect, useCallback } from 'react';
import { useSequencerStore } from '../../store/useSequencerStore';
import { useUIStore } from '../../store/useUIStore';
import { useGridFocusStore } from '../../store/useGridFocusStore';
import { Popover } from '../common/Popover';
import { announce } from '../../utils/announce';
import { DRUM_KIT, DRUM_KITS, SYNTH_PRESETS } from '../../constants';
import type { SynthType } from '../../types';
import { DrumTrack } from './DrumTrack';
import { MelodicTrack } from './MelodicTrack';
import { StepRuler } from './StepRuler';

const SYNTH_OPTIONS: { type: SynthType; label: string; color: string }[] = [
  { type: 'synth', label: 'Basic Synth', color: '#a855f7' },
  { type: 'fmSynth', label: 'FM Synth', color: '#3b82f6' },
  { type: 'amSynth', label: 'AM Synth', color: '#06b6d4' },
  { type: 'monoSynth', label: 'Mono Synth', color: '#22c55e' },
];

export function SequencerGrid() {
  const patterns = useSequencerStore(s => s.patterns);
  const activePatternId = useSequencerStore(s => s.activePatternId);
  const addDrumTrack = useSequencerStore(s => s.addDrumTrack);
  const removeDrumTrack = useSequencerStore(s => s.removeDrumTrack);
  const addMelodicTrack = useSequencerStore(s => s.addMelodicTrack);
  const removeMelodicTrack = useSequencerStore(s => s.removeMelodicTrack);
  const fillAllDrums = useSequencerStore(s => s.fillAllDrums);
  const fillAllSynths = useSequencerStore(s => s.fillAllSynths);
  const applyDrumKit = useSequencerStore(s => s.applyDrumKit);
  const applySynthPreset = useSequencerStore(s => s.applySynthPreset);
  const activePattern = patterns.find(p => p.id === activePatternId) || patterns[0];
  const drumKitId = activePattern?.kitId ?? 'classic';

  const studioTab = useUIStore(s => s.studioTab);
  const isCompact = (activePattern?.stepResolution ?? '16n') === '32n';
  const stepsPerMeasure = (() => {
    const beats = (activePattern?.timeSignature ?? '4/4') === '3/4' ? 3 : 4;
    const subs = isCompact ? 8 : 4;
    return beats * subs;
  })();
  const [showDrumPicker, setShowDrumPicker] = useState(false);
  const [showSynthPicker, setShowSynthPicker] = useState(false);
  const [drumsCollapsed, setDrumsCollapsed] = useState(false);
  const [synthsCollapsed, setSynthsCollapsed] = useState(false);
  const setGridFocus = useGridFocusStore(s => s.setGridFocus);
  const setDrumStep = useSequencerStore(s => s.setDrumStep);
  const setMelodicStep = useSequencerStore(s => s.setMelodicStep);

  // Keep the grid's single Tab stop on a cell that exists and is visible
  const visibleTrackIds = [
    ...(drumsCollapsed ? [] : activePattern.drumTracks.map(t => t.id)),
    ...(synthsCollapsed ? [] : activePattern.melodicTracks.map(t => t.id)),
  ];
  const visibleKey = visibleTrackIds.join('|');
  useEffect(() => {
    const ids = visibleKey ? visibleKey.split('|') : [];
    if (ids.length === 0) return;
    const { trackId, step } = useGridFocusStore.getState();
    const valid = trackId !== null && ids.includes(trackId);
    const clamped = Math.min(step, activePattern.numSteps - 1);
    if (!valid) setGridFocus(ids[0], 0);
    else if (clamped !== step) setGridFocus(trackId, clamped);
  }, [visibleKey, activePattern.numSteps, setGridFocus]);

  /** Arrow keys move between cells; Delete clears. Enter is handled by each cell. */
  const handleGridKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (!target.dataset || target.dataset.cell === undefined) return;
    const trackId = target.dataset.track!;
    const step = Number(target.dataset.step);
    const kind = target.dataset.cell;
    const root = e.currentTarget;
    const sel = (t: string, s: number) =>
      root.querySelector<HTMLElement>(`[data-cell][data-track="${CSS.escape(t)}"][data-step="${s}"]`);
    let next: HTMLElement | null = null;

    switch (e.key) {
      case 'ArrowRight': next = sel(trackId, step + 1); break;
      case 'ArrowLeft': next = sel(trackId, step - 1); break;
      case 'Home': next = sel(trackId, 0); break;
      case 'End': {
        const row = root.querySelectorAll<HTMLElement>(`[data-cell][data-track="${CSS.escape(trackId)}"]`);
        next = row[row.length - 1] ?? null;
        break;
      }
      case 'ArrowUp':
      case 'ArrowDown': {
        const column = Array.from(root.querySelectorAll<HTMLElement>(`[data-cell][data-step="${step}"]`));
        const i = column.indexOf(target);
        next = column[i + (e.key === 'ArrowDown' ? 1 : -1)] ?? null;
        break;
      }
      case 'Delete':
      case 'Backspace':
        e.preventDefault();
        if (kind === 'drum') setDrumStep(trackId, step, 0);
        else setMelodicStep(trackId, step, null);
        announce('Step cleared');
        return;
      default:
        return;
    }
    e.preventDefault();
    if (next) {
      setGridFocus(next.dataset.track!, Number(next.dataset.step));
      next.focus();
    }
  }, [setDrumStep, setMelodicStep, setGridFocus]);

  // Clicking a cell moves the Tab stop there too
  const handleGridFocus = useCallback((e: React.FocusEvent<HTMLDivElement>) => {
    const t = e.target as HTMLElement;
    if (t.dataset && t.dataset.cell !== undefined) setGridFocus(t.dataset.track!, Number(t.dataset.step));
  }, [setGridFocus]);

  const handleAddDrum = (kit: typeof DRUM_KIT[number]) => {
    addDrumTrack(kit.key, kit.name, kit.color);
    setShowDrumPicker(false);
  };

  const handleAddSynth = (option: typeof SYNTH_OPTIONS[number]) => {
    const count = activePattern.melodicTracks.length + 1;
    addMelodicTrack(option.type, `${option.label} ${count}`);
    setShowSynthPicker(false);
  };

  const handleAddPresetSynth = (presetId: string) => {
    const preset = SYNTH_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    addMelodicTrack(preset.synthType, preset.name);
    // The new track is appended last — apply the preset to it
    const pattern = useSequencerStore.getState().getActivePattern();
    const newTrack = pattern.melodicTracks[pattern.melodicTracks.length - 1];
    if (newTrack) applySynthPreset(newTrack.id, preset.id);
    setShowSynthPicker(false);
  };

  const handleKitChange = (kitId: string) => {
    applyDrumKit(kitId);
  };

  return (
    <section aria-labelledby="sequencer-heading" className="flex flex-col min-h-0 flex-1" data-sequencer-grid>
      <h2 id="sequencer-heading" className="sr-only">Sequencer, pattern {activePattern.name}</h2>
      <p id="grid-instructions" className="sr-only">
        Arrow keys move between steps. Enter turns a drum step on or off, or opens the note editor for a synth step.
        Shift+Enter changes velocity. Delete clears a step. Space plays and stops.
      </p>
      <div
        className="px-6 py-3 flex flex-col gap-3 overflow-auto min-h-0 flex-1"
        onKeyDown={handleGridKeyDown}
        onFocus={handleGridFocus}
      >
        <StepRuler numSteps={activePattern.numSteps} stepsPerMeasure={stepsPerMeasure} compact={isCompact} />

        {/* Drums section */}
        <div>
          <div className={`w-full flex items-center gap-2 px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors ${
            studioTab === 'beats'
              ? 'bg-accent-amber/20 text-accent-amber-fg border border-accent-amber/40'
              : 'bg-bg-tertiary text-text-secondary border border-transparent'
          }`}>
            <h3 className="flex items-center">
            <button
              onClick={() => setDrumsCollapsed(!drumsCollapsed)}
              aria-expanded={!drumsCollapsed}
              className="flex items-center gap-2 min-h-6 cursor-pointer uppercase font-semibold tracking-wider"
            >
              <svg
                aria-hidden="true"
                className={`w-3 h-3 shrink-0 transition-transform ${drumsCollapsed ? '' : 'rotate-90'}`}
                viewBox="0 0 12 12"
                fill="currentColor"
              >
                <path d="M4 2l5 4-5 4V2z" />
              </svg>
              Drums
            </button>
            </h3>
            <label className="flex items-center gap-1.5 ml-3 normal-case tracking-normal font-normal">
              <span className="text-[11px]">Kit</span>
              <select
                value={drumKitId}
                onChange={(e) => handleKitChange(e.target.value)}
                title={DRUM_KITS.find(k => k.id === drumKitId)?.description}
                className="bg-bg-primary/60 border border-current rounded px-1.5 py-1 text-[11px] font-semibold cursor-pointer text-inherit"
              >
                {DRUM_KITS.map(k => (
                  <option key={k.id} value={k.id}>{k.name}</option>
                ))}
              </select>
            </label>
            <span className="text-[11px] font-normal normal-case tracking-normal ml-auto">
              {activePattern.drumTracks.length} {activePattern.drumTracks.length === 1 ? 'track' : 'tracks'}
            </span>
          </div>

          {!drumsCollapsed && (
            <div className="flex flex-col gap-2 mt-2">
              {activePattern.drumTracks.map(track => (
                <DrumTrack
                  key={track.id}
                  track={track}
                  onRemove={() => removeDrumTrack(track.id)}
                  stepsPerMeasure={stepsPerMeasure}
                  compact={isCompact}
                />
              ))}

              {/* Add drum button */}
              <div className="relative flex items-center gap-2">
                <button
                  onClick={() => { setShowDrumPicker(!showDrumPicker); setShowSynthPicker(false); }}
                  aria-expanded={showDrumPicker}
                  aria-haspopup="dialog"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-text-muted hover:text-text-primary bg-bg-cell hover:bg-bg-cell-hover border border-border/30 hover:border-border/60 cursor-pointer transition-colors"
                >
                  <span aria-hidden="true" className="text-sm leading-none">+</span> Add Drum
                </button>
                <button
                  onClick={fillAllDrums}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-text-muted hover:text-accent-purple-fg bg-bg-cell hover:bg-accent-purple/15 border border-border/30 hover:border-accent-purple/40 cursor-pointer transition-colors"
                  title="Fill blank bars on all drum tracks"
                >
                  Fill All Drums
                </button>
                {showDrumPicker && (
                  <Popover label="Add a drum" onClose={() => setShowDrumPicker(false)} className="absolute top-9 left-0 z-50 bg-bg-secondary border border-border-control rounded-lg p-2 shadow-xl min-w-40">
                    <div className="flex flex-col gap-1">
                      {DRUM_KIT.map(kit => (
                        <button
                          key={kit.key}
                          onClick={() => handleAddDrum(kit)}
                          className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-text-primary hover:bg-bg-cell cursor-pointer transition-colors text-left"
                        >
                          <div aria-hidden="true" className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: kit.color }} />
                          {kit.name}
                        </button>
                      ))}
                    </div>
                  </Popover>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Synth section */}
        <div>
          <h3>
          <button
            onClick={() => setSynthsCollapsed(!synthsCollapsed)}
            aria-expanded={!synthsCollapsed}
            className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider cursor-pointer transition-colors ${
              studioTab === 'harmony'
                ? 'bg-accent-purple/20 text-accent-purple-fg border border-accent-purple/40'
                : 'bg-bg-tertiary text-text-secondary border border-transparent'
            }`}
          >
            <svg
              aria-hidden="true"
              className={`w-3 h-3 shrink-0 transition-transform ${synthsCollapsed ? '' : 'rotate-90'}`}
              viewBox="0 0 12 12"
              fill="currentColor"
            >
              <path d="M4 2l5 4-5 4V2z" />
            </svg>
            Synth
            <span className="text-[11px] font-normal normal-case tracking-normal ml-auto">
              <span className="sr-only">, </span>{activePattern.melodicTracks.length} {activePattern.melodicTracks.length === 1 ? 'track' : 'tracks'}
            </span>
          </button>
          </h3>

          {!synthsCollapsed && (
            <div className="flex flex-col gap-2 mt-2">
              {activePattern.melodicTracks.map(track => (
                <MelodicTrack
                  key={track.id}
                  track={track}
                  onRemove={() => removeMelodicTrack(track.id)}
                  stepsPerMeasure={stepsPerMeasure}
                  compact={isCompact}
                />
              ))}

              {/* Add synth button */}
              <div className="relative flex items-center gap-2">
                <button
                  onClick={() => { setShowSynthPicker(!showSynthPicker); setShowDrumPicker(false); }}
                  aria-expanded={showSynthPicker}
                  aria-haspopup="dialog"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-text-muted hover:text-text-primary bg-bg-cell hover:bg-bg-cell-hover border border-border/30 hover:border-border/60 cursor-pointer transition-colors"
                >
                  <span aria-hidden="true" className="text-sm leading-none">+</span> Add Synth
                </button>
                <button
                  onClick={fillAllSynths}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-text-muted hover:text-accent-purple-fg bg-bg-cell hover:bg-accent-purple/15 border border-border/30 hover:border-accent-purple/40 cursor-pointer transition-colors"
                  title="Fill blank bars on all synth tracks"
                >
                  Fill All Synths
                </button>
                {showSynthPicker && (
                  <Popover label="Add a synth" onClose={() => setShowSynthPicker(false)} className="absolute top-9 left-0 z-50 bg-bg-secondary border border-border-control rounded-lg p-2 shadow-xl min-w-56">
                    <h4 id="synth-presets-heading" className="text-[11px] font-normal uppercase tracking-widest text-text-muted px-2 pb-1">Presets</h4>
                    <div role="group" aria-labelledby="synth-presets-heading" className="grid grid-cols-2 gap-1 mb-2">
                      {SYNTH_PRESETS.map(preset => (
                        <button
                          key={preset.id}
                          onClick={() => handleAddPresetSynth(preset.id)}
                          title={preset.description}
                          className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-text-primary hover:bg-accent-purple/20 cursor-pointer transition-colors text-left"
                        >
                          <div aria-hidden="true" className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: SYNTH_OPTIONS.find(o => o.type === preset.synthType)?.color }} />
                          {preset.name}
                        </button>
                      ))}
                    </div>
                    <h4 id="synth-blank-heading" className="text-[11px] font-normal uppercase tracking-widest text-text-muted px-2 pb-1 border-t border-border/50 pt-2">Blank engine</h4>
                    <div role="group" aria-labelledby="synth-blank-heading" className="flex flex-col gap-1">
                      {SYNTH_OPTIONS.map(option => (
                        <button
                          key={option.type}
                          onClick={() => handleAddSynth(option)}
                          className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-text-primary hover:bg-bg-cell cursor-pointer transition-colors text-left"
                        >
                          <div aria-hidden="true" className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: option.color }} />
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </Popover>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
