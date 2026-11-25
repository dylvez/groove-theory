import { withUndoGroup } from '../../store/history';
import { announce } from '../../utils/announce';
import { useState, useCallback, useMemo } from 'react';
import type { NoteWithOctave } from '../../types';
import { useTheoryStore } from '../../store/useTheoryStore';
import { useSequencerStore } from '../../store/useSequencerStore';
import { AudioEngine } from '../../audio/AudioEngine';
import { generateMelodyPattern, type MelodyPatternType } from '../../utils/musicTheory';
import { formatNote } from '../../utils/noteHelpers';

const PATTERN_OPTIONS: { value: MelodyPatternType; label: string }[] = [
  { value: 'roots', label: 'Root Notes' },
  { value: 'arp-up', label: 'Arpeggiate Up' },
  { value: 'arp-down', label: 'Arpeggiate Down' },
  { value: 'scale-up', label: 'Scale Walk Up' },
  { value: 'scale-down', label: 'Scale Walk Down' },
  { value: 'chord-passing', label: 'Chord + Passing' },
];

export function MelodyHelper() {
  const [patternType, setPatternType] = useState<MelodyPatternType>('arp-up');

  const rootNote = useTheoryStore(s => s.rootNote);
  const selectedScale = useTheoryStore(s => s.selectedScale);
  const progression = useTheoryStore(s => s.progression);
  const setMelodicStep = useSequencerStore(s => s.setMelodicStep);

  // Track selector state
  const [targetTrackId, setTargetTrackId] = useState<string | null>(null);
  const melodicTracks = useSequencerStore(s => {
    const p = s.patterns.find(p => p.id === s.activePatternId) || s.patterns[0];
    return p?.melodicTracks ?? [];
  });
  const resolvedTrackId = useMemo(() => {
    if (targetTrackId && melodicTracks.find(t => t.id === targetTrackId)) return targetTrackId;
    // Default to 2nd track (Melody 1) if available, else 1st
    return melodicTracks.length > 1 ? melodicTracks[1].id : melodicTracks[0]?.id ?? null;
  }, [targetTrackId, melodicTracks]);

  // Use target track's octave for melody generation
  const targetTrack = melodicTracks.find(t => t.id === resolvedTrackId);
  const baseOctave = targetTrack?.octave ?? 4;

  const melodyNotes = useMemo(() => {
    if (progression.length === 0) return [];
    return generateMelodyPattern(
      progression.map(slot => ({
        scaleDegree: slot.scaleDegree,
        chordDefinition: { intervals: slot.chordDefinition.intervals },
      })),
      rootNote,
      selectedScale,
      patternType,
      baseOctave
    );
  }, [progression, rootNote, selectedScale, patternType, baseOctave]);

  const previewMelody = useCallback(async () => {
    const engine = AudioEngine.getInstance();
    await engine.init();

    melodyNotes.forEach((note, i) => {
      if (!note) return;
      setTimeout(() => {
        engine.synthEngine.previewNote(note, '8n');
      }, i * 150);
    });
  }, [melodyNotes]);

  const applyToTrack = useCallback(() => {
    const pattern = useSequencerStore.getState().getActivePattern();
    const track = pattern.melodicTracks.find(t => t.id === resolvedTrackId);
    if (!track) return;

    const cycleLength = melodyNotes.length;
    if (cycleLength === 0) return;

    // Tile melody notes across all sequencer steps — one undo step
    withUndoGroup(() => {
      for (let step = 0; step < pattern.numSteps; step++) {
        const note = melodyNotes[step % cycleLength];
        setMelodicStep(track.id, step, note);
      }
    });
    announce(`Melody written to ${track.name}`);
  }, [melodyNotes, resolvedTrackId, setMelodicStep]);

  // Show hint when no progression exists
  if (progression.length === 0) {
    return (
      <div className="flex flex-col gap-1.5">
        <h4 className="label-caps">
          Melody Helper
        </h4>
        <p className="text-xs text-text-muted italic">
          Add chords to the progression above to generate melody patterns.
        </p>
      </div>
    );
  }

  // Extract non-null notes for display
  const displayNotes = melodyNotes.filter((n): n is NoteWithOctave => n !== null);

  return (
    <div className="flex flex-col gap-2">
      <h4 className="label-caps">
        Melody Helper
      </h4>

      {/* Pattern selector row */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-text-muted shrink-0">Pattern:</label>
        <select
          aria-label="Pattern"
          value={patternType}
          onChange={(e) => setPatternType(e.target.value as MelodyPatternType)}
          className="px-2 py-1 bg-[#111118] border border-border-control rounded-md text-sm text-text-primary focus:outline-none focus:border-text-primary flex-1 min-w-0"
        >
          {PATTERN_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Track selector + action buttons */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-text-muted shrink-0">Track:</label>
        <select
          aria-label="Track"
          value={resolvedTrackId ?? ''}
          onChange={(e) => setTargetTrackId(e.target.value)}
          disabled={melodicTracks.length === 0}
          className="px-2 py-1 bg-[#111118] border border-border-control rounded-md text-xs text-text-primary focus:outline-none focus:border-text-primary min-w-0 flex-1"
        >
          {melodicTracks.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>

        <button
          onClick={previewMelody}
          className="pill shrink-0"
        >
          Preview
        </button>
        <button
          onClick={applyToTrack}
          disabled={!resolvedTrackId}
          className="pill pill-go shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Apply
        </button>
      </div>

      {/* Note preview pills */}
      {displayNotes.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {melodyNotes.map((note, i) => (
            <div
              key={i}
              className={`px-1.5 py-0.5 rounded text-[11px] font-medium min-w-[2rem] text-center ${
                note
                  ? 'bg-[#121219] text-text-primary border border-[#4a4a62]'
                  : 'bg-bg-cell text-text-muted border border-transparent'
              }`}
            >
              {note ? formatNote(note.replace(/\d$/, '') as any) : '—'}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
