import { useState } from 'react';
import { useSequencerStore } from '../../store/useSequencerStore';
import { useUIStore } from '../../store/useUIStore';
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
    <div className="flex flex-col min-h-0 flex-1" data-sequencer-grid>
      <div className="px-6 py-3 flex flex-col gap-3 overflow-auto min-h-0 flex-1">
        <StepRuler numSteps={activePattern.numSteps} stepsPerMeasure={stepsPerMeasure} compact={isCompact} />

        {/* Drums section */}
        <div>
          <div className={`w-full flex items-center gap-2 px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors ${
            studioTab === 'beats'
              ? 'bg-accent-amber/20 text-accent-amber border border-accent-amber/40'
              : 'bg-bg-tertiary text-text-secondary border border-transparent'
          }`}>
            <button
              onClick={() => setDrumsCollapsed(!drumsCollapsed)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <svg
                className={`w-3 h-3 shrink-0 transition-transform ${drumsCollapsed ? '' : 'rotate-90'}`}
                viewBox="0 0 12 12"
                fill="currentColor"
              >
                <path d="M4 2l5 4-5 4V2z" />
              </svg>
              Drums
            </button>
            <label className="flex items-center gap-1.5 ml-3 normal-case tracking-normal font-normal">
              <span className="text-[10px] opacity-70">Kit</span>
              <select
                value={drumKitId}
                onChange={(e) => handleKitChange(e.target.value)}
                title={DRUM_KITS.find(k => k.id === drumKitId)?.description}
                className="bg-bg-primary/60 border border-current/30 rounded px-1.5 py-0.5 text-[11px] font-semibold cursor-pointer text-inherit focus:outline-none"
              >
                {DRUM_KITS.map(k => (
                  <option key={k.id} value={k.id}>{k.name}</option>
                ))}
              </select>
            </label>
            <span className="text-[10px] font-normal normal-case tracking-normal opacity-60 ml-auto">
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
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-text-muted hover:text-text-primary bg-bg-cell hover:bg-bg-cell-hover border border-border/30 hover:border-border/60 cursor-pointer transition-colors"
                >
                  <span className="text-sm leading-none">+</span> Add Drum
                </button>
                <button
                  onClick={fillAllDrums}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-text-muted hover:text-accent-purple bg-bg-cell hover:bg-accent-purple/15 border border-border/30 hover:border-accent-purple/40 cursor-pointer transition-colors"
                  title="Fill blank bars on all drum tracks"
                >
                  Fill All Drums
                </button>
                {showDrumPicker && (
                  <div className="absolute top-9 left-0 z-50 bg-bg-secondary border border-border rounded-lg p-2 shadow-xl min-w-40">
                    <div className="flex flex-col gap-1">
                      {DRUM_KIT.map(kit => (
                        <button
                          key={kit.key}
                          onClick={() => handleAddDrum(kit)}
                          className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-text-primary hover:bg-bg-cell cursor-pointer transition-colors text-left"
                        >
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: kit.color }} />
                          {kit.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Synth section */}
        <div>
          <button
            onClick={() => setSynthsCollapsed(!synthsCollapsed)}
            className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider cursor-pointer transition-colors ${
              studioTab === 'harmony'
                ? 'bg-accent-purple/20 text-accent-purple border border-accent-purple/40'
                : 'bg-bg-tertiary text-text-secondary border border-transparent'
            }`}
          >
            <svg
              className={`w-3 h-3 shrink-0 transition-transform ${synthsCollapsed ? '' : 'rotate-90'}`}
              viewBox="0 0 12 12"
              fill="currentColor"
            >
              <path d="M4 2l5 4-5 4V2z" />
            </svg>
            Synth
            <span className="text-[10px] font-normal normal-case tracking-normal opacity-60 ml-auto">
              {activePattern.melodicTracks.length} {activePattern.melodicTracks.length === 1 ? 'track' : 'tracks'}
            </span>
          </button>

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
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-text-muted hover:text-text-primary bg-bg-cell hover:bg-bg-cell-hover border border-border/30 hover:border-border/60 cursor-pointer transition-colors"
                >
                  <span className="text-sm leading-none">+</span> Add Synth
                </button>
                <button
                  onClick={fillAllSynths}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-text-muted hover:text-accent-purple bg-bg-cell hover:bg-accent-purple/15 border border-border/30 hover:border-accent-purple/40 cursor-pointer transition-colors"
                  title="Fill blank bars on all synth tracks"
                >
                  Fill All Synths
                </button>
                {showSynthPicker && (
                  <div className="absolute top-9 left-0 z-50 bg-bg-secondary border border-border rounded-lg p-2 shadow-xl min-w-56">
                    <div className="text-[9px] uppercase tracking-widest text-text-muted px-2 pb-1">Presets</div>
                    <div className="grid grid-cols-2 gap-1 mb-2">
                      {SYNTH_PRESETS.map(preset => (
                        <button
                          key={preset.id}
                          onClick={() => handleAddPresetSynth(preset.id)}
                          title={preset.description}
                          className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-text-primary hover:bg-accent-purple/20 cursor-pointer transition-colors text-left"
                        >
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: SYNTH_OPTIONS.find(o => o.type === preset.synthType)?.color }} />
                          {preset.name}
                        </button>
                      ))}
                    </div>
                    <div className="text-[9px] uppercase tracking-widest text-text-muted px-2 pb-1 border-t border-border/50 pt-2">Blank engine</div>
                    <div className="flex flex-col gap-1">
                      {SYNTH_OPTIONS.map(option => (
                        <button
                          key={option.type}
                          onClick={() => handleAddSynth(option)}
                          className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-text-primary hover:bg-bg-cell cursor-pointer transition-colors text-left"
                        >
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: option.color }} />
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
