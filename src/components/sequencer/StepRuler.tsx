import { useTransportStore } from '../../store/useTransportStore';
import { useUIStore } from '../../store/useUIStore';
import { useSongStore } from '../../store/useSongStore';

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
  const setTrackHeaderWidth = useUIStore(s => s.setTrackHeaderWidth);
  const currentStep = useTransportStore(s => s.currentStep);
  const songPlaying = useSongStore(s => s.songState) === 'playing';
  const isPlaying = useTransportStore(s => s.state) === 'playing' || songPlaying;
  const stepsPerBeat = compact ? 8 : 4;

  return (
    <div className="flex items-end gap-1 select-none">
      {/* Spacer: header width + gap + resize handle + gap. Its right edge holds
          the keyboard-operable version of the track-name column resize handle. */}
      <div className="shrink-0 sticky left-0 z-20 bg-bg-primary self-stretch" style={{ width: trackHeaderWidth + 4 + 8 }}>
        <div
          role="separator"
          tabIndex={0}
          aria-orientation="vertical"
          aria-label="Track name column width"
          aria-valuemin={120}
          aria-valuemax={300}
          aria-valuenow={trackHeaderWidth}
          title="Track name column width — use the left and right arrow keys"
          onKeyDown={(e) => {
            const delta = e.key === 'ArrowRight' ? 16 : e.key === 'ArrowLeft' ? -16 : 0;
            if (delta) { e.preventDefault(); setTrackHeaderWidth(trackHeaderWidth + delta); }
            if (e.key === 'Home') { e.preventDefault(); setTrackHeaderWidth(120); }
            if (e.key === 'End') { e.preventDefault(); setTrackHeaderWidth(300); }
          }}
          className="absolute right-1 top-0 bottom-0 w-2 rounded focus-visible:bg-accent-orange/40"
        />
      </div>
      <div aria-hidden="true" className={`flex ${compact ? 'gap-0.5' : 'gap-1'}`}>
        {Array.from({ length: numSteps }, (_, i) => {
          const isBarStart = i % stepsPerMeasure === 0 && i > 0;
          const isBeatStart = i % stepsPerBeat === 0;
          const bar = Math.floor(i / stepsPerMeasure) + 1;
          const beat = Math.floor((i % stepsPerMeasure) / stepsPerBeat) + 1;
          const isCurrent = isPlaying && currentStep === i;
          return (
            <div
              key={i}
              className={`${compact ? 'w-6' : 'w-9'} h-4 flex items-end justify-center relative ${isBarStart ? 'ml-2' : ''}`}
            >
              {isBeatStart ? (
                <span className={`font-mono text-[11px] font-bold leading-none ${
                  beat === 1 ? 'text-text-secondary' : 'text-text-muted'
                }`}>
                  {compact ? beat : (beat === 1 ? `${bar}.${beat}` : beat)}
                </span>
              ) : (
                <span className="w-px h-1.5 bg-border-soft mb-px" />
              )}
              <span
                className={`absolute -bottom-1 left-0 right-0 h-0.5 rounded-full transition-opacity duration-75 ${
                  isCurrent ? 'bg-white shadow-[0_0_8px_#fff] opacity-100' : 'opacity-0'
                }`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
