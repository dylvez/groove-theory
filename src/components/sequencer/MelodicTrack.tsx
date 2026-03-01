import { useState } from 'react';
import type { MelodicTrack as MelodicTrackType, NoteWithOctave, MelodicSynthParams, SynthType } from '../../types';
import { useSequencerStore } from '../../store/useSequencerStore';
import { useTheoryStore } from '../../store/useTheoryStore';
import { useTransportStore } from '../../store/useTransportStore';
import { AudioEngine } from '../../audio/AudioEngine';
import { DEFAULT_MELODIC_PARAMS } from '../../constants';
import { TrackHeader, HeaderResizeHandle } from './TrackHeader';
import { MelodicSettingsPanel } from './TrackSettingsPanel';
import { getScaleNotes } from '../../utils/musicTheory';

interface MelodicTrackProps {
  track: MelodicTrackType;
  onRemove: () => void;
  stepsPerMeasure?: number;
}

export function MelodicTrack({ track, onRemove, stepsPerMeasure = 16 }: MelodicTrackProps) {
  const setMelodicStep = useSequencerStore(s => s.setMelodicStep);
  const muteTrack = useSequencerStore(s => s.muteTrack);
  const soloTrack = useSequencerStore(s => s.soloTrack);
  const renameTrack = useSequencerStore(s => s.renameTrack);
  const updateMelodicSynthParams = useSequencerStore(s => s.updateMelodicSynthParams);
  const setMelodicSynthType = useSequencerStore(s => s.setMelodicSynthType);
  const setTrackVolume = useSequencerStore(s => s.setTrackVolume);
  const fillMelodicTrack = useSequencerStore(s => s.fillMelodicTrack);
  const rootNote = useTheoryStore(s => s.rootNote);
  const selectedScale = useTheoryStore(s => s.selectedScale);
  const currentStep = useTransportStore(s => s.currentStep);
  const isPlaying = useTransportStore(s => s.state) === 'playing';
  const [activePopup, setActivePopup] = useState<number | null>(null);
  const [popupOctave, setPopupOctave] = useState(track.octave);
  const [showSettings, setShowSettings] = useState(false);

  const scaleNotes = getScaleNotes(rootNote, selectedScale);

  const handleStepClick = (stepIndex: number) => {
    if (track.steps[stepIndex].active) {
      setMelodicStep(track.id, stepIndex, null);
      setActivePopup(null);
    } else {
      // Init popup octave from existing note or track default
      const existingNote = track.steps[stepIndex].note;
      if (existingNote) {
        const match = existingNote.match(/\d+$/);
        if (match) setPopupOctave(parseInt(match[0]));
      } else {
        setPopupOctave(track.octave);
      }
      setActivePopup(activePopup === stepIndex ? null : stepIndex);
    }
  };

  const handleNoteSelect = (stepIndex: number, note: NoteWithOctave) => {
    setMelodicStep(track.id, stepIndex, note);
    setActivePopup(null);
  };

  const handleVolumeChange = (db: number) => {
    setTrackVolume(track.id, 'melodic', db);
    AudioEngine.getInstance().setMelodicVolume(track.id, db);
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

  const handleReset = () => {
    const defaults = { ...DEFAULT_MELODIC_PARAMS };
    updateMelodicSynthParams(track.id, defaults);
    AudioEngine.getInstance().updateMelodicParams(track.id, defaults);
  };

  // Color based on synth type
  const synthColors: Record<SynthType, string> = {
    synth: '#a855f7',
    fmSynth: '#3b82f6',
    amSynth: '#06b6d4',
    monoSynth: '#22c55e',
  };
  const trackColor = synthColors[track.synthType] ?? '#a855f7';

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
      />
      <HeaderResizeHandle />
      <div className="flex gap-1 relative">
        {track.steps.map((step, i) => {
          const isCurrent = isPlaying && currentStep === i;
          const isBeatStart = i % 4 === 0;
          const isBarStart = i % stepsPerMeasure === 0 && i > 0;
          const octaveDigit = step.note?.match(/\d+$/)?.[0];

          return (
            <div key={i} className={`relative ${isBarStart ? 'ml-2' : ''}`}>
              <button
                onClick={() => handleStepClick(i)}
                className={`w-9 h-9 rounded-md border text-[10px] font-medium transition-all duration-75 cursor-pointer ${
                  isCurrent ? 'ring-2 ring-white/60' : ''
                } ${
                  step.active
                    ? 'border-transparent text-white'
                    : isBeatStart
                    ? 'bg-bg-cell-hover border-border/50 hover:border-border text-text-muted'
                    : 'bg-bg-cell border-border/30 hover:border-border/60 text-text-muted'
                }`}
                style={step.active ? { backgroundColor: trackColor } : undefined}
              >
                {step.note ? (
                  <span className="flex flex-col items-center leading-none">
                    <span>{step.note.replace(/\d+$/, '')}</span>
                    <span className="text-[7px] opacity-60">{octaveDigit}</span>
                  </span>
                ) : ''}
              </button>

              {/* Note picker popup with octave selector */}
              {activePopup === i && (
                <div className="absolute top-10 left-0 z-50 bg-bg-secondary border border-border rounded-lg p-2 shadow-xl min-w-28">
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
                    {scaleNotes.map(note => (
                      <button
                        key={note}
                        onClick={() => handleNoteSelect(i, `${note}${popupOctave}` as NoteWithOctave)}
                        className="px-2 py-1 text-xs rounded bg-bg-cell hover:bg-accent-purple/30 text-text-primary cursor-pointer transition-colors"
                      >
                        {note}
                      </button>
                    ))}
                  </div>
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
          onParamChange={handleParamChange}
          onVolumeChange={handleVolumeChange}
          onSynthTypeChange={handleSynthTypeChange}
          onReset={handleReset}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
