import { useState, useCallback, useEffect, useRef } from 'react';
import { useUIStore } from '../../store/useUIStore';

interface TrackHeaderProps {
  name: string;
  color: string;
  muted: boolean;
  solo: boolean;
  onMute: () => void;
  onSolo: () => void;
  onRemove?: () => void;
  onRename?: (newName: string) => void;
  onOpenSettings?: () => void;
  settingsOpen?: boolean;
  onFill?: () => void;
  /** Drum tracks: play the sound once */
  onAudition?: () => void;
  /** Melodic tracks: arm for live keyboard input */
  armed?: boolean;
  onToggleArm?: () => void;
  /** Small caption under the name (e.g. synth preset) */
  subtitle?: string;
}

export function HeaderResizeHandle() {
  const setTrackHeaderWidth = useUIStore(s => s.setTrackHeaderWidth);
  const dragging = useRef(false);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const gridEl = document.querySelector('[data-sequencer-grid]');
      if (!gridEl) return;
      const gridRect = gridEl.getBoundingClientRect();
      const newWidth = e.clientX - gridRect.left - 24; // subtract px-6 padding
      setTrackHeaderWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (dragging.current) {
        dragging.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [setTrackHeaderWidth]);

  return (
    <div
      onMouseDown={handleResizeStart}
      className="shrink-0 w-2 self-stretch cursor-col-resize flex items-center justify-center group"
    >
      <div className="w-0.5 h-full rounded bg-border/30 group-hover:bg-accent-orange transition-colors" />
    </div>
  );
}

export function TrackHeader({
  name, color, muted, solo,
  onMute, onSolo, onRemove, onRename, onOpenSettings, settingsOpen, onFill,
  onAudition, armed, onToggleArm, subtitle,
}: TrackHeaderProps) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const trackHeaderWidth = useUIStore(s => s.trackHeaderWidth);

  const commitRename = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== name) {
      onRename?.(trimmed);
    }
    setEditing(false);
  };

  return (
    <div
      className={`flex items-center gap-1.5 shrink-0 rounded-md px-1 -mx-1 transition-colors ${armed ? 'bg-accent-red/10' : ''}`}
      style={{ width: trackHeaderWidth + 8 }}
    >
      <button
        onClick={onOpenSettings}
        className={`w-5 h-5 shrink-0 flex items-center justify-center text-[15px] font-bold leading-none cursor-pointer rounded transition-opacity ${
          settingsOpen ? 'opacity-100' : 'opacity-80 hover:opacity-100'
        }`}
        style={{ color, textShadow: `0 0 2px ${color}` }}
        title="Sound settings"
      >
        &#9881;
      </button>

      {editing ? (
        <input
          autoFocus
          value={editName}
          onChange={e => setEditName(e.target.value)}
          onBlur={commitRename}
          onKeyDown={e => {
            if (e.key === 'Enter') commitRename();
            if (e.key === 'Escape') setEditing(false);
          }}
          className="text-sm font-medium bg-bg-cell border border-accent-orange rounded px-1 w-20 text-text-primary outline-none"
        />
      ) : (
        <div className="flex flex-col min-w-0 leading-tight">
          <span
            onDoubleClick={() => {
              if (onRename) {
                setEditName(name);
                setEditing(true);
              }
            }}
            onMouseDown={(e) => {
              // Single click on a drum name auditions it
              if (onAudition && e.detail === 1) onAudition();
            }}
            className={`text-sm font-medium truncate ${onAudition ? 'cursor-pointer' : onRename ? 'cursor-text' : ''} ${
              muted ? 'text-text-muted line-through' : 'text-text-primary'
            }`}
            title={onAudition ? 'Click to hear · double-click to rename' : onRename ? 'Double-click to rename' : name}
          >
            {name}
          </span>
          {subtitle && (
            <span className="text-[9px] text-text-muted truncate leading-none">{subtitle}</span>
          )}
        </div>
      )}

      <div className="flex gap-1 ml-auto shrink-0">
        {onToggleArm && (
          <button
            onClick={onToggleArm}
            className={`w-6 h-6 rounded text-[11px] font-bold flex items-center justify-center cursor-pointer transition-colors ${
              armed ? 'bg-accent-red text-white animate-pulse' : 'bg-bg-cell text-text-muted hover:text-accent-red'
            }`}
            title={armed ? 'Armed for live keys — click to disarm' : 'Arm: play this synth with your keyboard'}
          >
            ●
          </button>
        )}
        {onRemove && (
          <button
            onClick={onRemove}
            className="w-6 h-6 rounded text-[10px] font-bold flex items-center justify-center cursor-pointer transition-colors bg-bg-cell text-text-muted hover:bg-accent-red/30 hover:text-accent-red"
            title={`Remove ${name}`}
          >
            ×
          </button>
        )}
        <button
          onClick={onMute}
          className={`w-6 h-6 rounded text-[10px] font-bold flex items-center justify-center cursor-pointer transition-colors ${
            muted ? 'bg-accent-red/30 text-accent-red' : 'bg-bg-cell text-text-muted hover:text-text-secondary'
          }`}
          title={muted ? `Unmute ${name}` : `Mute ${name}`}
        >
          M
        </button>
        <button
          onClick={onSolo}
          className={`w-6 h-6 rounded text-[10px] font-bold flex items-center justify-center cursor-pointer transition-colors ${
            solo ? 'bg-accent-amber/30 text-accent-amber' : 'bg-bg-cell text-text-muted hover:text-text-secondary'
          }`}
          title={solo ? `Unsolo ${name}` : `Solo ${name}`}
        >
          S
        </button>
        {onFill && (
          <button
            onClick={onFill}
            className="w-6 h-6 rounded text-[8px] font-bold flex items-center justify-center cursor-pointer transition-colors bg-bg-cell text-text-muted hover:bg-accent-purple/30 hover:text-accent-purple"
            title="Fill blank bars with existing pattern"
          >
            Fill
          </button>
        )}
      </div>
    </div>
  );
}
