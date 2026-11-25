import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { usePopover } from '../../hooks/usePopover';
import { useUIStore } from '../../store/useUIStore';
import { useTheoryStore } from '../../store/useTheoryStore';
import { useSequencerStore } from '../../store/useSequencerStore';
import { connectMidi, disconnectMidi, useMidiStore } from '../../audio/midiInput';
import { AudioEngine } from '../../audio/AudioEngine';
import { HOME_ROW, scaleKeyNote } from '../../utils/liveInput';
import { announce } from '../../utils/announce';

/**
 * "LIVE" in the transport bar: scale lock, the computer keys' octave, and a
 * MIDI keyboard. All of them feed the armed synth track.
 */
export function LiveInputControl() {
  const [open, setOpen] = useState(false);
  const scaleLock = useUIStore(s => s.scaleLock);
  const midiStatus = useMidiStore(s => s.status);
  const close = useCallback(() => setOpen(false), []);

  const midiOn = midiStatus === 'on';
  const state = [scaleLock && 'scale lock on', midiOn && 'MIDI keyboard on'].filter(Boolean).join(', ');

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Live input: scale lock and MIDI keyboard"
        className={`flex items-center gap-1 px-2 py-1 min-h-7 rounded-md text-xs font-medium border cursor-pointer transition-colors ${
          open || scaleLock || midiOn
            ? 'bg-accent-red/15 text-accent-red-fg border-accent-red/40'
            : 'bg-bg-cell text-text-muted border-border-control hover:text-text-secondary'
        }`}
      >
        LIVE
        {scaleLock && (
          <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
            <path fillRule="evenodd" d="M8 1a3.5 3.5 0 0 0-3.5 3.5V7H4a1.5 1.5 0 0 0-1.5 1.5v5A1.5 1.5 0 0 0 4 15h8a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 12 7h-.5V4.5A3.5 3.5 0 0 0 8 1Zm2 6V4.5a2 2 0 1 0-4 0V7h4Z" clipRule="evenodd" />
          </svg>
        )}
        {midiOn && <span aria-hidden="true" className="text-[10px] font-bold">MIDI</span>}
        {state && <span className="sr-only">({state})</span>}
      </button>
      {open && <LiveInputPanel onClose={close} />}
    </div>
  );
}

