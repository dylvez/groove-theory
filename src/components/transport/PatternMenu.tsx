import { usePopover } from '../../hooks/usePopover';
import { useSequencerStore } from '../../store/useSequencerStore';
import { PATTERN_COLORS, patternTextColor } from '../../constants/patterns';
import { announce } from '../../utils/announce';

interface PatternMenuProps {
  onClose: () => void;
}

function Item({ onClick, children, shortcut, disabled }: {
  onClick: () => void;
  children: React.ReactNode;
  shortcut?: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center justify-between gap-4 px-3 py-1.5 text-xs text-left text-text-secondary hover:bg-bg-cell-hover hover:text-text-primary cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <span>{children}</span>
      {shortcut && <kbd aria-hidden="true" className="text-[11px] text-text-muted font-mono">{shortcut}</kbd>}
    </button>
  );
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = isMac ? '⌘' : 'Ctrl';

/** Actions on the whole active pattern. */
export function PatternMenu({ onClose }: PatternMenuProps) {
  const ref = usePopover<HTMLDivElement>(onClose);
  const patterns = useSequencerStore(s => s.patterns);
  const activePatternId = useSequencerStore(s => s.activePatternId);
  const copyPatternTo = useSequencerStore(s => s.copyPatternTo);
  const copyActivePattern = useSequencerStore(s => s.copyActivePattern);
  const pasteToActivePattern = useSequencerStore(s => s.pasteToActivePattern);
  const hasClipboard = useSequencerStore(s => s.hasClipboard);
  const shiftPattern = useSequencerStore(s => s.shiftPattern);
  const humanizePattern = useSequencerStore(s => s.humanizePattern);
  const fillAllDrums = useSequencerStore(s => s.fillAllDrums);
  const fillAllSynths = useSequencerStore(s => s.fillAllSynths);
  const clearActivePattern = useSequencerStore(s => s.clearActivePattern);

  const run = (fn: () => void) => () => { fn(); onClose(); };

  return (
    <div ref={ref} role="dialog" aria-label="Pattern actions" className="absolute top-full left-0 mt-1 z-50 bg-bg-secondary border border-border-control rounded-lg shadow-xl min-w-56 py-1">
      <h3 id="copy-to-slot" className="px-3 pt-1 pb-1 text-[11px] font-normal uppercase tracking-widest text-text-muted">Copy to slot</h3>
      <div role="group" aria-labelledby="copy-to-slot" className="grid grid-cols-4 gap-1 px-3 pb-2">
        {patterns.map(p => {
          const color = PATTERN_COLORS[p.id] ?? '#f97316';
          const isSelf = p.id === activePatternId;
          return (
            <button
              key={p.id}
              disabled={isSelf}
              onClick={run(() => copyPatternTo(p.id))}
              className="w-8 h-7 rounded-md text-xs font-bold cursor-pointer transition-opacity disabled:opacity-25 disabled:cursor-not-allowed hover:opacity-80"
              style={{ backgroundColor: `${color}30`, color: patternTextColor(p.id) }}
              aria-label={isSelf ? `Pattern ${p.name} (this pattern)` : `Copy this pattern into ${p.name}, replacing it`}
              title={isSelf ? 'This is the active pattern' : `Overwrite pattern ${p.name} with a copy of this one`}
            >
              {p.name}
            </button>
          );
        })}
      </div>
      <div className="border-t border-border/50" />
      <Item onClick={run(copyActivePattern)} shortcut={`${MOD}C`}>Copy pattern</Item>
      <Item onClick={run(pasteToActivePattern)} shortcut={`${MOD}V`} disabled={!hasClipboard}>Paste pattern</Item>
      <div className="border-t border-border/50" />
      <Item onClick={() => { shiftPattern(-1); announce('Shifted left one step'); }} shortcut="[">Shift left one step</Item>
      <Item onClick={() => { shiftPattern(1); announce('Shifted right one step'); }} shortcut="]">Shift right one step</Item>
      <Item onClick={run(() => humanizePattern())}>Humanize velocities</Item>
      <Item onClick={run(() => { fillAllDrums(); fillAllSynths(); })}>Fill empty bars</Item>
      <div className="border-t border-border/50" />
      <Item onClick={run(clearActivePattern)}>Clear pattern</Item>
    </div>
  );
}
