import { useState, useCallback } from 'react';
import { useSongStore, type SongBlock } from '../../store/useSongStore';
import { useSequencerStore } from '../../store/useSequencerStore';
import { usePopover } from '../../hooks/usePopover';
import { PATTERN_IDS, PATTERN_COLORS, patternTextColor } from '../../constants/patterns';
import { announce } from '../../utils/announce';

interface ContextMenuProps {
  x: number;
  y: number;
  block: SongBlock;
  index: number;
  count: number;
  onClose: () => void;
}

export function SongBlockContextMenu({ x, y, block, index, count, onClose }: ContextMenuProps) {
  const reorderBlock = useSongStore((s) => s.reorderBlock);
  const insertBlock = useSongStore((s) => s.insertBlock);
  const loopStart = useSongStore((s) => s.loopStart);
  const loopEnd = useSongStore((s) => s.loopEnd);
  const setLoopRange = useSongStore((s) => s.setLoopRange);
  const duplicateBlock = useSongStore((s) => s.duplicateBlock);
  const removeBlock = useSongStore((s) => s.removeBlock);
  const setBlockPattern = useSongStore((s) => s.setBlockPattern);
  const setBlockRepeats = useSongStore((s) => s.setBlockRepeats);
  const toggleBlockMute = useSongStore((s) => s.toggleBlockMute);
  const setSectionLabel = useSongStore((s) => s.setSectionLabel);
  const setActivePattern = useSequencerStore((s) => s.setActivePattern);
  const patterns = useSequencerStore((s) => s.patterns);

  const [showReplace, setShowReplace] = useState(false);
  const [editingRepeats, setEditingRepeats] = useState(false);
  const [editingLabel, setEditingLabel] = useState(false);
  const [repeatsValue, setRepeatsValue] = useState(String(block.repeats));
  const [labelValue, setLabelValue] = useState(block.sectionLabel ?? '');

  const ref = usePopover<HTMLDivElement>(onClose);

  // usePopover moves it to fit inside the window
  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    top: y,
    left: x,
    zIndex: 50,
  };

  const handleDuplicate = useCallback(() => {
    duplicateBlock(block.id);
    onClose();
  }, [duplicateBlock, block.id, onClose]);

  const handleEditPattern = useCallback(() => {
    setActivePattern(block.patternId);
    onClose();
  }, [setActivePattern, block.patternId, onClose]);

  const handleReplace = useCallback(
    (patternId: string) => {
      setBlockPattern(block.id, patternId);
      onClose();
    },
    [setBlockPattern, block.id, onClose]
  );

  const handleRepeatsSubmit = useCallback(() => {
    const val = parseInt(repeatsValue) || 1;
    setBlockRepeats(block.id, val);
    setEditingRepeats(false);
  }, [repeatsValue, setBlockRepeats, block.id]);

  const handleToggleMute = useCallback(() => {
    toggleBlockMute(block.id);
    onClose();
  }, [toggleBlockMute, block.id, onClose]);

  const handleLabelSubmit = useCallback(() => {
    setSectionLabel(block.id, labelValue.trim() || null);
    setEditingLabel(false);
    onClose();
  }, [labelValue, setSectionLabel, block.id, onClose]);

  const handleRemove = useCallback(() => {
    removeBlock(block.id);
    announce(`Removed block ${index + 1}`);
    onClose();
  }, [removeBlock, block.id, index, onClose]);

  const handleMove = useCallback((to: number) => {
    reorderBlock(index, to);
    announce(`Moved to position ${to + 1}`);
    onClose();
  }, [reorderBlock, index, onClose]);

  const handleInsert = useCallback((patternId: string, at: number, name: string) => {
    insertBlock(patternId, at);
    announce(`Inserted pattern ${name} at position ${at + 1}`);
    onClose();
  }, [insertBlock, onClose]);

  const handleLoopFrom = useCallback(() => {
    const end = loopEnd !== null && loopEnd >= index ? loopEnd : index;
    setLoopRange(index, end);
    announce(`Loop: blocks ${index + 1} to ${end + 1}`);
    onClose();
  }, [loopEnd, index, setLoopRange, onClose]);

  const handleLoopTo = useCallback(() => {
    const start = loopStart !== null && loopStart <= index ? loopStart : index;
    setLoopRange(start, index);
    announce(`Loop: blocks ${start + 1} to ${index + 1}`);
    onClose();
  }, [loopStart, index, setLoopRange, onClose]);

  const patternName = patterns.find((p) => p.id === block.patternId)?.name ?? '?';
  const color = PATTERN_COLORS[block.patternId] ?? '#888';

  return (
    <div
      ref={ref}
      style={menuStyle}
      role="dialog"
      aria-label={`Options for block ${index + 1}, pattern ${patternName}`}
      className="bg-bg-secondary border border-border-soft rounded-xl shadow-xl py-1 min-w-[180px] text-xs"
    >
      {/* Header showing block info */}
      <div aria-hidden="true" className="px-3 py-1.5 text-text-muted border-b border-border/50 flex items-center gap-2">
        <span className="font-bold" style={{ color: patternTextColor(block.patternId) || color }}>
          {patternName}
        </span>
        <span>×{block.repeats}</span>
      </div>

      {/* Move (keyboard alternative to drag-and-drop) */}
      <button
        onClick={() => handleMove(index - 1)}
        disabled={index === 0}
        className="w-full px-3 py-1.5 text-left text-text-secondary hover:bg-bg-cell transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Move left
      </button>
      <button
        onClick={() => handleMove(index + 1)}
        disabled={index >= count - 1}
        className="w-full px-3 py-1.5 text-left text-text-secondary hover:bg-bg-cell transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Move right
      </button>
      <div className="border-t border-border/50 my-0.5" />

      {/* Duplicate */}
      <button
        onClick={handleDuplicate}
        className="w-full px-3 py-1.5 text-left text-text-secondary hover:bg-bg-cell transition-colors cursor-pointer"
      >
        Duplicate
      </button>

      {/* Edit Pattern */}
      <button
        onClick={handleEditPattern}
        className="w-full px-3 py-1.5 text-left text-text-secondary hover:bg-bg-cell transition-colors cursor-pointer"
      >
        Edit Pattern
      </button>

      {/* Set Repeats */}
      {editingRepeats ? (
        <div className="px-3 py-1.5 flex items-center gap-2">
          <span className="text-text-muted">Repeats:</span>
          <input
            autoFocus
            type="number"
            min={1}
            max={99}
            value={repeatsValue}
            onChange={(e) => setRepeatsValue(e.target.value)}
            aria-label="Repeats"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRepeatsSubmit();
            }}
            onBlur={handleRepeatsSubmit}
            className="w-12 px-1 py-0.5 bg-bg-primary border border-border rounded text-center text-xs text-text-primary focus:outline-none focus:border-text-primary"
          />
        </div>
      ) : (
        <button
          onClick={() => setEditingRepeats(true)}
          className="w-full px-3 py-1.5 text-left text-text-secondary hover:bg-bg-cell transition-colors cursor-pointer"
        >
          Set Repeats...
        </button>
      )}

      {/* Replace With */}
      {showReplace ? (
        <div role="group" aria-label="Replace with pattern" className="px-3 py-1.5 flex items-start gap-1">
          <span aria-hidden="true" className="text-text-muted mr-1">Replace:</span>
          <div className="grid grid-cols-4 gap-1">
          {PATTERN_IDS.map((pid) => {
            const name = patterns.find((p) => p.id === pid)?.name ?? '?';
            const c = PATTERN_COLORS[pid];
            return (
              <button
                key={pid}
                onClick={() => handleReplace(pid)}
                className="w-6 h-6 rounded text-[11px] font-bold flex items-center justify-center cursor-pointer hover:opacity-80"
                style={{ backgroundColor: `${c}20`, color: patternTextColor(pid) }}
                aria-label={`Pattern ${name}`}
              >
                {name}
              </button>
            );
          })}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowReplace(true)}
          className="w-full px-3 py-1.5 text-left text-text-secondary hover:bg-bg-cell transition-colors cursor-pointer"
        >
          Replace With...
        </button>
      )}

      <div className="border-t border-border/50 my-0.5" />

      {/* Mute/Unmute */}
      <button
        onClick={handleToggleMute}
        className="w-full px-3 py-1.5 text-left text-text-secondary hover:bg-bg-cell transition-colors cursor-pointer"
      >
        {block.muted ? 'Unmute' : 'Mute'}
      </button>

      {/* Section Label */}
      {editingLabel ? (
        <div className="px-3 py-1.5 flex items-center gap-2">
          <input
            autoFocus
            type="text"
            value={labelValue}
            placeholder="e.g. Intro, Verse..."
            aria-label="Section label"
            onChange={(e) => setLabelValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleLabelSubmit();
            }}
            onBlur={handleLabelSubmit}
            className="flex-1 px-1 py-0.5 bg-bg-primary border border-border rounded text-xs text-text-primary focus:outline-none focus:border-text-primary"
          />
        </div>
      ) : (
        <button
          onClick={() => setEditingLabel(true)}
          className="w-full px-3 py-1.5 text-left text-text-secondary hover:bg-bg-cell transition-colors cursor-pointer"
        >
          {block.sectionLabel ? `Edit Label "${block.sectionLabel}"` : 'Add Section Label...'}
        </button>
      )}

      {/* Insert (larger-target alternative to the thin insert strips between blocks) */}
      {([['before', index], ['after', index + 1]] as const).map(([where, at]) => (
        <div key={where} role="group" aria-label={`Insert a block ${where} this one`} className="px-3 py-1.5 flex items-start gap-1">
          <span aria-hidden="true" className="text-text-muted mr-1 w-20">Insert {where}:</span>
          <div className="grid grid-cols-4 gap-1">
          {PATTERN_IDS.map((pid) => {
            const name = patterns.find((p) => p.id === pid)?.name ?? '?';
            const c = PATTERN_COLORS[pid];
            return (
              <button
                key={pid}
                onClick={() => handleInsert(pid, at, name)}
                className="w-6 h-6 rounded text-[11px] font-bold flex items-center justify-center cursor-pointer hover:opacity-80"
                style={{ backgroundColor: `${c}20`, color: patternTextColor(pid) }}
                aria-label={`Pattern ${name}`}
              >
                {name}
              </button>
            );
          })}
          </div>
        </div>
      ))}

      <div className="border-t border-border/50 my-0.5" />

      {/* Loop range (keyboard alternative to Shift+click) */}
      <button
        onClick={handleLoopFrom}
        className="w-full px-3 py-1.5 text-left text-text-secondary hover:bg-bg-cell transition-colors cursor-pointer"
      >
        Start loop here
      </button>
      <button
        onClick={handleLoopTo}
        className="w-full px-3 py-1.5 text-left text-text-secondary hover:bg-bg-cell transition-colors cursor-pointer"
      >
        End loop here
      </button>

      <div className="border-t border-border/50 my-0.5" />

      {/* Remove */}
      <button
        onClick={handleRemove}
        className="w-full px-3 py-1.5 text-left text-accent-red-fg hover:bg-accent-red/10 transition-colors cursor-pointer"
      >
        Remove
      </button>
    </div>
  );
}
