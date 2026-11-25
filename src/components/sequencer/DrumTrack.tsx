import { useState, useRef, useEffect, useCallback, useId } from 'react';
import type { DrumTrack as DrumTrackType, DrumSynthParams, StepFx } from '../../types';
import { DEFAULT_VELOCITY, VELOCITY_LEVELS } from '../../types';
import { useSequencerStore } from '../../store/useSequencerStore';
import { beginUndoGroup, endUndoGroup, withUndoGroup } from '../../store/history';
import { usePopover } from '../../hooks/usePopover';
import { stepPosition } from '../../store/useGridFocusStore';
import { drumFx } from '../../utils/stepFx';
import { StepFxControls } from './StepFxControls';
import { AudioEngine } from '../../audio/AudioEngine';
import { DEFAULT_DRUM_PARAMS } from '../../constants';
import { StepCell } from './StepCell';
import { TrackHeader, HeaderResizeHandle } from './TrackHeader';
import { DrumSettingsPanel } from './TrackSettingsPanel';

interface DrumTrackProps {
  track: DrumTrackType;
  onRemove: () => void;
  stepsPerMeasure?: number;
  compact?: boolean;
}

export function DrumTrack({ track, onRemove, stepsPerMeasure = 16, compact = false }: DrumTrackProps) {
  const setDrumStep = useSequencerStore(s => s.setDrumStep);
  const cycleDrumVelocity = useSequencerStore(s => s.cycleDrumVelocity);
  const muteTrack = useSequencerStore(s => s.muteTrack);
  const soloTrack = useSequencerStore(s => s.soloTrack);
  const renameTrack = useSequencerStore(s => s.renameTrack);
  const updateDrumSynthParams = useSequencerStore(s => s.updateDrumSynthParams);
  const setTrackVolume = useSequencerStore(s => s.setTrackVolume);
  const setTrackSends = useSequencerStore(s => s.setTrackSends);
  const setTrackPan = useSequencerStore(s => s.setTrackPan);
  const fillDrumTrack = useSequencerStore(s => s.fillDrumTrack);
  const setDrumStepFx = useSequencerStore(s => s.setDrumStepFx);
  const [showSettings, setShowSettings] = useState(false);
  // Step editor: which step, and where to draw it (the cell's left edge in the row)
  const [editing, setEditing] = useState<{ index: number; left: number } | null>(null);

  const openEditor = useCallback((i: number, cell: HTMLElement) => {
    // Focus the cell so closing the editor brings focus back to it
    cell.focus({ preventScroll: true });
    setEditing(e => (e?.index === i ? null : { index: i, left: cell.offsetLeft }));
  }, []);

  /** Change a step's feel; on a step that's off, this adds the hit too */
  const changeFx = (i: number, fx: StepFx) => withUndoGroup(() => {
    if (!(track.steps[i] > 0)) setDrumStep(track.id, i, DEFAULT_VELOCITY);
    setDrumStepFx(track.id, i, fx);
  });

  // Drag-paint state: the value we're painting (null = not painting)
  const paintValue = useRef<number | null>(null);

  useEffect(() => {
    const stop = () => {
      if (paintValue.current !== null) endUndoGroup();
      paintValue.current = null;
    };
    window.addEventListener('mouseup', stop);
    return () => window.removeEventListener('mouseup', stop);
  }, []);

  const handlePointerDown = useCallback((i: number, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    // preventDefault stops the browser focusing the cell; do it ourselves so
    // keyboard navigation continues from where the mouse last was
    (e.currentTarget as HTMLElement).focus({ preventScroll: true });
    const current = track.steps[i];
    if (e.shiftKey) {
      cycleDrumVelocity(track.id, i);
      paintValue.current = null;
      return;
    }
    const next = current > 0 ? 0 : DEFAULT_VELOCITY;
    // The whole drag-paint gesture is one undo step
    beginUndoGroup();
    paintValue.current = next;
    setDrumStep(track.id, i, next);
  }, [track.id, track.steps, cycleDrumVelocity, setDrumStep]);

  const handleActivate = useCallback((i: number, shift: boolean) => {
    if (shift) { cycleDrumVelocity(track.id, i); return; }
    setDrumStep(track.id, i, track.steps[i] > 0 ? 0 : DEFAULT_VELOCITY);
  }, [track.id, track.steps, cycleDrumVelocity, setDrumStep]);

  const handlePointerEnter = useCallback((i: number) => {
    const v = paintValue.current;
    if (v === null) return;
    if ((v > 0) !== (track.steps[i] > 0)) {
      setDrumStep(track.id, i, v);
    }
  }, [track.id, track.steps, setDrumStep]);

  const handleVolumeChange = (db: number) => {
    setTrackVolume(track.id, 'drum', db);
    AudioEngine.getInstance().setDrumVolume(track.sampleKey, db);
  };

  const handlePanChange = (pan: number) => {
    setTrackPan(track.id, 'drum', pan);
    AudioEngine.getInstance().setDrumPan(track.sampleKey, pan);
  };

  const handleSendsChange = (reverb: number, delay: number) => {
    setTrackSends(track.id, 'drum', reverb, delay);
    AudioEngine.getInstance().setDrumSends(track.sampleKey, reverb, delay);
  };

  const handleParamChange = (partial: Partial<DrumSynthParams>) => {
    updateDrumSynthParams(track.id, partial);
    const newParams = { ...track.synthParams, ...partial } as DrumSynthParams;
    AudioEngine.getInstance().updateDrumParams(track.sampleKey, newParams);
  };

  const handleReset = () => {
    const defaults = DEFAULT_DRUM_PARAMS[track.sampleKey] || DEFAULT_DRUM_PARAMS['kick'];
    updateDrumSynthParams(track.id, defaults);
    AudioEngine.getInstance().updateDrumParams(track.sampleKey, defaults);
  };

  const handleAudition = async () => {
    const engine = AudioEngine.getInstance();
    await engine.init();
    engine.auditionDrum(track.sampleKey, track.synthParams, track.volume, track.reverbSend ?? 0, track.delaySend ?? 0, 1, track.pan ?? 0);
  };

  return (
    <div className="flex items-center gap-1 relative">
      <TrackHeader
        name={track.name}
        color={track.color}
        soundsAt={(i) => (track.steps[i] ?? 0) > 0}
        muted={track.muted}
        solo={track.solo}
        onMute={() => muteTrack(track.id, 'drum')}
        onSolo={() => soloTrack(track.id, 'drum')}
        onRemove={onRemove}
        onRename={(newName) => renameTrack(track.id, 'drum', newName)}
        onOpenSettings={() => setShowSettings(!showSettings)}
        settingsOpen={showSettings}
        onFill={() => fillDrumTrack(track.id)}
        onAudition={handleAudition}
        panel={showSettings && (
        <DrumSettingsPanel
          name={track.name}
          onRename={(newName) => renameTrack(track.id, 'drum', newName)}
          synthParams={track.synthParams}
          volume={track.volume}
          reverbSend={track.reverbSend ?? 0}
          delaySend={track.delaySend ?? 0}
          pan={track.pan ?? 0}
          onPanChange={handlePanChange}
          onChange={handleParamChange}
          onVolumeChange={handleVolumeChange}
          onSendsChange={handleSendsChange}
          onReset={handleReset}
          onAudition={handleAudition}
          onClose={() => setShowSettings(false)}
        />
      )}
      />
      <HeaderResizeHandle />
      <div
        role="group"
        aria-label={`${track.name} steps`}
        aria-describedby="grid-instructions"
        className={`flex ${compact ? 'gap-0.5' : 'gap-1'} relative`}
      >
        {track.steps.map((step, i) => (
          <StepCell
            key={i}
            velocity={step}
            stepIndex={i}
            color={track.color}
            trackId={track.id}
            trackName={track.name}
            stepsPerMeasure={stepsPerMeasure}
            compact={compact}
            onPointerDown={handlePointerDown}
            onPointerEnter={handlePointerEnter}
            onActivate={handleActivate}
            fx={drumFx(track, i)}
            onEdit={openEditor}
            editing={editing?.index === i}
            numSteps={track.steps.length}
          />
        ))}
        {editing && editing.index < track.steps.length && (
          <DrumStepEditor
            title={`${track.name} ${stepPosition(editing.index, stepsPerMeasure, compact ? 8 : 4)}`}
            left={editing.left}
            velocity={track.steps[editing.index]}
            fx={drumFx(track, editing.index)}
            onVelocity={(v) => setDrumStep(track.id, editing.index, v)}
            onFx={(fx) => changeFx(editing.index, fx)}
            onClear={() => { setDrumStep(track.id, editing.index, 0); setEditing(null); }}
            onClose={() => setEditing(null)}
          />
        )}
      </div>
    </div>
  );
}

