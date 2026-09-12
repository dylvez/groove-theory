import { useState, useRef, useEffect, useMemo } from 'react';
import type { MelodicTrack as MelodicTrackType, NoteWithOctave, MelodicSynthParams, SynthType } from '../../types';
import { useSequencerStore } from '../../store/useSequencerStore';
import { useTheoryStore } from '../../store/useTheoryStore';
import { useTransportStore } from '../../store/useTransportStore';
import { useUIStore } from '../../store/useUIStore';
import { AudioEngine } from '../../audio/AudioEngine';
import { DEFAULT_MELODIC_PARAMS, SYNTH_PRESETS } from '../../constants';
import { TrackHeader, HeaderResizeHandle } from './TrackHeader';
import { MelodicSettingsPanel } from './TrackSettingsPanel';
import { velocityAlpha, SYNTH_COLORS } from '../../utils/stepDisplay';
import { getScaleNotes } from '../../utils/musicTheory';

interface MelodicTrackProps {
  track: MelodicTrackType;
  onRemove: () => void;
  stepsPerMeasure?: number;
  compact?: boolean;
}

const LENGTH_OPTIONS = [1, 2, 3, 4, 6, 8];

function findPresetName(track: MelodicTrackType): string | undefined {
  const p = track.synthParams;
  const match = SYNTH_PRESETS.find(pr =>
    pr.synthType === track.synthType &&
    pr.params.oscillatorType === p.oscillatorType &&
    Math.abs(pr.params.attack - p.attack) < 1e-6 &&
    Math.abs(pr.params.decay - p.decay) < 1e-6 &&
    Math.abs(pr.params.sustain - p.sustain) < 1e-6 &&
    Math.abs(pr.params.release - p.release) < 1e-6 &&
    (pr.params.filterCutoff ?? 0) === (p.filterCutoff ?? 0)
  );
  return match?.name;
}

