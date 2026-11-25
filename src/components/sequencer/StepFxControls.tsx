import { useId } from 'react';
import type { StepFx } from '../../types';
import { CHANCE_OPTIONS, REPEAT_OPTIONS, MAX_NUDGE, NUDGE_STEP, chanceLabel, cleanFx, nudgeLabel } from '../../utils/stepFx';

const CHOICE = 'h-6 min-w-6 px-1.5 rounded text-[11px] font-bold flex items-center justify-center cursor-pointer transition-colors border border-transparent';
const ON = 'bg-text-primary text-bg-primary shadow-[0_0_12px_rgb(255_255_255/0.2)]';
const OFF = 'bg-bg-cell text-text-muted hover:text-text-primary hover:bg-bg-cell-hover';

/**
 * Chance, repeats and timing for one step. Used by the drum step editor and
 * the synth note editor. `onChange` gets only the field that changed.
 */
export function StepFxControls({ fx, onChange }: { fx: StepFx | undefined; onChange: (fx: StepFx) => void }) {
  const id = useId();
  const f = cleanFx(fx);
  const chance = f?.chance ?? 1;
  const repeats = f?.repeats ?? 1;
  const nudge = f?.nudge ?? 0;

  return (
    <div className="flex flex-col gap-2">
      <div>
        <div id={`${id}-chance`} className="label-caps mb-1">Chance</div>
        <div role="group" aria-labelledby={`${id}-chance`} className="flex gap-1">
          {CHANCE_OPTIONS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => onChange({ chance: c })}
              aria-pressed={Math.abs(chance - c) < 0.005}
              title={c === 1 ? 'Always plays' : `Plays about ${chanceLabel(c)} of the time`}
              className={`${CHOICE} ${Math.abs(chance - c) < 0.005 ? ON : OFF}`}
            >
              {chanceLabel(c)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div id={`${id}-repeats`} className="label-caps mb-1">Repeats</div>
        <div role="group" aria-labelledby={`${id}-repeats`} className="flex gap-1">
          {REPEAT_OPTIONS.map(r => (
            <button
              key={r}
              type="button"
              onClick={() => onChange({ repeats: r })}
              aria-pressed={repeats === r}
              aria-label={r === 1 ? '1 hit' : `${r} hits`}
              title={r === 1 ? 'One hit' : `${r} quick hits inside the step`}
              className={`${CHOICE} ${repeats === r ? ON : OFF}`}
            >
              {r === 1 ? '1' : `×${r}`}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor={`${id}-nudge`} className="flex items-baseline justify-between label-caps mb-1">
          <span>Timing</span>
          <span aria-hidden="true" className="normal-case tracking-normal text-text-secondary">{nudgeLabel(nudge)}</span>
        </label>
        <div className="flex items-center gap-1.5">
          <span aria-hidden="true" className="text-[11px] text-text-muted">Early</span>
          <input
            id={`${id}-nudge`}
            type="range"
            min={-MAX_NUDGE}
            max={MAX_NUDGE}
            step={NUDGE_STEP}
            value={nudge}
            onChange={e => onChange({ nudge: parseFloat(e.target.value) })}
            onDoubleClick={() => onChange({ nudge: 0 })}
            aria-valuetext={nudgeLabel(nudge)}
            title="Shift the step a little early or late. Double-click to put it back on the grid."
            className="flex-1 h-6 accent-[#f4f4f8] cursor-pointer"
          />
          <span aria-hidden="true" className="text-[11px] text-text-muted">Late</span>
        </div>
        {nudge !== 0 && (
          <button
            type="button"
            onClick={() => onChange({ nudge: 0 })}
            className="mt-1 h-6 px-2 rounded text-[11px] text-text-secondary bg-bg-cell hover:bg-bg-cell-hover cursor-pointer"
          >
            Back on the grid
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Decorative marks drawn inside a step cell: stripes for a chance below 100%,
 * ticks along the top for repeats, and a small arrow for early / late. The
 * same facts are in the cell's label and tooltip.
 */
export function FxMarks({ fx }: { fx: StepFx | undefined }) {
  const f = cleanFx(fx);
  if (!f) return null;
  return (
    <span aria-hidden="true" className="absolute inset-0 pointer-events-none rounded-[inherit] overflow-hidden">
      {f.chance !== undefined && (
        <span
          className="absolute inset-0"
          style={{ backgroundImage: 'repeating-linear-gradient(135deg, transparent 0 3px, rgba(0,0,0,0.45) 3px 5px)' }}
        />
      )}
      {f.repeats !== undefined && (
        <span className="absolute top-[3px] inset-x-0 flex justify-center gap-[2px]">
          {Array.from({ length: f.repeats }, (_, k) => (
            <span key={k} className="w-[3px] h-[6px] rounded-full bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.6)]" />
          ))}
        </span>
      )}
      {f.nudge !== undefined && (
        <svg
          viewBox="0 0 8 8"
          className={`absolute bottom-[3px] w-2 h-2 ${f.nudge < 0 ? 'left-[3px]' : 'right-[3px]'}`}
          style={{ filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.9))' }}
        >
          <path d={f.nudge < 0 ? 'M6 0 L1 4 L6 8 Z' : 'M2 0 L7 4 L2 8 Z'} fill="white" />
        </svg>
      )}
    </span>
  );
}
