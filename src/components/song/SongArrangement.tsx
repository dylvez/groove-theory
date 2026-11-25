import React, { useState, useCallback, useRef, useMemo } from 'react';
import { useSongStore } from '../../store/useSongStore';
import { useSequencerStore } from '../../store/useSequencerStore';
import { useUIStore } from '../../store/useUIStore';
import { choosePlayMode } from '../../utils/playback';
import { SongBlockChip } from './SongBlock';
import { SongBlockContextMenu } from './SongBlockContextMenu';
import { PATTERN_IDS, PATTERN_COLORS, patternTextColor } from '../../constants/patterns';
import {
  buildSongSnapshot,
  exportSongToFile,
} from '../../utils/grooveStorage';
import { OpenSongDropdown } from './OpenSongDropdown';
import { announce } from '../../utils/announce';
import { showPrompt } from '../../utils/dialogs';
import type { Pattern } from '../../types/sequencer';

const PX_PER_BAR = 40;
const MIN_BLOCK_WIDTH = 60;
/** Space before each block: the insert target while editing, an empty spacer while playing */
const BLOCK_GAP = 24;
/** Left padding of the timeline (px-6) */
const TIMELINE_PAD = 24;

function getBlockWidth(pattern: Pattern | undefined, repeats: number): number {
  if (!pattern) return MIN_BLOCK_WIDTH;
  const stepsPerMeasure = (() => {
    const beats = pattern.timeSignature === '3/4' ? 3 : 4;
    const subs = pattern.stepResolution === '32n' ? 8 : 4;
    return beats * subs;
  })();
  const bars = pattern.numSteps / stepsPerMeasure;
  return Math.max(MIN_BLOCK_WIDTH, bars * repeats * PX_PER_BAR);
}

