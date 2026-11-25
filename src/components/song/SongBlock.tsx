import { useState, useRef, useCallback, memo } from 'react';
import { useSongStore, type SongBlock as SongBlockType } from '../../store/useSongStore';
import { PATTERN_COLORS, patternTextColor } from '../../constants/patterns';
import type { Pattern } from '../../types/sequencer';

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

/** Mini-grid preview showing drum track activity as tiny step rows */
const MiniGrid = memo(function MiniGrid({ pattern }: { pattern: Pattern }) {
  return (
    <div className="flex flex-col justify-center gap-px flex-1 overflow-hidden min-w-0">
      {pattern.drumTracks.map((track) => (
        <div key={track.id} className="flex gap-px h-[2px]">
          {track.steps.map((step, j) => (
            <div
              key={j}
              className="flex-1 rounded-[0.5px]"
              style={{ backgroundColor: step > 0 ? track.color : '#2a2a3d', opacity: step > 0 ? 0.4 + 0.6 * step : 1 }}
            />
          ))}
        </div>
      ))}
      {/* Aggregated melodic row */}
      {pattern.melodicTracks.length > 0 && (
        <div className="flex gap-px h-[2px] mt-px">
          {pattern.melodicTracks[0].steps.map((_, j) => {
            const hasActivity = pattern.melodicTracks.some((t) => t.steps[j]?.active);
            return (
              <div
                key={j}
                className="flex-1 rounded-[0.5px]"
                style={{ backgroundColor: hasActivity ? '#a855f7' : '#2a2a3d' }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
});

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
      title="Drag to reorder · click the letter or right-click for options"
      className={`group relative flex flex-col rounded-lg cursor-grab transition-all select-none shrink-0 h-full ${
        block.muted ? 'opacity-40' : ''
      } ${
        isActive
          ? 'ring-2 ring-accent-teal'
          : 'hover:ring-1 hover:ring-border'
      }`}
      style={{ width: widthPx, minWidth: 60 }}
    >
      {/* Colored top accent stripe */}
      <div
        className="h-1 w-full rounded-t-lg shrink-0"
        style={{ backgroundColor: color }}
      />

      {/* Block body */}
      <div className="flex-1 flex items-stretch bg-bg-cell rounded-b-lg overflow-hidden min-h-0">
        {/* Pattern letter badge — also the options button */}
        <button
          type="button"
          onClick={openOptions}
          aria-haspopup="dialog"
          aria-label={`Block ${index + 1}${block.sectionLabel ? `, ${block.sectionLabel}` : ''}: pattern ${patternName}, ${block.repeats} time${block.repeats === 1 ? '' : 's'}${block.muted ? ', muted' : ''}${isActive ? ', playing' : ''}. Options`}
          className="flex items-center justify-center px-2 min-w-6 shrink-0 cursor-pointer hover:brightness-125"
          style={{ backgroundColor: `${color}15` }}
        >
          <span aria-hidden="true" className="text-sm font-bold" style={{ color: patternTextColor(block.patternId) }}>
            {patternName}
          </span>
        </button>

        {/* Mini-grid preview (center area) */}
        {pattern && widthPx > 80 && (
          <div aria-hidden="true" className="flex-1 py-1 px-1 min-w-0 overflow-hidden">
            <MiniGrid pattern={pattern} />
          </div>
        )}

        {/* Repeat badge (right) */}
        <div className="flex items-center px-2 shrink-0">
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
              className="w-8 text-center text-[11px] bg-bg-primary border border-border rounded px-0.5 py-0 text-text-primary focus:outline-none focus:border-accent-orange"
            />
          ) : (
            <button
              onClick={handleRepeatsClick}
              aria-label={`Block ${index + 1} repeats ${block.repeats} time${block.repeats === 1 ? '' : 's'}. Edit`}
              className="text-[11px] min-h-6 min-w-6 px-0.5 text-text-muted hover:text-text-primary cursor-pointer"
              title="Click to edit repeats"
            >
              {isActive ? (
                <span className="text-accent-teal-fg">{currentRepeat + 1}/{block.repeats}</span>
              ) : (
                <span>×{block.repeats}</span>
              )}
            </button>
          )}
        </div>
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
