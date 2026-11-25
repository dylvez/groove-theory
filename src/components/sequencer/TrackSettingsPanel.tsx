import type {
  DrumSynthParams, MembraneSynthParams, NoiseSynthParams, MetalSynthParams,
  MelodicSynthParams, SynthType,
} from '../../types';
import { SYNTH_PRESETS } from '../../constants';
import { useState, useId } from 'react';
import { DEFAULT_FILTER_CUTOFF, DEFAULT_FILTER_Q } from '../../audio/SynthEngine';
import { usePopover } from '../../hooks/usePopover';

// --- Shared slider component ---

interface ParamSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  /** What screen readers hear, when the short display isn't clear spoken */
  spoken?: (v: number) => string;
  /** Use a logarithmic curve (for frequencies) */
  log?: boolean;
}

export function ParamSlider({ label, value, min, max, step, onChange, format, spoken, log }: ParamSliderProps) {
  const display = format ? format(value) : value.toFixed(step < 0.01 ? 3 : step < 1 ? 2 : 0);
  const toSlider = (v: number) => log ? (Math.log(v / min) / Math.log(max / min)) * 1000 : v;
  const fromSlider = (s: number) => log ? min * Math.pow(max / min, s / 1000) : s;
  return (
    <label className="flex items-center gap-2 text-xs text-text-secondary">
      <span className="w-16 shrink-0">{label}</span>
      <input
        type="range"
        min={log ? 0 : min} max={log ? 1000 : max} step={log ? 1 : step}
        value={toSlider(value)}
        onChange={e => onChange(fromSlider(parseFloat(e.target.value)))}
        aria-valuetext={spoken ? spoken(value) : display}
        className="flex-1 accent-[#f4f4f8] h-6 cursor-pointer"
      />
      <span aria-hidden="true" className="w-12 text-right text-text-muted font-mono text-[11px]">{display}</span>
    </label>
  );
}

/** Stereo position slider, −1 (left) to 1 (right) */
function PanSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <ParamSlider
      label="Pan"
      value={value}
      min={-1}
      max={1}
      step={0.05}
      onChange={v => onChange(Math.abs(v) < 0.025 ? 0 : v)}
      format={v => (v === 0 ? 'C' : `${v < 0 ? 'L' : 'R'}${Math.round(Math.abs(v) * 100)}`)}
      spoken={v => (v === 0 ? 'centre' : `${Math.round(Math.abs(v) * 100)}% ${v < 0 ? 'left' : 'right'}`)}
    />
  );
}

// --- Select control ---

interface SelectProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  accent?: boolean;
}

