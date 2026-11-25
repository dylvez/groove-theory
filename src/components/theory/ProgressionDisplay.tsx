import { withUndoGroup } from '../../store/history';
import { announce } from '../../utils/announce';
import { useState, useCallback, useMemo, useId } from 'react';
import type { NoteName } from '../../types';
import { NOTE_NAMES } from '../../constants';
import { getDiatonicChordsForScale } from '../../constants/diatonicChords';
import { useTheoryStore } from '../../store/useTheoryStore';
import { useSequencerStore } from '../../store/useSequencerStore';
import { AudioEngine } from '../../audio/AudioEngine';
import { getScaleNotes, getDiatonicChord, getChordNotesWithOctave } from '../../utils/musicTheory';
import { formatNote } from '../../utils/noteHelpers';
import { getStepsPerMeasure } from '../../utils/patternHelpers';
import {
  progressionToSteps, chordLengthSteps, bestChordLength, CHORD_LENGTH_LABELS,
  type ApplyVoicing, type ApplyRhythm, type ChordLength,
} from '../../utils/progression';

type WriteStyle = `${ApplyVoicing}-${ApplyRhythm}`;
const WRITE_STYLES: { value: WriteStyle; label: string }[] = [
  { value: 'chords-held', label: 'Chords, held' },
  { value: 'chords-beats', label: 'Chords on each beat' },
  { value: 'roots-held', label: 'Root notes, held' },
  { value: 'roots-beats', label: 'Root notes on each beat' },
];

