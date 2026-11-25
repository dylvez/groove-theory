import { memo, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { MelodicTrack, NoteWithOctave, StepFx } from '../../types';
import { NOTE_NAMES } from '../../constants/notes';
import { useSequencerStore } from '../../store/useSequencerStore';
import { useTheoryStore } from '../../store/useTheoryStore';
import { useTransportStore } from '../../store/useTransportStore';
import { useSongStore } from '../../store/useSongStore';
import { beginUndoGroup, endUndoGroup } from '../../store/history';
import { stepPosition, velocityName } from '../../store/useGridFocusStore';
import { AudioEngine } from '../../audio/AudioEngine';
import { getScaleNotes } from '../../utils/musicTheory';
import { midiToNote, noteCovering, noteToMidi, stepNotes } from '../../utils/melodicNotes';
import { spokenNote } from '../../utils/noteHelpers';
import { velocityAlpha } from '../../utils/stepDisplay';
import { describeFx, melodicFx } from '../../utils/stepFx';
import { glowLevel, hexAlpha } from '../../utils/stepDisplay';
import { Popover } from '../common/Popover';
import { useTrackHeaderWidth } from '../../hooks/useCramped';
import { announce } from '../../utils/announce';
import { FxMarks, StepFxControls } from './StepFxControls';

const LENGTHS = [1, 2, 3, 4, 6, 8];
const ROW_GAP = 2; // px between rows (gap-0.5)

interface Cell {
  kind: 'start' | 'tail';
  start: number;
  length: number;
  velocity: number;
  /** Last cell of the note */
  last: boolean;
  /** The step's chance / repeats / timing (start cells only) */
  fx?: StepFx;
}

interface PianoRollProps {
  track: MelodicTrack;
  color: string;
  stepsPerMeasure: number;
  compact: boolean;
  onClose: () => void;
}

/**
 * Pitch × step editor for one synth track. Notes can overlap on a step
 * (chords), each with its own length. Lives inside the sequencer's scroll
 * area so its columns line up with the ruler and the track lane above.
 *
 * Pointer: click an empty cell to add a note (drag right to set its length),
 * click a note to remove it, Shift+click to change its velocity.
 * Keyboard: arrows move, Enter adds/removes, Shift+←/→ changes length,
 * Shift+↑/↓ moves the note, Delete removes, Shift+Enter changes velocity.
 */
export function PianoRoll({ track, color, stepsPerMeasure, compact, onClose }: PianoRollProps) {
  const trackHeaderWidth = useTrackHeaderWidth();
  const rootNote = useTheoryStore(s => s.rootNote);
  const selectedScale = useTheoryStore(s => s.selectedScale);
  const addMelodicNote = useSequencerStore(s => s.addMelodicNote);
  const removeMelodicNote = useSequencerStore(s => s.removeMelodicNote);
  const setMelodicNoteLength = useSequencerStore(s => s.setMelodicNoteLength);
  const cycleMelodicNoteVelocity = useSequencerStore(s => s.cycleMelodicNoteVelocity);
  const setMelodicStepFx = useSequencerStore(s => s.setMelodicStepFx);

  const numSteps = track.steps.length;
  const mono = track.synthType === 'monoSynth';
  const stepsPerBeat = compact ? 8 : 4;
  const headingId = useId();
  const helpId = useId();
  const rootRef = useRef<HTMLElement>(null);
  const rowsRef = useRef<HTMLDivElement>(null);

  // Visible range: two octaves from C of `baseOctave` up to the next-but-one C
  const [baseOctave, setBaseOctave] = useState(() => Math.max(1, Math.min(5, track.octave)));
  const [scaleOnly, setScaleOnly] = useState(true);
  const [drawLength, setDrawLength] = useState(1);
  const [focus, setFocus] = useState<{ pitch: number; step: number } | null>(null);
  // Chance / repeats / timing editor for the step a note starts on
  const [fxEdit, setFxEdit] = useState<{ start: number; note: NoteWithOctave; x: number; y: number } | null>(null);
  const lo = (baseOctave + 1) * 12;
  const hi = lo + 24;

  const scaleNames = getScaleNotes(rootNote, selectedScale) as string[];
  const inScale = useCallback((midi: number) => scaleNames.includes(NOTE_NAMES[midi % 12]), [scaleNames]);

  // One pass over the track: cells per pitch, plus counts outside the range
  const { rows, used, above, below } = useMemo(() => {
    const rows = new Map<number, (Cell | undefined)[]>();
    const used = new Set<number>();
    let above = 0;
    let below = 0;
    const row = (m: number) => {
      let r = rows.get(m);
      if (!r) { r = new Array(numSteps).fill(undefined); rows.set(m, r); }
      return r;
    };
    track.steps.forEach((s, i) => {
      const fx = s.active ? melodicFx(s) : undefined;
      for (const n of stepNotes(s)) {
        const m = noteToMidi(n.note);
        used.add(m);
        if (m > hi) { above++; continue; }
        if (m < lo) { below++; continue; }
        const r = row(m);
        r[i] = { kind: 'start', start: i, length: n.length, velocity: n.velocity, last: n.length === 1, fx };
        for (let k = 1; k < n.length && i + k < numSteps; k++) {
          // A later note of the same pitch cuts this one short
          if (stepNotes(track.steps[i + k]).some(o => noteToMidi(o.note) === m)) break;
          r[i + k] = { kind: 'tail', start: i, length: n.length, velocity: n.velocity, last: k === n.length - 1 || i + k === numSteps - 1 };
        }
      }
    });
    return { rows, used, above, below };
  }, [track.steps, numSteps, lo, hi]);

  // Rows top to bottom (high pitch first). In scale view, out-of-scale rows
  // still show when they hold notes, so nothing is ever hidden.
  const pitches = useMemo(() => {
    const list: number[] = [];
    for (let m = hi; m >= lo; m--) {
      if (!scaleOnly || inScale(m) || used.has(m)) list.push(m);
    }
    return list;
  }, [hi, lo, scaleOnly, inScale, used]);

  // The roll's single Tab stop: last focused cell, else the first note, else the root
  const tabStop = useMemo(() => {
    if (focus && pitches.includes(focus.pitch) && focus.step < numSteps) return focus;
    for (let i = 0; i < numSteps; i++) {
      for (const m of pitches) if (rows.get(m)?.[i]?.kind === 'start') return { pitch: m, step: i };
    }
    const root = pitches.find(m => NOTE_NAMES[m % 12] === rootNote);
    return { pitch: root ?? pitches[Math.floor(pitches.length / 2)], step: 0 };
  }, [focus, pitches, rows, numSteps, rootNote]);

  // Bring the roll into view when it opens. Scroll only the sequencer's own
  // scroll area: scrollIntoView would also shift the overflow-hidden app
  // layout around it, with no scrollbar to put it back.
  useEffect(() => {
    const el = rootRef.current;
    const scroller = el?.closest<HTMLElement>('.overflow-auto');
    if (!el || !scroller) return;
    const er = el.getBoundingClientRect();
    const sr = scroller.getBoundingClientRect();
    if (er.bottom > sr.bottom) scroller.scrollTop += Math.min(er.bottom - sr.bottom, er.top - sr.top);
  }, []);

  const audition = useCallback((note: NoteWithOctave, velocity = 0.8) => {
    const engine = AudioEngine.getInstance();
    engine.init().then(() => {
      engine.prepareMelodicVoice(track.id, track.synthType, track.synthParams, track.volume, track.reverbSend ?? 0, track.delaySend ?? 0, track.pan ?? 0);
      engine.synthEngine.playNote(track.id, note, '8n', undefined, velocity);
    });
  }, [track.id, track.synthType, track.synthParams, track.volume, track.reverbSend, track.delaySend, track.pan]);

  const focusCell = useCallback((pitch: number, step: number) => {
    setFocus({ pitch, step });
    const el = rowsRef.current?.querySelector<HTMLElement>(`[data-roll-cell][data-pitch="${pitch}"][data-step="${step}"]`);
    el?.focus();
  }, []);

  // --- Editing -------------------------------------------------------------

  const addAt = useCallback((pitch: number, step: number, length: number) => {
    const note = midiToNote(pitch);
    addMelodicNote(track.id, step, note, { length, velocity: 0.8, mono });
    audition(note);
  }, [addMelodicNote, track.id, mono, audition]);

  /** Enter / screen reader click: add, or remove (Shift: change velocity) */
  const activate = useCallback((pitch: number, step: number, shift: boolean) => {
    const cover = noteCovering(track.steps, pitch, step);
    if (cover) {
      if (shift) {
        cycleMelodicNoteVelocity(track.id, cover.start, cover.event.note);
      } else {
        removeMelodicNote(track.id, cover.start, cover.event.note);
        announce(`Removed ${spokenNote(cover.event.note)}`);
      }
      return;
    }
    if (shift) return;
    addAt(pitch, step, Math.min(drawLength, numSteps - step));
    announce(`Added ${spokenNote(midiToNote(pitch))}, ${drawLength} step${drawLength > 1 ? 's' : ''}`);
  }, [track.steps, track.id, cycleMelodicNoteVelocity, removeMelodicNote, addAt, drawLength, numSteps]);

  // Drag to set length: press on an empty cell, move right along the row
  const drag = useRef<{ pitch: number; start: number } | null>(null);
  useEffect(() => {
    const up = () => {
      if (drag.current) endUndoGroup();
      drag.current = null;
    };
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, []);

  const onCellDown = useCallback((pitch: number, step: number, e: React.MouseEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.focus({ preventScroll: true });
    setFocus({ pitch, step });
    const cover = noteCovering(track.steps, pitch, step);
    if (cover) {
      if (e.shiftKey) cycleMelodicNoteVelocity(track.id, cover.start, cover.event.note);
      else removeMelodicNote(track.id, cover.start, cover.event.note);
      return;
    }
    if (e.shiftKey) return;
    beginUndoGroup();
    drag.current = { pitch, start: step };
    addAt(pitch, step, Math.min(drawLength, numSteps - step));
  }, [track.steps, track.id, cycleMelodicNoteVelocity, removeMelodicNote, addAt, drawLength, numSteps]);

  const onCellEnter = useCallback((pitch: number, step: number) => {
    const d = drag.current;
    if (!d || pitch !== d.pitch || step < d.start) return;
    setMelodicNoteLength(track.id, d.start, midiToNote(d.pitch), step - d.start + 1);
  }, [setMelodicNoteLength, track.id]);

  /** Right-click or Alt+Enter on a note: edit its step's chance, repeats and timing */
  const openFx = useCallback((pitch: number, step: number, el: HTMLElement) => {
    const cover = noteCovering(track.steps, pitch, step);
    if (!cover) { announce('No note here. Add a note first.'); return; }
    const base = rowsRef.current?.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    if (!base) return;
    setFxEdit({ start: cover.start, note: cover.event.note, x: r.left - base.left, y: r.bottom - base.top + 6 });
  }, [track.steps]);

  // --- Keyboard ------------------------------------------------------------

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const t = e.target as HTMLElement;
    if (t.dataset.rollCell === undefined) return;
    const pitch = Number(t.dataset.pitch);
    const step = Number(t.dataset.step);
    const rowIndex = pitches.indexOf(pitch);
    const cover = noteCovering(track.steps, pitch, step);

    if (e.key === 'Enter' && e.altKey) {
      e.preventDefault();
      openFx(pitch, step, t);
      return;
    }
    if (e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
      if (!cover) return;
      const len = Math.max(1, Math.min(numSteps - cover.start, cover.event.length + (e.key === 'ArrowRight' ? 1 : -1)));
      setMelodicNoteLength(track.id, cover.start, cover.event.note, len);
      announce(`${spokenNote(cover.event.note)} length ${len}`);
      return;
    }
    if (e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      if (!cover) return;
      const target = pitches[rowIndex + (e.key === 'ArrowUp' ? -1 : 1)];
      if (target === undefined) return;
      const toNote = midiToNote(target);
      beginUndoGroup();
      removeMelodicNote(track.id, cover.start, cover.event.note);
      addMelodicNote(track.id, cover.start, toNote, { length: cover.event.length, velocity: cover.event.velocity, mono });
      endUndoGroup();
      audition(toNote, cover.event.velocity);
      announce(`Moved to ${spokenNote(toNote)}`);
      focusCell(target, step);
      return;
    }

    let next: { pitch: number; step: number } | null = null;
    switch (e.key) {
      case 'ArrowRight': if (step < numSteps - 1) next = { pitch, step: step + 1 }; break;
      case 'ArrowLeft': if (step > 0) next = { pitch, step: step - 1 }; break;
      case 'ArrowUp': if (rowIndex > 0) next = { pitch: pitches[rowIndex - 1], step }; break;
      case 'ArrowDown': if (rowIndex < pitches.length - 1) next = { pitch: pitches[rowIndex + 1], step }; break;
      case 'Home': next = { pitch, step: 0 }; break;
      case 'End': next = { pitch, step: numSteps - 1 }; break;
      case 'Delete':
      case 'Backspace':
        e.preventDefault();
        if (cover) {
          removeMelodicNote(track.id, cover.start, cover.event.note);
          announce(`Removed ${spokenNote(cover.event.note)}`);
        }
        return;
      default:
        return;
    }
    e.preventDefault();
    if (next) focusCell(next.pitch, next.step);
  };

  const shiftRange = (delta: number) => setBaseOctave(o => Math.max(0, Math.min(5, o + delta)));
  const rangeLabel = `${midiToNote(lo)}–${midiToNote(hi)}`;
  const labelWidth = trackHeaderWidth + 12;

  return (
    <section
      ref={rootRef}
      aria-labelledby={headingId}
      aria-describedby={helpId}
      // -ml-1 + 1px border + 3px padding = columns line up with the lane above
      className="rounded-xl border border-border bg-bg-secondary py-2 pr-2 -ml-1 pl-[3px]"
    >
      <p id={helpId} className="sr-only">
        Rows are pitches, columns are steps. Arrow keys move. Enter adds a note of the chosen length or removes one.
        Shift+Left and Shift+Right change a note’s length, Shift+Up and Shift+Down move it to the next row,
        Shift+Enter changes velocity, Delete removes it. Alt+Enter, or a right-click, on a note sets its step’s
        chance, repeats and timing, which apply to every note that starts on that step.
      </p>

      {/* Toolbar — pinned to the left while the grid scrolls sideways */}
      <div className="sticky left-1 w-fit max-w-[min(100%,1100px)] flex flex-wrap items-center gap-x-4 gap-y-2 mb-2" style={{ paddingLeft: 4 }}>
        <h4 id={headingId} className="label-caps !text-text-primary">
          Piano roll · {track.name}
        </h4>

        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="text-xs text-text-muted">New note length</span>
          <div role="group" aria-label="Length of new notes, in steps" className="seg">
            {LENGTHS.map(L => (
              <button
                key={L}
                onClick={() => setDrawLength(L)}
                aria-pressed={drawLength === L}
                aria-label={`${L} step${L > 1 ? 's' : ''}`}
                className="seg-item font-mono"
              >
                {L}
              </button>
            ))}
          </div>
        </div>

        <div role="group" aria-label="Pitch range" className="flex items-center gap-1">
          <button
            onClick={() => shiftRange(-1)}
            disabled={baseOctave <= 0}
            aria-label={`Show one octave lower${below ? ` (${below} note${below > 1 ? 's' : ''} below)` : ''}`}
            className="min-w-6 h-6 px-1.5 rounded-full border border-border-soft bg-bg-cell text-text-secondary hover:text-text-primary text-[11px] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span aria-hidden="true">▼{below ? ` ${below}` : ''}</span>
          </button>
          <span className="text-xs text-text-primary font-mono font-semibold w-16 text-center" aria-live="polite">{rangeLabel}</span>
          <button
            onClick={() => shiftRange(1)}
            disabled={baseOctave >= 5}
            aria-label={`Show one octave higher${above ? ` (${above} note${above > 1 ? 's' : ''} above)` : ''}`}
            className="min-w-6 h-6 px-1.5 rounded-full border border-border-soft bg-bg-cell text-text-secondary hover:text-text-primary text-[11px] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span aria-hidden="true">▲{above ? ` ${above}` : ''}</span>
          </button>
        </div>

        <button
          onClick={() => setScaleOnly(v => !v)}
          aria-pressed={scaleOnly}
          title={`Only show notes in ${rootNote} ${selectedScale.name} (plus any rows that already have notes)`}
          className="tog"
        >
          {rootNote} {selectedScale.name} notes only
        </button>

        {mono && (
          <span className="text-[11px] text-accent-amber-fg">Mono synth: one note at a time, so a new note replaces the step’s note.</span>
        )}

        <button
          onClick={onClose}
          aria-label={`Close ${track.name} piano roll`}
          className="w-7 h-7 flex items-center justify-center rounded-full text-text-muted hover:text-text-primary hover:bg-bg-cell cursor-pointer"
        >
          ×
        </button>
      </div>

      {/* Rows */}
      <div ref={rowsRef} className="relative flex flex-col" style={{ gap: ROW_GAP }} onKeyDown={onKeyDown}>
        {pitches.map(m => (
          <PianoRollRow
            key={m}
            midi={m}
            cells={rows.get(m)}
            numSteps={numSteps}
            tabStopStep={tabStop.pitch === m ? tabStop.step : -1}
            inScale={inScale(m)}
            isRoot={NOTE_NAMES[m % 12] === rootNote}
            color={color}
            stepsPerMeasure={stepsPerMeasure}
            stepsPerBeat={stepsPerBeat}
            compact={compact}
            labelWidth={labelWidth}
            onCellDown={onCellDown}
            onCellEnter={onCellEnter}
            onActivate={activate}
            onAudition={audition}
            onEdit={openFx}
          />
        ))}
        <Playhead left={labelWidth + 4} compact={compact} stepsPerMeasure={stepsPerMeasure} />
        <RollGlow rows={rows} pitches={pitches} color={color} numSteps={numSteps} left={labelWidth + 4} compact={compact} stepsPerMeasure={stepsPerMeasure} />
        {fxEdit && (
          <Popover
            label={`Chance, repeats and timing: ${spokenNote(fxEdit.note)} ${stepPosition(fxEdit.start, stepsPerMeasure, stepsPerBeat)}`}
            onClose={() => setFxEdit(null)}
            className="absolute z-30 w-64 p-3 flex flex-col gap-2.5 bg-bg-secondary border border-border-soft rounded-xl shadow-2xl"
            style={{ left: Math.max(0, fxEdit.x - 8), top: fxEdit.y }}
          >
            <div className="flex items-center justify-between gap-2">
              <h5 className="label-caps !text-text-primary">{fxEdit.note} · {stepPosition(fxEdit.start, stepsPerMeasure, stepsPerBeat)}</h5>
              <button
                onClick={() => setFxEdit(null)}
                aria-label="Close"
                className="w-7 h-7 flex items-center justify-center rounded-full text-text-muted hover:text-text-primary hover:bg-bg-cell cursor-pointer"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
            <p className="text-[11px] text-text-muted leading-snug">Applies to every note that starts on this step.</p>
            <StepFxControls fx={melodicFx(track.steps[fxEdit.start])} onChange={(f) => setMelodicStepFx(track.id, fxEdit.start, f)} />
          </Popover>
        )}
      </div>
    </section>
  );
}

interface RowProps {
  midi: number;
  cells: (Cell | undefined)[] | undefined;
  numSteps: number;
  tabStopStep: number;
  inScale: boolean;
  isRoot: boolean;
  color: string;
  stepsPerMeasure: number;
  stepsPerBeat: number;
  compact: boolean;
  labelWidth: number;
  onCellDown: (pitch: number, step: number, e: React.MouseEvent<HTMLButtonElement>) => void;
  onCellEnter: (pitch: number, step: number) => void;
  onActivate: (pitch: number, step: number, shift: boolean) => void;
  onAudition: (note: NoteWithOctave) => void;
  onEdit: (pitch: number, step: number, el: HTMLElement) => void;
}

const PianoRollRow = memo(function PianoRollRow({
  midi, cells, numSteps, tabStopStep, inScale, isRoot, color, stepsPerMeasure, stepsPerBeat, compact, labelWidth,
  onCellDown, onCellEnter, onActivate, onAudition, onEdit,
}: RowProps) {
  const note = midiToNote(midi);
  const spoken = spokenNote(note);
  const black = note.includes('#');
  const cellW = compact ? 'w-6' : 'w-9';

  return (
    <div role="group" aria-label={`${spoken}${isRoot ? ', root' : inScale ? '' : ', outside the scale'}`} className="flex items-center gap-1">
      {/* Pitch label — mouse users can press it to hear the note */}
      <div aria-hidden="true" className="shrink-0 sticky left-0 z-10 bg-bg-secondary self-stretch flex items-center justify-end gap-1.5 pr-1" style={{ width: labelWidth }}>
        <span
          onMouseDown={() => onAudition(note)}
          className={`text-[11px] font-mono cursor-pointer select-none ${
            isRoot ? 'text-accent-orange-fg font-bold' : inScale ? 'text-text-secondary' : 'text-text-muted'
          }`}
        >
          {note}
        </span>
        <span className={`w-3 h-4 rounded-sm ${black ? 'bg-gray-900 border border-border-control' : 'bg-gray-200'}`} />
      </div>
      <div className={`flex ${compact ? 'gap-0.5' : 'gap-1'}`}>
        {Array.from({ length: numSteps }, (_, i) => {
          const c = cells?.[i];
          const isBarStart = i % stepsPerMeasure === 0 && i > 0;
          const isBeatStart = i % stepsPerBeat === 0;
          const position = stepPosition(i, stepsPerMeasure, stepsPerBeat);
          const feel = c?.kind === 'start' ? describeFx(c.fx) : '';
          const label = !c
            ? `${spoken} ${position}`
            : c.kind === 'start'
            ? `${spoken} ${position}, ${c.length} step${c.length > 1 ? 's' : ''} long, ${velocityName(c.velocity)}${feel ? `, ${feel}` : ''}`
            : `${spoken} ${position}, held from ${stepPosition(c.start, stepsPerMeasure, stepsPerBeat)}`;
          const continues = c && !c.last;
          return (
            <button
              key={i}
              type="button"
              data-roll-cell=""
              data-pitch={midi}
              data-step={i}
              tabIndex={tabStopStep === i ? 0 : -1}
              aria-pressed={!!c}
              aria-label={label}
              onMouseDown={(e) => onCellDown(midi, i, e)}
              onMouseEnter={() => onCellEnter(midi, i)}
              onClick={(e) => { if (e.detail === 0) onActivate(midi, i, e.shiftKey); }}
              onContextMenu={(e) => { e.preventDefault(); if (c) onEdit(midi, i, e.currentTarget); }}
              className={`relative ${cellW} h-6 border cursor-pointer select-none ${isBarStart ? 'ml-2' : ''} ${
                c
                  ? `step-active border-transparent ${c.kind === 'start' ? (continues ? 'rounded-l-sm' : 'rounded-sm') : continues ? '' : 'rounded-r-sm'}`
                  : `rounded-sm border-border-cell hover:border-border-control ${
                      isRoot ? 'bg-accent-orange/15' : inScale ? (isBeatStart ? 'bg-bg-cell-hover' : 'bg-bg-cell') : 'bg-bg-secondary'
                    }`
              }`}
              style={c ? {
                backgroundColor: `${color}${velocityAlpha(c.kind === 'start' ? c.velocity : c.velocity * 0.6)}`,
              } : undefined}
            >
              {c?.kind === 'start' && <FxMarks fx={c.fx} />}
            </button>
          );
        })}
      </div>
    </div>
  );
});

/**
 * Night Glow in the piano roll: notes sounding under the playhead bloom, and
 * the two steps just played keep a fading afterglow. Drawn as one light
 * overlay so the rows themselves don't redraw on every step.
 */
function RollGlow({ rows, pitches, color, numSteps, left, compact, stepsPerMeasure }: {
  rows: Map<number, (Cell | undefined)[]>;
  pitches: number[];
  color: string;
  numSteps: number;
  left: number;
  compact: boolean;
  stepsPerMeasure: number;
}) {
  const step = useTransportStore(s => s.currentStep);
  const songPlaying = useSongStore(s => s.songState) === 'playing';
  const playing = useTransportStore(s => s.state) === 'playing' || songPlaying;
  if (!playing) return null;
  const w = compact ? 24 : 36;
  const gap = compact ? 2 : 4;
  const boxes: { key: string; x: number; y: number; level: number }[] = [];
  for (const back of [2, 1, 0]) {
    const s = (step - back + numSteps) % numSteps;
    const level = glowLevel(s, step, true, numSteps);
    pitches.forEach((m, r) => {
      if (rows.get(m)?.[s]) boxes.push({ key: `${m}-${s}`, x: left + s * (w + gap) + Math.floor(s / stepsPerMeasure) * 8, y: r * (24 + ROW_GAP), level });
    });
  }
  return (
    <div aria-hidden="true" className="pointer-events-none">
      {boxes.map(b => (
        <span
          key={b.key}
          className="absolute rounded-sm"
          style={{
            left: b.x, top: b.y, width: w, height: 24,
            boxShadow: b.level >= 1
              ? `0 0 0 2px #ffffff, 0 0 18px ${color}f2, 0 0 6px #ffffff`
              : `0 0 ${Math.round(16 * b.level)}px ${color}${hexAlpha(0.8 * b.level)}`,
          }}
        />
      ))}
    </div>
  );
}

/** Column highlight that follows playback across all rows */
function Playhead({ left, compact, stepsPerMeasure }: { left: number; compact: boolean; stepsPerMeasure: number }) {
  const step = useTransportStore(s => s.currentStep);
  const songPlaying = useSongStore(s => s.songState) === 'playing';
  const playing = useTransportStore(s => s.state) === 'playing' || songPlaying;
  if (!playing) return null;
  const w = compact ? 24 : 36;
  const gap = compact ? 2 : 4;
  const x = left + step * (w + gap) + Math.floor(step / stepsPerMeasure) * 8;
  return (
    <div
      aria-hidden="true"
      className="absolute top-0 bottom-0 rounded-sm bg-white/10 ring-1 ring-white/50 pointer-events-none"
      style={{ left: x, width: w }}
    />
  );
}
