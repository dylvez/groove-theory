import { useState, useCallback } from 'react';
import { usePopover } from '../../hooks/usePopover';
import { withUndoGroup } from '../../store/history';
import { hasUnsavedWork } from '../../utils/workState';
import { announce } from '../../utils/announce';
import { showAlert, showConfirm } from '../../utils/dialogs';
import { useSequencerStore } from '../../store/useSequencerStore';
import { useTransportStore } from '../../store/useTransportStore';
import { useUIStore } from '../../store/useUIStore';
import { useSongStore } from '../../store/useSongStore';
import { exportPatternToMidi, exportSongToMidi } from '../../utils/midiExport';
import { exportPatternToWav, exportPatternToMp3, exportSongToWav, exportSongToMp3 } from '../../utils/audioExport';
import { SaveGrooveDropdown } from '../transport/SaveGrooveDropdown';
import { OpenGrooveDropdown } from '../transport/OpenGrooveDropdown';
import { RingMark } from '../common/RhythmRing';
import { HelpModal } from './HelpModal';
import { LayoutControls } from './LayoutControls';
import { useTrackHeaderWidth } from '../../hooks/useCramped';

type Format = 'midi' | 'wav' | 'mp3';
const FORMATS: { key: Format; label: string }[] = [
  { key: 'midi', label: 'MIDI' },
  { key: 'wav', label: 'WAV' },
  { key: 'mp3', label: 'MP3' },
];

const EXPORT_FAILED = 'Something went wrong while making the audio file. Please try again.';

const ghost = 'min-h-8 px-2.5 rounded-full text-[13px] font-medium text-text-secondary hover:text-text-primary hover:bg-bg-cell transition-colors cursor-pointer flex items-center gap-1.5';

function ExportMenu({ onClose, canPattern, songBlocks, busy, onExport }: {
  onClose: () => void;
  canPattern: boolean;
  songBlocks: number;
  busy: Format | null;
  onExport: (what: 'pattern' | 'song', format: Format) => void;
}) {
  const ref = usePopover<HTMLDivElement>(onClose);
  const group = (what: 'pattern' | 'song', title: string, enabled: boolean, note?: string) => (
    <div role="group" aria-labelledby={`export-${what}`} className="flex flex-col gap-1.5">
      <h3 id={`export-${what}`} className="label-caps">{title}</h3>
      <div className="flex gap-1.5">
        {FORMATS.map(f => (
          <button
            key={f.key}
            onClick={() => { onExport(what, f.key); onClose(); }}
            disabled={!enabled || busy !== null}
            className="pill flex-1 font-mono font-semibold"
          >
            {f.label}
          </button>
        ))}
      </div>
      {note && <p className="text-[11px] text-text-muted">{note}</p>}
    </div>
  );
  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Export"
      className="absolute top-full right-0 mt-2 z-50 w-64 p-3 flex flex-col gap-3 bg-bg-secondary border border-border-soft rounded-xl shadow-2xl"
    >
      {group('pattern', 'This pattern', canPattern, canPattern ? undefined : 'The pattern has no notes yet.')}
      {songBlocks > 0 && group('song', `The song · ${songBlocks} block${songBlocks === 1 ? '' : 's'}`, true)}
    </div>
  );
}

