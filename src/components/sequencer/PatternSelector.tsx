import { useSequencerStore } from '../../store/useSequencerStore';

export function PatternSelector() {
  const patterns = useSequencerStore(s => s.patterns);
  const activePatternId = useSequencerStore(s => s.activePatternId);
  const setActivePattern = useSequencerStore(s => s.setActivePattern);
  const setMeasures = useSequencerStore(s => s.setMeasures);

  const activePattern = patterns.find(p => p.id === activePatternId) || patterns[0];
  const stepsPerMeasure = (() => {
    const beats = (activePattern?.timeSignature ?? '4/4') === '3/4' ? 3 : 4;
    const subs = (activePattern?.stepResolution ?? '16n') === '32n' ? 8 : 4;
    return beats * subs;
  })();
  const currentMeasures = Math.round((activePattern?.numSteps ?? 32) / stepsPerMeasure);

  return (
    <div className="flex items-center gap-3 shrink-0">
      <span className="text-xs text-text-secondary uppercase tracking-wider">Pattern</span>
      <div className="flex gap-1">
        {patterns.map(p => (
          <button
            key={p.id}
            onClick={() => setActivePattern(p.id)}
            className={`w-8 h-8 rounded-md text-sm font-bold flex items-center justify-center cursor-pointer transition-colors ${
              p.id === activePatternId
                ? 'bg-accent-orange text-white'
                : 'bg-bg-cell text-text-secondary hover:bg-bg-cell-hover'
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>
      {/* Separator */}
      <div className="w-px h-5 bg-border shrink-0" />

      {/* Measures toggle */}
      <span className="text-xs text-text-secondary uppercase tracking-wider">Bars</span>
      <div className="flex gap-1">
        {([2, 4] as const).map(m => (
          <button
            key={m}
            onClick={() => setMeasures(m)}
            className={`w-8 h-8 rounded-md text-sm font-bold flex items-center justify-center cursor-pointer transition-colors ${
              currentMeasures === m
                ? 'bg-accent-purple/25 text-accent-purple border border-accent-purple/40'
                : 'bg-bg-cell text-text-secondary hover:bg-bg-cell-hover border border-transparent'
            }`}
          >
            {m}
          </button>
        ))}
      </div>
    </div>
  );
}
