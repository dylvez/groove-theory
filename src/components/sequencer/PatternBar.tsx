import { useCallback, useState } from 'react';
import { useSequencerStore } from '../../store/useSequencerStore';
import type { StepResolution, TimeSignature } from '../../types';
import { PATTERN_BAR_OPTIONS, PATTERN_COLORS } from '../../constants/patterns';
import { getStepsPerMeasure } from '../../utils/patternHelpers';
import { PatternMenu } from '../transport/PatternMenu';

/**
 * The active pattern's own settings, above the grid: its length in bars,
 * time signature, step size, and the pattern menu (copy, shift, humanize…).
 */
export function PatternBar() {
  const patterns = useSequencerStore(s => s.patterns);
  const activePatternId = useSequencerStore(s => s.activePatternId);
  const setMeasures = useSequencerStore(s => s.setMeasures);
  const setTimeSignature = useSequencerStore(s => s.setTimeSignature);
  const setStepResolution = useSequencerStore(s => s.setStepResolution);
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const pattern = patterns.find(p => p.id === activePatternId) || patterns[0];
  const color = PATTERN_COLORS[pattern.id] ?? '#f97316';
  const ts = pattern.timeSignature ?? '4/4';
  const res = pattern.stepResolution ?? '16n';
  const measures = Math.round(pattern.numSteps / getStepsPerMeasure(ts, res));

  return (
    // Sticky makes this its own stacking layer, so while the menu is open the
    // bar is raised to the top, or the menu would sit under the grid rows
    <div className={`sticky left-0 ${menuOpen ? 'z-50' : ''} flex flex-wrap items-center gap-x-3 gap-y-2 px-6 pt-3 pb-1`}>
      <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }} />
      <p className="font-display text-base font-bold tracking-tight text-text-primary">Pattern {pattern.name}</p>

      <div role="group" aria-label="Pattern length in bars" className="seg ml-2">
        {PATTERN_BAR_OPTIONS.map(m => (
          <button
            key={m}
            onClick={() => setMeasures(m)}
            aria-pressed={measures === m}
            aria-label={`${m} bar${m > 1 ? 's' : ''}`}
            title={`${m} bar${m > 1 ? 's' : ''}`}
            className="seg-item font-mono"
          >
            {m}
          </button>
        ))}
      </div>
      <span aria-hidden="true" className="text-xs text-text-muted">bars</span>

      <button
        onClick={() => setTimeSignature((ts === '4/4' ? '3/4' : '4/4') as TimeSignature)}
        aria-label={`Time signature ${ts}. Switch to ${ts === '4/4' ? '3/4' : '4/4'}`}
        title="Switch between 4/4 and 3/4"
        className="pill !rounded-md font-mono font-semibold"
      >
        {ts}
      </button>
      <button
        onClick={() => setStepResolution((res === '16n' ? '32n' : '16n') as StepResolution)}
        aria-label={`Step size ${res === '32n' ? '1/32' : '1/16'} notes. Switch to ${res === '32n' ? '1/16' : '1/32'}`}
        title="Switch between 16th and 32nd-note steps"
        className="pill !rounded-md font-mono font-semibold"
      >
        {res === '32n' ? '1/32' : '1/16'}
      </button>

      <div className="relative">
        <button
          onClick={() => setMenuOpen(v => !v)}
          aria-label="Pattern actions"
          aria-expanded={menuOpen}
          aria-haspopup="dialog"
          title="Pattern actions: copy, shift, humanize, clear"
          className={`pill !rounded-md !px-2.5 ${menuOpen ? '!border-text-primary !bg-[#2a2a3a] !text-white' : ''}`}
        >
          <svg aria-hidden="true" width="14" height="4" viewBox="0 0 14 4"><circle cx="2" cy="2" r="1.5" fill="currentColor" /><circle cx="7" cy="2" r="1.5" fill="currentColor" /><circle cx="12" cy="2" r="1.5" fill="currentColor" /></svg>
        </button>
        {menuOpen && <PatternMenu onClose={closeMenu} />}
      </div>
    </div>
  );
}
