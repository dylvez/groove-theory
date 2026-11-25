import { usePopover } from '../../hooks/usePopover';
import { useMixerStore, type DelayTime } from '../../store/useMixerStore';
import { ParamSlider } from '../sequencer/TrackSettingsPanel';

const DELAY_OPTIONS: { value: DelayTime; label: string }[] = [
  { value: '16n', label: '1/16' },
  { value: '8n', label: '1/8' },
  { value: '8n.', label: '1/8 dotted' },
  { value: '4n', label: '1/4' },
];

interface MixerPanelProps {
  onClose: () => void;
}

/**
 * Global effects & master bus controls. Every track's reverb/delay sends feed
 * these buses, so this is where the "space" of the whole groove is shaped.
 */
export function MixerPanel({ onClose }: MixerPanelProps) {
  const ref = usePopover<HTMLDivElement>(onClose);
  const m = useMixerStore();

  const pct = (v: number) => `${Math.round(v * 100)}%`;

  return (
    <div
      ref={ref}
      role="dialog"
      aria-labelledby="mixer-heading"
      className="absolute top-full right-0 mt-2 z-50 bg-bg-secondary border border-border-control rounded-lg p-3 shadow-xl w-80"
    >
      <div className="flex items-center justify-between mb-2">
        <h3 id="mixer-heading" className="text-xs font-bold text-text-secondary uppercase tracking-wider">Mixer & Effects</h3>
        <button onClick={onClose} aria-label="Close mixer" className="w-6 h-6 flex items-center justify-center rounded text-text-muted hover:text-text-primary text-sm cursor-pointer leading-none">×</button>
      </div>

      <div className="flex flex-col gap-1.5">
        <h4 className="text-[11px] font-normal uppercase tracking-widest text-text-muted">Master</h4>
        <ParamSlider label="Volume" value={m.masterVolume} min={-24} max={6} step={0.5} onChange={v => m.setMixer({ masterVolume: v })} format={v => `${v > 0 ? '+' : ''}${v.toFixed(1)} dB`} />
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <span aria-hidden="true" className="w-16 shrink-0">Glue</span>
          <button
            onClick={() => m.setMixer({ compressor: !m.compressor })}
            aria-pressed={m.compressor}
            aria-label="Glue: bus compressor"
            className={`px-2 py-1 rounded text-[11px] font-semibold border cursor-pointer transition-colors ${
              m.compressor
                ? 'bg-accent-green/20 text-accent-green-fg border-accent-green/40'
                : 'bg-bg-cell text-text-muted border-border-control'
            }`}
          >
            {m.compressor ? 'Compressor ON' : 'Compressor OFF'}
          </button>
          <span aria-hidden="true" className="text-[11px] text-text-muted">bus compression</span>
        </div>

        <div className="border-t border-border/50 my-1" />
        <h4 className="text-[11px] font-normal uppercase tracking-widest text-text-muted">Reverb bus</h4>
        <ParamSlider label="Size" value={m.reverbDecay} min={0.3} max={8} step={0.1} onChange={v => m.setMixer({ reverbDecay: v })} format={v => `${v.toFixed(1)} s`} />
        <ParamSlider label="Return" value={m.reverbLevel} min={0} max={1.5} step={0.01} onChange={v => m.setMixer({ reverbLevel: v })} format={pct} />

        <div className="border-t border-border/50 my-1" />
        <h4 className="text-[11px] font-normal uppercase tracking-widest text-text-muted">Delay bus</h4>
        <div role="group" aria-label="Delay time" className="flex items-center gap-2 text-xs text-text-secondary">
          <span aria-hidden="true" className="w-16 shrink-0">Time</span>
          <div className="flex gap-1">
            {DELAY_OPTIONS.map(o => (
              <button
                key={o.value}
                onClick={() => m.setMixer({ delayTime: o.value })}
                aria-pressed={m.delayTime === o.value}
                className={`px-2 py-1 rounded text-[11px] font-semibold cursor-pointer transition-colors ${
                  m.delayTime === o.value ? 'bg-accent-cyan text-on-accent' : 'bg-bg-cell text-text-muted hover:text-text-primary'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <ParamSlider label="Feedback" value={m.delayFeedback} min={0} max={0.9} step={0.01} onChange={v => m.setMixer({ delayFeedback: v })} format={pct} />
        <ParamSlider label="Return" value={m.delayLevel} min={0} max={1.5} step={0.01} onChange={v => m.setMixer({ delayLevel: v })} format={pct} />
      </div>

      <div className="flex items-center justify-between mt-3">
        <span className="text-[11px] text-text-muted">Per-track send amounts live in each track's ⚙ panel.</span>
        <button
          onClick={m.resetMixer}
          aria-label="Reset mixer to defaults"
          className="px-1 py-1 text-[11px] text-text-muted hover:text-accent-orange-fg cursor-pointer transition-colors uppercase tracking-wider"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
