import { useState, useRef, useCallback, useMemo } from 'react';
import { useSongStore, type SongBlock as SongBlockType } from '../../store/useSongStore';
import { PATTERN_COLORS, patternTextColor } from '../../constants/patterns';
import type { Pattern } from '../../types/sequencer';
import { RhythmRing } from '../common/RhythmRing';
import { ringFromPattern } from '../../utils/rhythmRing';

interface SongBlockProps {
  block: SongBlockType;
  index: number;
  widthPx: number;
  pattern: Pattern | undefined;
  isActive: boolean;
  currentRepeat: number;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (index: number) => void;
  /** Open the block's options menu at a screen position */
  onContextMenu: (pos: { x: number; y: number }, blockId: string) => void;
}

export function SongBlockChip({
  block,
  index,
  widthPx,
  pattern,
  isActive,
  currentRepeat,
  onDragStart,
  onDragOver,
  onDrop,
  onContextMenu,
}: SongBlockProps) {
  const removeBlock = useSongStore((s) => s.removeBlock);
  const setBlockRepeats = useSongStore((s) => s.setBlockRepeats);
  const songState = useSongStore((s) => s.songState);

  const [editingRepeats, setEditingRepeats] = useState(false);
  const repeatsInputRef = useRef<HTMLInputElement>(null);

  const patternName = pattern?.name ?? '?';
  const color = PATTERN_COLORS[block.patternId] ?? '#888';
  const ring = useMemo(() => (pattern ? ringFromPattern(pattern) : null), [pattern]);

  const handleRepeatsClick = useCallback(() => {
    if (songState === 'playing') return;
    setEditingRepeats(true);
    setTimeout(() => repeatsInputRef.current?.select(), 0);
  }, [songState]);

  const handleRepeatsBlur = useCallback(() => {
    setEditingRepeats(false);
  }, []);

  const handleRepeatsChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseInt(e.target.value) || 1;
      setBlockRepeats(block.id, val);
    },
    [block.id, setBlockRepeats]
  );

  const handleRepeatsKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') setEditingRepeats(false);
    },
    []
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onContextMenu({ x: e.clientX, y: e.clientY }, block.id);
    },
    [block.id, onContextMenu]
  );

  // Keyboard / single-click way to the same menu
  const openOptions = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const r = e.currentTarget.getBoundingClientRect();
      onContextMenu({ x: r.left, y: r.bottom + 4 }, block.id);
    },
    [block.id, onContextMenu]
  );

  return (
    <div
      draggable={songState !== 'playing'}
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={() => onDrop(index)}
      onContextMenu={handleContextMenu}
      title="Drag to reorder · click the ring or right-click for options"
      className={`group relative flex items-center gap-2.5 pl-1.5 pr-2 rounded-xl border cursor-grab transition-[box-shadow,border-color] select-none shrink-0 h-full overflow-hidden ${
        block.muted ? 'opacity-40' : ''
      } ${isActive ? '' : 'border-[#383848] bg-bg-cell hover:border-text-muted'}`}
      style={{
        width: widthPx,
        minWidth: 60,
        ...(isActive ? {
          borderColor: `${color}d9`,
          background: `linear-gradient(90deg, ${color}2e, var(--color-bg-cell) 75%)`,
          boxShadow: `0 0 24px ${color}4d`,
        } : {}),
      }}
    >
      {/* The ring is also the options button */}
      <button
        type="button"
        onClick={openOptions}
        aria-haspopup="dialog"
        aria-label={`Block ${index + 1}${block.sectionLabel ? `, ${block.sectionLabel}` : ''}: pattern ${patternName}, ${block.repeats} time${block.repeats === 1 ? '' : 's'}${block.muted ? ', muted' : ''}${isActive ? ', playing' : ''}. Options`}
        className="relative shrink-0 w-[52px] h-[52px] rounded-full cursor-pointer hover:bg-white/5 flex items-center justify-center"
      >
        {ring && <RhythmRing ring={ring} size={52} lit={isActive} className="absolute inset-0 pointer-events-none" />}
        <span aria-hidden="true" className="relative font-display text-[13px] font-bold" style={{ color: patternTextColor(block.patternId) }}>
          {patternName}
        </span>
      </button>

      {/* Name, then repeats */}
      {widthPx > 100 && (
        <div className="flex flex-col gap-0.5 min-w-0">
          <span aria-hidden="true" className="text-xs font-semibold text-text-primary truncate">Pattern {patternName}</span>
        </div>
      )}
      <div className="ml-auto flex items-center shrink-0">
        {editingRepeats ? (
          <input
            ref={repeatsInputRef}
            type="number"
            min={1}
            max={99}
            value={block.repeats}
            onChange={handleRepeatsChange}
            onBlur={handleRepeatsBlur}
            onKeyDown={handleRepeatsKeyDown}
            aria-label={`Repeats for block ${index + 1}`}
            className="w-10 text-center font-mono text-[11px] bg-[#111118] border border-border-control rounded px-0.5 py-0.5 text-text-primary focus:outline-none focus:border-text-primary"
          />
        ) : (
          <button
            onClick={handleRepeatsClick}
            aria-label={`Block ${index + 1} repeats ${block.repeats} time${block.repeats === 1 ? '' : 's'}. Edit`}
            className="font-mono text-[11px] min-h-6 min-w-6 px-1.5 rounded-full border border-border-soft text-text-secondary hover:text-text-primary hover:bg-bg-cell-hover cursor-pointer"
            title="Click to edit repeats"
          >
            {isActive ? <span className="text-text-primary">{currentRepeat + 1}/{block.repeats}</span> : <span>×{block.repeats}</span>}
          </button>
        )}
      </div>

      {/* Mute indicator */}
      {block.muted && (
        <div aria-hidden="true" className="absolute top-1.5 left-1 text-[11px] font-bold text-accent-red-fg bg-accent-red/20 rounded px-0.5">
          M
        </div>
      )}

      {/* Remove button — hover only */}
      {songState !== 'playing' && (
        <button
          onClick={() => removeBlock(block.id)}
          aria-label={`Remove block ${index + 1}`}
          title="Remove block"
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-bg-tertiary border border-border-control text-text-muted
            hover:bg-accent-red hover:text-on-accent hover:border-accent-red
            opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-sm"
        >
          <span aria-hidden="true">×</span>
        </button>
      )}
    </div>
  );
}
