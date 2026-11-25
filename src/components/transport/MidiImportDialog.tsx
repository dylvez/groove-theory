import { useId, useMemo, useRef, useState } from 'react';
import type { StepResolution } from '../../types';
import { useUIStore } from '../../store/useUIStore';
import { useSequencerStore } from '../../store/useSequencerStore';
import { useSongStore } from '../../store/useSongStore';
import { useTransportStore } from '../../store/useTransportStore';
import { withUndoGroup } from '../../store/history';
import { useModal } from '../../hooks/useModal';
import { buildImport, soundFor, type MidiFileData, type MidiPart } from '../../utils/midiImport';
import { PATTERN_IDS, type PatternBars } from '../../constants/patterns';
import { getSynthPreset } from '../../constants';
import { confirmReplaceWork, markWorkSaved } from '../../utils/workState';
import { announce } from '../../utils/announce';

const LENGTHS: PatternBars[] = [1, 2, 4, 8];

/** Most notes off the 1/16 grid? Then 1/32 keeps the rhythm better. */
function suggestResolution(data: MidiFileData): StepResolution {
  const sixteenth = data.ppq / 4;
  const notes = data.parts.flatMap(p => p.notes);
  const off = notes.filter(n => Math.abs(n.tick / sixteenth - Math.round(n.tick / sixteenth)) > 0.25).length;
  return notes.length && off / notes.length > 0.2 ? '32n' : '16n';
}

