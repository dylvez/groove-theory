import { useCallback } from 'react';
import type { NoteName } from '../../types';
import { NOTE_NAMES, CHORDS } from '../../constants';
import { useTheoryStore } from '../../store/useTheoryStore';
import { AudioEngine } from '../../audio/AudioEngine';
import { getChordNotes, getChordNotesWithOctave } from '../../utils/musicTheory';
import { formatNote } from '../../utils/noteHelpers';

export function ChordExplorer() {
  const chordRoot = useTheoryStore(s => s.chordRoot);
  const selectedChord = useTheoryStore(s => s.selectedChord);
  const chordInversion = useTheoryStore(s => s.chordInversion);
  const setChordRoot = useTheoryStore(s => s.setChordRoot);
  const setSelectedChord = useTheoryStore(s => s.setSelectedChord);
  const setChordInversion = useTheoryStore(s => s.setChordInversion);
  const setHighlightMode = useTheoryStore(s => s.setHighlightMode);
  const setSelectedDegreeIndex = useTheoryStore(s => s.setSelectedDegreeIndex);

  const chordNotes = getChordNotes(chordRoot, selectedChord);
  const maxInversion = selectedChord.intervals.length - 1;

  const playChord = useCallback(() => {
    const engine = AudioEngine.getInstance();
    const notes = getChordNotesWithOctave(chordRoot, selectedChord, 4, chordInversion);
    engine.synthEngine.previewChord(notes, '2n');
  }, [chordRoot, selectedChord, chordInversion]);

  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-display text-[13px] font-bold uppercase tracking-[0.08em] text-text-primary">Chord Explorer</h3>

      <div className="flex gap-3">
        {/* Root selector */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-text-muted">Root</label>
          <select
          aria-label="Root"
            value={chordRoot}
            onChange={(e) => { setChordRoot(e.target.value as NoteName); setHighlightMode('chord'); setSelectedDegreeIndex(null); }}
            className="px-3 py-1.5 bg-[#111118] border border-border-control rounded-md text-sm text-text-primary focus:outline-none focus:border-text-primary"
          >
            {NOTE_NAMES.map(n => (
              <option key={n} value={n}>{formatNote(n)}</option>
            ))}
          </select>
        </div>

        {/* Chord type selector */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-text-muted">Type</label>
          <select
          aria-label="Type"
            value={selectedChord.name}
            onChange={(e) => {
              const chord = CHORDS.find(c => c.name === e.target.value);
              if (chord) { setSelectedChord(chord); setHighlightMode('chord'); setChordInversion(0); setSelectedDegreeIndex(null); }
            }}
            className="px-3 py-1.5 bg-[#111118] border border-border-control rounded-md text-sm text-text-primary focus:outline-none focus:border-text-primary"
          >
            {CHORDS.map(c => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Chord display */}
      <div className="flex items-center gap-3">
        <div className="text-2xl font-bold text-text-primary">
          {formatNote(chordRoot)}{selectedChord.symbol}
        </div>
        <button
          onClick={playChord}
          className="pill"
        >
          Play
        </button>
      </div>

      {/* Chord notes */}
      <div className="flex gap-1.5">
        {chordNotes.map((note, i) => (
          <div
            key={`${note}-${i}`}
            className="px-2.5 py-1 rounded-md bg-accent-purple/20 text-accent-purple-fg text-sm font-medium border border-accent-purple/30"
          >
            {formatNote(note)}
          </div>
        ))}
      </div>

      {/* Inversions */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-text-muted">Inversion:</span>
        {Array.from({ length: maxInversion + 1 }, (_, i) => (
          <button
            key={i}
            onClick={() => setChordInversion(i)}
            className={`w-7 h-7 rounded-md text-xs font-medium flex items-center justify-center cursor-pointer transition-colors ${
              chordInversion === i
                ? 'bg-text-primary text-bg-primary shadow-[0_0_12px_rgb(255_255_255/0.2)]'
                : 'bg-bg-cell text-text-secondary hover:bg-bg-cell-hover'
            }`}
          >
            {i}
          </button>
        ))}
      </div>
    </div>
  );
}