export function ProgressionDisplay() {
  const rootNote = useTheoryStore(s => s.rootNote);
  const selectedScale = useTheoryStore(s => s.selectedScale);
  const progression = useTheoryStore(s => s.progression);
  const removeProgressionSlot = useTheoryStore(s => s.removeProgressionSlot);
  const clearProgression = useTheoryStore(s => s.clearProgression);
  const setMelodicSteps = useSequencerStore(s => s.setMelodicSteps);
  const ids = { track: useId(), style: useId(), length: useId(), hint: useId() };

  // Track selector state
  const [targetTrackId, setTargetTrackId] = useState<string | null>(null);
  const [style, setStyle] = useState<WriteStyle>('chords-held');
  const [chordLengthChoice, setChordLengthChoice] = useState<ChordLength | null>(null);
  const pattern = useSequencerStore(s => s.patterns.find(p => p.id === s.activePatternId) || s.patterns[0]);
  const melodicTracks = useMemo(() => pattern?.melodicTracks ?? [], [pattern]);
  const resolvedTrackId = useMemo(() => {
    if (targetTrackId && melodicTracks.find(t => t.id === targetTrackId)) return targetTrackId;
    // Prefer a track that can play chords
    return (melodicTracks.find(t => t.synthType !== 'monoSynth') ?? melodicTracks[0])?.id ?? null;
  }, [targetTrackId, melodicTracks]);
  const targetTrack = melodicTracks.find(t => t.id === resolvedTrackId);
  const mono = targetTrack?.synthType === 'monoSynth';

  // Timing in steps for the active pattern
  const stepsPerBeat = pattern.stepResolution === '32n' ? 8 : 4;
  const stepsPerBar = getStepsPerMeasure(pattern.timeSignature, pattern.stepResolution);

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

  const chordLength = chordLengthChoice ?? bestChordLength(resolvedChords.length, pattern.numSteps, stepsPerBeat, stepsPerBar);
  const stepsPerChord = chordLengthSteps(chordLength, stepsPerBeat, stepsPerBar);
  const fitCount = Math.min(resolvedChords.length, Math.floor(pattern.numSteps / stepsPerChord));
  const [voicing, rhythm] = style.split('-') as [ApplyVoicing, ApplyRhythm];
  const effectiveVoicing: ApplyVoicing = mono ? 'roots' : voicing;

  const hint = fitCount < resolvedChords.length
    ? `Only the first ${fitCount} of ${resolvedChords.length} chords fit in this pattern. Pick a shorter length or make the pattern longer.`
    : mono && voicing === 'chords'
    ? `${targetTrack?.name} is a Mono Synth, so only the root notes are written.`
    : resolvedChords.length * stepsPerChord < pattern.numSteps
    ? 'The progression repeats to fill the pattern.'
    : '';

  const applyToTrack = useCallback(() => {
    if (!targetTrack) return;
    const steps = progressionToSteps(resolvedChords, {
      numSteps: pattern.numSteps,
      stepsPerChord,
      stepsPerBeat,
      octave: targetTrack.octave ?? 3,
      voicing: effectiveVoicing,
      rhythm,
    });
    // One write, one undo step
    withUndoGroup(() => setMelodicSteps(targetTrack.id, steps));
    announce(`Progression written to ${targetTrack.name} as ${effectiveVoicing === 'roots' ? 'root notes' : 'chords'}, ${CHORD_LENGTH_LABELS[chordLength]} each`);
  }, [targetTrack, resolvedChords, pattern.numSteps, stepsPerChord, stepsPerBeat, effectiveVoicing, rhythm, setMelodicSteps, chordLength]);

  if (progression.length === 0) {
    return (
      <div className="flex flex-col gap-1.5">
        <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Progression
        </h4>
        <p className="text-xs text-text-muted italic">
          Hover over or tab to a diatonic chord and press <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-accent-cyan text-on-accent text-[11px] font-bold leading-none align-text-bottom not-italic">+</span> to build a progression.
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
                onClick={() => { removeProgressionSlot(slot.id); announce(`Removed ${chord?.numeral ?? 'chord'}`); }}
                aria-label={`Remove ${chord?.numeral ?? 'chord'} ${i + 1} from the progression`}
                className="w-6 h-6 -mr-1.5 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-text-muted hover:text-accent-red-fg text-sm cursor-pointer transition-opacity"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Listen / clear */}
      <div className="flex gap-2 items-center flex-wrap">
        <button
          onClick={playProgression}
          className="px-3 py-1 rounded-md bg-accent-cyan/20 text-accent-cyan-fg text-xs font-medium border border-accent-cyan/30 hover:bg-accent-cyan/30 cursor-pointer transition-colors"
        >
          Play
        </button>
        <button
          onClick={clearProgression}
          className="px-3 py-1 rounded-md bg-bg-cell text-text-muted text-xs hover:bg-bg-cell-hover cursor-pointer transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Write into the sequencer */}
      <fieldset className="flex flex-col gap-1.5 rounded-md border border-border-control p-2">
        <legend className="px-1 text-[11px] uppercase tracking-wider text-text-muted">Write to a synth track</legend>
        <div className="grid grid-cols-[auto_1fr] items-center gap-x-2 gap-y-1.5 text-xs">
          <label htmlFor={ids.track} className="text-text-muted">Track</label>
          <select
            id={ids.track}
            value={resolvedTrackId ?? ''}
            onChange={(e) => setTargetTrackId(e.target.value)}
            disabled={melodicTracks.length === 0}
            className="px-2 py-1 bg-bg-cell border border-border-control rounded-md text-xs text-text-primary min-w-0"
          >
            {melodicTracks.map(t => (
              <option key={t.id} value={t.id}>{t.name}{t.synthType === 'monoSynth' ? ' (mono)' : ''}</option>
            ))}
          </select>
          <label htmlFor={ids.style} className="text-text-muted">Write as</label>
          <select
            id={ids.style}
            value={style}
            onChange={(e) => setStyle(e.target.value as WriteStyle)}
            className="px-2 py-1 bg-bg-cell border border-border-control rounded-md text-xs text-text-primary min-w-0"
          >
            {WRITE_STYLES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <label htmlFor={ids.length} className="text-text-muted">Each chord</label>
          <select
            id={ids.length}
            value={chordLength}
            onChange={(e) => setChordLengthChoice(e.target.value as ChordLength)}
            className="px-2 py-1 bg-bg-cell border border-border-control rounded-md text-xs text-text-primary min-w-0"
          >
            {(Object.keys(CHORD_LENGTH_LABELS) as ChordLength[]).map(k => (
              <option key={k} value={k}>{CHORD_LENGTH_LABELS[k]}</option>
            ))}
          </select>
        </div>
        {hint && <p id={ids.hint} className="text-[11px] text-accent-amber-fg">{hint}</p>}
        <button
          onClick={applyToTrack}
          disabled={!resolvedTrackId}
          aria-describedby={hint ? ids.hint : undefined}
          className="self-start px-3 py-1 rounded-md bg-accent-green/20 text-accent-green-fg text-xs font-medium border border-accent-green/30 hover:bg-accent-green/30 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Apply to {targetTrack?.name ?? 'track'}
        </button>
        <p className="text-[11px] text-text-muted">Replaces that track’s notes in pattern {pattern.name}. Undo brings them back.</p>
      </fieldset>
    </div>
  );
}