export function MidiImportDialog({ file }: { file: MidiFileData & { fileName: string } }) {
  const setMidiImport = useUIStore(s => s.setMidiImport);
  const loadPatterns = useSequencerStore(s => s.loadPatterns);
  const loadBlocks = useSongStore(s => s.loadBlocks);
  const close = () => setMidiImport(null);
  const titleId = useId();
  const descId = useId();
  const importRef = useRef<HTMLButtonElement>(null);
  const ref = useModal<HTMLDivElement>(close, importRef);

  const [partIds, setPartIds] = useState<string[]>(() => file.parts.map(p => p.id));
  const [resolution, setResolution] = useState<StepResolution>(() => suggestResolution(file));

  // Default length: the shortest that fits the whole song in eight slots
  // (short chunks repeat more often), else the longest
  const [bars, setBars] = useState<PatternBars>(() => {
    const ids = file.parts.map(p => p.id);
    for (const b of [2, 4, 8] as PatternBars[]) {
      const r = buildImport(file, { partIds: ids, barsPerPattern: b, resolution: suggestResolution(file) });
      if (r.importedBars >= r.totalBars) return b;
    }
    return 8;
  });

  const preview = useMemo(
    () => (partIds.length ? buildImport(file, { partIds, barsPerPattern: bars, resolution }) : null),
    [file, partIds, bars, resolution],
  );

  const togglePart = (id: string) =>
    setPartIds(ids => (ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]));

  const doImport = async () => {
    if (!preview) return;
    if (!(await confirmReplaceWork(`Importing "${file.fileName}"`))) return;
    useSongStore.getState().stopSong();
    useTransportStore.getState().stop();
    withUndoGroup(() => {
      loadPatterns(preview.patterns, PATTERN_IDS[0]);
      loadBlocks(preview.blocks);
    });
    useTransportStore.getState().setBpm(preview.bpm);
    useTransportStore.getState().setSwing(0);
    markWorkSaved();
    announce(`Imported ${file.fileName}: ${preview.patterns.length} patterns, ${preview.importedBars} bars. Undo brings back what was here.`);
    close();
  };

  const summary = preview
    ? `Becomes ${preview.patterns.length} pattern${preview.patterns.length === 1 ? '' : 's'} of ${bars} bar${bars > 1 ? 's' : ''} and a song of ${preview.blocks.length} block${preview.blocks.length === 1 ? '' : 's'}, covering ${preview.importedBars} of ${preview.totalBars} bars.`
    : 'Choose at least one part to import.';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="bg-bg-secondary border border-border-control rounded-xl shadow-2xl w-[92vw] max-w-xl max-h-[85vh] flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
          <h2 id={titleId} className="text-sm font-bold text-text-primary truncate">Import MIDI: {file.fileName}</h2>
          <button onClick={close} aria-label="Cancel import" className="w-7 h-7 flex items-center justify-center rounded text-text-muted hover:text-text-primary cursor-pointer">×</button>
        </div>

        <div className="overflow-y-auto px-5 py-4 flex flex-col gap-4 text-xs text-text-secondary">
          <p id={descId}>
            {file.bpm} BPM · {file.timeSignature[0]}/{file.timeSignature[1]} · {file.parts.length} part{file.parts.length > 1 ? 's' : ''}.
            This replaces all patterns and the song arrangement; Undo brings them back.
          </p>

          <fieldset className="flex flex-col gap-1">
            <legend className="text-[11px] uppercase tracking-wider text-text-muted mb-1">Parts to import</legend>
            {file.parts.map(p => (
              <label key={p.id} className="flex items-center gap-2 min-h-6 cursor-pointer">
                <input
                  type="checkbox"
                  checked={partIds.includes(p.id)}
                  onChange={() => togglePart(p.id)}
                  className="w-4 h-4 accent-accent-orange cursor-pointer"
                />
                <span className="text-text-primary">{p.name}</span>
                <span className="text-text-muted">
                  {p.isDrums ? 'drums' : soundLabel(p)}, {p.notes.length} notes
                </span>
              </label>
            ))}
          </fieldset>

          <fieldset className="flex flex-wrap items-center gap-2">
            <legend className="text-[11px] uppercase tracking-wider text-text-muted mb-1 w-full">Pattern length</legend>
            {LENGTHS.map(b => (
              <label key={b} className={`flex items-center gap-1.5 px-2 min-h-7 rounded-md border cursor-pointer ${bars === b ? 'border-accent-purple bg-accent-purple/15 text-text-primary' : 'border-border-control'}`}>
                <input type="radio" name="midi-bars" checked={bars === b} onChange={() => setBars(b)} className="accent-accent-purple" />
                {b} bar{b > 1 ? 's' : ''}
              </label>
            ))}
            <p className="w-full text-text-muted">Repeated sections share a pattern. Shorter patterns repeat more often; longer ones fit longer songs into the {PATTERN_IDS.length} slots.</p>
          </fieldset>

          <fieldset className="flex flex-wrap items-center gap-2">
            <legend className="text-[11px] uppercase tracking-wider text-text-muted mb-1 w-full">Snap notes to</legend>
            {(['16n', '32n'] as StepResolution[]).map(r => (
              <label key={r} className={`flex items-center gap-1.5 px-2 min-h-7 rounded-md border cursor-pointer ${resolution === r ? 'border-accent-purple bg-accent-purple/15 text-text-primary' : 'border-border-control'}`}>
                <input type="radio" name="midi-res" checked={resolution === r} onChange={() => setResolution(r)} className="accent-accent-purple" />
                1/{r === '16n' ? 16 : 32} notes
              </label>
            ))}
          </fieldset>

          <div className="rounded-md border border-border-control bg-bg-primary/40 p-3" role="status">
            <p className="text-text-primary">{summary}</p>
            {preview && preview.skippedLeadingBars > 0 && (
              <p className="mt-1 text-text-muted">{preview.skippedLeadingBars} empty bar{preview.skippedLeadingBars > 1 ? 's' : ''} at the start will be left out.</p>
            )}
            {preview?.warnings.map((w, i) => (
              <p key={i} className="mt-1 text-accent-amber-fg">{w}</p>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border shrink-0">
          <button onClick={close} className="px-3 py-1.5 rounded-md text-xs text-text-secondary bg-bg-cell border border-border-control hover:bg-bg-cell-hover cursor-pointer">
            Cancel
          </button>
          <button
            ref={importRef}
            onClick={doImport}
            disabled={!preview}
            className="px-3 py-1.5 rounded-md text-xs font-semibold bg-accent-green text-on-accent hover:brightness-110 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
}

function soundLabel(part: MidiPart): string {
  const { preset, family } = soundFor(part);
  const name = getSynthPreset(preset)?.name ?? preset;
  return family ? `${family} → ${name} sound` : `${name} sound`;
}
