import { useTransportStore } from '../../store/useTransportStore';

interface StepCellProps {
  active: boolean;
  stepIndex: number;
  color: string;
  onClick: () => void;
  stepsPerMeasure?: number;
}

export function StepCell({ active, stepIndex, color, onClick, stepsPerMeasure = 16 }: StepCellProps) {
  const currentStep = useTransportStore(s => s.currentStep);
  const isPlaying = useTransportStore(s => s.state) === 'playing';
  const isCurrent = isPlaying && currentStep === stepIndex;
  const isBeatStart = stepIndex % 4 === 0;
  const isBarStart = stepIndex % stepsPerMeasure === 0 && stepIndex > 0;

  return (
    <button
      onClick={onClick}
      className={`w-9 h-9 rounded-md border transition-all duration-75 cursor-pointer ${isBarStart ? 'ml-2' : ''} ${
        isCurrent
          ? 'ring-2 ring-white/60'
          : ''
      } ${
        active
          ? 'border-transparent shadow-inner'
          : isBeatStart
          ? 'bg-bg-cell-hover border-border/50 hover:border-border'
          : 'bg-bg-cell border-border/30 hover:border-border/60'
      }`}
      style={active ? { backgroundColor: color } : undefined}
    />
  );
}
