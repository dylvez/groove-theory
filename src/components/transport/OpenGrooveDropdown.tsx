import { useState, useCallback } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';
import {
  listGrooves,
  loadGroove,
  deleteGroove,
  applyGroove,
  importAnyFile,
  applyPatternBank,
  applySongArrangement,
} from '../../utils/grooveStorage';
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
  const ref = useClickOutside<HTMLDivElement>(onClose);
  const [saves, setSaves] = useState<GrooveSlotEntry[]>(() => listGrooves());

  const handleLoad = useCallback((id: string) => {
    const groove = loadGroove(id);
    if (!groove) {
      alert('Could not load groove — data may be corrupted.');
      setSaves(listGrooves()); // refresh in case self-heal removed it
      return;
    }
    applyGroove(groove);
    onClose();
  }, [onClose]);

  const handleDelete = useCallback((e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation(); // don't trigger load
    if (!window.confirm(`Delete saved groove "${name}"?`)) return;
    deleteGroove(id);
    setSaves(listGrooves());
  }, []);

  const handleImportFile = useCallback(async () => {
    try {
      const result = await importAnyFile();
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
      onClose();
    } catch (err) {
      const msg = (err as Error).message;
      if (msg !== 'No file selected') alert(msg);
    }
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute top-full mt-1.5 right-0 z-50 w-72 bg-bg-secondary border border-border rounded-lg shadow-xl"
    >
      {/* Saved grooves list */}
      {saves.length > 0 ? (
        <div className="max-h-64 overflow-y-auto">
          <div className="px-3 pt-2.5 pb-1">
            <span className="text-[10px] text-text-secondary uppercase tracking-wider">Saved grooves</span>
          </div>
          {saves.map(entry => (
            <button
              key={entry.id}
              onClick={() => handleLoad(entry.id)}
              className="flex items-center justify-between w-full px-3 py-2 text-left text-xs
                hover:bg-bg-cell transition-colors cursor-pointer group"
            >
              <div className="flex flex-col min-w-0">
                <span className="text-text-primary truncate">{entry.name}</span>
                <span className="text-[10px] text-text-muted">{timeAgo(entry.savedAt)}</span>
              </div>
              <button
                onClick={(e) => handleDelete(e, entry.id, entry.name)}
                className="p-1 rounded text-text-muted opacity-0 group-hover:opacity-100
                  hover:text-accent-red hover:bg-accent-red/10 transition-all cursor-pointer shrink-0 ml-2"
                title={`Delete "${entry.name}"`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                  <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5A.75.75 0 0 1 9.95 6Z" clipRule="evenodd" />
                </svg>
              </button>
            </button>
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
          <p className="text-[10px] text-text-muted mt-1">
            Save your current groove or import a .groove file.
          </p>
        </div>
      )}

      {/* Import from file */}
      <div className="px-3 py-2 border-t border-border">
        <button
          onClick={handleImportFile}
          className="flex items-center gap-1.5 w-full px-2 py-1.5 rounded-md text-xs text-text-muted
            hover:bg-bg-cell hover:text-text-primary transition-colors cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
            <path d="M2.75 14A1.75 1.75 0 0 1 1 12.25v-2.5a.75.75 0 0 1 1.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 13.25 14H2.75Z" />
            <path d="M8.75 1.75a.75.75 0 0 0-1.5 0v5.689L5.28 5.47a.75.75 0 0 0-1.06 1.06l3.25 3.25a.75.75 0 0 0 1.06 0l3.25-3.25a.75.75 0 0 0-1.06-1.06L8.75 7.439V1.75Z" />
          </svg>
          Import file <span className="text-text-muted/50 ml-1">.groove / .patterns / .song</span>
        </button>
      </div>
    </div>
  );
}