function LiveInputPanel({ onClose }: { onClose: () => void }) {
  const ref = usePopover<HTMLDivElement>(onClose);
  const id = useId();
  const scaleLock = useUIStore(s => s.scaleLock);
  const setScaleLock = useUIStore(s => s.setScaleLock);
  const liveOctave = useUIStore(s => s.liveOctave);
  const setLiveOctave = useUIStore(s => s.setLiveOctave);
  const armedTrackId = useUIStore(s => s.armedTrackId);
  const rootNote = useTheoryStore(s => s.rootNote);
  const scale = useTheoryStore(s => s.selectedScale);
  const armedName = useSequencerStore(s => {
    const p = s.patterns.find(x => x.id === s.activePatternId);
    return p?.melodicTracks.find(t => t.id === armedTrackId)?.name ?? null;
  });
  const keyName = `${rootNote} ${scale.name}`;

  const toggleLock = () => {
    setScaleLock(!scaleLock);
    announce(scaleLock ? 'Scale lock off' : `Scale lock on: ${keyName}`);
  };

  return (
    <div
      ref={ref}
      role="dialog"
      aria-labelledby={`${id}-title`}
      className="absolute top-full left-0 mt-2 z-50 w-80 max-h-[80vh] overflow-y-auto bg-bg-secondary border border-border-control rounded-lg p-3 shadow-xl text-xs text-text-secondary"
    >
      <div className="flex items-center justify-between mb-2">
        <h3 id={`${id}-title`} className="text-xs font-bold uppercase tracking-wider">Live input</h3>
        <button onClick={onClose} aria-label="Close live input" className="w-6 h-6 flex items-center justify-center rounded text-text-muted hover:text-text-primary text-sm cursor-pointer leading-none">×</button>
      </div>

      <p className="mb-3">
        {armedName
          ? <>Plays into <strong className="text-text-primary">{armedName}</strong>. Press <strong>●</strong> (Record) to write what you play into the grid.</>
          : <span className="text-accent-amber-fg">No synth track is armed. Press ● on a synth track’s name row to play it live.</span>}
      </p>

      {/* Scale lock */}
      <section aria-labelledby={`${id}-lock`} className="border-t border-border/50 pt-2 mb-3">
        <div className="flex items-center justify-between gap-2">
          <h4 id={`${id}-lock`} className="text-[11px] uppercase tracking-widest text-text-muted">Scale lock</h4>
          <button
            role="switch"
            aria-checked={scaleLock}
            aria-labelledby={`${id}-lock`}
            onClick={toggleLock}
            className={`relative w-10 h-6 rounded-full border cursor-pointer transition-colors ${
              scaleLock ? 'bg-accent-red border-accent-red' : 'bg-bg-cell border-border-control'
            }`}
          >
            <span aria-hidden="true" className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${scaleLock ? 'left-5' : 'left-0.5'}`} />
          </button>
        </div>
        <p className="mt-1">
          Keeps what you play in <strong className="text-text-primary">{keyName}</strong>. Change the key in the Harmony tab.
        </p>
        <ul className="list-disc pl-4 mt-1 space-y-0.5">
          <li>Computer keys: the home row, <kbd>A</kbd> to <kbd>;</kbd>, plays the scale up from {rootNote}. The top row is silent.</li>
          <li>MIDI keyboard: a note outside the key plays the nearest one in it.</li>
        </ul>
        {scaleLock && (
          <div className="mt-2">
            <div id={`${id}-map`} className="text-[11px] text-text-muted mb-1">Home row now plays</div>
            <ul aria-labelledby={`${id}-map`} className="grid grid-cols-5 gap-1">
              {HOME_ROW.map(k => (
                <li key={k} className="flex flex-col items-center rounded bg-bg-cell border border-border-control py-0.5">
                  <span className="font-mono font-bold text-text-primary">{k.toUpperCase()}</span>
                  <span className="font-mono text-[11px]">{scaleKeyNote(k, rootNote, scale, liveOctave)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Octave */}
      <section aria-labelledby={`${id}-oct`} className="border-t border-border/50 pt-2 mb-3">
        <div className="flex items-center justify-between gap-2">
          <h4 id={`${id}-oct`} className="text-[11px] uppercase tracking-widest text-text-muted">Computer keys octave</h4>
          <div className="flex items-center gap-1">
            <button onClick={() => setLiveOctave(liveOctave - 1)} disabled={liveOctave <= 1} aria-label="Octave down" aria-keyshortcuts="Z" title="Octave down (Z)" className="w-6 h-6 rounded bg-bg-cell text-text-secondary hover:text-text-primary cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">−</button>
            <span className="font-mono w-8 text-center text-text-primary" aria-live="polite">C{liveOctave}</span>
            <button onClick={() => setLiveOctave(liveOctave + 1)} disabled={liveOctave >= 7} aria-label="Octave up" aria-keyshortcuts="X" title="Octave up (X)" className="w-6 h-6 rounded bg-bg-cell text-text-secondary hover:text-text-primary cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">+</button>
          </div>
        </div>
        <p className="mt-1">Or press <kbd>Z</kbd> and <kbd>X</kbd> while a track is armed.</p>
      </section>

      <MidiSection id={id} />
    </div>
  );
}

function MidiSection({ id }: { id: string }) {
  const status = useMidiStore(s => s.status);
  const devices = useMidiStore(s => s.devices);
  const lastNote = useMidiStore(s => s.lastNote);
  const notArmed = useMidiStore(s => s.notArmed);
  const soundBlocked = useMidiStore(s => s.soundBlocked);
  const inputId = useUIStore(s => s.midiInputId);
  const setInputId = useUIStore(s => s.setMidiInputId);

  // The button pressed is replaced by the new state's controls, so once the
  // status settles, put focus on the first of them rather than leave it on the page
  const sectionRef = useRef<HTMLElement>(null);
  const wantFocus = useRef(false);
  const refocus = () => { wantFocus.current = true; };
  useEffect(() => {
    if (!wantFocus.current || status === 'connecting') return;
    wantFocus.current = false;
    sectionRef.current?.querySelector<HTMLElement>('select, button:not([disabled])')?.focus();
  }, [status]);

  const connect = async () => {
    refocus();
    // This click is also what lets the page make sound
    AudioEngine.getInstance().init();
    const result = await connectMidi();
    announce(
      result === 'on' ? 'MIDI keyboard on'
      : result === 'denied' ? 'The browser blocked MIDI access'
      : result === 'unsupported' ? 'This browser can’t use MIDI keyboards'
      : 'Couldn’t connect to MIDI',
    );
  };
  const turnOff = () => { refocus(); disconnectMidi(); announce('MIDI keyboard off'); };

  const button = 'h-7 px-2.5 rounded-md text-xs font-semibold border cursor-pointer transition-colors';

  return (
    <section ref={sectionRef} aria-labelledby={`${id}-midi`} className="border-t border-border/50 pt-2">
      <h4 id={`${id}-midi`} className="text-[11px] uppercase tracking-widest text-text-muted mb-1">MIDI keyboard</h4>

      {status === 'on' ? (
        <div className="flex flex-col gap-2">
          {devices.length === 0 ? (
            <p>Connected, but no MIDI keyboard is plugged in. Plug one in and it shows up here.</p>
          ) : (
            <div className="flex items-center gap-2">
              <label htmlFor={`${id}-dev`} className="shrink-0">Listen to</label>
              <select
                id={`${id}-dev`}
                value={inputId}
                onChange={e => setInputId(e.target.value)}
                className="flex-1 min-w-0 h-7 px-1 bg-bg-cell border border-border-control rounded text-text-primary"
              >
                <option value="all">Every keyboard ({devices.length})</option>
                {devices.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                {inputId !== 'all' && !devices.some(d => d.id === inputId) && (
                  <option value={inputId}>Last keyboard used (unplugged)</option>
                )}
              </select>
            </div>
          )}
          {lastNote && <p>Last note: <span className="font-mono text-text-primary">{lastNote}</span></p>}
          {notArmed && <p className="text-accent-amber-fg">Notes are arriving, but no synth track is armed.</p>}
          {soundBlocked && <p className="text-accent-amber-fg">Click anywhere on the page once to turn the sound on.</p>}
          <div>
            <button onClick={turnOff} className={`${button} bg-bg-cell text-text-secondary border-border-control hover:text-text-primary`}>Turn off MIDI</button>
          </div>
        </div>
      ) : status === 'unsupported' ? (
        <p>This browser can’t use MIDI keyboards. Chrome, Edge and Firefox can.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {status === 'denied' && (
            <p className="text-accent-amber-fg">The browser blocked MIDI access. Allow MIDI for this site in the browser’s site settings, then press Connect again.</p>
          )}
          {status === 'error' && <p className="text-accent-amber-fg">Couldn’t connect to MIDI. Check the keyboard is plugged in, then try again.</p>}
          {status === 'off' && <p>Play a USB or Bluetooth MIDI keyboard. The browser asks for permission the first time.</p>}
          <div>
            <button
              onClick={connect}
              disabled={status === 'connecting'}
              className={`${button} bg-accent-red/15 text-accent-red-fg border-accent-red/40 hover:bg-accent-red/25 disabled:opacity-50 disabled:cursor-wait`}
            >
              {status === 'connecting' ? 'Connecting…' : 'Connect MIDI keyboard'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
