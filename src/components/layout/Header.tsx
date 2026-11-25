import { useState, useCallback } from 'react';
import { usePopover } from '../../hooks/usePopover';
import { withUndoGroup } from '../../store/history';
import { hasUnsavedWork } from '../../utils/workState';
import { announce } from '../../utils/announce';
import { useSequencerStore } from '../../store/useSequencerStore';
import { useTransportStore } from '../../store/useTransportStore';
import { useUIStore } from '../../store/useUIStore';
import { useSongStore } from '../../store/useSongStore';
import { exportPatternToMidi, exportSongToMidi } from '../../utils/midiExport';
import { exportPatternToWav, exportPatternToMp3, exportSongToWav, exportSongToMp3 } from '../../utils/audioExport';
import { SaveGrooveDropdown } from '../transport/SaveGrooveDropdown';
import { OpenGrooveDropdown } from '../transport/OpenGrooveDropdown';
import { HelpModal } from './HelpModal';

type ExportDropdownType = 'midi' | 'wav' | 'mp3' | null;

function ExportDropdown({
  type,
  onClose,
  onExportPattern,
  onExportSong,
  songBlockCount,
}: {
  type: ExportDropdownType;
  onClose: () => void;
  onExportPattern: () => void;
  onExportSong: () => void;
  songBlockCount: number;
}) {
  const ref = usePopover<HTMLDivElement>(onClose);

  if (!type) return null;

  const label = type.toUpperCase();

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={`Export ${label}`}
      className="absolute top-full right-0 mt-1 z-50 bg-bg-secondary border border-border rounded-lg shadow-lg overflow-hidden min-w-[160px]"
    >
      <button
        onClick={() => { onExportPattern(); onClose(); }}
        className="w-full px-3 py-2 text-xs text-left hover:bg-bg-cell-hover cursor-pointer transition-colors text-text-secondary"
      >
        Export Pattern ({label})
      </button>
      <div className="border-t border-border" />
      <button
        onClick={() => { onExportSong(); onClose(); }}
        className="w-full px-3 py-2 text-xs text-left hover:bg-bg-cell-hover cursor-pointer transition-colors text-accent-teal-fg font-medium"
      >
        Export Song ({songBlockCount} block{songBlockCount !== 1 ? 's' : ''})
      </button>
    </div>
  );
}

