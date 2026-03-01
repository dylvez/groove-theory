import { useCallback, useMemo } from 'react';
import type { NoteName } from '../../types';
import { CHORDS, NOTE_NAMES } from '../../constants';
import { getDiatonicChordsForScale } from '../../constants/diatonicChords';
import { useTheoryStore } from '../../store/useTheoryStore';
import { AudioEngine } from '../../audio/AudioEngine';
import { formatNote } from '../../utils/noteHelpers';

export function UnifiedDiatonicChords() {
  const rootNote = useTheoryStore(s => s.rootNote);
  const selectedScale = useTheoryStore(s => s.selectedScale);
  const selectedDegreeIndex = useTheoryStore(s => s.selectedDegreeIndex);
  const setSelectedDegreeIndex = useTheoryStore(s => s.setSelectedDegreeIndex);
  const setChordRoot = useTheoryStore(s => s.setChordRoot);
  const setSelectedChord = useTheoryStore(s => s.setSelectedChord);
  const setHighlightMode = useTheoryStore(s => s.setHighlightMode);
  const addProgressionSlot = useTheoryStore(s => s.addProgressionSlot);

  const diatonicMap = getDiatonicChordsForScale(selectedScale.name);

  const chords = useMemo(() => {
    if (!diatonicMap) return null;
    const rootIndex = NOTE_NAMES.indexOf(rootNote);
    return diatonicMap.chords.map(entry => {
      const chordRootNote = NOTE_NAMES[(rootIndex + entry.intervalOffset) % 12] as NoteName;
      const chordDef = CHORDS.find(c => c.name === entry.quality)!;
      return {
        ...entry,
        rootNote: chordRootNote,
        chordDef,
      };
    });
  }, [diatonicMap, rootNote]);

  const playChord = useCallback((chordRootNote: NoteName, intervals: number[]) => {
    const rootIndex = NOTE_NAMES.indexOf(chordRootNote);
    const baseOctave = 4;
    const notes = intervals.map(interval => {
      const noteIndex = (rootIndex + interval) % 12;
      const octave = baseOctave + Math.floor((rootIndex + interval) / 12);
      return `${NOTE_NAMES[noteIndex]}${octave}`;
    });
    const engine = AudioEngine.getInstance();
    engine.synthEngine.previewChord(notes, '4n');
  }, []);

  const handleChordClick = useCallback((degreeIndex: number) => {
    if (!chords) return;
    const chord = chords[degreeIndex];

    // Always play the chord on click
    playChord(chord.rootNote, chord.chordDef.intervals);

    if (selectedDegreeIndex === degreeIndex) {
      // Deselect
      setSelectedDegreeIndex(null);
      setHighlightMode('scale');
    } else {
      // Select — sync chord explorer silently
      setSelectedDegreeIndex(degreeIndex);
      setChordRoot(chord.rootNote);
      setSelectedChord(chord.chordDef);
      setHighlightMode('chord');
    }
  }, [chords, selectedDegreeIndex, playChord, setSelectedDegreeIndex, setChordRoot, setSelectedChord, setHighlightMode]);

  const handleAddToProgression = useCallback((degreeIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!chords) return;
    const chord = chords[degreeIndex];

    addProgressionSlot({
      id: `slot-${Date.now()}-${degreeIndex}`,
      scaleDegree: chord.degree,
      chordDefinition: {
        name: chord.numeral,
        symbol: '',
        intervals: chord.chordDef.intervals,
      },
      duration: 4,
    });
  }, [chords, addProgressionSlot]);

  if (!diatonicMap) {
    return (
      <div className="flex flex-col gap-2">
        <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Diatonic Chords
        </h4>
        <p className="text-xs text-text-muted italic">
          Diatonic chords not available for this scale.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
        Diatonic Chords
      </h4>
      <div className="flex gap-1.5 flex-wrap">
        {chords?.map((chord, i) => (
          <button
            key={i}
            onClick={() => handleChordClick(i)}
            className={`relative px-3 py-2 rounded-md border cursor-pointer transition-colors flex flex-col items-center min-w-[3rem] group ${
              selectedDegreeIndex === i
                ? 'bg-accent-purple/25 border-accent-purple/50 ring-1 ring-accent-purple/30'
                : 'bg-bg-cell border-border hover:border-accent-cyan/50 hover:bg-bg-cell-hover'
            }`}
          >
            <span className={`text-sm font-bold ${
              selectedDegreeIndex === i ? 'text-accent-purple' : 'text-text-primary'
            }`}>
              {chord.numeral}
            </span>
            <span className="text-[10px] text-text-muted">
              {formatNote(chord.rootNote)}
            </span>

            {/* Add to progression button */}
            <div
              onClick={(e) => handleAddToProgression(i, e)}
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent-cyan text-white text-[10px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent-cyan/80"
              title="Add to progression"
            >
              +
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
