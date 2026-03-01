import { useState, useCallback } from 'react';
import { useSongStore, type SongBlock } from '../../store/useSongStore';
import { useSequencerStore } from '../../store/useSequencerStore';
import { useClickOutside } from '../../hooks/useClickOutside';
import { PATTERN_IDS, PATTERN_COLORS } from '../../constants/patterns';

interface ContextMenuProps {
  x: number;
  y: number;
  block: SongBlock;
  onClose: () => void;
}

export function SongBlockContextMenu({ x, y, block, onClose }: ContextMenuProps) {
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

  const ref = useClickOutside<HTMLDivElement>(onClose, true);

  // Keep menu on screen
  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    top: Math.min(y, window.innerHeight - 300),
    left: Math.min(x, window.innerWidth - 200),
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
    onClose();
  }, [removeBlock, block.id, onClose]);

  const patternName = patterns.find((p) => p.id === block.patternId)?.name ?? '?';
  const color = PATTERN_COLORS[block.patternId] ?? '#888';

  return (
    <div
      ref={ref}
      style={menuStyle}
      className="bg-bg-secondary border border-border rounded-lg shadow-xl py-1 min-w-[160px] text-xs"
    >
      {/* Header showing block info */}
      <div className="px-3 py-1.5 text-text-muted border-b border-border/50 flex items-center gap-2">
        <span className="font-bold" style={{ color }}>
          {patternName}
        </span>
        <span>×{block.repeats}</span>
      </div>

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
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRepeatsSubmit();
              if (e.key === 'Escape') setEditingRepeats(false);
            }}
            onBlur={handleRepeatsSubmit}
            className="w-12 px-1 py-0.5 bg-bg-primary border border-border rounded text-center text-xs text-text-primary focus:outline-none focus:border-accent-orange"
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
        <div className="px-3 py-1.5 flex items-center gap-1">
          <span className="text-text-muted mr-1">Replace:</span>
          {PATTERN_IDS.map((pid) => {
            const name = patterns.find((p) => p.id === pid)?.name ?? '?';
            const c = PATTERN_COLORS[pid];
            return (
              <button
                key={pid}
                onClick={() => handleReplace(pid)}
                className="w-6 h-6 rounded text-[10px] font-bold flex items-center justify-center cursor-pointer hover:opacity-80"
                style={{ backgroundColor: `${c}20`, color: c }}
              >
                {name}
              </button>
            );
          })}
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
            onChange={(e) => setLabelValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleLabelSubmit();
              if (e.key === 'Escape') setEditingLabel(false);
            }}
            onBlur={handleLabelSubmit}
            className="flex-1 px-1 py-0.5 bg-bg-primary border border-border rounded text-xs text-text-primary focus:outline-none focus:border-accent-orange"
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

      <div className="border-t border-border/50 my-0.5" />

      {/* Remove */}
      <button
        onClick={handleRemove}
        className="w-full px-3 py-1.5 text-left text-accent-red hover:bg-accent-red/10 transition-colors cursor-pointer"
      >
        Remove
      </button>
    </div>
  );
}
