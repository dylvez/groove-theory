import { useEffect, useRef } from 'react';
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
  const ref = useRef<HTMLDivElement>(null);
  const m = useMixerStore();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const pct = (v: number) => `${Math.round(v * 100)}%`;

  return (
    <div
      ref={ref}
      className="absolute top-full right-0 mt-2 z-50 bg-bg-secondary border border-border rounded-lg p-3 shadow-xl w-80"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Mixer & Effects</span>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary text-sm cursor-pointer leading-none">×</button>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="text-[9px] uppercase tracking-widest text-text-muted/70">Master</div>
        <ParamSlider label="Volume" value={m.masterVolume} min={-24} max={6} step={0.5} onChange={v => m.setMixer({ masterVolume: v })} format={v => `${v > 0 ? '+' : ''}${v.toFixed(1)} dB`} />
        <label className="flex items-center gap-2 text-xs text-text-secondary">
          <span className="w-16 shrink-0">Glue</span>
          <button
            onClick={() => m.setMixer({ compressor: !m.compressor })}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold border cursor-pointer transition-colors ${
              m.compressor
                ? 'bg-accent-green/20 text-accent-green border-accent-green/40'
                : 'bg-bg-cell text-text-muted border-border'
            }`}
          >
            {m.compressor ? 'Compressor ON' : 'Compressor OFF'}
          </button>
          <span className="text-[10px] text-text-muted">bus compression</span>
        </label>

        <div className="border-t border-border/50 my-1" />
        <div className="text-[9px] uppercase tracking-widest text-text-muted/70">Reverb bus</div>
        <ParamSlider label="Size" value={m.reverbDecay} min={0.3} max={8} step={0.1} onChange={v => m.setMixer({ reverbDecay: v })} format={v => `${v.toFixed(1)} s`} />
        <ParamSlider label="Return" value={m.reverbLevel} min={0} max={1.5} step={0.01} onChange={v => m.setMixer({ reverbLevel: v })} format={pct} />

        <div className="border-t border-border/50 my-1" />
        <div className="text-[9px] uppercase tracking-widest text-text-muted/70">Delay bus</div>
        <label className="flex items-center gap-2 text-xs text-text-secondary">
          <span className="w-16 shrink-0">Time</span>
          <div className="flex gap-1">
            {DELAY_OPTIONS.map(o => (
              <button
                key={o.value}
                onClick={() => m.setMixer({ delayTime: o.value })}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer transition-colors ${
                  m.delayTime === o.value ? 'bg-accent-cyan text-white' : 'bg-bg-cell text-text-muted hover:text-text-primary'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </label>
        <ParamSlider label="Feedback" value={m.delayFeedback} min={0} max={0.9} step={0.01} onChange={v => m.setMixer({ delayFeedback: v })} format={pct} />
        <ParamSlider label="Return" value={m.delayLevel} min={0} max={1.5} step={0.01} onChange={v => m.setMixer({ delayLevel: v })} format={pct} />
      </div>

      <div className="flex items-center justify-between mt-3">
        <span className="text-[10px] text-text-muted">Per-track send amounts live in each track's ⚙ panel.</span>
        <button
          onClick={m.resetMixer}
          className="text-[10px] text-text-muted hover:text-accent-orange cursor-pointer transition-colors uppercase tracking-wider"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
