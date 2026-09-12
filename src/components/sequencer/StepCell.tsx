import { useTransportStore } from '../../store/useTransportStore';
import { velocityAlpha } from '../../utils/stepDisplay';

interface StepCellProps {
  /** 0 = off, otherwise velocity 0–1 */
  velocity: number;
  stepIndex: number;
  color: string;
  stepsPerMeasure?: number;
  compact?: boolean;
  /** Mouse down: begin a click or a drag-paint gesture */
  onPointerDown: (stepIndex: number, e: React.MouseEvent) => void;
  /** Mouse enters while painting */
  onPointerEnter: (stepIndex: number, e: React.MouseEvent) => void;
}

export function StepCell({
  velocity, stepIndex, color, stepsPerMeasure = 16, compact = false, onPointerDown, onPointerEnter,
}: StepCellProps) {
  const currentStep = useTransportStore(s => s.currentStep);
  const isPlaying = useTransportStore(s => s.state) === 'playing';
  const isCurrent = isPlaying && currentStep === stepIndex;
  const stepsPerBeat = compact ? 8 : 4;
  const isBeatStart = stepIndex % stepsPerBeat === 0;
  const isBarStart = stepIndex % stepsPerMeasure === 0 && stepIndex > 0;
  const active = velocity > 0;

  return (
    <button
      onMouseDown={(e) => onPointerDown(stepIndex, e)}
      onMouseEnter={(e) => onPointerEnter(stepIndex, e)}
      onContextMenu={(e) => e.preventDefault()}
      title={active ? `Velocity ${Math.round(velocity * 100)}% — shift+click to change` : 'Click or drag to add hits'}
      className={`${compact ? 'w-4 h-8' : 'w-9 h-9'} rounded-md border transition-all duration-75 cursor-pointer select-none relative ${isBarStart ? 'ml-2' : ''} ${
        isCurrent ? 'ring-2 ring-white/70' : ''
      } ${
        active
          ? 'border-transparent shadow-inner'
          : isBeatStart
          ? 'bg-bg-cell-hover border-border/50 hover:border-border'
          : 'bg-bg-cell border-border/30 hover:border-border/60'
      } ${isCurrent && active ? 'brightness-125' : ''}`}
      style={active ? { backgroundColor: `${color}${velocityAlpha(velocity)}` } : undefined}
    >
      {active && velocity < 0.5 && !compact && (
        <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white/70">·</span>
      )}
    </button>
  );
}
