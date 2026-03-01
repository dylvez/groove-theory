import { useState, useCallback } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';
import {
  listGrooves,
  saveGroove,
  deleteGroove,
  exportGrooveToFile,
  buildGrooveSnapshot,
  buildPatternSnapshot,
  exportPatternsToFile,
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

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function SaveGrooveDropdown({ onClose }: { onClose: () => void }) {
  const ref = useClickOutside<HTMLDivElement>(onClose);
  const [name, setName] = useState('My Groove');
  const [saves, setSaves] = useState<GrooveSlotEntry[]>(() => listGrooves());
  const [justSaved, setJustSaved] = useState(false);

  const handleSave = useCallback(() => {
    if (!name.trim()) return;
    try {
      const groove = buildGrooveSnapshot(name.trim());
      saveGroove(groove);
      setSaves(listGrooves());
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1500);
    } catch (err) {
      alert((err as Error).message);
    }
  }, [name]);

  const handleExportFile = useCallback(() => {
    const groove = buildGrooveSnapshot(name.trim() || 'My Groove');
    exportGrooveToFile(groove);
  }, [name]);

  const handleExportPatternsFile = useCallback(() => {
    const data = buildPatternSnapshot(name.trim() || 'My Patterns');
    exportPatternsToFile(data);
  }, [name]);

  const handleOverwrite = useCallback((id: string, existingName: string) => {
    try {
      deleteGroove(id);
      const groove = buildGrooveSnapshot(existingName);
      saveGroove(groove);
      setSaves(listGrooves());
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1500);
    } catch (err) {
      alert((err as Error).message);
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') onClose();
  };

  return (
    <div
      ref={ref}
      className="absolute top-full mt-1.5 right-0 z-50 w-72 bg-bg-secondary border border-border rounded-lg shadow-xl"
    >
      {/* Save new */}
      <div className="p-3 border-b border-border">
        <label className="text-[10px] text-text-secondary uppercase tracking-wider mb-1.5 block">
          Save current groove
        </label>
        <div className="flex gap-1.5">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Groove name..."
            autoFocus
            className="flex-1 px-2 py-1.5 bg-bg-cell border border-border rounded-md text-xs text-text-primary
              placeholder:text-text-muted focus:outline-none focus:border-accent-orange"
          />
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors
              bg-accent-green/20 text-accent-green border border-accent-green/30 hover:bg-accent-green/30
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {justSaved ? '✓' : 'Save'}
          </button>
        </div>
      </div>

      {/* Export to file */}
      <div className="px-3 py-2 border-b border-border space-y-0.5">
        <button
          onClick={handleExportFile}
          className="flex items-center gap-1.5 w-full px-2 py-1.5 rounded-md text-xs text-text-muted
            hover:bg-bg-cell hover:text-text-primary transition-colors cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
            <path d="M2.75 14A1.75 1.75 0 0 1 1 12.25v-2.5a.75.75 0 0 1 1.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 13.25 14H2.75Z" />
            <path d="M7.25 7.689V2a.75.75 0 0 1 1.5 0v5.689l1.97-1.969a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 6.78a.75.75 0 0 1 1.06-1.06l1.97 1.969Z" />
          </svg>
          Export as .groove file
        </button>
        <button
          onClick={handleExportPatternsFile}
          className="flex items-center gap-1.5 w-full px-2 py-1.5 rounded-md text-xs text-text-muted
            hover:bg-bg-cell hover:text-text-primary transition-colors cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
            <path d="M2.75 14A1.75 1.75 0 0 1 1 12.25v-2.5a.75.75 0 0 1 1.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 13.25 14H2.75Z" />
            <path d="M7.25 7.689V2a.75.75 0 0 1 1.5 0v5.689l1.97-1.969a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 6.78a.75.75 0 0 1 1.06-1.06l1.97 1.969Z" />
          </svg>
          Export as .patterns file <span className="text-text-muted/60 ml-auto">(no song)</span>
        </button>
      </div>

      {/* Existing saves */}
      {saves.length > 0 && (
        <div className="max-h-48 overflow-y-auto">
          <div className="px-3 pt-2 pb-1">
            <span className="text-[10px] text-text-secondary uppercase tracking-wider">Overwrite existing</span>
          </div>
          {saves.map(entry => (
            <button
              key={entry.id}
              onClick={() => handleOverwrite(entry.id, entry.name)}
              className="flex items-center justify-between w-full px-3 py-1.5 text-left text-xs
                hover:bg-bg-cell transition-colors cursor-pointer group"
            >
              <div className="flex flex-col min-w-0">
                <span className="text-text-primary truncate">{entry.name}</span>
                <span className="text-[10px] text-text-muted">
                  {timeAgo(entry.savedAt)} · {formatSize(entry.sizeBytes)}
                </span>
              </div>
              <span className="text-text-muted opacity-0 group-hover:opacity-100 text-[10px] shrink-0 ml-2">
                overwrite
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
