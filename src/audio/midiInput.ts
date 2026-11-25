import { create } from 'zustand';
import * as Tone from 'tone';
import { AudioEngine } from './AudioEngine';
import { useUIStore } from '../store/useUIStore';
import { useTheoryStore } from '../store/useTheoryStore';
import { liveNoteOff, liveNoteOn, releaseLive, snapToScale } from '../utils/liveInput';
import { midiToNote } from '../utils/melodicNotes';
import { announce } from '../utils/announce';

/**
 * A hardware MIDI keyboard, through the Web MIDI API (Chrome, Edge, Firefox;
 * not Safari). Notes go to the armed synth track the same way the computer
 * keyboard's do (utils/liveInput), with the keyboard's own velocity.
 *
 * The browser asks for permission the first time. Once given, the keyboard
 * reconnects on later visits without asking.
 */

export type MidiStatus = 'off' | 'connecting' | 'on' | 'unsupported' | 'denied' | 'error';

export interface MidiDevice { id: string; name: string }

interface MidiState {
  status: MidiStatus;
  devices: MidiDevice[];
  /** Last note received, to show the keyboard is getting through */
  lastNote: string | null;
  /** A note came in with no synth track armed */
  notArmed: boolean;
  /** A note came in before the page was allowed to make sound */
  soundBlocked: boolean;
}

export const useMidiStore = create<MidiState>(() => ({
  status: 'off',
  devices: [],
  lastNote: null,
  notArmed: false,
  soundBlocked: false,
}));

/** Lowest and highest notes the app can hold (C0 to B7) */
const LOW = 12;
const HIGH = 107;

let access: MIDIAccess | null = null;

function inputs(): MIDIInput[] {
  return access ? [...access.inputs.values()] : [];
}

function refreshDevices() {
  const list = inputs().filter(i => i.state === 'connected');
  for (const input of list) input.onmidimessage = onMessage;
  // A keyboard unplugged mid-note never sends its note off
  for (const input of inputs()) if (input.state !== 'connected') releaseLive(`midi:${input.id}:`);
  useMidiStore.setState({
    devices: list.map(i => ({ id: i.id, name: i.name || i.manufacturer || 'MIDI keyboard' })),
  });
}

function onMessage(e: MIDIMessageEvent) {
  const input = e.currentTarget as MIDIInput | null;
  const data = e.data;
  if (!input || !data || data.length < 2) return;
  const selected = useUIStore.getState().midiInputId;
  if (selected !== 'all' && selected !== input.id) return;

  const cmd = data[0] & 0xf0;
  const num = data[1];
  const vel = data[2] ?? 0;
  const source = `midi:${input.id}:${num}`;

  if (cmd === 0x90 && vel > 0) noteOn(source, num, vel);
  else if (cmd === 0x80 || cmd === 0x90) liveNoteOff(source);
  // All Notes Off / All Sound Off
  else if (cmd === 0xb0 && (num === 123 || num === 120)) releaseLive('midi:');
}

function noteOn(source: string, num: number, vel: number) {
  if (num < LOW || num > HIGH) return;
  let midi = num;
  if (useUIStore.getState().scaleLock) {
    const { rootNote, selectedScale } = useTheoryStore.getState();
    midi = snapToScale(num, rootNote, selectedScale);
  }
  const note = midiToNote(midi);
  const state = useMidiStore.getState();
  const running = Tone.getContext().state === 'running';
  const played = liveNoteOn(source, note, Math.max(0.05, vel / 127));

  // Say each problem once, not on every note
  if (!played && !state.notArmed) announce('Arm a synth track to play it from your MIDI keyboard.');
  else if (played && !running && !state.soundBlocked) announce('Click anywhere on the page once to turn the sound on.');
  useMidiStore.setState({ lastNote: note, notArmed: !played, soundBlocked: played && !running });
}

/**
 * Ask the browser for MIDI access and start listening. Called from the
 * Connect button (a click, so the browser can show its permission prompt)
 * or at start-up when permission was already given.
 */
export async function connectMidi(): Promise<MidiStatus> {
  const store = useMidiStore.getState();
  if (store.status === 'on' || store.status === 'connecting') return store.status;
  if (typeof navigator === 'undefined' || !('requestMIDIAccess' in navigator)) {
    useMidiStore.setState({ status: 'unsupported' });
    return 'unsupported';
  }
  useMidiStore.setState({ status: 'connecting' });
  try {
    access = await navigator.requestMIDIAccess();
  } catch (err) {
    const name = (err as DOMException)?.name;
    const status: MidiStatus = name === 'SecurityError' || name === 'NotAllowedError' ? 'denied' : 'error';
    useMidiStore.setState({ status });
    useUIStore.getState().setMidiEnabled(false);
    return status;
  }
  access.onstatechange = refreshDevices;
  refreshDevices();
  useMidiStore.setState({ status: 'on', notArmed: false });
  useUIStore.getState().setMidiEnabled(true);
  return 'on';
}

export function disconnectMidi() {
  for (const input of inputs()) input.onmidimessage = null;
  if (access) access.onstatechange = null;
  access = null;
  releaseLive('midi:');
  useMidiStore.setState({ status: 'off', devices: [], lastNote: null, notArmed: false, soundBlocked: false });
  useUIStore.getState().setMidiEnabled(false);
}

/**
 * At start-up: reconnect if the user turned MIDI on before and the browser
 * still allows it (no prompt). The page can't make sound until the user
 * clicks or presses a key, so the first one turns the sound on.
 */
export async function reconnectMidi() {
  if (!useUIStore.getState().midiEnabled || useMidiStore.getState().status !== 'off') return;
  try {
    const perm = await navigator.permissions.query({ name: 'midi' as PermissionName });
    if (perm.state !== 'granted') return;
  } catch {
    return; // The browser can't say, so wait for the user to press Connect
  }
  if ((await connectMidi()) !== 'on') return;
  const unlock = () => {
    AudioEngine.getInstance().init().then(() => useMidiStore.setState({ soundBlocked: false }));
    window.removeEventListener('pointerdown', unlock, true);
    window.removeEventListener('keydown', unlock, true);
  };
  window.addEventListener('pointerdown', unlock, true);
  window.addEventListener('keydown', unlock, true);
}
