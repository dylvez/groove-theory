import { useCallback } from 'react';
import type { NoteName, NoteWithOctave } from '../../types';
import { NOTE_NAMES, SCALES } from '../../constants';
import { useTheoryStore } from '../../store/useTheoryStore';
import { AudioEngine } from '../../audio/AudioEngine';
import { getScaleNotes, getScaleNotesWithOctave } from '../../utils/musicTheory';
import { formatNote } from '../../utils/noteHelpers';

export function ScaleExplorer() {
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
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Scale Explorer</h3>

      <div className="flex gap-3">
        {/* Root note selector */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-text-muted">Root</label>
          <select
          aria-label="Root"
            value={rootNote}
            onChange={(e) => { setRootNote(e.target.value as NoteName); setHighlightMode('scale'); }}
            className="px-3 py-1.5 bg-bg-cell border border-border rounded-md text-sm text-text-primary focus:outline-none focus:border-accent-orange"
          >
            {NOTE_NAMES.map(n => (
              <option key={n} value={n}>{formatNote(n)}</option>
            ))}
          </select>
        </div>

        {/* Scale type selector */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-text-muted">Scale</label>
          <select
          aria-label="Scale"
            value={selectedScale.name}
            onChange={(e) => {
              const scale = SCALES.find(s => s.name === e.target.value);
              if (scale) { setSelectedScale(scale); setHighlightMode('scale'); }
            }}
            className="px-3 py-1.5 bg-bg-cell border border-border rounded-md text-sm text-text-primary focus:outline-none focus:border-accent-orange"
          >
            {SCALES.map(s => (
              <option key={s.name} value={s.name}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Play scale button */}
        <div className="flex flex-col gap-1 justify-end">
          <button
            onClick={playScale}
            className="px-3 py-1.5 rounded-md bg-accent-blue/20 text-accent-blue-fg text-sm font-medium border border-accent-blue/30 hover:bg-accent-blue/30 cursor-pointer transition-colors"
          >
            Play Scale
          </button>
        </div>
      </div>

      {/* Scale notes display — clickable */}
      <div className="flex gap-1.5 flex-wrap">
        {scaleNotes.map((note, i) => (
          <button
            key={`${note}-${i}`}
            onClick={() => playNote(note)}
            className="px-2.5 py-1 rounded-md bg-accent-blue/20 text-accent-blue-fg text-sm font-medium border border-accent-blue/30 hover:bg-accent-blue/30 cursor-pointer transition-colors"
          >
            {formatNote(note)}
          </button>
        ))}
      </div>

      {/* Intervals display */}
      <div className="flex gap-1.5 flex-wrap">
        {selectedScale.intervals.map((interval, i) => (
          <div
            key={i}
            className="px-2 py-0.5 rounded text-xs text-text-muted bg-bg-cell"
          >
            {interval === 0 ? 'R' : `+${interval}`}
          </div>
        ))}
      </div>
    </div>
  );
}
