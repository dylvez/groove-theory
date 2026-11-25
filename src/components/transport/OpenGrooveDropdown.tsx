import { useState, useCallback } from 'react';
import { usePopover } from '../../hooks/usePopover';
import { confirmReplaceWork } from '../../utils/workState';
import { announce } from '../../utils/announce';
import {
  listGrooves,
  loadGroove,
  deleteGroove,
  applyGroove,
  importAnyFile,
  applyPatternBank,
  applySongArrangement,
} from '../../utils/grooveStorage';
import { PRESET_GROOVES } from '../../constants/presetGrooves';
import { useUIStore } from '../../store/useUIStore';
import { parseMidi, pickMidiFile, MidiImportError } from '../../utils/midiImport';
import type { GrooveSlotEntry } from '../../types';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function OpenGrooveDropdown({ onClose }: { onClose: () => void }) {
  const ref = usePopover<HTMLDivElement>(onClose);
  const [saves, setSaves] = useState<GrooveSlotEntry[]>(() => listGrooves());

  const handleLoad = useCallback((id: string, name: string) => {
    if (!confirmReplaceWork(`Opening "${name}"`)) return;
    const groove = loadGroove(id);
    if (!groove) {
      alert('Could not load groove — data may be corrupted.');
      setSaves(listGrooves()); // refresh in case self-heal removed it
      return;
    }
    applyGroove(groove);
    announce(`Opened ${groove.name}`);
    onClose();
  }, [onClose]);

  const handleDelete = useCallback((id: string, name: string) => {
    if (!window.confirm(`Delete saved groove "${name}"? This can't be undone.`)) return;
    deleteGroove(id);
    setSaves(listGrooves());
    announce(`Deleted ${name}`);
  }, []);

  const handleLoadPreset = useCallback((presetId: string) => {
    const preset = PRESET_GROOVES.find(p => p.id === presetId);
    if (!preset) return;
    if (!confirmReplaceWork(`Opening the preset "${preset.name}"`)) return;
    applyGroove(structuredClone(preset.groove));
    announce(`Opened preset ${preset.name}`);
    onClose();
  }, [onClose]);

  const setMidiImport = useUIStore(s => s.setMidiImport);
  const handleImportMidi = useCallback(async () => {
    const picked = await pickMidiFile();
    if (!picked) return;
    try {
      const data = parseMidi(picked.buffer);
      onClose();
      setMidiImport({ ...data, fileName: picked.fileName });
    } catch (err) {
      alert(err instanceof MidiImportError ? err.message : 'Could not read this MIDI file.');
    }
  }, [onClose, setMidiImport]);

  const handleImportFile = useCallback(async () => {
    try {
      const result = await importAnyFile();
      if (!confirmReplaceWork(`Importing "${result.data.name}"`)) return;
      switch (result.type) {
        case 'groove':
          applyGroove(result.data);
          break;
        case 'patterns':
          applyPatternBank(result.data);
          break;
        case 'song':
          applySongArrangement(result.data);
          break;
      }
      announce(`Imported ${result.data.name}`);
      onClose();
    } catch (err) {
      const msg = (err as Error).message;
      if (msg !== 'No file selected') alert(msg);
    }
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Open a groove"
      className="absolute top-full mt-1.5 right-0 z-50 w-72 bg-bg-secondary border border-border rounded-lg shadow-xl"
    >
      {/* Saved grooves list */}
      {saves.length > 0 ? (
        <div className="max-h-64 overflow-y-auto">
          <h2 className="px-3 pt-2.5 pb-1 text-[11px] font-normal text-text-secondary uppercase tracking-wider">Saved grooves</h2>
          {saves.map(entry => (
            <div key={entry.id} className="flex items-center group hover:bg-bg-cell focus-within:bg-bg-cell transition-colors">
              <button
                onClick={() => handleLoad(entry.id, entry.name)}
                className="flex flex-col min-w-0 flex-1 px-3 py-2 text-left text-xs cursor-pointer"
              >
                <span className="text-text-primary truncate w-full">{entry.name}</span>
                <span className="text-[11px] text-text-muted">{timeAgo(entry.savedAt)}</span>
              </button>
              <button
                onClick={() => handleDelete(entry.id, entry.name)}
                className="w-7 h-7 mr-2 flex items-center justify-center rounded text-text-muted opacity-0 group-hover:opacity-100 focus-visible:opacity-100
                  hover:text-accent-red-fg hover:bg-accent-red/10 transition-all cursor-pointer shrink-0"
                aria-label={`Delete ${entry.name}`}
                title={`Delete "${entry.name}"`}
              >
                <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                  <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5A.75.75 0 0 1 9.95 6Z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-3 py-4 text-center">
          <img
            src={`${import.meta.env.BASE_URL}images/empty-grooves.png`}
            alt=""
            className="w-20 h-20 mx-auto mb-2 opacity-70"
          />
          <p className="text-xs text-text-muted">No saved grooves yet.</p>
          <p className="text-[11px] text-text-muted mt-1">
            Save your current groove or import a .groove file.
          </p>
        </div>
      )}

      {/* Preset songs */}
      {(['song', 'beat'] as const).map(cat => {
        const items = PRESET_GROOVES.filter(p => p.category === cat);
        return (
          <div key={cat} className="border-t border-border">
            <h2 className="px-3 pt-2.5 pb-1 text-[11px] font-normal text-text-secondary uppercase tracking-wider">
              {cat === 'song' ? 'Preset songs' : 'Beat presets'}
            </h2>
            {items.map(preset => (
              <button
                key={preset.id}
                onClick={() => handleLoadPreset(preset.id)}
                className="flex items-center justify-between w-full px-3 py-2 text-left text-xs
                  hover:bg-bg-cell transition-colors cursor-pointer"
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-text-primary truncate">{preset.name}</span>
                  <span className="text-[11px] text-text-muted">{preset.genre} · {preset.bpm} BPM</span>
                </div>
                <span className={`text-[11px] shrink-0 ml-2 ${cat === 'song' ? 'text-accent-green-fg' : 'text-accent-orange-fg'}`}>
                  {cat === 'song' ? 'SONG' : 'BEAT'}
                </span>
              </button>
            ))}
          </div>
        );
      })}

      {/* Import from file */}
      <div className="px-3 py-2 border-t border-border">
        <button
          onClick={handleImportFile}
          className="flex items-center gap-1.5 w-full px-2 py-1.5 rounded-md text-xs text-text-muted
            hover:bg-bg-cell hover:text-text-primary transition-colors cursor-pointer"
        >
          <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
            <path d="M2.75 14A1.75 1.75 0 0 1 1 12.25v-2.5a.75.75 0 0 1 1.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 13.25 14H2.75Z" />
            <path d="M8.75 1.75a.75.75 0 0 0-1.5 0v5.689L5.28 5.47a.75.75 0 0 0-1.06 1.06l3.25 3.25a.75.75 0 0 0 1.06 0l3.25-3.25a.75.75 0 0 0-1.06-1.06L8.75 7.439V1.75Z" />
          </svg>
          Import file <span className="text-text-muted ml-1">.groove / .patterns / .song</span>
        </button>
        <button
          onClick={handleImportMidi}
          aria-haspopup="dialog"
          className="flex items-center gap-1.5 w-full px-2 py-1.5 rounded-md text-xs text-text-muted
            hover:bg-bg-cell hover:text-text-primary transition-colors cursor-pointer"
        >
          <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
            <path d="M2.75 14A1.75 1.75 0 0 1 1 12.25v-2.5a.75.75 0 0 1 1.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 13.25 14H2.75Z" />
            <path d="M8.75 1.75a.75.75 0 0 0-1.5 0v5.689L5.28 5.47a.75.75 0 0 0-1.06 1.06l3.25 3.25a.75.75 0 0 0 1.06 0l3.25-3.25a.75.75 0 0 0-1.06-1.06L8.75 7.439V1.75Z" />
          </svg>
          Import MIDI file <span className="text-text-muted ml-1">.mid</span>
        </button>
      </div>
    </div>
  );
}
