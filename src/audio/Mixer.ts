import * as Tone from 'tone';
import type { MixerSettings } from '../store/useMixerStore';
import { DEFAULT_MIXER } from '../store/useMixerStore';

/**
 * A per-track strip: volume → master, plus reverb and delay sends.
 * Every voice in the app (drum, synth, preview) plays through one of these.
 */
export interface Channel {
  /** Connect a source here */
  input: Tone.Volume;
  reverbSend: Tone.Gain;
  delaySend: Tone.Gain;
  setVolume(db: number): void;
  /** `immediate` sets the value without a ramp (safe inside audio callbacks) */
  setSends(reverb: number, delay: number, immediate?: boolean): void;
  dispose(): void;
}

/**
 * Master bus + effect return buses.
 *
 * Signal flow:
 *   channel.input ─┬─► master ─► compressor ─► limiter ─► destination
 *                  ├─► reverbSend ─► hpf ─► reverb ─► reverbReturn ─► master
 *                  └─► delaySend ─► delay ─► delayReturn ─► master
 *
 * Nodes are created against whatever Tone context is current, so a Mixer can
 * be built inside `Tone.Offline` for exports and produce identical sound.
 */
export class Mixer {
  readonly master: Tone.Gain;
  readonly compressor: Tone.Compressor;
  readonly limiter: Tone.Limiter;
  readonly meter: Tone.Meter;

  private reverbHpf: Tone.Filter;
  private reverb: Tone.Reverb;
  private reverbReturn: Tone.Gain;
  private delay: Tone.FeedbackDelay;
  private delayReturn: Tone.Gain;
  private settings: MixerSettings;
  private channels = new Set<Channel>();

  constructor(settings: MixerSettings = DEFAULT_MIXER) {
    this.settings = { ...settings };

    this.master = new Tone.Gain(Tone.dbToGain(settings.masterVolume));
    this.compressor = new Tone.Compressor({ threshold: -18, ratio: 3, attack: 0.01, release: 0.15, knee: 8 });
    this.limiter = new Tone.Limiter(-1);
    this.meter = new Tone.Meter({ smoothing: 0.8, normalRange: false });

    this.master.chain(this.compressor, this.limiter, Tone.getDestination());
    this.limiter.connect(this.meter);

    // Reverb return (send/return: fully wet, level via return gain)
    this.reverbHpf = new Tone.Filter({ type: 'highpass', frequency: 180, Q: 0.5 });
    this.reverb = new Tone.Reverb({ decay: settings.reverbDecay, preDelay: 0.02, wet: 1 });
    this.reverbReturn = new Tone.Gain(settings.reverbLevel);
    this.reverbHpf.chain(this.reverb, this.reverbReturn, this.master);

    // Delay return (tempo-synced)
    this.delay = new Tone.FeedbackDelay({ delayTime: settings.delayTime, feedback: settings.delayFeedback, wet: 1, maxDelay: 2 });
    this.delayReturn = new Tone.Gain(settings.delayLevel);
    this.delay.chain(this.delayReturn, this.master);

    this.applyCompressor(settings.compressor);
  }

  /** Resolves once the reverb impulse response has been generated. */
  get ready(): Promise<void> {
    return this.reverb.ready;
  }

  createChannel(volumeDb: number = -6, reverbSend: number = 0, delaySend: number = 0): Channel {
    const input = new Tone.Volume(volumeDb);
    const rSend = new Tone.Gain(reverbSend);
    const dSend = new Tone.Gain(delaySend);
    input.connect(this.master);
    input.connect(rSend);
    input.connect(dSend);
    rSend.connect(this.reverbHpf);
    dSend.connect(this.delay);

    const channel: Channel = {
      input,
      reverbSend: rSend,
      delaySend: dSend,
      setVolume: (db) => { input.volume.value = db; },
      setSends: (r, d, immediate = false) => {
        if (immediate) {
          rSend.gain.value = r;
          dSend.gain.value = d;
        } else {
          rSend.gain.rampTo(r, 0.02);
          dSend.gain.rampTo(d, 0.02);
        }
      },
      dispose: () => {
        input.dispose();
        rSend.dispose();
        dSend.dispose();
        this.channels.delete(channel);
      },
    };
    this.channels.add(channel);
    return channel;
  }

  /** Apply a (partial) settings update live. */
  apply(next: Partial<MixerSettings>) {
    const prev = this.settings;
    const s = { ...prev, ...next };
    this.settings = s;

    if (s.masterVolume !== prev.masterVolume) {
      this.master.gain.rampTo(Tone.dbToGain(s.masterVolume), 0.05);
    }
    if (s.reverbLevel !== prev.reverbLevel) {
      this.reverbReturn.gain.rampTo(s.reverbLevel, 0.05);
    }
    if (s.reverbDecay !== prev.reverbDecay) {
      // Regenerates the impulse response asynchronously
      this.reverb.decay = s.reverbDecay;
    }
    if (s.delayTime !== prev.delayTime) {
      this.delay.delayTime.value = Tone.Time(s.delayTime).toSeconds();
    }
    if (s.delayFeedback !== prev.delayFeedback) {
      this.delay.feedback.rampTo(s.delayFeedback, 0.05);
    }
    if (s.delayLevel !== prev.delayLevel) {
      this.delayReturn.gain.rampTo(s.delayLevel, 0.05);
    }
    if (s.compressor !== prev.compressor) {
      this.applyCompressor(s.compressor);
    }
  }

  /** Re-resolve tempo-synced delay time after a BPM change. */
  syncTempo() {
    this.delay.delayTime.value = Tone.Time(this.settings.delayTime).toSeconds();
  }

  private applyCompressor(enabled: boolean) {
    this.compressor.threshold.value = enabled ? -18 : 0;
    this.compressor.ratio.value = enabled ? 3 : 1;
  }

  /** Current master level in dB (−Infinity when silent). */
  getLevel(): number {
    const v = this.meter.getValue();
    return Array.isArray(v) ? Math.max(...v) : v;
  }

  dispose() {
    this.channels.forEach(c => c.dispose());
    this.channels.clear();
    this.master.dispose();
    this.compressor.dispose();
    this.limiter.dispose();
    this.meter.dispose();
    this.reverbHpf.dispose();
    this.reverb.dispose();
    this.reverbReturn.dispose();
    this.delay.dispose();
    this.delayReturn.dispose();
  }
}
