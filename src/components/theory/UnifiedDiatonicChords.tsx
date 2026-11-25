import { announce } from '../../utils/announce';
import { useCallback, useMemo } from 'react';
import type { NoteName } from '../../types';
import { CHORDS, NOTE_NAMES } from '../../constants';
import { getDiatonicChordsForScale } from '../../constants/diatonicChords';
import { useTheoryStore } from '../../store/useTheoryStore';
import { AudioEngine } from '../../audio/AudioEngine';
import { spokenNote, formatNote } from '../../utils/noteHelpers';

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

    announce(`Added ${chord.numeral} to the progression`);
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
        <h4 className="label-caps">
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
      <h4 className="label-caps">
        Diatonic Chords
      </h4>
      <div className="flex gap-1.5 flex-wrap">
        {chords?.map((chord, i) => (
          <div key={i} className="relative group">
          <button
            onClick={() => handleChordClick(i)}
            aria-pressed={selectedDegreeIndex === i}
            aria-label={`${chord.numeral}, ${spokenNote(chord.rootNote)} ${chord.chordDef.name}`}
            className={`relative px-3 py-2 rounded-[10px] border cursor-pointer transition-colors flex flex-col items-center min-w-[3rem] group ${
              selectedDegreeIndex === i
                ? 'bg-text-primary border-text-primary shadow-[0_0_14px_rgb(255_255_255/0.22)]'
                : 'bg-bg-cell border-border-soft hover:border-text-muted hover:bg-bg-cell-hover'
            }`}
          >
            <span className={`font-mono text-[13px] font-bold ${
              selectedDegreeIndex === i ? 'text-bg-primary' : 'text-text-primary'
            }`}>
              {chord.numeral}
            </span>
            <span className={`text-[11px] ${selectedDegreeIndex === i ? 'text-bg-primary' : 'text-text-muted'}`}>
              {formatNote(chord.rootNote)}
            </span>
          </button>
          {/* Add to progression — shown on hover or keyboard focus */}
          <button
            onClick={(e) => handleAddToProgression(i, e)}
            aria-label={`Add ${chord.numeral} to the progression`}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#3ddc84] text-bg-primary text-sm font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity hover:brightness-110 cursor-pointer shadow-[0_0_10px_rgb(61_220_132/0.5)]"
            title="Add to progression"
          >
            <span aria-hidden="true">+</span>
          </button>
          </div>
        ))}
      </div>
    </div>
  );
}
