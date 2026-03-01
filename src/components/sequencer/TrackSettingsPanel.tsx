import type {
  DrumSynthParams, MembraneSynthParams, NoiseSynthParams, MetalSynthParams,
  MelodicSynthParams, SynthType,
} from '../../types';

// --- Shared slider component ---

interface ParamSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}

function ParamSlider({ label, value, min, max, step, onChange, format }: ParamSliderProps) {
  const display = format ? format(value) : value.toFixed(step < 0.01 ? 3 : step < 1 ? 2 : 0);
  return (
    <label className="flex items-center gap-2 text-xs text-text-secondary">
      <span className="w-16 shrink-0">{label}</span>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="flex-1 accent-accent-orange h-1"
      />
      <span className="w-12 text-right text-text-muted font-mono text-[10px]">{display}</span>
    </label>
  );
}

// --- Oscillator type selector ---

interface OscSelectProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}

function SelectControl({ label, value, onChange, options }: OscSelectProps) {
  return (
    <label className="flex items-center gap-2 text-xs text-text-secondary">
      <span className="w-16 shrink-0">{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="flex-1 bg-bg-cell border border-border rounded px-1.5 py-0.5 text-xs text-text-primary cursor-pointer"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

// --- Drum settings panels ---

function MembraneSettings({ params, onChange }: {
  params: MembraneSynthParams;
  onChange: (p: Partial<MembraneSynthParams>) => void;
}) {
  return (
    <>
      <ParamSlider label="Attack" value={params.attack} min={0.001} max={0.5} step={0.001} onChange={v => onChange({ attack: v })} />
      <ParamSlider label="Decay" value={params.decay} min={0.01} max={2} step={0.01} onChange={v => onChange({ decay: v })} />
      <ParamSlider label="Sustain" value={params.sustain} min={0} max={1} step={0.01} onChange={v => onChange({ sustain: v })} />
      <ParamSlider label="Release" value={params.release} min={0.01} max={2} step={0.01} onChange={v => onChange({ release: v })} />
      <ParamSlider label="Frequency" value={params.frequency} min={20} max={500} step={1} onChange={v => onChange({ frequency: v })} />
      <ParamSlider label="Pitch Dec." value={params.pitchDecay} min={0} max={0.5} step={0.001} onChange={v => onChange({ pitchDecay: v })} />
      <ParamSlider label="Octaves" value={params.octaves} min={0.5} max={10} step={0.5} onChange={v => onChange({ octaves: v })} />
      <SelectControl
        label="Wave"
        value={params.oscillatorType}
        onChange={v => onChange({ oscillatorType: v as MembraneSynthParams['oscillatorType'] })}
        options={[
          { value: 'sine', label: 'Sine' },
          { value: 'square', label: 'Square' },
          { value: 'triangle', label: 'Triangle' },
          { value: 'sawtooth', label: 'Sawtooth' },
        ]}
      />
    </>
  );
}

function NoiseSettings({ params, onChange }: {
  params: NoiseSynthParams;
  onChange: (p: Partial<NoiseSynthParams>) => void;
}) {
  return (
    <>
      <SelectControl
        label="Noise"
        value={params.noiseType}
        onChange={v => onChange({ noiseType: v as NoiseSynthParams['noiseType'] })}
        options={[
          { value: 'white', label: 'White' },
          { value: 'pink', label: 'Pink' },
          { value: 'brown', label: 'Brown' },
        ]}
      />
      <ParamSlider label="Attack" value={params.attack} min={0.001} max={0.5} step={0.001} onChange={v => onChange({ attack: v })} />
      <ParamSlider label="Decay" value={params.decay} min={0.01} max={2} step={0.01} onChange={v => onChange({ decay: v })} />
      <ParamSlider label="Sustain" value={params.sustain} min={0} max={1} step={0.01} onChange={v => onChange({ sustain: v })} />
      <ParamSlider label="Release" value={params.release} min={0.01} max={2} step={0.01} onChange={v => onChange({ release: v })} />
    </>
  );
}

function MetalSettings({ params, onChange }: {
  params: MetalSynthParams;
  onChange: (p: Partial<MetalSynthParams>) => void;
}) {
  return (
    <>
      <ParamSlider label="Attack" value={params.attack} min={0.001} max={0.5} step={0.001} onChange={v => onChange({ attack: v })} />
      <ParamSlider label="Decay" value={params.decay} min={0.01} max={4} step={0.01} onChange={v => onChange({ decay: v })} />
      <ParamSlider label="Release" value={params.release} min={0.01} max={2} step={0.01} onChange={v => onChange({ release: v })} />
      <ParamSlider label="Frequency" value={params.frequency} min={100} max={2000} step={1} onChange={v => onChange({ frequency: v })} />
      <ParamSlider label="Harmonic" value={params.harmonicity} min={0.1} max={20} step={0.1} onChange={v => onChange({ harmonicity: v })} />
      <ParamSlider label="Mod Index" value={params.modulationIndex} min={1} max={100} step={1} onChange={v => onChange({ modulationIndex: v })} />
      <ParamSlider label="Resonance" value={params.resonance} min={100} max={8000} step={100} onChange={v => onChange({ resonance: v })} />
      <ParamSlider label="Octaves" value={params.octaves} min={0.1} max={5} step={0.1} onChange={v => onChange({ octaves: v })} />
    </>
  );
}

// --- Drum settings entry point ---

interface DrumSettingsProps {
  synthParams: DrumSynthParams;
  volume: number;
  onChange: (params: Partial<DrumSynthParams>) => void;
  onVolumeChange: (db: number) => void;
  onReset: () => void;
  onClose: () => void;
}

export function DrumSettingsPanel({ synthParams, volume, onChange, onVolumeChange, onReset, onClose }: DrumSettingsProps) {
  return (
    <div className="absolute top-10 left-0 z-50 bg-bg-secondary border border-border rounded-lg p-3 shadow-xl w-72">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Sound Settings</span>
        <button
          onClick={onClose}
          className="text-text-muted hover:text-text-primary text-sm cursor-pointer leading-none"
        >
          ×
        </button>
      </div>
      <div className="flex flex-col gap-2">
        <ParamSlider label="Volume" value={volume} min={-36} max={6} step={1} onChange={onVolumeChange} format={v => `${v > 0 ? '+' : ''}${v} dB`} />
        <div className="border-t border-border/50 my-1" />
        {synthParams.synthKind === 'membrane' && (
          <MembraneSettings params={synthParams} onChange={onChange} />
        )}
        {synthParams.synthKind === 'noise' && (
          <NoiseSettings params={synthParams} onChange={onChange} />
        )}
        {synthParams.synthKind === 'metal' && (
          <MetalSettings params={synthParams} onChange={onChange} />
        )}
      </div>
      <button
        onClick={onReset}
        className="mt-3 text-[10px] text-text-muted hover:text-accent-orange cursor-pointer transition-colors uppercase tracking-wider"
      >
        Reset to default
      </button>
    </div>
  );
}

// --- Melodic settings entry point ---

const SYNTH_TYPE_OPTIONS: { value: SynthType; label: string }[] = [
  { value: 'synth', label: 'Basic Synth' },
  { value: 'fmSynth', label: 'FM Synth' },
  { value: 'amSynth', label: 'AM Synth' },
  { value: 'monoSynth', label: 'Mono Synth' },
];

interface MelodicSettingsProps {
  synthType: SynthType;
  synthParams: MelodicSynthParams;
  volume: number;
  onParamChange: (params: Partial<MelodicSynthParams>) => void;
  onVolumeChange: (db: number) => void;
  onSynthTypeChange: (synthType: SynthType) => void;
  onReset: () => void;
  onClose: () => void;
}

export function MelodicSettingsPanel({
  synthType, synthParams, volume, onParamChange, onVolumeChange, onSynthTypeChange, onReset, onClose,
}: MelodicSettingsProps) {
  return (
    <div className="absolute top-10 left-0 z-50 bg-bg-secondary border border-border rounded-lg p-3 shadow-xl w-72">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Sound Settings</span>
        <button
          onClick={onClose}
          className="text-text-muted hover:text-text-primary text-sm cursor-pointer leading-none"
        >
          ×
        </button>
      </div>
      <div className="flex flex-col gap-2">
        <ParamSlider label="Volume" value={volume} min={-36} max={6} step={1} onChange={onVolumeChange} format={v => `${v > 0 ? '+' : ''}${v} dB`} />
        <div className="border-t border-border/50 my-1" />
        <SelectControl
          label="Synth"
          value={synthType}
          onChange={v => onSynthTypeChange(v as SynthType)}
          options={SYNTH_TYPE_OPTIONS}
        />
        <div className="border-t border-border/50 my-1" />
        <SelectControl
          label="Wave"
          value={synthParams.oscillatorType}
          onChange={v => onParamChange({ oscillatorType: v as MelodicSynthParams['oscillatorType'] })}
          options={[
            { value: 'sine', label: 'Sine' },
            { value: 'square', label: 'Square' },
            { value: 'triangle', label: 'Triangle' },
            { value: 'sawtooth', label: 'Sawtooth' },
          ]}
        />
        <ParamSlider label="Attack" value={synthParams.attack} min={0.001} max={2} step={0.001} onChange={v => onParamChange({ attack: v })} />
        <ParamSlider label="Decay" value={synthParams.decay} min={0.01} max={2} step={0.01} onChange={v => onParamChange({ decay: v })} />
        <ParamSlider label="Sustain" value={synthParams.sustain} min={0} max={1} step={0.01} onChange={v => onParamChange({ sustain: v })} />
        <ParamSlider label="Release" value={synthParams.release} min={0.01} max={4} step={0.01} onChange={v => onParamChange({ release: v })} />
      </div>
      <button
        onClick={onReset}
        className="mt-3 text-[10px] text-text-muted hover:text-accent-orange cursor-pointer transition-colors uppercase tracking-wider"
      >
        Reset to default
      </button>
    </div>
  );
}
