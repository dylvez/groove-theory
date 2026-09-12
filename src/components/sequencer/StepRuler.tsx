import { useTransportStore } from '../../store/useTransportStore';
import { useUIStore } from '../../store/useUIStore';

interface StepRulerProps {
  numSteps: number;
  stepsPerMeasure: number;
  compact?: boolean;
}

/**
 * Beat/bar ruler that sits above the tracks and doubles as a playhead.
 * Its layout mirrors a track row (header width + resize handle + cells) so
 * the marks line up with the step cells beneath.
 */
export function StepRuler({ numSteps, stepsPerMeasure, compact = false }: StepRulerProps) {
  const trackHeaderWidth = useUIStore(s => s.trackHeaderWidth);
  const currentStep = useTransportStore(s => s.currentStep);
  const isPlaying = useTransportStore(s => s.state) === 'playing';
  const stepsPerBeat = compact ? 8 : 4;

  return (
    <div className="flex items-end gap-1 select-none">
      {/* Spacer: header width + gap + resize handle + gap */}
      <div className="shrink-0" style={{ width: trackHeaderWidth + 4 + 8 }} />
      <div className={`flex ${compact ? 'gap-0.5' : 'gap-1'}`}>
        {Array.from({ length: numSteps }, (_, i) => {
          const isBarStart = i % stepsPerMeasure === 0 && i > 0;
          const isBeatStart = i % stepsPerBeat === 0;
          const bar = Math.floor(i / stepsPerMeasure) + 1;
          const beat = Math.floor((i % stepsPerMeasure) / stepsPerBeat) + 1;
          const isCurrent = isPlaying && currentStep === i;
          return (
            <div
              key={i}
              className={`${compact ? 'w-4' : 'w-9'} h-4 flex items-end justify-center relative ${isBarStart ? 'ml-2' : ''}`}
            >
              {isBeatStart ? (
                <span className={`text-[10px] font-semibold leading-none ${
                  beat === 1 ? 'text-text-secondary' : 'text-text-muted'
                }`}>
                  {compact ? beat : (beat === 1 ? `${bar}.${beat}` : beat)}
                </span>
              ) : (
                <span className="w-px h-1.5 bg-border/60 mb-px" />
              )}
              <span
                className={`absolute -bottom-1 left-0 right-0 h-0.5 rounded-full transition-opacity duration-75 ${
                  isCurrent ? 'bg-accent-orange opacity-100' : 'opacity-0'
                }`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
