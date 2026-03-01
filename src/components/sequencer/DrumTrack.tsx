import { useState } from 'react';
import type { DrumTrack as DrumTrackType, DrumSynthParams } from '../../types';
import { useSequencerStore } from '../../store/useSequencerStore';
import { AudioEngine } from '../../audio/AudioEngine';
import { DEFAULT_DRUM_PARAMS } from '../../constants';
import { StepCell } from './StepCell';
import { TrackHeader, HeaderResizeHandle } from './TrackHeader';
import { DrumSettingsPanel } from './TrackSettingsPanel';

interface DrumTrackProps {
  track: DrumTrackType;
  onRemove: () => void;
  stepsPerMeasure?: number;
}

export function DrumTrack({ track, onRemove, stepsPerMeasure = 16 }: DrumTrackProps) {
  const toggleDrumStep = useSequencerStore(s => s.toggleDrumStep);
  const muteTrack = useSequencerStore(s => s.muteTrack);
  const soloTrack = useSequencerStore(s => s.soloTrack);
  const renameTrack = useSequencerStore(s => s.renameTrack);
  const updateDrumSynthParams = useSequencerStore(s => s.updateDrumSynthParams);
  const setTrackVolume = useSequencerStore(s => s.setTrackVolume);
  const fillDrumTrack = useSequencerStore(s => s.fillDrumTrack);
  const [showSettings, setShowSettings] = useState(false);

  const handleVolumeChange = (db: number) => {
    setTrackVolume(track.id, 'drum', db);
    AudioEngine.getInstance().setDrumVolume(track.sampleKey, db);
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
      />
      <HeaderResizeHandle />
      <div className="flex gap-1">
        {track.steps.map((step, i) => (
          <StepCell
            key={i}
            active={step === 1}
            stepIndex={i}
            color={track.color}
            onClick={() => toggleDrumStep(track.id, i)}
            stepsPerMeasure={stepsPerMeasure}
          />
        ))}
      </div>
      {showSettings && (
        <DrumSettingsPanel
          synthParams={track.synthParams}
          volume={track.volume}
          onChange={handleParamChange}
          onVolumeChange={handleVolumeChange}
          onReset={handleReset}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