/** Floating editor for one drum step: velocity, chance, repeats and timing. */
function DrumStepEditor({ title, left, velocity, fx, onVelocity, onFx, onClear, onClose }: {
  title: string;
  left: number;
  velocity: number;
  fx: StepFx | undefined;
  onVelocity: (v: number) => void;
  onFx: (fx: StepFx) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const ref = usePopover<HTMLDivElement>(onClose);
  const headingId = useId();
  const on = velocity > 0;
  const closest = on ? VELOCITY_LEVELS.reduce((a, b) => (Math.abs(b - velocity) < Math.abs(a - velocity) ? b : a)) : null;

  return (
    <div
      ref={ref}
      role="dialog"
      aria-labelledby={headingId}
      className="absolute top-full mt-1 z-50 w-60 bg-bg-secondary border border-border-soft rounded-xl p-2 shadow-xl flex flex-col gap-2"
      style={{ left }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 id={headingId} className="text-[11px] font-normal uppercase tracking-wider text-text-muted whitespace-nowrap">{title}</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close step editor"
          className="w-6 h-6 flex items-center justify-center rounded text-text-muted hover:text-text-primary text-sm cursor-pointer leading-none"
        >
          ×
        </button>
      </div>
      {!on && <p className="text-[11px] text-text-muted">This step is off. Choosing anything below adds a hit.</p>}
      <div>
        <div id={`${headingId}-vel`} className="label-caps mb-1">Velocity</div>
        <div role="group" aria-labelledby={`${headingId}-vel`} className="flex gap-1">
          {VELOCITY_LEVELS.map(v => (
            <button
              key={v}
              type="button"
              onClick={() => onVelocity(v)}
              aria-pressed={closest === v}
              className={`h-6 min-w-6 px-1.5 rounded text-[11px] font-bold flex items-center justify-center cursor-pointer transition-colors border border-transparent ${
                closest === v ? 'bg-text-primary text-bg-primary shadow-[0_0_12px_rgb(255_255_255/0.2)]' : 'bg-bg-cell text-text-muted hover:text-text-primary hover:bg-bg-cell-hover'
              }`}
            >
              {Math.round(v * 100)}%
            </button>
          ))}
        </div>
      </div>
      <StepFxControls fx={fx} onChange={onFx} />
      {on && (
        <button
          type="button"
          onClick={onClear}
          className="w-full px-2 py-1 rounded text-xs text-accent-red-fg bg-bg-cell hover:bg-accent-red/15 cursor-pointer transition-colors"
        >
          Clear step
        </button>
      )}
    </div>
  );
}