export function Header() {
  const clearAllPatterns = useSequencerStore(s => s.clearAllPatterns);
  const getActivePattern = useSequencerStore(s => s.getActivePattern);
  const patterns = useSequencerStore(s => s.patterns);
  const bpm = useTransportStore(s => s.bpm);
  const trackHeaderWidth = useUIStore(s => s.trackHeaderWidth);
  const songBlocks = useSongStore(s => s.blocks);
  const clearSong = useSongStore(s => s.clearSong);

  const hasSongBlocks = songBlocks.length > 0;

  // Check if the active pattern has any content to export
  const hasContent = useSequencerStore(s => {
    const p = s.patterns.find(pat => pat.id === s.activePatternId) ?? s.patterns[0];
    const hasDrum = p.drumTracks.some(t => !t.muted && t.steps.some(v => v !== 0));
    const hasMelodic = p.melodicTracks.some(t => !t.muted && t.steps.some(st => st.active));
    return hasDrum || hasMelodic;
  });

  const canExport = hasContent || hasSongBlocks;

  const [saveOpen, setSaveOpen] = useState(false);
  const [openOpen, setOpenOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [exporting, setExporting] = useState<'wav' | 'mp3' | null>(null);
  const [exportDropdown, setExportDropdown] = useState<ExportDropdownType>(null);

  const toggleSave = useCallback(() => {
    setSaveOpen(v => !v);
    setOpenOpen(false);
  }, []);
  const toggleOpen = useCallback(() => {
    setOpenOpen(v => !v);
    setSaveOpen(false);
  }, []);

  const handleNewGroove = useCallback(() => {
    if (hasUnsavedWork() && !window.confirm(
      'Start a new groove? This clears every pattern and the song arrangement, and your current work hasn\'t been saved.\n\nYou can get it back with Undo (Ctrl+Z or ⌘Z).'
    )) return;
    withUndoGroup(() => {
      clearAllPatterns();
      clearSong();
    });
    announce('Started a new groove');
  }, [clearAllPatterns, clearSong]);

  // Pattern exports
  const handleExportMidiPattern = useCallback(() => {
    const pattern = getActivePattern();
    exportPatternToMidi(pattern, bpm);
  }, [getActivePattern, bpm]);

  const handleExportWavPattern = useCallback(async () => {
    if (exporting) return;
    setExporting('wav');
    try {
      const pattern = getActivePattern();
      await exportPatternToWav(pattern, bpm);
    } catch (e) {
      console.error('WAV export failed:', e);
      alert('WAV export failed — check console for details.');
    } finally {
      setExporting(null);
    }
  }, [getActivePattern, bpm, exporting]);

  const handleExportMp3Pattern = useCallback(async () => {
    if (exporting) return;
    setExporting('mp3');
    try {
      const pattern = getActivePattern();
      await exportPatternToMp3(pattern, bpm);
    } catch (e) {
      console.error('MP3 export failed:', e);
      alert('MP3 export failed — check console for details.');
    } finally {
      setExporting(null);
    }
  }, [getActivePattern, bpm, exporting]);

  // Song exports
  const handleExportMidiSong = useCallback(() => {
    exportSongToMidi(songBlocks, patterns, bpm);
  }, [songBlocks, patterns, bpm]);

  const handleExportWavSong = useCallback(async () => {
    if (exporting) return;
    setExporting('wav');
    try {
      await exportSongToWav(songBlocks, patterns, bpm);
    } catch (e) {
      console.error('WAV song export failed:', e);
      alert('WAV song export failed — check console for details.');
    } finally {
      setExporting(null);
    }
  }, [songBlocks, patterns, bpm, exporting]);

  const handleExportMp3Song = useCallback(async () => {
    if (exporting) return;
    setExporting('mp3');
    try {
      await exportSongToMp3(songBlocks, patterns, bpm);
    } catch (e) {
      console.error('MP3 song export failed:', e);
      alert('MP3 song export failed — check console for details.');
    } finally {
      setExporting(null);
    }
  }, [songBlocks, patterns, bpm, exporting]);

  // Click handlers for export buttons — show dropdown if song exists, otherwise direct export
  const handleMidiClick = useCallback(() => {
    if (hasSongBlocks) {
      setExportDropdown(d => d === 'midi' ? null : 'midi');
    } else {
      handleExportMidiPattern();
    }
  }, [hasSongBlocks, handleExportMidiPattern]);

  const handleWavClick = useCallback(() => {
    if (hasSongBlocks) {
      setExportDropdown(d => d === 'wav' ? null : 'wav');
    } else {
      handleExportWavPattern();
    }
  }, [hasSongBlocks, handleExportWavPattern]);

  const handleMp3Click = useCallback(() => {
    if (hasSongBlocks) {
      setExportDropdown(d => d === 'mp3' ? null : 'mp3');
    } else {
      handleExportMp3Pattern();
    }
  }, [hasSongBlocks, handleExportMp3Pattern]);

  return (
    <header className="sticky top-0 z-50 flex flex-wrap items-center gap-y-2 px-4 sm:px-6 py-2 min-h-[53px] bg-bg-secondary border-b border-border shrink-0">
      {/* Logo + Title — width matches track header so buttons align with grid */}
      <div className="flex items-center gap-2.5 shrink-0" style={{ width: trackHeaderWidth + 16 }}>
        <img
          src={`${import.meta.env.BASE_URL}images/logo.png`}
          alt=""
          className="h-9 w-auto rounded-lg"
        />
        <h1 className="text-lg font-bold text-text-primary tracking-tight whitespace-nowrap">
          Groove Theory
        </h1>
      </div>

      {/* Action buttons — two groups */}
      <div className="flex items-center gap-4">
        {/* File: New / Save / Open / Help */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleNewGroove}
            title="New groove — clear all patterns and the song"
            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border cursor-pointer transition-colors
              bg-bg-cell text-text-muted border-border hover:bg-bg-cell-hover hover:text-text-primary"
          >
            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
              <path d="M3.75 2a.75.75 0 0 0-.75.75v10.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75V6.318a.75.75 0 0 0-.22-.53L9.212 2.22a.75.75 0 0 0-.53-.22H3.75Z" />
            </svg>
            <span className="hidden sm:inline">New</span>
          </button>

          <div className="relative">
            <button
              onClick={toggleSave}
              title="Save groove"
              aria-expanded={saveOpen}
              aria-haspopup="dialog"
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border cursor-pointer transition-colors
                ${saveOpen
                  ? 'bg-accent-green/25 text-accent-green-fg border-accent-green/40'
                  : 'bg-accent-green/15 text-accent-green-fg border-accent-green/25 hover:bg-accent-green/25'
                }`}
            >
              <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                <path d="M3.5 1.75a.75.75 0 0 0-1.5 0v3a2.25 2.25 0 0 0 2.25 2.25h5.5A2.25 2.25 0 0 0 12 4.75v-3a.75.75 0 0 0-1.5 0v3a.75.75 0 0 1-.75.75h-5.5a.75.75 0 0 1-.75-.75v-3Z" />
                <path d="M1 8.75A.75.75 0 0 1 1.75 8h12.5a.75.75 0 0 1 .75.75v5.5a.75.75 0 0 1-.75.75H1.75a.75.75 0 0 1-.75-.75v-5.5Zm7 1a.75.75 0 0 0-.75.75v1.5a.75.75 0 0 0 1.5 0v-1.5A.75.75 0 0 0 8 9.75Z" />
              </svg>
              <span className="hidden sm:inline">Save</span>
            </button>
            {saveOpen && <SaveGrooveDropdown onClose={() => setSaveOpen(false)} />}
          </div>

          <div className="relative">
            <button
              onClick={toggleOpen}
              title="Open a saved groove or preset"
              aria-expanded={openOpen}
              aria-haspopup="dialog"
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border cursor-pointer transition-colors
                ${openOpen
                  ? 'bg-accent-blue/25 text-accent-blue-fg border-accent-blue/40'
                  : 'bg-accent-blue/15 text-accent-blue-fg border-accent-blue/25 hover:bg-accent-blue/25'
                }`}
            >
              <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                <path d="M1.75 2A1.75 1.75 0 0 0 0 3.75v.5A1.75 1.75 0 0 0 1.02 5.89l.857 6A1.75 1.75 0 0 0 3.607 13.5h8.786a1.75 1.75 0 0 0 1.731-1.61l.857-6A1.75 1.75 0 0 0 16 4.25v-.5A1.75 1.75 0 0 0 14.25 2H9.236a.75.75 0 0 1-.447-.148L7.078 0.578A2.25 2.25 0 0 0 5.736 0H1.75Z" />
              </svg>
              <span className="hidden sm:inline">Open</span>
            </button>
            {openOpen && <OpenGrooveDropdown onClose={() => setOpenOpen(false)} />}
          </div>

          <button
            onClick={() => setHelpOpen(true)}
            title="How to use Groove Theory"
            aria-haspopup="dialog"
            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border cursor-pointer transition-colors
              bg-bg-cell text-text-muted border-border hover:bg-bg-cell-hover hover:text-text-primary"
          >
            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
              <path fillRule="evenodd" d="M15 8A7 7 0 1 1 1 8a7 7 0 0 1 14 0ZM9 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM6.75 8a.75.75 0 0 0 0 1.5h.75v1.75a.75.75 0 0 0 1.5 0v-2.5A.75.75 0 0 0 8.25 8h-1.5Z" clipRule="evenodd" />
            </svg>
            <span className="hidden sm:inline">Help</span>
          </button>
        </div>

        <div aria-hidden="true" className="w-px h-5 bg-border/50" />

        {/* Export: MIDI / WAV / MP3 */}
        <div className="flex items-center gap-1.5">
          {/* MIDI */}
          <div className="relative">
            <button
              onClick={handleMidiClick}
              aria-haspopup={hasSongBlocks ? 'dialog' : undefined}
              aria-expanded={hasSongBlocks ? exportDropdown === 'midi' : undefined}
              disabled={!canExport}
              title={
                !canExport ? 'No active steps to export'
                  : hasSongBlocks ? 'Export pattern or song as MIDI'
                    : 'Export active pattern to MIDI file'
              }
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border transition-colors
                ${canExport
                  ? 'bg-accent-purple/15 text-accent-purple-fg border-accent-purple/25 hover:bg-accent-purple/25 cursor-pointer'
                  : 'bg-bg-cell text-text-muted/40 border-border/50 cursor-not-allowed'
                }`}
            >
              <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                <path d="M2.75 14A1.75 1.75 0 0 1 1 12.25v-2.5a.75.75 0 0 1 1.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 13.25 14H2.75Z" />
                <path d="M7.25 7.689V2a.75.75 0 0 1 1.5 0v5.689l1.97-1.969a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 6.78a.75.75 0 0 1 1.06-1.06l1.97 1.969Z" />
              </svg>
              <span className="hidden sm:inline">MIDI</span>
              {hasSongBlocks && canExport && (
                <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-2.5 h-2.5 opacity-60">
                  <path fillRule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              )}
            </button>
            {exportDropdown === 'midi' && (
              <ExportDropdown
                type="midi"
                onClose={() => setExportDropdown(null)}
                onExportPattern={handleExportMidiPattern}
                onExportSong={handleExportMidiSong}
                songBlockCount={songBlocks.length}
              />
            )}
          </div>

          {/* WAV */}
          <div className="relative">
            <button
              onClick={handleWavClick}
              aria-haspopup={hasSongBlocks ? 'dialog' : undefined}
              aria-expanded={hasSongBlocks ? exportDropdown === 'wav' : undefined}
              disabled={!canExport || exporting !== null}
              title={
                !canExport ? 'No active steps to export'
                  : hasSongBlocks ? 'Export pattern or song as WAV'
                    : 'Export active pattern to WAV audio file'
              }
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border transition-colors
                ${!canExport
                  ? 'bg-bg-cell text-text-muted/40 border-border/50 cursor-not-allowed'
                  : exporting === 'wav'
                    ? 'bg-accent-orange/25 text-accent-orange-fg border-accent-orange/40 animate-pulse cursor-pointer'
                    : exporting !== null
                      ? 'bg-accent-orange/15 text-accent-orange-fg border-accent-orange/25 opacity-50 cursor-not-allowed'
                      : 'bg-accent-orange/15 text-accent-orange-fg border-accent-orange/25 hover:bg-accent-orange/25 cursor-pointer'
                }`}
            >
              <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                <path d="M2.75 14A1.75 1.75 0 0 1 1 12.25v-2.5a.75.75 0 0 1 1.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 13.25 14H2.75Z" />
                <path d="M7.25 7.689V2a.75.75 0 0 1 1.5 0v5.689l1.97-1.969a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 6.78a.75.75 0 0 1 1.06-1.06l1.97 1.969Z" />
              </svg>
              <span className="hidden sm:inline">{exporting === 'wav' ? 'WAV...' : 'WAV'}</span>
              {hasSongBlocks && canExport && !exporting && (
                <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-2.5 h-2.5 opacity-60">
                  <path fillRule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              )}
            </button>
            {exportDropdown === 'wav' && (
              <ExportDropdown
                type="wav"
                onClose={() => setExportDropdown(null)}
                onExportPattern={handleExportWavPattern}
                onExportSong={handleExportWavSong}
                songBlockCount={songBlocks.length}
              />
            )}
          </div>

          {/* MP3 */}
          <div className="relative">
            <button
              onClick={handleMp3Click}
              aria-haspopup={hasSongBlocks ? 'dialog' : undefined}
              aria-expanded={hasSongBlocks ? exportDropdown === 'mp3' : undefined}
              disabled={!canExport || exporting !== null}
              title={
                !canExport ? 'No active steps to export'
                  : hasSongBlocks ? 'Export pattern or song as MP3'
                    : 'Export active pattern to MP3 audio file'
              }
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border transition-colors
                ${!canExport
                  ? 'bg-bg-cell text-text-muted/40 border-border/50 cursor-not-allowed'
                  : exporting === 'mp3'
                    ? 'bg-accent-pink/25 text-accent-pink-fg border-accent-pink/40 animate-pulse cursor-pointer'
                    : exporting !== null
                      ? 'bg-accent-pink/15 text-accent-pink-fg border-accent-pink/25 opacity-50 cursor-not-allowed'
                      : 'bg-accent-pink/15 text-accent-pink-fg border-accent-pink/25 hover:bg-accent-pink/25 cursor-pointer'
                }`}
            >
              <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                <path d="M2.75 14A1.75 1.75 0 0 1 1 12.25v-2.5a.75.75 0 0 1 1.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 13.25 14H2.75Z" />
                <path d="M7.25 7.689V2a.75.75 0 0 1 1.5 0v5.689l1.97-1.969a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 6.78a.75.75 0 0 1 1.06-1.06l1.97 1.969Z" />
              </svg>
              <span className="hidden sm:inline">{exporting === 'mp3' ? 'MP3...' : 'MP3'}</span>
              {hasSongBlocks && canExport && !exporting && (
                <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-2.5 h-2.5 opacity-60">
                  <path fillRule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              )}
            </button>
            {exportDropdown === 'mp3' && (
              <ExportDropdown
                type="mp3"
                onClose={() => setExportDropdown(null)}
                onExportPattern={handleExportMp3Pattern}
                onExportSong={handleExportMp3Song}
                songBlockCount={songBlocks.length}
              />
            )}
          </div>
        </div>
      </div>

      {/* Copyright + links — pushed right */}
      <div className="ml-auto flex items-center gap-1 text-text-muted text-[11px] shrink-0">
        <span className="mr-2">&copy; 2026 Groove Theory</span>
        <a
          href="mailto:groovetheoryapp@gmail.com"
          className="w-7 h-7 flex items-center justify-center rounded hover:text-text-secondary transition-colors"
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
          className="w-7 h-7 flex items-center justify-center rounded hover:text-text-secondary transition-colors"
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
