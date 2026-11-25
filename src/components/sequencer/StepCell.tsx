import { useTransportStore } from '../../store/useTransportStore';
import { useGridFocusStore, stepPosition, velocityName } from '../../store/useGridFocusStore';
import { velocityAlpha } from '../../utils/stepDisplay';

interface StepCellProps {
  /** 0 = off, otherwise velocity 0–1 */
  velocity: number;
  stepIndex: number;
  color: string;
  trackId: string;
  trackName: string;
  stepsPerMeasure?: number;
  compact?: boolean;
  /** Mouse down: begin a click or a drag-paint gesture */
  onPointerDown: (stepIndex: number, e: React.MouseEvent) => void;
  /** Mouse enters while painting */
  onPointerEnter: (stepIndex: number, e: React.MouseEvent) => void;
  /** Keyboard / assistive-tech activation (Enter, or a screen reader "click") */
  onActivate: (stepIndex: number, shift: boolean) => void;
}

export function StepCell({
  velocity, stepIndex, color, trackId, trackName, stepsPerMeasure = 16, compact = false,
  onPointerDown, onPointerEnter, onActivate,
}: StepCellProps) {
  const currentStep = useTransportStore(s => s.currentStep);
  const isPlaying = useTransportStore(s => s.state) === 'playing';
  const isTabStop = useGridFocusStore(s => s.trackId === trackId && s.step === stepIndex);
  const isCurrent = isPlaying && currentStep === stepIndex;
  const stepsPerBeat = compact ? 8 : 4;
  const isBeatStart = stepIndex % stepsPerBeat === 0;
  const isBarStart = stepIndex % stepsPerMeasure === 0 && stepIndex > 0;
  const active = velocity > 0;
  const position = stepPosition(stepIndex, stepsPerMeasure, stepsPerBeat);

  return (
    <button
      type="button"
      data-cell="drum"
      data-track={trackId}
      data-step={stepIndex}
      tabIndex={isTabStop ? 0 : -1}
      aria-pressed={active}
      aria-label={`${trackName} ${position}${active ? `, ${velocityName(velocity)}` : ''}`}
      onMouseDown={(e) => onPointerDown(stepIndex, e)}
      onMouseEnter={(e) => onPointerEnter(stepIndex, e)}
      onClick={(e) => { if (e.detail === 0) onActivate(stepIndex, e.shiftKey); }}
      onContextMenu={(e) => e.preventDefault()}
      title={active ? `Velocity ${Math.round(velocity * 100)}% — shift+click to change` : 'Click or drag to add hits'}
      className={`${compact ? 'w-4 h-8' : 'w-9 h-9'} rounded-md border transition-all duration-75 cursor-pointer select-none relative ${isBarStart ? 'ml-2' : ''} ${
        isCurrent ? 'ring-2 ring-white/70' : ''
      } ${
        active
          ? 'step-active border-transparent shadow-inner'
          : isBeatStart
          ? 'bg-bg-cell-hover border-border-cell hover:border-border-control'
          : 'bg-bg-cell border-border-cell hover:border-border-control'
      } ${isCurrent && active ? 'brightness-125' : ''}`}
      style={active ? { backgroundColor: `${color}${velocityAlpha(velocity)}` } : undefined}
    >
      {active && velocity < 0.5 && !compact && (
        <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white/80">·</span>
      )}
    </button>
  );
}
