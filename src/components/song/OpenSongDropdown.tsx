import { useCallback } from 'react';
import { createPortal } from 'react-dom';
import { usePopover } from '../../hooks/usePopover';
import { confirmReplaceWork } from '../../utils/workState';
import { announce } from '../../utils/announce';
import {
  applyGroove,
  importSongFromFile,
  applySongArrangement,
} from '../../utils/grooveStorage';
import { PRESET_GROOVES } from '../../constants/presetGrooves';

export function OpenSongDropdown({
  pos,
  onClose,
}: {
  /** Top-right corner of the button that opened it (measured on click) */
  pos: { top: number; left: number };
  onClose: () => void;
}) {
  const ref = usePopover<HTMLDivElement>(onClose);

  const handleLoadPreset = useCallback((presetId: string) => {
    const preset = PRESET_GROOVES.find(p => p.id === presetId);
    if (!preset) return;
    if (!confirmReplaceWork(`Opening the preset "${preset.name}"`)) return;
    applyGroove(structuredClone(preset.groove));
    announce(`Opened preset ${preset.name}`);
    onClose();
  }, [onClose]);

  const handleImportFile = useCallback(async () => {
    try {
      const data = await importSongFromFile();
      if (!confirmReplaceWork(`Importing the song "${data.name}"`)) return;
      applySongArrangement(data);
      announce(`Imported song ${data.name}`);
      onClose();
    } catch (err) {
      const msg = (err as Error).message;
      if (msg !== 'No file selected') alert(msg);
    }
  }, [onClose]);

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label="Open a song"
      className="fixed z-[9999] w-64 bg-bg-secondary border border-border rounded-lg shadow-xl"
      style={{
        top: pos.top,
        left: pos.left,
        transform: 'translate(-100%, -100%)',
      }}
    >
      {/* Preset songs, then beat presets */}
      {(['song', 'beat'] as const).map((cat, ci) => {
        const items = PRESET_GROOVES.filter(p => p.category === cat);
        return (
          <div key={cat} className={ci > 0 ? 'border-t border-border' : ''}>
            <h3 className="px-3 pt-2.5 pb-1 text-[11px] font-normal text-text-secondary uppercase tracking-wider">
              {cat === 'song' ? 'Preset songs' : 'Beat presets'}
            </h3>
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
          Import .song file
        </button>
      </div>
    </div>,
    document.body,
  );
}
