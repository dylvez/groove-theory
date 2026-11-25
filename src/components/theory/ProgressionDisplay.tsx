import { withUndoGroup } from '../../store/history';
import { announce } from '../../utils/announce';
import { useState, useCallback, useMemo } from 'react';
import type { NoteName, NoteWithOctave } from '../../types';
import { NOTE_NAMES } from '../../constants';
import { getDiatonicChordsForScale } from '../../constants/diatonicChords';
import { useTheoryStore } from '../../store/useTheoryStore';
import { useSequencerStore } from '../../store/useSequencerStore';
import { AudioEngine } from '../../audio/AudioEngine';
import { getScaleNotes, getDiatonicChord, getChordNotesWithOctave } from '../../utils/musicTheory';
import { formatNote } from '../../utils/noteHelpers';

export function ProgressionDisplay() {
  const rootNote = useTheoryStore(s => s.rootNote);
  const selectedScale = useTheoryStore(s => s.selectedScale);
  const progression = useTheoryStore(s => s.progression);
  const removeProgressionSlot = useTheoryStore(s => s.removeProgressionSlot);
  const clearProgression = useTheoryStore(s => s.clearProgression);
  const setMelodicStep = useSequencerStore(s => s.setMelodicStep);

  // Track selector state
  const [targetTrackId, setTargetTrackId] = useState<string | null>(null);
  const melodicTracks = useSequencerStore(s => {
    const p = s.patterns.find(p => p.id === s.activePatternId) || s.patterns[0];
    return p?.melodicTracks ?? [];
  });
  const resolvedTrackId = useMemo(() => {
    if (targetTrackId && melodicTracks.find(t => t.id === targetTrackId)) return targetTrackId;
    return melodicTracks[0]?.id ?? null;
  }, [targetTrackId, melodicTracks]);

  const diatonicMap = getDiatonicChordsForScale(selectedScale.name);
  const scaleNotes = getScaleNotes(rootNote, selectedScale);

  // Resolve progression slots to chord data using curated diatonic map when available
  const resolvedChords = useMemo(() => {
    return progression.map(slot => {
      if (diatonicMap) {
        const entry = diatonicMap.chords.find(c => c.degree === slot.scaleDegree);
        if (entry) {
          const rootIndex = NOTE_NAMES.indexOf(rootNote);
          const chordRootNote = NOTE_NAMES[(rootIndex + entry.intervalOffset) % 12] as NoteName;
          return {
            numeral: entry.numeral,
            root: chordRootNote,
            intervals: slot.chordDefinition.intervals,
          };
        }
      }
      // Fallback: compute from scale
      const chord = getDiatonicChord(rootNote, selectedScale, slot.scaleDegree);
      return {
        numeral: slot.chordDefinition.name,
        root: chord.root,
        intervals: chord.intervals,
      };
    });
  }, [progression, diatonicMap, rootNote, selectedScale, scaleNotes]);

  const playProgression = useCallback(async () => {
    const engine = AudioEngine.getInstance();
    await engine.init();

    resolvedChords.forEach((chord, i) => {
      const notes = getChordNotesWithOctave(chord.root, {
        name: chord.numeral,
        symbol: '',
        intervals: chord.intervals,
      }, 4);
      setTimeout(() => {
        engine.synthEngine.previewChord(notes, '2n');
      }, i * 600);
    });
  }, [resolvedChords]);

  const applyToTrack = useCallback(() => {
    const pattern = useSequencerStore.getState().getActivePattern();
    const melodicTrack = pattern.melodicTracks.find(t => t.id === resolvedTrackId);
    if (!melodicTrack) return;

    const trackOctave = melodicTrack.octave ?? 3;

    // Build one cycle of the bass pattern
    const cycleLength = resolvedChords.length * 4;
    const cycle: (NoteWithOctave | null)[] = new Array(cycleLength).fill(null);
    resolvedChords.forEach((chord, i) => {
      cycle[i * 4] = `${chord.root}${trackOctave}` as NoteWithOctave;
    });

    // Tile across all sequencer steps — one undo step for the whole write
    withUndoGroup(() => {
      for (let step = 0; step < pattern.numSteps; step++) {
        const note = cycle[step % cycleLength];
        setMelodicStep(melodicTrack.id, step, note);
      }
    });
    announce(`Progression written to ${melodicTrack.name}`);
  }, [resolvedChords, resolvedTrackId, setMelodicStep]);

  if (progression.length === 0) {
    return (
      <div className="flex flex-col gap-1.5">
        <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Progression
        </h4>
        <p className="text-xs text-text-muted italic">
          Hover a diatonic chord and click <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-accent-cyan text-on-accent text-[11px] font-bold leading-none align-text-bottom not-italic">+</span> to build a progression.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
        Progression
      </h4>

      {/* Progression slots */}
      <div className="flex gap-1.5 flex-wrap">
        {progression.map((slot, i) => {
          const chord = resolvedChords[i];
          return (
            <div
              key={slot.id}
              className="px-3 py-2 rounded-md bg-accent-cyan/15 border border-accent-cyan/30 flex items-center gap-2 group"
            >
              <span className="text-sm font-bold text-accent-cyan-fg">
                {chord?.numeral || slot.scaleDegree + 1}
              </span>
              <span className="text-[11px] text-text-muted">
                {chord ? formatNote(chord.root) : ''}
              </span>
              <button
                onClick={() => removeProgressionSlot(slot.id)}
                className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-accent-red-fg text-xs cursor-pointer transition-opacity"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      {/* Action buttons with track selector */}
      <div className="flex gap-2 items-center flex-wrap">
        <button
          onClick={playProgression}
          className="px-3 py-1 rounded-md bg-accent-cyan/20 text-accent-cyan-fg text-xs font-medium border border-accent-cyan/30 hover:bg-accent-cyan/30 cursor-pointer transition-colors"
        >
          Play
        </button>
        <button
          onClick={applyToTrack}
          disabled={!resolvedTrackId}
          className="px-3 py-1 rounded-md bg-accent-green/20 text-accent-green-fg text-xs font-medium border border-accent-green/30 hover:bg-accent-green/30 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Apply
        </button>
        <select
          aria-label="Synth track to write the progression to"
          value={resolvedTrackId ?? ''}
          onChange={(e) => setTargetTrackId(e.target.value)}
          disabled={melodicTracks.length === 0}
          className="px-2 py-1 bg-bg-cell border border-border rounded-md text-xs text-text-primary focus:outline-none focus:border-accent-green min-w-0 max-w-[120px]"
        >
          {melodicTracks.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <button
          onClick={clearProgression}
          className="px-3 py-1 rounded-md bg-bg-cell text-text-muted text-xs hover:bg-bg-cell-hover cursor-pointer transition-colors"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
