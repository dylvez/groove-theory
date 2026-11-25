import { useState, useCallback, useEffect, useRef } from 'react';
import { useUIStore, DEFAULT_HEADER_WIDTH } from '../../store/useUIStore';
import { useTransportStore } from '../../store/useTransportStore';
import { useSongStore } from '../../store/useSongStore';
import { useTrackHeaderWidth } from '../../hooks/useCramped';

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
  /** Synth tracks: the name opens and closes the piano roll */
  pianoRollOpen?: boolean;
  onTogglePianoRoll?: () => void;
  /** Floating panel anchored to the header (sound settings), so it opens in view even when the grid is scrolled */
  panel?: React.ReactNode;
  /** Does the track sound on this step? Lights the track's dot while playing. */
  soundsAt?: (step: number) => boolean;
}

/** The track's colour dot. It lights up while the track is sounding. */
function SoundingDot({ color, soundsAt }: { color: string; soundsAt?: (step: number) => boolean }) {
  const step = useTransportStore(s => s.currentStep);
  const transportPlaying = useTransportStore(s => s.state) === 'playing';
  const songPlaying = useSongStore(s => s.songState) === 'playing';
  const on = (transportPlaying || songPlaying) && !!soundsAt?.(step);
  return (
    <span
      aria-hidden="true"
      className="w-2 h-2 rounded-full shrink-0 transition-[box-shadow,background-color] duration-150"
      style={{
        backgroundColor: on ? color : `${color}8c`,
        boxShadow: on ? `0 0 10px ${color}, 0 0 3px ${color}` : 'none',
      }}
    />
  );
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
      // Measure from a (pinned) track header so this works when the grid is scrolled
      const header = document.querySelector('[data-sticky-header]');
      if (!header) return;
      const left = header.getBoundingClientRect().left + 4; // header has -mx-1
      setTrackHeaderWidth(e.clientX - left);
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

  // Mouse-only shortcut; the keyboard version is the separator in the ruler row
  return (
    <div
      aria-hidden="true"
      onMouseDown={handleResizeStart}
      onDoubleClick={() => setTrackHeaderWidth(DEFAULT_HEADER_WIDTH)}
      className="shrink-0 w-2 self-stretch cursor-col-resize flex items-center justify-center group"
    >
      <div className="w-0.5 h-full rounded bg-border/30 group-hover:bg-accent-orange transition-colors" />
    </div>
  );
}

