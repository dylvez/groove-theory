import React, { useState, useCallback, useRef, useMemo } from 'react';
import { useSongStore } from '../../store/useSongStore';
import { useSequencerStore } from '../../store/useSequencerStore';
import { useTransportStore } from '../../store/useTransportStore';
import { useAudioInit } from '../../audio/useAudioInit';
import { SongBlockChip } from './SongBlock';
import { SongBlockContextMenu } from './SongBlockContextMenu';
import { PATTERN_IDS, PATTERN_COLORS } from '../../constants/patterns';
import {
  buildSongSnapshot,
  exportSongToFile,
} from '../../utils/grooveStorage';
import { OpenSongDropdown } from './OpenSongDropdown';
import type { Pattern } from '../../types/sequencer';

const PX_PER_BAR = 40;
const MIN_BLOCK_WIDTH = 60;
const BLOCK_GAP = 8; // gap-2 = 8px

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
  const playSong = useSongStore((s) => s.playSong);
  const stopSong = useSongStore((s) => s.stopSong);
  const clearSong = useSongStore((s) => s.clearSong);
  const loopStart = useSongStore((s) => s.loopStart);
  const loopEnd = useSongStore((s) => s.loopEnd);
  const setLoopRange = useSongStore((s) => s.setLoopRange);
  const clearLoopRange = useSongStore((s) => s.clearLoopRange);

  const transportState = useTransportStore((s) => s.state);
  const transportStop = useTransportStore((s) => s.stop);
  const bpm = useTransportStore((s) => s.bpm);
  const swing = useTransportStore((s) => s.swing);
  const setBpm = useTransportStore((s) => s.setBpm);
  const setSwing = useTransportStore((s) => s.setSwing);

  const patterns = useSequencerStore((s) => s.patterns);
  const { ready, init } = useAudioInit();

  const [showAddButtons, setShowAddButtons] = useState(false);
  const [insertAtIndex, setInsertAtIndex] = useState<number | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Drag-and-drop state
  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; blockId: string } | null>(null);

  // Open song dropdown state
  const [showOpenSong, setShowOpenSong] = useState(false);
  const openSongBtnRef = useRef<HTMLButtonElement>(null);

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

  const handlePlaySong = useCallback(async () => {
    if (!ready) await init();
    if (songState === 'playing') {
      stopSong();
    } else {
      if (transportState === 'playing') {
        transportStop();
      }
      playSong();
    }
  }, [ready, init, songState, stopSong, transportState, transportStop, playSong]);

  const handleAddBlock = useCallback(
    (patternId: string) => {
      addBlock(patternId);
    },
    [addBlock]
  );

  const handleBlockContextMenu = useCallback(
    (e: React.MouseEvent, blockId: string) => {
      setContextMenu({ x: e.clientX, y: e.clientY, blockId });
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

  const handleSaveSong = useCallback(() => {
    const name = window.prompt('Song arrangement name:', 'My Song');
    if (!name) return;
    const snapshot = buildSongSnapshot(name.trim());
    exportSongToFile(snapshot);
  }, []);

  const handleToggleOpenSong = useCallback(() => {
    setShowOpenSong(prev => !prev);
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
    let x = 0;
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
      <div className="flex items-center gap-3 px-4 sm:px-6 py-2 bg-bg-tertiary border-b-2 border-border shrink-0">
        {/* Song label + info */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-text-secondary uppercase tracking-wider font-medium">Song</span>
          {hasBlocks && (
            <span className="text-[10px] text-text-muted">
              {blocks.length} block{blocks.length !== 1 ? 's' : ''} · {totalBars} bar{totalBars !== 1 ? 's' : ''}
            </span>
          )}
          {songState === 'playing' && (
            <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
          )}
        </div>

        <div className="w-px h-5 bg-border shrink-0" />

        {/* Play/Stop */}
        <button
          onClick={handlePlaySong}
          disabled={!hasBlocks}
          className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-colors shrink-0 ${
            !hasBlocks
              ? 'bg-bg-cell text-text-muted/30 cursor-not-allowed'
              : songState === 'playing'
                ? 'bg-accent-red text-white cursor-pointer'
                : 'bg-accent-green text-white cursor-pointer'
          }`}
        >
          {songState === 'playing' ? '\u25A0' : '\u25B6'}
        </button>

        {/* BPM */}
        <div className="flex items-center gap-1.5 shrink-0">
          <label className="text-[10px] text-text-muted uppercase tracking-wider">BPM</label>
          <input
            type="number"
            min={40}
            max={300}
            value={bpm}
            onChange={(e) => setBpm(parseInt(e.target.value) || 120)}
            className="w-12 px-1 py-0.5 bg-bg-cell border border-border rounded text-center text-xs text-text-primary focus:outline-none focus:border-accent-orange"
          />
          <input
            type="range"
            min={40}
            max={300}
            value={bpm}
            onChange={(e) => setBpm(parseInt(e.target.value))}
            className="w-16 accent-accent-orange hidden md:block"
          />
        </div>

        {/* Swing */}
        <div className="flex items-center gap-1.5 shrink-0">
          <label className="text-[10px] text-text-muted uppercase tracking-wider">Swing</label>
          <input
            type="number"
            min={0}
            max={75}
            value={Math.round(swing * 100)}
            onChange={(e) => setSwing((parseInt(e.target.value) || 0) / 100)}
            className="w-12 px-1 py-0.5 bg-bg-cell border border-border rounded text-center text-xs text-text-primary focus:outline-none focus:border-accent-orange"
          />
          <input
            type="range"
            min={0}
            max={75}
            value={Math.round(swing * 100)}
            onChange={(e) => setSwing(parseInt(e.target.value) / 100)}
            className="w-14 accent-accent-orange hidden md:block"
          />
          <span className="text-[10px] text-text-muted hidden md:block">%</span>
        </div>

        {/* Loop toggle */}
        {hasBlocks && (
          <>
            <div className="w-px h-4 bg-border/50" />
            <button
              onClick={() => hasLoop ? clearLoopRange() : null}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer shrink-0 ${
                hasLoop
                  ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/40'
                  : 'bg-bg-cell text-text-muted border border-border hover:bg-bg-cell-hover'
              }`}
              title={hasLoop ? `Loop: blocks ${loopStart! + 1}–${loopEnd! + 1} (click to clear)` : 'Shift+click two blocks to set loop range'}
            >
              LOOP{hasLoop ? ` ${loopStart! + 1}–${loopEnd! + 1}` : ''}
            </button>
          </>
        )}

        {/* Clear song */}
        {hasBlocks && songState !== 'playing' && (
          <>
            <div className="w-px h-4 bg-border/50" />
            <button
              onClick={clearSong}
              className="px-2 py-0.5 rounded text-[10px] text-text-muted bg-bg-cell hover:bg-bg-cell-hover border border-border cursor-pointer transition-colors"
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
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${
              hasBlocks
                ? 'bg-accent-green/15 text-accent-green border-accent-green/25 hover:bg-accent-green/25 cursor-pointer'
                : 'bg-bg-cell text-text-muted/30 border-border/50 cursor-not-allowed'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-2.5 h-2.5">
              <path d="M3.5 1.75a.75.75 0 0 0-1.5 0v3a2.25 2.25 0 0 0 2.25 2.25h5.5A2.25 2.25 0 0 0 12 4.75v-3a.75.75 0 0 0-1.5 0v3a.75.75 0 0 1-.75.75h-5.5a.75.75 0 0 1-.75-.75v-3Z" />
              <path d="M1 8.75A.75.75 0 0 1 1.75 8h12.5a.75.75 0 0 1 .75.75v5.5a.75.75 0 0 1-.75.75H1.75a.75.75 0 0 1-.75-.75v-5.5Zm7 1a.75.75 0 0 0-.75.75v1.5a.75.75 0 0 0 1.5 0v-1.5A.75.75 0 0 0 8 9.75Z" />
            </svg>
            Save Song
          </button>
          <div className="relative">
            <button
              ref={openSongBtnRef}
              onClick={handleToggleOpenSong}
              title="Open song — presets or import file"
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border transition-colors
                bg-accent-blue/15 text-accent-blue border-accent-blue/25 hover:bg-accent-blue/25 cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-2.5 h-2.5">
                <path d="M1.75 2A1.75 1.75 0 0 0 0 3.75v.5A1.75 1.75 0 0 0 1.02 5.89l.857 6A1.75 1.75 0 0 0 3.607 13.5h8.786a1.75 1.75 0 0 0 1.731-1.61l.857-6A1.75 1.75 0 0 0 16 4.25v-.5A1.75 1.75 0 0 0 14.25 2H9.236a.75.75 0 0 1-.447-.148L7.078.578A2.25 2.25 0 0 0 5.736 0H1.75Z" />
              </svg>
              Open Song
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-2 h-2 opacity-60">
                <path fillRule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
              </svg>
            </button>
            {showOpenSong && (
              <OpenSongDropdown anchorRef={openSongBtnRef} onClose={() => setShowOpenSong(false)} />
            )}
          </div>
        </div>
      </div>

      {/* Block Timeline */}
      <div
        ref={timelineRef}
        className="flex-1 overflow-y-hidden overflow-x-auto px-4 sm:px-6 py-2 bg-bg-secondary/30 relative"
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
              {/* Insertion zone before each block */}
              {songState !== 'playing' && (
                <InsertionZone
                  index={idx}
                  isOpen={insertAtIndex === idx}
                  onToggle={() => setInsertAtIndex(insertAtIndex === idx ? null : idx)}
                  onInsert={handleInsert}
                  patterns={patterns}
                />
              )}
              <div
                className={`transition-transform shrink-0 relative ${dragOverIndex === idx ? 'translate-x-1' : ''}`}
                style={{ height: 80 }}
                onClick={(e) => handleBlockClick(e, idx)}
              >
                {/* Section label */}
                {block.sectionLabel && (
                  <div className="absolute -top-4 left-0 text-[9px] font-medium text-accent-orange uppercase tracking-wider truncate max-w-full">
                    {block.sectionLabel}
                  </div>
                )}
                {/* Loop range indicator */}
                {hasLoop && idx >= loopStart! && idx <= loopEnd! && (
                  <div className="absolute inset-0 rounded-lg border-2 border-accent-blue/40 pointer-events-none z-5" />
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
                        onClick={() => handleAddBlock(pid)}
                        className="w-8 h-8 rounded-md text-sm font-bold flex items-center justify-center cursor-pointer transition-colors hover:opacity-80"
                        style={{ backgroundColor: `${PATTERN_COLORS[pid]}20`, color: PATTERN_COLORS[pid] }}
                        title={`Add pattern ${name}`}
                      >
                        {name}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setShowAddButtons(false)}
                    className="w-6 h-8 rounded-md flex items-center justify-center text-text-muted hover:text-text-secondary cursor-pointer transition-colors text-xs"
                    title="Close"
                  >
                    ×
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowAddButtons(true)}
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
            className="absolute top-0 bottom-0 w-0.5 bg-[#28d7d4] pointer-events-none z-10"
            style={{
              transform: `translateX(${cursorX + 16}px)`,
              boxShadow: '0 0 6px #28d7d4',
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
      <div className="flex flex-col items-center justify-center gap-0.5 px-0.5 shrink-0 self-center">
        {PATTERN_IDS.map((pid) => {
          const name = patterns.find((p) => p.id === pid)?.name ?? '?';
          const c = PATTERN_COLORS[pid];
          return (
            <button
              key={pid}
              onClick={() => onInsert(pid, index)}
              className="w-5 h-5 rounded text-[9px] font-bold flex items-center justify-center cursor-pointer hover:opacity-80"
              style={{ backgroundColor: `${c}25`, color: c }}
              title={`Insert ${name}`}
            >
              {name}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className="group/insert w-1 hover:w-5 shrink-0 self-stretch flex items-center justify-center cursor-pointer transition-all"
      onClick={onToggle}
      title="Insert block here"
    >
      <div className="w-px h-full bg-transparent group-hover/insert:bg-accent-orange/40 transition-colors relative">
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center opacity-0 group-hover/insert:opacity-100 transition-opacity">
          <span className="w-4 h-4 rounded-full bg-accent-orange/20 text-accent-orange text-[10px] font-bold flex items-center justify-center">
            +
          </span>
        </div>
      </div>
    </div>
  );
}
