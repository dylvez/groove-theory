import { useCallback } from 'react';
import type { NoteName, NoteWithOctave } from '../../types';
import { NOTE_NAMES, SCALES } from '../../constants';
import { useTheoryStore } from '../../store/useTheoryStore';
import { AudioEngine } from '../../audio/AudioEngine';
import { getScaleNotes, getScaleNotesWithOctave } from '../../utils/musicTheory';
import { formatNote, spokenNote } from '../../utils/noteHelpers';

export function KeyScalePicker() {
  const rootNote = useTheoryStore(s => s.rootNote);
  const selectedScale = useTheoryStore(s => s.selectedScale);
  const setRootNote = useTheoryStore(s => s.setRootNote);
  const setSelectedScale = useTheoryStore(s => s.setSelectedScale);
  const setHighlightMode = useTheoryStore(s => s.setHighlightMode);

  const scaleNotes = getScaleNotes(rootNote, selectedScale);

  const playNote = useCallback(async (note: NoteName) => {
    const engine = AudioEngine.getInstance();
    await engine.init();
    engine.synthEngine.previewNote(`${note}4` as NoteWithOctave, '8n');
  }, []);

  const playScale = useCallback(async () => {
    const engine = AudioEngine.getInstance();
    await engine.init();
    const notes = getScaleNotesWithOctave(rootNote, selectedScale, 4, 1);
    notes.forEach((note, i) => {
      setTimeout(() => {
        engine.synthEngine.previewNote(note, '8n');
      }, i * 200);
    });
  }, [rootNote, selectedScale]);

  return (
    <div className="flex flex-col gap-2">
      {/* Compact row: Root + Scale + Play button */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-text-muted shrink-0">Key:</label>
        <select
          aria-label="Key"
          value={rootNote}
          onChange={(e) => { setRootNote(e.target.value as NoteName); setHighlightMode('scale'); }}
          className="px-2 py-1 bg-bg-cell border border-border rounded-md text-sm text-text-primary focus:outline-none focus:border-accent-orange min-w-[3.5rem]"
        >
          {NOTE_NAMES.map(n => (
            <option key={n} value={n}>{formatNote(n)}</option>
          ))}
        </select>

        <select
          aria-label="Scale"
          value={selectedScale.name}
          onChange={(e) => {
            const scale = SCALES.find(s => s.name === e.target.value);
            if (scale) { setSelectedScale(scale); setHighlightMode('scale'); }
          }}
          className="px-2 py-1 bg-bg-cell border border-border rounded-md text-sm text-text-primary focus:outline-none focus:border-accent-orange flex-1 min-w-0"
        >
          {SCALES.map(s => (
            <option key={s.name} value={s.name}>{s.name}</option>
          ))}
        </select>

        <button
          onClick={playScale}
          className="px-2.5 py-1 rounded-md bg-accent-blue/20 text-accent-blue-fg text-xs font-medium border border-accent-blue/30 hover:bg-accent-blue/30 cursor-pointer transition-colors shrink-0"
          title="Play scale"
          aria-label="Play scale"
        >
          &#9654; Scale
        </button>
      </div>

      {/* Scale notes + intervals */}
      <div className="flex gap-1 flex-wrap">
        {scaleNotes.map((note, i) => (
          <button
            key={`${note}-${i}`}
            onClick={() => playNote(note)}
            aria-label={`Play ${spokenNote(note)}, ${selectedScale.intervals[i] === 0 ? 'root' : `${selectedScale.intervals[i]} semitones up`}`}
            className="px-2 py-1 rounded bg-accent-blue/15 text-accent-blue-fg text-xs font-medium border border-accent-blue/25 hover:bg-accent-blue/25 cursor-pointer transition-colors"
          >
            {formatNote(note)}
            <span className="ml-1 text-text-muted text-[11px]">
              {selectedScale.intervals[i] === 0 ? 'R' : `+${selectedScale.intervals[i]}`}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
