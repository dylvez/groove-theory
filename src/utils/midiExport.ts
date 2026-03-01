import MidiWriter from 'midi-writer-js';
import type { Pattern, MelodicTrack } from '../types';
import type { SongBlock } from '../store/useSongStore';

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

/** Ticks per sixteenth note at midi-writer-js default PPQ of 128 */
const TICKS_PER_16TH = 32;

/**
 * Export the active pattern as a standard MIDI file and trigger a browser download.
 * Drums go on a single channel-10 track; each melodic track gets its own MIDI track.
 */
export function exportPatternToMidi(pattern: Pattern, bpm: number): void {
  const tracks: InstanceType<typeof MidiWriter.Track>[] = [];

  // --- Drum track (GM channel 10) ---
  const drumTrack = buildDrumTrack(pattern, bpm);
  if (drumTrack) tracks.push(drumTrack);

  // --- Melodic tracks ---
  for (const mTrack of pattern.melodicTracks) {
    const midiTrack = buildMelodicTrack(mTrack, pattern, bpm);
    if (midiTrack) tracks.push(midiTrack);
  }

  if (tracks.length === 0) {
    alert('Nothing to export — all tracks are empty or muted.');
    return;
  }

  const writer = new MidiWriter.Writer(tracks);
  const dataUri = writer.dataUri();

  // Trigger browser download
  const link = document.createElement('a');
  link.href = dataUri;
  link.download = `groove-theory-${pattern.name}.mid`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildDrumTrack(
  pattern: Pattern,
  bpm: number,
): InstanceType<typeof MidiWriter.Track> | null {
  const activeTracks = pattern.drumTracks.filter(t => !t.muted);
  if (activeTracks.length === 0) return null;

  let hasAnyNotes = false;
  const track = new MidiWriter.Track();
  track.setTempo(bpm);
  track.addTrackName('Drums');

  const [num, den] = pattern.timeSignature.split('/').map(Number);
  track.setTimeSignature(num, den, 24, 8);

  let restTicks = 0;

  for (let step = 0; step < pattern.numSteps; step++) {
    const pitches: number[] = [];

    for (const dt of activeTracks) {
      if (dt.steps[step] !== 0) {
        const midiNote = DRUM_MIDI_MAP[dt.sampleKey];
        if (midiNote !== undefined) pitches.push(midiNote);
      }
    }

    if (pitches.length > 0) {
      hasAnyNotes = true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fields: any = {
        pitch: pitches,
        duration: `T${TICKS_PER_16TH}`,
        velocity: 80,
        channel: 10,
      };
      if (restTicks > 0) {
        fields.wait = `T${restTicks}`;
      }
      track.addEvent(new MidiWriter.NoteEvent(fields));
      restTicks = 0;
    } else {
      restTicks += TICKS_PER_16TH;
    }
  }

  return hasAnyNotes ? track : null;
}

function buildMelodicTrack(
  mTrack: MelodicTrack,
  pattern: Pattern,
  bpm: number,
): InstanceType<typeof MidiWriter.Track> | null {
  if (mTrack.muted) return null;

  let hasAnyNotes = false;
  const track = new MidiWriter.Track();
  track.setTempo(bpm);
  track.addTrackName(mTrack.name);

  const [num, den] = pattern.timeSignature.split('/').map(Number);
  track.setTimeSignature(num, den, 24, 8);

  let restTicks = 0;

  for (let step = 0; step < pattern.numSteps; step++) {
    const mStep = mTrack.steps[step];

    if (mStep.active && mStep.note) {
      hasAnyNotes = true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fields: any = {
        pitch: [mStep.note], // e.g. 'C4', 'D#3' — midi-writer-js accepts note names
        duration: `T${TICKS_PER_16TH}`,
        velocity: Math.round(mStep.velocity * 100),
      };
      if (restTicks > 0) {
        fields.wait = `T${restTicks}`;
      }
      track.addEvent(new MidiWriter.NoteEvent(fields));
      restTicks = 0;
    } else {
      restTicks += TICKS_PER_16TH;
    }
  }

  return hasAnyNotes ? track : null;
}

// ---------------------------------------------------------------------------
// Song MIDI export — concatenates all blocks with repeats
// ---------------------------------------------------------------------------

export function exportSongToMidi(
  blocks: SongBlock[],
  patterns: Pattern[],
  bpm: number
): void {
  const drumTrack = new MidiWriter.Track();
  drumTrack.setTempo(bpm);
  drumTrack.addTrackName('Drums');
  drumTrack.setTimeSignature(4, 4, 24, 8);

  const melodicTrackMap = new Map<string, { track: InstanceType<typeof MidiWriter.Track>; restTicks: number }>();
  let drumRestTicks = 0;
  let hasDrumNotes = false;

  for (const block of blocks) {
    const pattern = patterns.find((p) => p.id === block.patternId);
    if (!pattern) continue;

    const activeDrums = pattern.drumTracks.filter((t) => !t.muted);

    for (let rep = 0; rep < block.repeats; rep++) {
      for (let step = 0; step < pattern.numSteps; step++) {
        const pitches: number[] = [];
        for (const dt of activeDrums) {
          if (dt.steps[step] !== 0) {
            const midiNote = DRUM_MIDI_MAP[dt.sampleKey];
            if (midiNote !== undefined) pitches.push(midiNote);
          }
        }
        if (pitches.length > 0) {
          hasDrumNotes = true;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const fields: any = {
            pitch: pitches,
            duration: `T${TICKS_PER_16TH}`,
            velocity: 80,
            channel: 10,
          };
          if (drumRestTicks > 0) {
            fields.wait = `T${drumRestTicks}`;
          }
          drumTrack.addEvent(new MidiWriter.NoteEvent(fields));
          drumRestTicks = 0;
        } else {
          drumRestTicks += TICKS_PER_16TH;
        }
      }

      for (const mTrack of pattern.melodicTracks) {
        if (mTrack.muted) continue;
        const key = mTrack.name;
        if (!melodicTrackMap.has(key)) {
          const t = new MidiWriter.Track();
          t.setTempo(bpm);
          t.addTrackName(mTrack.name);
          t.setTimeSignature(4, 4, 24, 8);
          melodicTrackMap.set(key, { track: t, restTicks: 0 });
        }
        const entry = melodicTrackMap.get(key)!;

        for (let step = 0; step < pattern.numSteps; step++) {
          const mStep = mTrack.steps[step];
          if (mStep.active && mStep.note) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const fields: any = {
              pitch: [mStep.note],
              duration: `T${TICKS_PER_16TH}`,
              velocity: Math.round(mStep.velocity * 100),
            };
            if (entry.restTicks > 0) {
              fields.wait = `T${entry.restTicks}`;
            }
            entry.track.addEvent(new MidiWriter.NoteEvent(fields));
            entry.restTicks = 0;
          } else {
            entry.restTicks += TICKS_PER_16TH;
          }
        }
      }
    }
  }

  const allTracks: InstanceType<typeof MidiWriter.Track>[] = [];
  if (hasDrumNotes) allTracks.push(drumTrack);
  for (const { track } of melodicTrackMap.values()) {
    allTracks.push(track);
  }

  if (allTracks.length === 0) {
    alert('Nothing to export — all tracks are empty or muted.');
    return;
  }

  const writer = new MidiWriter.Writer(allTracks);
  const dataUri = writer.dataUri();

  const link = document.createElement('a');
  link.href = dataUri;
  link.download = 'groove-theory-song.mid';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