export function MelodicTrack({ track, onRemove, stepsPerMeasure = 16, compact = false }: MelodicTrackProps) {
  const setMelodicStep = useSequencerStore(s => s.setMelodicStep);
  const setMelodicStepLength = useSequencerStore(s => s.setMelodicStepLength);
  const cycleMelodicVelocity = useSequencerStore(s => s.cycleMelodicVelocity);
  const muteTrack = useSequencerStore(s => s.muteTrack);
  const soloTrack = useSequencerStore(s => s.soloTrack);
  const renameTrack = useSequencerStore(s => s.renameTrack);
  const updateMelodicSynthParams = useSequencerStore(s => s.updateMelodicSynthParams);
  const setMelodicSynthType = useSequencerStore(s => s.setMelodicSynthType);
  const applySynthPreset = useSequencerStore(s => s.applySynthPreset);
  const setTrackVolume = useSequencerStore(s => s.setTrackVolume);
  const setTrackSends = useSequencerStore(s => s.setTrackSends);
  const setMelodicOctave = useSequencerStore(s => s.setMelodicOctave);
  const fillMelodicTrack = useSequencerStore(s => s.fillMelodicTrack);
  const rootNote = useTheoryStore(s => s.rootNote);
  const selectedScale = useTheoryStore(s => s.selectedScale);
  const currentStep = useTransportStore(s => s.currentStep);
  const isPlaying = useTransportStore(s => s.state) === 'playing';
  const armedTrackId = useUIStore(s => s.armedTrackId);
  const setArmedTrack = useUIStore(s => s.setArmedTrack);
  const armed = armedTrackId === track.id;

  const [activePopup, setActivePopup] = useState<number | null>(null);
  const [popupOctave, setPopupOctave] = useState(track.octave);
  const [showSettings, setShowSettings] = useState(false);

  // Last note placed on this track — used for drag painting
  const lastNoteRef = useRef<NoteWithOctave | null>(null);
  // Drag-paint state
  const paintRef = useRef<{ start: number; painted: boolean; erase: boolean } | null>(null);

  const scaleNotes = getScaleNotes(rootNote, selectedScale);
  const trackColor = SYNTH_COLORS[track.synthType] ?? '#a855f7';
  const presetName = useMemo(() => findPresetName(track), [track]);

  const defaultPaintNote = (): NoteWithOctave =>
    lastNoteRef.current ?? (`${rootNote}${track.octave}` as NoteWithOctave);

  // Which cells are "tails" of a longer note starting earlier
  const tails = useMemo(() => {
    const map = new Map<number, { color: string; velocity: number; last: boolean }>();
    track.steps.forEach((s, i) => {
      if (!s.active) return;
      const len = Math.max(1, s.length ?? 1);
      for (let k = 1; k < len && i + k < track.steps.length; k++) {
        if (track.steps[i + k].active) break;
        map.set(i + k, { color: trackColor, velocity: s.velocity, last: k === len - 1 });
      }
    });
    return map;
  }, [track.steps, trackColor]);

  // A mouseup anywhere ends any drag-paint gesture
  useEffect(() => {
    const onUp = () => { paintRef.current = null; };
    window.addEventListener('mouseup', onUp);
    return () => window.removeEventListener('mouseup', onUp);
  }, []);

  // Escape closes the note editor
  useEffect(() => {
    if (activePopup === null) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setActivePopup(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activePopup]);

  const openPopupFor = (stepIndex: number) => {
    const existingNote = track.steps[stepIndex].note;
    if (existingNote) {
      const match = existingNote.match(/\d+$/);
      if (match) setPopupOctave(parseInt(match[0]));
    } else {
      setPopupOctave(track.octave);
    }
    setActivePopup(stepIndex);
  };

  const handleStepClick = (stepIndex: number) => {
    if (track.steps[stepIndex].active) {
      setMelodicStep(track.id, stepIndex, null);
      setActivePopup(null);
    } else {
      if (activePopup === stepIndex) setActivePopup(null);
      else openPopupFor(stepIndex);
    }
  };

  const handlePointerDown = (i: number, e: React.MouseEvent) => {
    if (e.button === 2) {
      e.preventDefault();
      openPopupFor(i);
      paintRef.current = null;
      return;
    }
    if (e.shiftKey) {
      e.preventDefault();
      if (track.steps[i].active) cycleMelodicVelocity(track.id, i);
      paintRef.current = null;
      return;
    }
    paintRef.current = { start: i, painted: false, erase: track.steps[i].active };
  };

  /** Mouse released on a cell: a plain click (no drag) toggles / opens the editor */
  const handlePointerUp = (i: number) => {
    const p = paintRef.current;
    paintRef.current = null;
    if (p && !p.painted && p.start === i) handleStepClick(i);
  };

  const handlePointerEnter = (i: number) => {
    const p = paintRef.current;
    if (!p) return;
    if (!p.painted) {
      p.painted = true;
      setActivePopup(null);
      // Apply to the start cell as well
      if (p.erase) setMelodicStep(track.id, p.start, null);
      else if (!track.steps[p.start].active) setMelodicStep(track.id, p.start, defaultPaintNote(), { length: 1 });
    }
    if (p.erase) {
      if (track.steps[i].active) setMelodicStep(track.id, i, null);
    } else if (!track.steps[i].active) {
      setMelodicStep(track.id, i, defaultPaintNote(), { length: 1 });
    }
  };

  const handleNoteSelect = (stepIndex: number, note: NoteWithOctave) => {
    lastNoteRef.current = note;
    setMelodicStep(track.id, stepIndex, note);
    // Audition the note
    const engine = AudioEngine.getInstance();
    engine.init().then(() => {
      engine.prepareMelodicVoice(track.id, track.synthType, track.synthParams, track.volume, track.reverbSend ?? 0, track.delaySend ?? 0);
      engine.synthEngine.playNote(track.id, note, '8n', undefined, track.steps[stepIndex].velocity);
    });
    if (!track.steps[stepIndex].active) setActivePopup(null);
  };

  const handleVolumeChange = (db: number) => {
    setTrackVolume(track.id, 'melodic', db);
    AudioEngine.getInstance().setMelodicVolume(track.id, db);
  };

  const handleSendsChange = (reverb: number, delay: number) => {
    setTrackSends(track.id, 'melodic', reverb, delay);
    AudioEngine.getInstance().setMelodicSends(track.id, reverb, delay);
  };

  const handleParamChange = (partial: Partial<MelodicSynthParams>) => {
    updateMelodicSynthParams(track.id, partial);
    const newParams = { ...track.synthParams, ...partial };
    AudioEngine.getInstance().updateMelodicParams(track.id, newParams);
  };

  const handleSynthTypeChange = (synthType: SynthType) => {
    setMelodicSynthType(track.id, synthType);
    AudioEngine.getInstance().changeMelodicSynthType(track.id, synthType, track.synthParams);
  };

  const handlePresetChange = (presetId: string) => {
    applySynthPreset(track.id, presetId);
  };

  const handleReset = () => {
    const defaults = { ...DEFAULT_MELODIC_PARAMS };
    updateMelodicSynthParams(track.id, defaults);
    AudioEngine.getInstance().updateMelodicParams(track.id, defaults);
  };

  const handleAudition = async () => {
    const engine = AudioEngine.getInstance();
    await engine.init();
    engine.prepareMelodicVoice(track.id, track.synthType, track.synthParams, track.volume, track.reverbSend ?? 0, track.delaySend ?? 0);
    engine.synthEngine.playNote(track.id, `${rootNote}${track.octave}`, '4n', undefined, 0.8);
  };

  const handleToggleArm = async () => {
    if (armed) {
      setArmedTrack(null);
    } else {
      const engine = AudioEngine.getInstance();
      await engine.init();
      engine.prepareMelodicVoice(track.id, track.synthType, track.synthParams, track.volume, track.reverbSend ?? 0, track.delaySend ?? 0);
      setArmedTrack(track.id);
    }
  };

  const cellW = compact ? 'w-4' : 'w-9';
  const cellH = compact ? 'h-8' : 'h-9';

  return (
    <div className="flex items-center gap-1 relative">
      <TrackHeader
        name={track.name}
        color={trackColor}
        muted={track.muted}
        solo={track.solo}
        onMute={() => muteTrack(track.id, 'melodic')}
        onSolo={() => soloTrack(track.id, 'melodic')}
        onRemove={onRemove}
        onRename={(newName) => renameTrack(track.id, 'melodic', newName)}
        onOpenSettings={() => setShowSettings(!showSettings)}
        settingsOpen={showSettings}
        onFill={() => fillMelodicTrack(track.id)}
        armed={armed}
        onToggleArm={handleToggleArm}
        subtitle={presetName ?? undefined}
      />
      <HeaderResizeHandle />
      <div className={`flex ${compact ? 'gap-0.5' : 'gap-1'} relative`}>
        {track.steps.map((step, i) => {
          const isCurrent = isPlaying && currentStep === i;
          const stepsPerBeat = compact ? 8 : 4;
          const isBeatStart = i % stepsPerBeat === 0;
          const isBarStart = i % stepsPerMeasure === 0 && i > 0;
          const octaveDigit = step.note?.match(/\d+$/)?.[0];
          const tail = !step.active ? tails.get(i) : undefined;
          const len = Math.max(1, step.length ?? 1);
          const hasTail = step.active && len > 1 && i + 1 < track.steps.length && !track.steps[i + 1].active;

          return (
            <div key={i} className={`relative ${isBarStart ? 'ml-2' : ''}`}>
              <button
                onMouseDown={(e) => handlePointerDown(i, e)}
                onMouseUp={() => handlePointerUp(i)}
                onMouseEnter={() => handlePointerEnter(i)}
                onContextMenu={(e) => e.preventDefault()}
                title={
                  step.active
                    ? `${step.note} · ${len} step${len > 1 ? 's' : ''} · vel ${Math.round(step.velocity * 100)}%\nClick to clear · right-click to edit · shift+click for velocity`
                    : tail ? 'Held note — right-click the note to change its length' : 'Click to pick a note · drag to paint · right-click to edit'
                }
                className={`${cellW} ${cellH} border text-[10px] font-medium transition-all duration-75 cursor-pointer select-none relative ${
                  hasTail ? 'rounded-l-md rounded-r-none border-r-0' : tail ? (tail.last ? 'rounded-r-md rounded-l-none border-l-0' : 'rounded-none border-l-0 border-r-0') : 'rounded-md'
                } ${
                  isCurrent ? 'ring-2 ring-white/70 z-10' : ''
                } ${
                  step.active
                    ? 'border-transparent text-white'
                    : tail
                    ? 'border-transparent'
                    : isBeatStart
                    ? 'bg-bg-cell-hover border-border/50 hover:border-border text-text-muted'
                    : 'bg-bg-cell border-border/30 hover:border-border/60 text-text-muted'
                }`}
                style={
                  step.active
                    ? { backgroundColor: `${trackColor}${velocityAlpha(step.velocity)}` }
                    : tail
                    ? { backgroundColor: `${tail.color}${velocityAlpha(tail.velocity * 0.45)}` }
                    : undefined
                }
              >
                {!compact && step.note ? (
                  <span className="flex flex-col items-center leading-none">
                    <span>{step.note.replace(/\d+$/, '')}</span>
                    <span className="text-[7px] opacity-60">{octaveDigit}</span>
                  </span>
                ) : ''}
              </button>

              {/* Note editor popup: octave, note, length */}
              {activePopup === i && (
                <div
                  className="absolute top-10 left-0 z-50 bg-bg-secondary border border-border rounded-lg p-2 shadow-xl min-w-36"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] uppercase tracking-wider text-text-muted">Step {i + 1}</span>
                    <button
                      onClick={() => setActivePopup(null)}
                      className="text-text-muted hover:text-text-primary text-xs cursor-pointer leading-none"
                    >
                      ×
                    </button>
                  </div>
                  {/* Octave selector */}
                  <div className="flex gap-1 mb-2">
                    {[2, 3, 4, 5, 6].map(oct => (
                      <button
                        key={oct}
                        onClick={() => setPopupOctave(oct)}
                        className={`w-6 h-6 rounded text-[10px] font-bold flex items-center justify-center cursor-pointer transition-colors ${
                          popupOctave === oct
                            ? 'bg-accent-purple text-white'
                            : 'bg-bg-cell text-text-muted hover:text-text-primary hover:bg-bg-cell-hover'
                        }`}
                      >
                        {oct}
                      </button>
                    ))}
                  </div>
                  {/* Scale notes grid */}
                  <div className="grid grid-cols-2 gap-1">
                    {scaleNotes.map((note, idx) => {
                      const full = `${note}${popupOctave}` as NoteWithOctave;
                      const isSet = step.note === full;
                      return (
                        <button
                          key={note}
                          onClick={() => handleNoteSelect(i, full)}
                          className={`px-2 py-1 text-xs rounded cursor-pointer transition-colors flex items-center justify-between gap-1 ${
                            isSet ? 'bg-accent-purple text-white' : 'bg-bg-cell hover:bg-accent-purple/30 text-text-primary'
                          }`}
                        >
                          <span>{note}</span>
                          <span className={`text-[9px] ${isSet ? 'text-white/70' : 'text-text-muted'}`}>{idx + 1}</span>
                        </button>
                      );
                    })}
                  </div>
                  {/* Length (only for active steps) */}
                  {step.active && (
                    <div className="mt-2 pt-2 border-t border-border/50">
                      <div className="text-[10px] uppercase tracking-wider text-text-muted mb-1">Length</div>
                      <div className="flex gap-1">
                        {LENGTH_OPTIONS.map(L => (
                          <button
                            key={L}
                            onClick={() => setMelodicStepLength(track.id, i, L)}
                            className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center cursor-pointer transition-colors ${
                              len === L ? 'bg-accent-cyan text-white' : 'bg-bg-cell text-text-muted hover:text-text-primary hover:bg-bg-cell-hover'
                            }`}
                          >
                            {L}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {showSettings && (
        <MelodicSettingsPanel
          synthType={track.synthType}
          synthParams={track.synthParams}
          volume={track.volume}
          octave={track.octave}
          reverbSend={track.reverbSend ?? 0}
          delaySend={track.delaySend ?? 0}
          onParamChange={handleParamChange}
          onVolumeChange={handleVolumeChange}
          onSendsChange={handleSendsChange}
          onSynthTypeChange={handleSynthTypeChange}
          onPresetChange={handlePresetChange}
          onOctaveChange={(o) => setMelodicOctave(track.id, o)}
          onReset={handleReset}
          onAudition={handleAudition}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
