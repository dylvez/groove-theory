import MidiWriter from 'midi-writer-js';
import type { Pattern } from '../types';
import { stepNotes } from './melodicNotes';
import type { SongBlock } from '../store/useSongStore';
import { showAlert } from './dialogs';

/**
 * General MIDI percussion mapping (channel 10).
 * Maps our internal drum key names to standard GM drum note numbers.
 */
const DRUM_MIDI_MAP: Record<string, number> = {
  'kick':         36, // Bass Drum 1
  'snare':        38, // Acoustic Snare
  'hihat-closed': 42, // Closed Hi-Hat
  'hihat-open':   46, // Open Hi-Hat
  'clap':         39, // Hand Clap
  'tom-low':      45, // Low Tom
  'tom-mid':      47, // Mid Tom
  'tom-high':     50, // High Tom
  'crash':        49, // Crash Cymbal 1
  'ride':         51, // Ride Cymbal 1
};

/** midi-writer-js default PPQ */
const PPQ = 128;

/** Ticks per sequencer step for a pattern's resolution */
function ticksPerStep(pattern: Pattern): number {
  return pattern.stepResolution === '32n' ? PPQ / 8 : PPQ / 4;
}

function midiVelocity(v: number): number {
  return Math.max(1, Math.min(100, Math.round(v * 100)));
}

type MidiTrack = InstanceType<typeof MidiWriter.Track>;

function newTrack(name: string, bpm: number, timeSignature: string): MidiTrack {
  const t = new MidiWriter.Track();
  t.setTempo(bpm);
  t.addTrackName(name);
  const [num, den] = timeSignature.split('/').map(Number);
  t.setTimeSignature(num, den, 24, 8);
  return t;
}

/**
 * midi-writer-js reads the start as `startTick || tick || null`, so a note at
 * tick 0 counts as "no explicit time" and gets queued after the previous note.
 * That pushed every chord note but one (and every drum hit but one) off the
 * downbeat. A Number object is truthy but still does arithmetic as 0.
 */
function atTick(tick: number): number {
  return tick === 0 ? (new Number(0) as unknown as number) : tick;
}

/**
 * Add one pattern pass to the given tracks starting at `startTick`.
 * Events use absolute `startTick`s so overlapping / long notes are preserved.
 * Returns the number of ticks the pattern occupies.
 */
function addPatternEvents(
  pattern: Pattern,
  startTick: number,
  drumTrack: MidiTrack,
  melodicTracks: Map<string, MidiTrack>,
  getMelodicTrack: (name: string) => MidiTrack,
  counters: { drum: number; melodic: number },
): number {
  const tps = ticksPerStep(pattern);
  const drumHasSolo = pattern.drumTracks.some(t => t.solo);
  const melodicHasSolo = pattern.melodicTracks.some(t => t.solo);

  for (const dt of pattern.drumTracks) {
    if (dt.muted || (drumHasSolo && !dt.solo)) continue;
    const midiNote = DRUM_MIDI_MAP[dt.sampleKey];
    if (midiNote === undefined) continue;
    for (let step = 0; step < pattern.numSteps; step++) {
      const vel = dt.steps[step];
      if (!vel) continue;
      drumTrack.addEvent(new MidiWriter.NoteEvent({
        pitch: [midiNote],
        duration: `T${tps}`,
        velocity: midiVelocity(vel),
        channel: 10,
        startTick: atTick(startTick + step * tps),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any));
      counters.drum++;
    }
  }

  for (const mTrack of pattern.melodicTracks) {
    if (mTrack.muted || (melodicHasSolo && !mTrack.solo)) continue;
    let track: MidiTrack | null = null;
    for (let step = 0; step < pattern.numSteps; step++) {
      const notes = stepNotes(mTrack.steps[step]);
      if (notes.length === 0) continue;
      if (!track) track = melodicTracks.get(mTrack.name) ?? getMelodicTrack(mTrack.name);
      // One event per note so each keeps its own length and velocity
      for (const n of notes) {
        track.addEvent(new MidiWriter.NoteEvent({
          pitch: [n.note],
          duration: `T${Math.max(1, n.length) * tps}`,
          velocity: midiVelocity(n.velocity),
          startTick: atTick(startTick + step * tps),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any));
        counters.melodic++;
      }
    }
  }

  return pattern.numSteps * tps;
}

function buildAndDownload(
  sequence: { pattern: Pattern; repeats: number }[],
  bpm: number,
  filename: string,
): void {
  if (sequence.length === 0) {
    void showAlert('Nothing to export', 'The song has no pattern blocks yet.');
    return;
  }
  const timeSignature = sequence[0].pattern.timeSignature;
  const drumTrack = newTrack('Drums', bpm, timeSignature);
  const melodicTracks = new Map<string, MidiTrack>();
  const getMelodicTrack = (name: string) => {
    const t = newTrack(name, bpm, timeSignature);
    melodicTracks.set(name, t);
    return t;
  };
  const counters = { drum: 0, melodic: 0 };

  let tick = 0;
  for (const { pattern, repeats } of sequence) {
    for (let rep = 0; rep < repeats; rep++) {
      tick += addPatternEvents(pattern, tick, drumTrack, melodicTracks, getMelodicTrack, counters);
    }
  }

  const tracks: MidiTrack[] = [];
  if (counters.drum > 0) tracks.push(drumTrack);
  tracks.push(...melodicTracks.values());

  if (tracks.length === 0) {
    void showAlert('Nothing to export', 'Every track is empty or muted.');
    return;
  }

  const writer = new MidiWriter.Writer(tracks);
  const link = document.createElement('a');
  link.href = writer.dataUri();
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export the active pattern as a standard MIDI file and trigger a browser download.
 * Drums go on a single channel-10 track; each melodic track gets its own MIDI track.
 * Velocities and note lengths are preserved.
 */
export function exportPatternToMidi(pattern: Pattern, bpm: number): void {
  buildAndDownload([{ pattern, repeats: 1 }], bpm, `groove-theory-${pattern.name}.mid`);
}

/**
 * Export the song arrangement (all non-muted blocks with repeats) as one MIDI file.
 */
export function exportSongToMidi(blocks: SongBlock[], patterns: Pattern[], bpm: number): void {
  const sequence: { pattern: Pattern; repeats: number }[] = [];
  for (const block of blocks) {
    if (block.muted) continue;
    const pattern = patterns.find(p => p.id === block.patternId);
    if (pattern) sequence.push({ pattern, repeats: block.repeats });
  }
  buildAndDownload(sequence, bpm, 'groove-theory-song.mid');
}