function SelectControl({ label, value, onChange, options, accent }: SelectProps) {
  return (
    <label className="flex items-center gap-2 text-xs text-text-secondary">
      <span className="w-16 shrink-0">{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`flex-1 bg-bg-cell border rounded px-1.5 py-1 text-xs cursor-pointer ${
          accent ? 'border-accent-purple text-accent-purple-fg font-medium' : 'border-border-control text-text-primary'
        }`}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h4 className="label-caps mt-1">{children}</h4>;
}

function formatHz(v: number) {
  return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`;
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

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
      <ParamSlider label="Frequency" value={params.frequency} min={20} max={800} step={1} log onChange={v => onChange({ frequency: Math.round(v) })} format={formatHz} />
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
      <ParamSlider label="Frequency" value={params.frequency} min={100} max={2000} step={1} log onChange={v => onChange({ frequency: Math.round(v) })} format={formatHz} />
      <ParamSlider label="Harmonic" value={params.harmonicity} min={0.1} max={20} step={0.1} onChange={v => onChange({ harmonicity: v })} />
      <ParamSlider label="Mod Index" value={params.modulationIndex} min={1} max={100} step={1} onChange={v => onChange({ modulationIndex: v })} />
      <ParamSlider label="Resonance" value={params.resonance} min={100} max={8000} step={100} log onChange={v => onChange({ resonance: Math.round(v / 100) * 100 })} format={formatHz} />
      <ParamSlider label="Octaves" value={params.octaves} min={0.1} max={5} step={0.1} onChange={v => onChange({ octaves: v })} />
    </>
  );
}

/** Track name field: commits on Enter or when focus leaves */
function NameField({ name, onRename }: { name: string; onRename: (n: string) => void }) {
  const [value, setValue] = useState(name);
  const id = useId();
  const commit = () => {
    const t = value.trim();
    if (t && t !== name) onRename(t);
    else setValue(name);
  };
  return (
    <div className="flex items-center gap-2 text-xs text-text-secondary">
      <label htmlFor={id} className="w-16 shrink-0">Name</label>
      <input
        id={id}
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); }}
        className="flex-1 min-w-0 bg-[#111118] border border-border-control rounded-md px-1.5 py-1 text-xs text-text-primary"
      />
    </div>
  );
}

function PanelFrame({ title, name, onRename, onClose, onAudition, onReset, children }: {
  title: string;
  name: string;
  onRename: (n: string) => void;
  onClose: () => void;
  onAudition?: () => void;
  onReset: () => void;
  children: React.ReactNode;
}) {
  const ref = usePopover<HTMLDivElement>(onClose);
  const headingId = useId();
  return (
    <div
      ref={ref}
      role="dialog"
      aria-labelledby={headingId}
      className="absolute top-10 left-0 z-50 bg-bg-secondary border border-border-soft rounded-xl p-3 shadow-2xl w-80 max-h-[min(70vh,34rem)] overflow-y-auto"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 id={headingId} className="label-caps !text-text-primary">{title}: {name}</h3>
        <div className="flex items-center gap-2">
          {onAudition && (
            <button
              onClick={onAudition}
              className="pill !min-h-7"
              title="Hear this sound"
            >
              <span aria-hidden="true">▶ </span>Hear
            </button>
          )}
          <button
            onClick={onClose}
            aria-label="Close sound settings"
            className="w-7 h-7 flex items-center justify-center rounded-full text-text-muted hover:text-text-primary hover:bg-bg-cell text-sm cursor-pointer leading-none"
          >
            ×
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <NameField name={name} onRename={onRename} />
        {children}
      </div>
      <button
        onClick={onReset}
        className="mt-3 self-start pill"
      >
        Reset sound to default
      </button>
    </div>
  );
}

// --- Drum settings entry point ---

interface DrumSettingsProps {
  name: string;
  onRename: (n: string) => void;
  synthParams: DrumSynthParams;
  volume: number;
  reverbSend: number;
  delaySend: number;
  pan: number;
  onChange: (params: Partial<DrumSynthParams>) => void;
  onVolumeChange: (db: number) => void;
  onSendsChange: (reverb: number, delay: number) => void;
  onPanChange: (pan: number) => void;
  onReset: () => void;
  onAudition?: () => void;
  onClose: () => void;
}

export function DrumSettingsPanel({
  name, onRename, synthParams, volume, reverbSend, delaySend, pan, onChange, onVolumeChange, onSendsChange, onPanChange, onReset, onAudition, onClose,
}: DrumSettingsProps) {
  return (
    <PanelFrame title="Drum sound" name={name} onRename={onRename} onClose={onClose} onAudition={onAudition} onReset={onReset}>
      <SectionLabel>Mix</SectionLabel>
      <ParamSlider label="Volume" value={volume} min={-36} max={6} step={1} onChange={onVolumeChange} format={v => `${v > 0 ? '+' : ''}${v} dB`} />
      <PanSlider value={pan} onChange={onPanChange} />
      <ParamSlider label="Reverb" value={reverbSend} min={0} max={1} step={0.01} onChange={v => onSendsChange(v, delaySend)} format={pct} />
      <ParamSlider label="Delay" value={delaySend} min={0} max={1} step={0.01} onChange={v => onSendsChange(reverbSend, v)} format={pct} />
      <div className="border-t border-border my-1" />
      <SectionLabel>Synthesis</SectionLabel>
      {synthParams.synthKind === 'membrane' && (
        <MembraneSettings params={synthParams} onChange={onChange} />
      )}
      {synthParams.synthKind === 'noise' && (
        <NoiseSettings params={synthParams} onChange={onChange} />
      )}
      {synthParams.synthKind === 'metal' && (
        <MetalSettings params={synthParams} onChange={onChange} />
      )}
    </PanelFrame>
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
  name: string;
  onRename: (n: string) => void;
  synthType: SynthType;
  synthParams: MelodicSynthParams;
  volume: number;
  octave: number;
  reverbSend: number;
  delaySend: number;
  pan: number;
  onParamChange: (params: Partial<MelodicSynthParams>) => void;
  onVolumeChange: (db: number) => void;
  onSendsChange: (reverb: number, delay: number) => void;
  onPanChange: (pan: number) => void;
  onSynthTypeChange: (synthType: SynthType) => void;
  onPresetChange: (presetId: string) => void;
  onOctaveChange: (octave: number) => void;
  onReset: () => void;
  onAudition?: () => void;
  onClose: () => void;
}

export function MelodicSettingsPanel({
  name, onRename, synthType, synthParams, volume, octave, reverbSend, delaySend, pan,
  onParamChange, onVolumeChange, onSendsChange, onPanChange, onSynthTypeChange, onPresetChange, onOctaveChange, onReset, onAudition, onClose,
}: MelodicSettingsProps) {
  return (
    <PanelFrame title="Synth sound" name={name} onRename={onRename} onClose={onClose} onAudition={onAudition} onReset={onReset}>
      <SelectControl
        label="Preset"
        value=""
        accent
        onChange={v => { if (v) onPresetChange(v); }}
        options={[
          { value: '', label: 'Load a preset…' },
          ...SYNTH_PRESETS.map(p => ({ value: p.id, label: `${p.name} — ${p.description}` })),
        ]}
      />
      <div className="border-t border-border my-1" />
      <SectionLabel>Mix</SectionLabel>
      <ParamSlider label="Volume" value={volume} min={-36} max={6} step={1} onChange={onVolumeChange} format={v => `${v > 0 ? '+' : ''}${v} dB`} />
      <PanSlider value={pan} onChange={onPanChange} />
      <ParamSlider label="Reverb" value={reverbSend} min={0} max={1} step={0.01} onChange={v => onSendsChange(v, delaySend)} format={pct} />
      <ParamSlider label="Delay" value={delaySend} min={0} max={1} step={0.01} onChange={v => onSendsChange(reverbSend, v)} format={pct} />
      <div className="border-t border-border my-1" />
      <SectionLabel>Voice</SectionLabel>
      <SelectControl
        label="Engine"
        value={synthType}
        onChange={v => onSynthTypeChange(v as SynthType)}
        options={SYNTH_TYPE_OPTIONS}
      />
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
      <div role="group" aria-label="Octave" className="flex items-center gap-2 text-xs text-text-secondary">
        <span aria-hidden="true" className="w-16 shrink-0">Octave</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5, 6].map(o => (
            <button
              key={o}
              onClick={() => onOctaveChange(o)}
              aria-pressed={octave === o}
              aria-label={`Octave ${o}`}
              className={`w-6 h-6 rounded text-[11px] font-bold flex items-center justify-center cursor-pointer transition-colors ${
                octave === o ? 'bg-text-primary text-bg-primary shadow-[0_0_12px_rgb(255_255_255/0.2)]' : 'bg-bg-cell text-text-muted hover:text-text-primary hover:bg-bg-cell-hover'
              }`}
            >
              {o}
            </button>
          ))}
        </div>
      </div>
      <SectionLabel>Envelope</SectionLabel>
      <ParamSlider label="Attack" value={synthParams.attack} min={0.001} max={2} step={0.001} onChange={v => onParamChange({ attack: v })} />
      <ParamSlider label="Decay" value={synthParams.decay} min={0.01} max={2} step={0.01} onChange={v => onParamChange({ decay: v })} />
      <ParamSlider label="Sustain" value={synthParams.sustain} min={0} max={1} step={0.01} onChange={v => onParamChange({ sustain: v })} />
      <ParamSlider label="Release" value={synthParams.release} min={0.01} max={4} step={0.01} onChange={v => onParamChange({ release: v })} />
      <SectionLabel>Filter</SectionLabel>
      <ParamSlider
        label="Cutoff"
        value={synthParams.filterCutoff ?? DEFAULT_FILTER_CUTOFF}
        min={80} max={DEFAULT_FILTER_CUTOFF} step={1} log
        onChange={v => onParamChange({ filterCutoff: Math.round(v) })}
        format={formatHz}
      />
      <ParamSlider
        label="Resonance"
        value={synthParams.filterResonance ?? DEFAULT_FILTER_Q}
        min={0.1} max={12} step={0.1}
        onChange={v => onParamChange({ filterResonance: v })}
      />
    </PanelFrame>
  );
}