export function Header() {
  const clearAllPatterns = useSequencerStore(s => s.clearAllPatterns);
  const getActivePattern = useSequencerStore(s => s.getActivePattern);
  const patterns = useSequencerStore(s => s.patterns);
  const undo = useSequencerStore(s => s.undo);
  const redo = useSequencerStore(s => s.redo);
  const undoDepth = useSequencerStore(s => s.undoDepth);
  const redoDepth = useSequencerStore(s => s.redoDepth);
  const bpm = useTransportStore(s => s.bpm);
  const trackHeaderWidth = useTrackHeaderWidth();
  const songBlocks = useSongStore(s => s.blocks);
  const clearSong = useSongStore(s => s.clearSong);

  // Does the active pattern have anything to export?
  const hasContent = useSequencerStore(s => {
    const p = s.patterns.find(pat => pat.id === s.activePatternId) ?? s.patterns[0];
    const hasDrum = p.drumTracks.some(t => !t.muted && t.steps.some(v => v !== 0));
    const hasMelodic = p.melodicTracks.some(t => !t.muted && t.steps.some(st => st.active));
    return hasDrum || hasMelodic;
  });
  const canExport = hasContent || songBlocks.length > 0;

  const [saveOpen, setSaveOpen] = useState(false);
  const [openOpen, setOpenOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState<Format | null>(null);
  const helpOpen = useUIStore(s => s.helpOpen);
  const setHelpOpen = useUIStore(s => s.setHelpOpen);

  const toggleSave = useCallback(() => { setSaveOpen(v => !v); setOpenOpen(false); }, []);
  const toggleOpen = useCallback(() => { setOpenOpen(v => !v); setSaveOpen(false); }, []);

  const handleNewGroove = useCallback(async () => {
    if (hasUnsavedWork() && !(await showConfirm(
      'Start a new groove?',
      'This clears every pattern and the song arrangement, and your current work hasn’t been saved.\n\n' +
      'Undo (Ctrl+Z or ⌘Z) brings it back.',
      { confirmLabel: 'Start new' },
    ))) return;
    withUndoGroup(() => {
      clearAllPatterns();
      clearSong();
    });
    announce('Started a new groove');
  }, [clearAllPatterns, clearSong]);

  const runExport = useCallback(async (what: 'pattern' | 'song', format: Format) => {
    if (exporting) return;
    if (format === 'midi') {
      if (what === 'pattern') exportPatternToMidi(getActivePattern(), bpm);
      else exportSongToMidi(songBlocks, patterns, bpm);
      return;
    }
    setExporting(format);
    announce(`Making the ${format.toUpperCase()} file…`);
    try {
      if (what === 'pattern') {
        await (format === 'wav' ? exportPatternToWav : exportPatternToMp3)(getActivePattern(), bpm);
      } else {
        await (format === 'wav' ? exportSongToWav : exportSongToMp3)(songBlocks, patterns, bpm);
      }
    } catch (e) {
      console.error(`${format.toUpperCase()} export failed:`, e);
      void showAlert(`${format.toUpperCase()} export failed`, EXPORT_FAILED);
    } finally {
      setExporting(null);
    }
  }, [exporting, getActivePattern, bpm, songBlocks, patterns]);

  return (
    <header className="sticky top-0 z-50 flex flex-wrap items-center gap-x-4 gap-y-2 px-4 sm:px-6 py-2 min-h-[53px] bg-bg-tertiary border-b border-border shrink-0 cramped:static">
      {/* The Fulmerica seal, then this app's own mark and title. The block is as wide
          as the track names so the buttons line up with the grid. The seal opens in a
          new tab so unsaved work in this one is never lost. */}
      <div className="flex items-center gap-3 shrink-0 pr-3" style={{ minWidth: trackHeaderWidth + 4 }}>
        <a
          href="https://fulmerica.com/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Fulmerica home (opens in a new tab)"
          title="Fulmerica"
          className="block shrink-0 rounded-full transition-transform motion-safe:hover:-rotate-[8deg]"
        >
          <img src={`${import.meta.env.BASE_URL}images/fulmerica-seal.svg`} alt="" width={30} height={30} className="block" />
        </a>
        <div aria-hidden="true" className="w-px h-6 bg-border-soft shrink-0" />
        <RingMark size={30} />
        <h1 className="font-display text-lg font-bold text-text-primary tracking-tight whitespace-nowrap">
          Groove Theory
        </h1>
      </div>

      <div className="flex items-center gap-1">
        <button onClick={handleNewGroove} title="New groove: clear all patterns and the song" className={ghost}>New</button>
        <div className="relative">
          <button onClick={toggleSave} aria-expanded={saveOpen} aria-haspopup="dialog" title="Save groove" className={ghost}>Save</button>
          {saveOpen && <SaveGrooveDropdown onClose={() => setSaveOpen(false)} />}
        </div>
        <div className="relative">
          <button onClick={toggleOpen} aria-expanded={openOpen} aria-haspopup="dialog" title="Open a saved groove or preset" className={ghost}>Open</button>
          {openOpen && <OpenGrooveDropdown onClose={() => setOpenOpen(false)} />}
        </div>
        <button onClick={() => setHelpOpen(true)} aria-haspopup="dialog" title="How to use Groove Theory" className={ghost}>Help</button>
      </div>

      <div className="flex items-center gap-0.5">
        <button
          onClick={undo}
          disabled={undoDepth === 0}
          aria-label="Undo"
          aria-keyshortcuts="Meta+Z Control+Z"
          title={undoDepth > 0 ? `Undo (${undoDepth})` : 'Nothing to undo'}
          className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-cell cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        >
          <svg aria-hidden="true" width="15" height="15" viewBox="0 0 16 16"><path d="M5 4L2 7l3 3M2.5 7H10a3.5 3.5 0 010 7H7" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <button
          onClick={redo}
          disabled={redoDepth === 0}
          aria-label="Redo"
          aria-keyshortcuts="Meta+Shift+Z Control+Shift+Z"
          title={redoDepth > 0 ? `Redo (${redoDepth})` : 'Nothing to redo'}
          className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-cell cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        >
          <svg aria-hidden="true" width="15" height="15" viewBox="0 0 16 16"><path d="M11 4l3 3-3 3M13.5 7H6a3.5 3.5 0 000 7h3" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-2 shrink-0 cramped:shrink cramped:ml-0">
        <div className="relative">
          <button
            onClick={() => setExportOpen(v => !v)}
            disabled={!canExport}
            aria-expanded={exportOpen}
            aria-haspopup="dialog"
            title={canExport ? 'Export the pattern or the song as MIDI, WAV or MP3' : 'Nothing to export yet'}
            className="pill text-[13px]"
          >
            {exporting ? `Exporting ${exporting.toUpperCase()}…` : 'Export'}
            <svg aria-hidden="true" width="10" height="10" viewBox="0 0 10 10"><path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" fill="none" /></svg>
          </button>
          {exportOpen && (
            <ExportMenu
              onClose={() => setExportOpen(false)}
              canPattern={hasContent}
              songBlocks={songBlocks.length}
              busy={exporting}
              onExport={runExport}
            />
          )}
        </div>
        <LayoutControls />
        <div aria-hidden="true" className="w-px h-5 bg-border mx-1" />
        <span className="text-[11px] text-text-muted mr-1">&copy; 2026 Fulmerica</span>
        <a
          href="mailto:groovetheoryapp@gmail.com"
          className="w-7 h-7 flex items-center justify-center rounded-full text-text-muted hover:text-text-primary transition-colors"
          aria-label="Email Groove Theory"
          title="Contact"
        >
          <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
            <path d="M2.5 3A1.5 1.5 0 0 0 1 4.5v.793c.026.009.051.02.076.032L7.674 8.51c.206.1.446.1.652 0l6.598-3.185A.755.755 0 0 1 15 5.293V4.5A1.5 1.5 0 0 0 13.5 3h-11Z" />
            <path d="M15 6.954 8.978 9.86a2.25 2.25 0 0 1-1.956 0L1 6.954V11.5A1.5 1.5 0 0 0 2.5 13h11a1.5 1.5 0 0 0 1.5-1.5V6.954Z" />
          </svg>
        </a>
        <a
          href="https://github.com/dylvez/groove-theory"
          target="_blank"
          rel="noopener noreferrer"
          className="w-7 h-7 flex items-center justify-center rounded-full text-text-muted hover:text-text-primary transition-colors"
          aria-label="Groove Theory on GitHub (opens in a new tab)"
          title="GitHub"
        >
          <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
          </svg>
        </a>
      </div>

      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
    </header>
  );
}