export function TrackHeader({
  name, color, muted, solo,
  onMute, onSolo, onRemove, onRename, onOpenSettings, settingsOpen, onFill,
  onAudition, armed, onToggleArm, subtitle, pianoRollOpen, onTogglePianoRoll, panel, soundsAt,
}: TrackHeaderProps) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const trackHeaderWidth = useTrackHeaderWidth();

  const commitRename = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== name) {
      onRename?.(trimmed);
    }
    setEditing(false);
  };

  return (
    // Pinned to the left edge while the grid scrolls sideways; needs an opaque
    // background so the cells pass underneath it. It stretches to the full row
    // height (the cells are taller than the buttons here) and its shadow
    // covers half the gap above and below, so nothing shows round its edges;
    // a soft shadow on the right lets cells fade as they slide under. Every
    // pinned header is its own layer, so while this one's sound panel is open
    // it sits above the headers below, or they would cover the panel.
    <div
      data-sticky-header=""
      className={`sticky left-0 ${panel ? 'z-40' : 'z-20'} self-stretch flex items-center gap-1.5 shrink-0 px-1 -mx-1 transition-colors cramped:flex-wrap cramped:content-center cramped:gap-y-1 cramped:py-1 ${armed ? 'bg-[#251418]' : 'bg-bg-primary'}`}
      style={{
        width: trackHeaderWidth + 8,
        boxShadow: `0 -4px 0 ${armed ? '#251418' : 'var(--color-bg-primary)'}, 0 4px 0 ${armed ? '#251418' : 'var(--color-bg-primary)'}, 10px 0 10px -8px rgb(0 0 0 / 0.85)`,
      }}
    >
      <button
        onClick={onOpenSettings}
        aria-label={`${name} sound settings`}
        aria-expanded={!!settingsOpen}
        aria-haspopup="dialog"
        className={`w-6 h-6 shrink-0 flex items-center justify-center text-[15px] leading-none cursor-pointer rounded-full hover:bg-bg-cell hover:text-text-primary transition-colors ${settingsOpen ? 'text-text-primary bg-bg-cell' : 'text-text-muted'}`}
        title="Sound settings"
      >
        <span aria-hidden="true">&#9881;</span>
      </button>
      <SoundingDot color={color} soundsAt={soundsAt} />

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
          aria-label={`Rename ${name}`}
          className="text-sm font-medium bg-bg-cell border border-accent-orange rounded px-1 w-20 text-text-primary"
        />
      ) : (
        <div className="flex flex-col min-w-0 leading-tight">
          {onTogglePianoRoll ? (
            <button
              type="button"
              onClick={onTogglePianoRoll}
              aria-expanded={!!pianoRollOpen}
              aria-label={`${name}${muted ? ' (muted)' : ''} piano roll`}
              title={pianoRollOpen ? 'Close the piano roll' : 'Open the piano roll to draw notes and chords'}
              className={`flex items-center gap-0.5 min-h-6 -ml-0.5 px-0.5 rounded text-sm font-medium cursor-pointer hover:bg-bg-cell min-w-0 ${
                muted ? 'text-text-muted line-through' : 'text-text-primary'
              }`}
            >
              <span className="truncate">{name}</span>
              <svg aria-hidden="true" viewBox="0 0 12 12" fill="currentColor" className={`w-2 h-2 shrink-0 text-text-muted transition-transform ${pianoRollOpen ? 'rotate-90' : ''}`}>
                <path d="M4 2l5 4-5 4V2z" />
              </svg>
            </button>
          ) : (
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
            {muted && <span className="sr-only">(muted) </span>}
            {name}
          </span>
          )}
          {subtitle && (
            <span className="text-[11px] text-text-muted truncate leading-none">{subtitle}</span>
          )}
        </div>
      )}

      <div className="flex gap-1 ml-auto shrink-0 cramped:basis-full cramped:ml-0 cramped:pl-7">
        {onToggleArm && (
          <button
            onClick={onToggleArm}
            aria-pressed={!!armed}
            aria-label={`Play ${name} from the computer keyboard`}
            className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center cursor-pointer transition-colors border ${
              armed ? 'bg-accent-red border-accent-red text-white shadow-[0_0_12px_rgb(239_68_68/0.6)] animate-pulse' : 'bg-bg-cell border-border-soft text-accent-red-fg hover:bg-bg-cell-hover'
            }`}
            title={armed ? 'Armed for live keys — click to disarm' : 'Arm: play this synth with your keyboard'}
          >
            <span aria-hidden="true">●</span>
          </button>
        )}
        {onRemove && (
          <button
            onClick={onRemove}
            aria-label={`Remove ${name}`}
            className="w-6 h-6 rounded-full text-[13px] font-bold flex items-center justify-center cursor-pointer transition-colors bg-bg-cell border border-border-soft text-text-muted hover:bg-accent-red/30 hover:text-accent-red-fg"
            title={`Remove ${name}`}
          >
            <span aria-hidden="true">×</span>
          </button>
        )}
        <button
          onClick={onMute}
          aria-pressed={muted}
          aria-label={`Mute ${name}`}
          className={`w-6 h-6 rounded-full font-mono text-[10px] font-bold flex items-center justify-center cursor-pointer transition-colors border ${
            muted ? 'bg-accent-red/30 text-accent-red-fg border-accent-red-fg' : 'bg-bg-cell border-border-soft text-text-muted hover:text-text-primary'
          }`}
          title={muted ? `Unmute ${name}` : `Mute ${name}`}
        >
          M
        </button>
        <button
          onClick={onSolo}
          aria-pressed={solo}
          aria-label={`Solo ${name}`}
          className={`w-6 h-6 rounded-full font-mono text-[10px] font-bold flex items-center justify-center cursor-pointer transition-colors border ${
            solo ? 'bg-accent-amber/30 text-accent-amber-fg border-accent-amber-fg' : 'bg-bg-cell border-border-soft text-text-muted hover:text-text-primary'
          }`}
          title={solo ? `Unsolo ${name}` : `Solo ${name}`}
        >
          S
        </button>
        {onFill && (
          <button
            onClick={onFill}
            aria-label={`Fill empty bars of ${name}`}
            className="h-6 px-2 rounded-full text-[11px] font-semibold flex items-center justify-center cursor-pointer transition-colors bg-bg-cell border border-border-soft text-text-muted hover:text-text-primary"
            title="Fill blank bars with existing pattern"
          >
            Fill
          </button>
        )}
      </div>
      {panel}
    </div>
  );
}
