import { useCallback } from 'react';
import type { NoteWithOctave } from '../../types';
import { useTheoryStore } from '../../store/useTheoryStore';
import { useSequencerStore } from '../../store/useSequencerStore';
import { AudioEngine } from '../../audio/AudioEngine';
import { getScaleNotes, getDiatonicChord, getChordNotesWithOctave } from '../../utils/musicTheory';
import { formatNote } from '../../utils/noteHelpers';
import { ROMAN_NUMERALS } from '../../constants';

export function ChordProgressionBuilder() {
  const rootNote = useTheoryStore(s => s.rootNote);
  const selectedScale = useTheoryStore(s => s.selectedScale);
  const progression = useTheoryStore(s => s.progression);
  const addProgressionSlot = useTheoryStore(s => s.addProgressionSlot);
  const removeProgressionSlot = useTheoryStore(s => s.removeProgressionSlot);
  const clearProgression = useTheoryStore(s => s.clearProgression);
  const setMelodicStep = useSequencerStore(s => s.setMelodicStep);

  const scaleNotes = getScaleNotes(rootNote, selectedScale);

  // Build diatonic chords for current scale
  const diatonicChords = scaleNotes.slice(0, 7).map((_, degree) => {
    const chord = getDiatonicChord(rootNote, selectedScale, degree);
    return {
      degree,
      root: chord.root,
      intervals: chord.intervals,
      numeral: ROMAN_NUMERALS[degree] || `${degree + 1}`,
    };
  });

  const addChord = (degree: number) => {
    const chord = diatonicChords[degree];
    if (!chord) return;
    addProgressionSlot({
      id: `slot-${Date.now()}-${degree}`,
      scaleDegree: degree,
      chordDefinition: {
        name: `${chord.numeral}`,
        symbol: '',
        intervals: chord.intervals,
      },
      duration: 4,
    });
  };

  const playProgression = useCallback(async () => {
    const engine = AudioEngine.getInstance();
    await engine.init();
    const now = engine.synthEngine;

    progression.forEach((slot, i) => {
      const chordData = diatonicChords[slot.scaleDegree];
      if (!chordData) return;
      const notes = getChordNotesWithOctave(chordData.root, {
        name: chordData.numeral,
        symbol: '',
        intervals: chordData.intervals,
      }, 4);
      // Schedule each chord 0.6s apart
      setTimeout(() => {
        now.previewChord(notes, '2n');
      }, i * 600);
    });
  }, [progression, diatonicChords]);

  const applyToTrack = () => {
    const pattern = useSequencerStore.getState().getActivePattern();
    const melodicTrack = pattern.melodicTracks[0];
    if (!melodicTrack) return;

    // Map progression slots to sequencer steps (4 steps per chord)
    progression.forEach((slot, i) => {
      const chord = diatonicChords[slot.scaleDegree];
      if (!chord) return;
      const stepStart = i * 4;
      if (stepStart >= pattern.numSteps) return;
      const note = `${chord.root}4` as NoteWithOctave;
      setMelodicStep(melodicTrack.id, stepStart, note);
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Chord Progression</h3>

      {/* Diatonic chord buttons */}
      <div className="flex gap-1.5 flex-wrap">
        {diatonicChords.map((chord, i) => (
          <button
            key={i}
            onClick={() => addChord(i)}
            className="px-3 py-2 rounded-md bg-bg-cell border border-border hover:border-accent-cyan/50 hover:bg-bg-cell-hover cursor-pointer transition-colors flex flex-col items-center"
          >
            <span className="text-sm font-bold text-text-primary">{chord.numeral}</span>
            <span className="text-[11px] text-text-muted">{formatNote(chord.root)}</span>
          </button>
        ))}
      </div>

      {/* Progression display */}
      {progression.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex gap-1.5 flex-wrap">
            {progression.map((slot) => {
              const chord = diatonicChords[slot.scaleDegree];
              return (
                <div
                  key={slot.id}
                  className="px-3 py-2 rounded-md bg-accent-cyan/15 border border-accent-cyan/30 flex items-center gap-2 group"
                >
                  <span className="text-sm font-bold text-accent-cyan-fg">
                    {chord?.numeral || slot.scaleDegree + 1}
                  </span>
                  <button
                    onClick={() => removeProgressionSlot(slot.id)}
                    className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-accent-red-fg text-xs cursor-pointer transition-opacity"
                  >
                    x
                  </button>
                </div>
              );
            })}
          </div>

          <div className="flex gap-2">
            <button
              onClick={playProgression}
              className="px-3 py-1.5 rounded-md bg-accent-cyan/20 text-accent-cyan-fg text-sm font-medium border border-accent-cyan/30 hover:bg-accent-cyan/30 cursor-pointer transition-colors"
            >
              Play
            </button>
            <button
              onClick={applyToTrack}
              className="px-3 py-1.5 rounded-md bg-accent-green/20 text-accent-green-fg text-sm font-medium border border-accent-green/30 hover:bg-accent-green/30 cursor-pointer transition-colors"
            >
              Apply to Track
            </button>
            <button
              onClick={clearProgression}
              className="px-3 py-1.5 rounded-md bg-bg-cell text-text-muted text-sm hover:bg-bg-cell-hover cursor-pointer transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