export function SongArrangement() {
  const blocks = useSongStore((s) => s.blocks);
  const songState = useSongStore((s) => s.songState);
  const currentBlockIndex = useSongStore((s) => s.currentBlockIndex);
  const currentRepeat = useSongStore((s) => s.currentRepeat);
  const currentStep = useSongStore((s) => s.currentStep);
  const addBlock = useSongStore((s) => s.addBlock);
  const insertBlock = useSongStore((s) => s.insertBlock);
  const reorderBlock = useSongStore((s) => s.reorderBlock);
  const clearSong = useSongStore((s) => s.clearSong);
  const loopStart = useSongStore((s) => s.loopStart);
  const loopEnd = useSongStore((s) => s.loopEnd);
  const setLoopRange = useSongStore((s) => s.setLoopRange);
  const clearLoopRange = useSongStore((s) => s.clearLoopRange);

  const playMode = useUIStore((s) => s.playMode);
  const patterns = useSequencerStore((s) => s.patterns);

  const [showAddButtons, setShowAddButtons] = useState(false);
  const [insertAtIndex, setInsertAtIndex] = useState<number | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Drag-and-drop state
  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; blockId: string } | null>(null);

  // Open song dropdown state
  const [openSongPos, setOpenSongPos] = useState<{ top: number; left: number } | null>(null);
  const showOpenSong = openSongPos !== null;

  // Precompute pattern lookups and block widths
  const blockData = useMemo(() => {
    return blocks.map((block) => {
      const pattern = patterns.find((p) => p.id === block.patternId);
      const widthPx = getBlockWidth(pattern, block.repeats);
      return { block, pattern, widthPx };
    });
  }, [blocks, patterns]);

  const handleDragStart = useCallback((index: number) => {
    dragIndexRef.current = index;
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  }, []);

  const handleDrop = useCallback(
    (toIndex: number) => {
      const fromIndex = dragIndexRef.current;
      if (fromIndex !== null && fromIndex !== toIndex) {
        reorderBlock(fromIndex, toIndex);
      }
      dragIndexRef.current = null;
      setDragOverIndex(null);
    },
    [reorderBlock]
  );

  const handleDragEnd = useCallback(() => {
    dragIndexRef.current = null;
    setDragOverIndex(null);
  }, []);

  const handleAddBlock = useCallback(
    (patternId: string) => {
      addBlock(patternId);
    },
    [addBlock]
  );

  const handleBlockContextMenu = useCallback(
    (pos: { x: number; y: number }, blockId: string) => {
      setContextMenu({ x: pos.x, y: pos.y, blockId });
    },
    []
  );

  const handleInsert = useCallback(
    (patternId: string, atIndex: number) => {
      insertBlock(patternId, atIndex);
      setInsertAtIndex(null);
    },
    [insertBlock]
  );

  // Loop range: Shift+click to set start, Shift+click again to set end
  const loopStartRef = useRef<number | null>(null);
  const handleBlockClick = useCallback(
    (e: React.MouseEvent, idx: number) => {
      if (!e.shiftKey) return;
      e.preventDefault();
      if (loopStartRef.current === null) {
        loopStartRef.current = idx;
      } else {
        const start = Math.min(loopStartRef.current, idx);
        const end = Math.max(loopStartRef.current, idx);
        setLoopRange(start, end);
        loopStartRef.current = null;
      }
    },
    [setLoopRange]
  );

  const hasLoop = loopStart !== null && loopEnd !== null;

  const handleSaveSong = useCallback(async () => {
    const name = await showPrompt('Save the song arrangement to a file', {
      label: 'Song name',
      defaultValue: 'My Song',
      confirmLabel: 'Save file',
    });
    if (!name) return;
    const snapshot = buildSongSnapshot(name);
    exportSongToFile(snapshot);
  }, []);

  const handleToggleOpenSong = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setOpenSongPos(prev => (prev ? null : { top: r.top, left: r.right }));
  }, []);

  const hasBlocks = blocks.length > 0;

  // Calculate total bars for display
  const totalBars = useMemo(() => {
    return blockData.reduce((sum, { block, pattern }) => {
      const stepsPerMeasure = (() => {
        const beats = (pattern?.timeSignature ?? '4/4') === '3/4' ? 3 : 4;
        const subs = (pattern?.stepResolution ?? '16n') === '32n' ? 8 : 4;
        return beats * subs;
      })();
      const bars = (pattern?.numSteps ?? 32) / stepsPerMeasure;
      return sum + bars * block.repeats;
    }, 0);
  }, [blockData]);

  // Playback cursor position
  const cursorX = useMemo(() => {
    if (songState !== 'playing') return null;
    let x = BLOCK_GAP;
    for (let i = 0; i < currentBlockIndex; i++) {
      if (blockData[i]) {
        x += blockData[i].widthPx + BLOCK_GAP;
      }
    }
    const current = blockData[currentBlockIndex];
    if (current?.pattern) {
      const totalSteps = current.pattern.numSteps * current.block.repeats;
      const completedSteps = currentRepeat * current.pattern.numSteps + currentStep;
      x += (completedSteps / totalSteps) * current.widthPx;
    }
    return x;
  }, [songState, currentBlockIndex, currentRepeat, currentStep, blockData]);

  // Auto-scroll to follow cursor
  const lastAutoScrollRef = useRef(0);
  if (songState === 'playing' && cursorX !== null && timelineRef.current) {
    const now = Date.now();
    if (now - lastAutoScrollRef.current > 200) {
      const container = timelineRef.current;
      const scrollLeft = container.scrollLeft;
      const clientWidth = container.clientWidth;
      if (cursorX > scrollLeft + clientWidth - 60 || cursorX < scrollLeft) {
        container.scrollTo({ left: cursorX - 100, behavior: 'smooth' });
      }
      lastAutoScrollRef.current = now;
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Song Transport Bar */}
      <div className="flex items-center gap-3 px-4 sm:px-6 py-2 bg-bg-tertiary border-b border-border shrink-0">
        {/* Song label + info */}
        <div className="flex items-center gap-2 shrink-0">
          <h2 id="song-heading" className="font-display text-base font-bold tracking-tight text-text-primary">Song</h2>
          {hasBlocks && (
            <span className="text-[11px] text-text-muted">
              {blocks.length} block{blocks.length !== 1 ? 's' : ''} · {totalBars} bar{totalBars !== 1 ? 's' : ''}
            </span>
          )}
          {songState === 'playing' && (
            <span aria-hidden="true" className="w-2 h-2 rounded-full bg-[#3ddc84] shadow-[0_0_8px_#3ddc84] animate-pulse" />
          )}
        </div>

        {/* Play lives in the transport bar; offer the switch to Song from here */}
        {hasBlocks && songState !== 'playing' && playMode !== 'song' && (
          <button
            // This button goes away once it's used, so focus moves to Play
            onClick={async () => { await choosePlayMode('song'); document.getElementById('main-play')?.focus(); }}
            title="Set the Play button to play the song instead of looping the pattern"
            className="pill shrink-0"
          >
            Use Play for the song
          </button>
        )}

        {/* Loop toggle */}
        {hasBlocks && (
          <>
            <div aria-hidden="true" className="w-px h-4 bg-border" />
            <button
              onClick={() => { if (hasLoop) { clearLoopRange(); announce('Loop cleared'); } }}
              aria-pressed={hasLoop}
              aria-label={hasLoop ? `Loop blocks ${loopStart! + 1} to ${loopEnd! + 1}. Press to clear` : 'Loop: off. Set a loop range from a block’s options menu'}
              className="tog shrink-0"
              title={hasLoop ? `Loop: blocks ${loopStart! + 1}–${loopEnd! + 1} (click to clear)` : 'Shift+click two blocks, or use a block’s options menu, to set a loop range'}
            >
              Loop{hasLoop ? ` ${loopStart! + 1}–${loopEnd! + 1}` : ''}
            </button>
          </>
        )}

        {/* Clear song */}
        {hasBlocks && songState !== 'playing' && (
          <>
            <div aria-hidden="true" className="w-px h-4 bg-border" />
            <button
              onClick={() => { clearSong(); announce('Song cleared. Undo brings it back.'); }}
              aria-label="Clear song arrangement"
              title="Clear the song arrangement (Undo brings it back)"
              className="pill"
            >
              Clear
            </button>
          </>
        )}

        {/* Spacer pushes save/open to right */}
        <div className="flex-1" />

        {/* Save / Open Song */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleSaveSong}
            disabled={!hasBlocks}
            title="Save song arrangement to file"
            className="pill"
          >
            Save song
          </button>
          <div className="relative">
            <button
              onClick={handleToggleOpenSong}
              title="Open song — presets or import file"
              aria-expanded={showOpenSong}
              aria-haspopup="dialog"
              className={`pill ${showOpenSong ? '!border-text-primary !bg-[#2a2a3a] !text-white' : ''}`}
            >
              Open song
              <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-2.5 h-2.5 opacity-70">
                <path fillRule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
              </svg>
            </button>
            {openSongPos && (
              <OpenSongDropdown pos={openSongPos} onClose={() => setOpenSongPos(null)} />
            )}
          </div>
        </div>
      </div>

      {/* Block Timeline */}
      <div
        ref={timelineRef}
        className="flex-1 overflow-y-hidden overflow-x-auto px-6 py-2 bg-bg-tertiary relative"
        onDragEnd={handleDragEnd}
      >
        <div className="flex items-start gap-0 pt-5" style={{ minHeight: 40 }}>
          {blocks.length === 0 && !showAddButtons && (
            <span className="text-xs text-text-muted py-1 self-center">
              Add patterns to build a song arrangement
            </span>
          )}

          {blockData.map(({ block, pattern, widthPx }, idx) => (
            <React.Fragment key={block.id}>
              {/* Insertion zone before each block; while playing, a spacer of
                  the same width so nothing shifts */}
              {songState !== 'playing' ? (
                <InsertionZone
                  index={idx}
                  isOpen={insertAtIndex === idx}
                  onToggle={() => setInsertAtIndex(insertAtIndex === idx ? null : idx)}
                  onInsert={handleInsert}
                  patterns={patterns}
                />
              ) : (
                <div aria-hidden="true" className="shrink-0" style={{ width: BLOCK_GAP }} />
              )}
              <div
                className={`transition-transform shrink-0 relative ${dragOverIndex === idx ? 'translate-x-1' : ''}`}
                style={{ height: 80 }}
                onClick={(e) => handleBlockClick(e, idx)}
              >
                {/* Section label */}
                {block.sectionLabel && (
                  <div className="absolute -top-4 left-0 text-[11px] font-medium text-accent-orange-fg uppercase tracking-wider truncate max-w-full">
                    {block.sectionLabel}
                  </div>
                )}
                {/* Loop range indicator */}
                {hasLoop && idx >= loopStart! && idx <= loopEnd! && (
                  <div className="absolute -inset-1 rounded-[14px] border-2 border-dashed border-text-muted/70 pointer-events-none z-5" />
                )}
                <SongBlockChip
                  block={block}
                  index={idx}
                  widthPx={widthPx}
                  pattern={pattern}
                  isActive={songState === 'playing' && currentBlockIndex === idx}
                  currentRepeat={currentRepeat}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onContextMenu={handleBlockContextMenu}
                />
              </div>
            </React.Fragment>
          ))}

          {/* Insertion zone after last block */}
          {songState !== 'playing' && blocks.length > 0 && (
            <InsertionZone
              index={blocks.length}
              isOpen={insertAtIndex === blocks.length}
              onToggle={() => setInsertAtIndex(insertAtIndex === blocks.length ? null : blocks.length)}
              onInsert={handleInsert}
              patterns={patterns}
            />
          )}

          {/* Add block — inline pattern buttons (when no blocks or as append) */}
          {songState !== 'playing' && (
            <div className="flex items-center gap-1 shrink-0 self-center ml-1">
              {showAddButtons ? (
                <>
                  {PATTERN_IDS.map((pid) => {
                    const name = patterns.find((p) => p.id === pid)?.name ?? '?';
                    return (
                      <button
                        key={pid}
                        onClick={() => { handleAddBlock(pid); announce(`Added pattern ${name} to the song`); }}
                        className="w-8 h-8 rounded-md text-sm font-bold flex items-center justify-center cursor-pointer transition-colors hover:opacity-80"
                        style={{ backgroundColor: `${PATTERN_COLORS[pid]}20`, color: patternTextColor(pid) }}
                        title={`Add pattern ${name}`}
                        aria-label={`Add pattern ${name} to the end of the song`}
                      >
                        {name}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setShowAddButtons(false)}
                    aria-label="Close add block"
                    className="w-6 h-8 rounded-md flex items-center justify-center text-text-muted hover:text-text-secondary cursor-pointer transition-colors text-xs"
                    title="Close"
                  >
                    ×
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowAddButtons(true)}
                  aria-label="Add a block to the song"
                  className="w-10 h-10 rounded-lg border-2 border-dashed border-border hover:border-text-muted
                    flex items-center justify-center text-text-muted hover:text-text-secondary
                    cursor-pointer transition-colors bg-bg-cell/50"
                  title="Add block"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                    <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Playback Cursor */}
        {songState === 'playing' && cursorX !== null && (
          <div
            aria-hidden="true"
            className="absolute top-0 bottom-0 w-0.5 bg-white pointer-events-none z-10"
            style={{
              transform: `translateX(${cursorX + TIMELINE_PAD}px)`,
              boxShadow: '0 0 10px #ffffff, 0 0 18px rgb(255 255 255 / 0.5)',
            }}
          />
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (() => {
        const block = blocks.find((b) => b.id === contextMenu.blockId);
        if (!block) return null;
        return (
          <SongBlockContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            block={block}
            index={blocks.indexOf(block)}
            count={blocks.length}
            onClose={() => setContextMenu(null)}
          />
        );
      })()}
    </div>
  );
}

/** Thin insertion zone between blocks — expands on hover to show + icon */
function InsertionZone({
  index,
  isOpen,
  onToggle,
  onInsert,
  patterns,
}: {
  index: number;
  isOpen: boolean;
  onToggle: () => void;
  onInsert: (patternId: string, atIndex: number) => void;
  patterns: Pattern[];
}) {
  if (isOpen) {
    return (
      <div role="group" aria-label={`Insert a pattern at position ${index + 1}`} className="grid grid-cols-4 gap-0.5 px-0.5 shrink-0 self-center">
        {PATTERN_IDS.map((pid) => {
          const name = patterns.find((p) => p.id === pid)?.name ?? '?';
          const c = PATTERN_COLORS[pid];
          return (
            <button
              key={pid}
              onClick={() => { onInsert(pid, index); announce(`Inserted pattern ${name}`); }}
              className="w-6 h-6 rounded text-[11px] font-bold flex items-center justify-center cursor-pointer hover:opacity-80"
              style={{ backgroundColor: `${c}25`, color: patternTextColor(pid) }}
              title={`Insert ${name}`}
              aria-label={`Insert pattern ${name} at position ${index + 1}`}
            >
              {name}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <button
      type="button"
      className="group/insert shrink-0 self-stretch flex items-center justify-center cursor-pointer"
      style={{ width: BLOCK_GAP }}
      onClick={onToggle}
      title="Insert block here"
      aria-label={`Insert a block at position ${index + 1}`}
    >
      <div className="w-px h-full bg-transparent group-hover/insert:bg-accent-orange/40 group-focus-visible/insert:bg-accent-orange/40 transition-colors relative">
        <div aria-hidden="true" className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center opacity-0 group-hover/insert:opacity-100 group-focus-visible/insert:opacity-100 transition-opacity">
          <span className="w-4 h-4 rounded-full bg-accent-orange/20 text-accent-orange-fg text-[11px] font-bold flex items-center justify-center">
            +
          </span>
        </div>
      </div>
    </button>
  );
}
