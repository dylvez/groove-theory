import { useState, useRef, useEffect, useCallback } from 'react';
import type { DrumTrack as DrumTrackType, DrumSynthParams } from '../../types';
import { DEFAULT_VELOCITY } from '../../types';
import { useSequencerStore } from '../../store/useSequencerStore';
import { beginUndoGroup, endUndoGroup } from '../../store/history';
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
  const fillDrumTrack = useSequencerStore(s => s.fillDrumTrack);
  const [showSettings, setShowSettings] = useState(false);

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
    engine.auditionDrum(track.sampleKey, track.synthParams, track.volume, track.reverbSend ?? 0, track.delaySend ?? 0);
  };

  return (
    <div className="flex items-center gap-1 relative">
      <TrackHeader
        name={track.name}
        color={track.color}
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
        className={`flex ${compact ? 'gap-0.5' : 'gap-1'}`}
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
          />
        ))}
      </div>
    </div>
  );
}
