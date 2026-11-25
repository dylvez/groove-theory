import type { DrumTrack, MelodicTrack, NoteEvent, Pattern, StepResolution, StepValue, TimeSignature } from '../types';
import type { SongBlock } from '../store/useSongStore';
import { DRUM_KIT } from '../constants/drums';
import { getSynthPreset } from '../constants';
import { PATTERN_IDS, patternLetter, type PatternBars } from '../constants/patterns';
import { createEmptyDrumTrack, createEmptyMelodicTrack } from './patternHelpers';
import { midiToNote, stepFromNotes } from './melodicNotes';

// ---------------------------------------------------------------------------
// Reading a Standard MIDI File
// ---------------------------------------------------------------------------

export interface MidiNote {
  tick: number;
  duration: number;
  pitch: number;
  velocity: number; // 1–127
}

/** One importable part: the notes of one channel within one MIDI track */
export interface MidiPart {
  id: string;
  name: string;
  channel: number; // 0-based; 9 is General MIDI drums
  program: number | null;
  notes: MidiNote[];
  isDrums: boolean;
}

export interface MidiFileData {
  ppq: number;
  parts: MidiPart[];
  /** First tempo in the file (BPM) and whether it changes later */
  bpm: number;
  tempoChanges: number;
  /** First time signature, e.g. [4, 4] */
  timeSignature: [number, number];
  lengthTicks: number;
}

export class MidiImportError extends Error {}

/**
 * Parse a Standard MIDI File (format 0 or 1). Notes are paired on/off per
 * channel and pitch; anything still held at the end of a track ends there.
 */
export function parseMidi(buffer: ArrayBuffer): MidiFileData {
  const bytes = new Uint8Array(buffer);
  let p = 0;
  const u32 = () => { const v = (bytes[p] << 24 | bytes[p + 1] << 16 | bytes[p + 2] << 8 | bytes[p + 3]) >>> 0; p += 4; return v; };
  const u16 = () => { const v = bytes[p] << 8 | bytes[p + 1]; p += 2; return v; };
  const tag = () => { const t = String.fromCharCode(bytes[p], bytes[p + 1], bytes[p + 2], bytes[p + 3]); p += 4; return t; };
  const vlq = () => {
    let v = 0;
    for (let i = 0; i < 4; i++) {
      const b = bytes[p++];
      v = (v << 7) | (b & 0x7f);
      if (!(b & 0x80)) break;
    }
    return v;
  };

  if (bytes.length < 14 || tag() !== 'MThd') throw new MidiImportError('This isn’t a MIDI file.');
  const headerLen = u32();
  const format = u16();
  const trackCount = u16();
  const division = u16();
  p = 8 + headerLen;
  if (format > 1) throw new MidiImportError('MIDI format 2 (separate patterns) isn’t supported.');
  if (division & 0x8000) throw new MidiImportError('MIDI files timed in SMPTE frames aren’t supported.');
  const ppq = division || 480;

  const parts: MidiPart[] = [];
  const tempos: { tick: number; bpm: number }[] = [];
  let timeSignature: [number, number] | null = null;
  let lengthTicks = 0;

  for (let t = 0; t < trackCount && p + 8 <= bytes.length; t++) {
    const chunk = tag();
    const len = u32();
    const end = Math.min(bytes.length, p + len);
    if (chunk !== 'MTrk') { p = end; t--; continue; }

    let tick = 0;
    let status = 0;
    let trackName = '';
    const programs = new Map<number, number>();
    const byChannel = new Map<number, MidiNote[]>();
    const held = new Map<string, { tick: number; velocity: number }[]>();
    const noteOff = (ch: number, pitch: number) => {
      const key = `${ch}:${pitch}`;
      const start = held.get(key)?.shift();
      if (!start) return;
      const list = byChannel.get(ch) ?? [];
      list.push({ tick: start.tick, duration: Math.max(1, tick - start.tick), pitch, velocity: start.velocity });
      byChannel.set(ch, list);
    };

    while (p < end) {
      tick += vlq();
      let b = bytes[p];
      if (b & 0x80) { status = b; p++; } else if (!status) { p++; continue; }
      b = status;
      if (b === 0xff) {
        const type = bytes[p++];
        const l = vlq();
        const data = bytes.subarray(p, p + l);
        if (type === 0x03 && !trackName) trackName = new TextDecoder().decode(data).trim();
        if (type === 0x51 && l >= 3) tempos.push({ tick, bpm: 60_000_000 / ((data[0] << 16) | (data[1] << 8) | data[2]) });
        if (type === 0x58 && l >= 2 && !timeSignature) timeSignature = [data[0], 2 ** data[1]];
        p += l;
        status = 0; // meta events cancel running status
      } else if (b === 0xf0 || b === 0xf7) {
        p += vlq();
        status = 0;
      } else {
        const kind = b & 0xf0;
        const ch = b & 0x0f;
        const d1 = bytes[p++];
        const d2 = kind === 0xc0 || kind === 0xd0 ? 0 : bytes[p++];
        if (kind === 0x90 && d2 > 0) {
          const key = `${ch}:${d1}`;
          const list = held.get(key) ?? [];
          list.push({ tick, velocity: d2 });
          held.set(key, list);
        } else if (kind === 0x80 || (kind === 0x90 && d2 === 0)) {
          noteOff(ch, d1);
        } else if (kind === 0xc0) {
          programs.set(ch, d1);
        }
      }
    }
    // Close anything still sounding at the end of the track
    for (const key of held.keys()) {
      const [ch, pitch] = key.split(':').map(Number);
      while (held.get(key)?.length) noteOff(ch, pitch);
    }
    lengthTicks = Math.max(lengthTicks, tick);

    const channels = [...byChannel.keys()].sort((a, b) => a - b);
    for (const ch of channels) {
      const notes = byChannel.get(ch)!.sort((a, b) => a.tick - b.tick || a.pitch - b.pitch);
      if (!notes.length) continue;
      const isDrums = ch === 9;
      const program = programs.get(ch) ?? null;
      const base = trackName || (isDrums ? 'Drums' : program !== null ? gmFamily(program).label : `Track ${t + 1}`);
      parts.push({
        id: `${t}:${ch}`,
        name: channels.length > 1 ? `${base} (ch ${ch + 1})` : base,
        channel: ch,
        program,
        notes,
        isDrums,
      });
    }
    p = end;
  }

  if (!parts.length) throw new MidiImportError('No notes were found in this file.');
  tempos.sort((a, b) => a.tick - b.tick);
  const bpm = tempos[0]?.bpm ?? 120;
  return {
    ppq,
    parts,
    bpm: Math.round(bpm),
    tempoChanges: new Set(tempos.map(x => Math.round(x.bpm))).size - 1,
    timeSignature: timeSignature ?? [4, 4],
    lengthTicks,
  };
}

// ---------------------------------------------------------------------------
// General MIDI mapping
// ---------------------------------------------------------------------------

/** GM percussion notes → our drum voices (unlisted notes are skipped) */
const GM_DRUMS: Record<number, string> = {
  35: 'kick', 36: 'kick',
  37: 'rim', 38: 'snare', 40: 'snare', 39: 'clap',
  42: 'hihat-closed', 44: 'hihat-closed', 46: 'hihat-open',
  41: 'tom-low', 43: 'tom-low', 45: 'tom-low',
  47: 'tom-mid', 48: 'tom-mid', 50: 'tom-high',
  49: 'crash', 52: 'crash', 55: 'crash', 57: 'crash',
  51: 'ride', 53: 'ride', 59: 'ride',
};

/** GM program families → a synth preset that suits them */
export function gmFamily(program: number): { label: string; preset: string } {
  const families: [number, string, string][] = [
    [7, 'Piano', 'keys'], [15, 'Mallets', 'bell'], [23, 'Organ', 'organ'], [31, 'Guitar', 'pluck'],
    [39, 'Bass', 'sub'], [47, 'Strings', 'pad'], [55, 'Ensemble', 'pad'], [63, 'Brass', 'lead'],
    [71, 'Reed', 'lead'], [79, 'Pipe', 'lead'], [87, 'Synth lead', 'lead'], [95, 'Synth pad', 'pad'],
    [103, 'Synth FX', 'pad'], [111, 'Ethnic', 'pluck'], [119, 'Percussive', 'bell'], [127, 'Effects', 'pad'],
  ];
  const f = families.find(([max]) => program <= max) ?? families[0];
  return { label: f[1], preset: f[2] };
}

/**
 * Which synth preset a part should start with: its General MIDI instrument
 * when the file says, else a guess from the part's name, else from its range
 * (low parts get a bass sound).
 */
export function soundFor(part: MidiPart): { preset: string; family?: string } {
  if (part.program !== null) {
    const f = gmFamily(part.program);
    return { preset: f.preset, family: f.label };
  }
  const name = part.name.toLowerCase();
  const byName: [RegExp, string][] = [
    [/bass|sub/, 'sub'], [/pad|string|choir|ambient/, 'pad'], [/lead|melody|solo|brass|sax|flute/, 'lead'],
    [/arp|pluck|guitar|harp/, 'pluck'], [/bell|glock|mallet|vibe|marimba/, 'bell'], [/organ/, 'organ'],
    [/piano|keys|rhodes|ep\b|chord|stab/, 'keys'],
  ];
  const hit = byName.find(([re]) => re.test(name));
  if (hit) return { preset: hit[1] };
  const pitches = part.notes.map(n => n.pitch).sort((a, b) => a - b);
  const median = pitches[Math.floor(pitches.length / 2)] ?? 60;
  return { preset: median < 48 ? 'sub' : 'keys' };
}

// ---------------------------------------------------------------------------
// Turning parts into patterns and a song
// ---------------------------------------------------------------------------

export interface ImportOptions {
  partIds: string[];
  barsPerPattern: PatternBars;
  resolution: StepResolution;
}

export interface ImportResult {
  patterns: Pattern[];
  blocks: SongBlock[];
  bpm: number;
  timeSignature: TimeSignature;
  /** Bars of music in the file (after dropping empty bars at the start) */
  totalBars: number;
  importedBars: number;
  skippedLeadingBars: number;
  /** Drum notes with no matching sound */
  unmappedDrumNotes: number;
  /** Chords that a Mono Synth track can only play one note of */
  warnings: string[];
}

function mapTimeSignature([num, den]: [number, number]): { ts: TimeSignature; beatsPerBar: number; note?: string } {
  if (num === 4 && den === 4) return { ts: '4/4', beatsPerBar: 4 };
  if (num === 3 && den === 4) return { ts: '3/4', beatsPerBar: 3 };
  // 6/8 has the same bar length as 3/4
  if (num === 6 && den === 8) return { ts: '3/4', beatsPerBar: 3, note: 'The file is in 6/8; it’s laid out as 3/4, which has the same bar length.' };
  return { ts: '4/4', beatsPerBar: 4, note: `The file is in ${num}/${den}, which isn’t supported; notes keep their timing but bars are counted in 4/4.` };
}

let uidCounter = 0;
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(uidCounter++).toString(36)}`;

/**
 * Build up to eight patterns and a song arrangement from the chosen parts.
 * The music is cut into chunks of `barsPerPattern`; identical chunks share a
 * pattern and play with repeats. If a ninth distinct chunk is needed, the
 * import stops there.
 */
export function buildImport(data: MidiFileData, opts: ImportOptions): ImportResult {
  const warnings: string[] = [];
  const parts = data.parts.filter(pt => opts.partIds.includes(pt.id));
  const { ts, beatsPerBar, note: tsNote } = mapTimeSignature(data.timeSignature);
  if (tsNote) warnings.push(tsNote);
  if (data.tempoChanges > 0) warnings.push(`The tempo changes ${data.tempoChanges} time${data.tempoChanges > 1 ? 's' : ''} in the file; the whole song uses the first tempo, ${data.bpm} BPM.`);

  const stepsPerBeat = opts.resolution === '32n' ? 8 : 4;
  const ticksPerStep = data.ppq / stepsPerBeat;
  const stepsPerBar = beatsPerBar * stepsPerBeat;
  const quant = (tick: number) => Math.round(tick / ticksPerStep);

  // Where the music starts: drop whole empty bars at the beginning
  const firstStep = Math.min(...parts.flatMap(pt => pt.notes.map(n => quant(n.tick))));
  const skippedLeadingBars = Number.isFinite(firstStep) ? Math.floor(firstStep / stepsPerBar) : 0;
  const offset = skippedLeadingBars * stepsPerBar;
  const lastStep = Math.max(0, ...parts.flatMap(pt => pt.notes.map(n => quant(n.tick) - offset + Math.max(1, Math.round(n.duration / ticksPerStep)))));
  const totalBars = Math.max(1, Math.ceil(lastStep / stepsPerBar));

  // --- Lay every part out on one long grid ---------------------------------
  const totalSteps = totalBars * stepsPerBar;
  let unmappedDrumNotes = 0;
  const drumLanes = new Map<string, number[]>(); // drum key → velocities 0–1
  const melodicLanes: { name: string; preset: string; notes: NoteEvent[][]; octave: number }[] = [];

  for (const part of parts) {
    if (part.isDrums) {
      for (const n of part.notes) {
        const key = GM_DRUMS[n.pitch];
        if (!key) { unmappedDrumNotes++; continue; }
        const lane = drumLanes.get(key) ?? new Array(totalSteps).fill(0);
        const s = quant(n.tick) - offset;
        if (s >= 0 && s < totalSteps) lane[s] = Math.max(lane[s], Math.round((n.velocity / 127) * 100) / 100);
        drumLanes.set(key, lane);
      }
      continue;
    }
    const { preset } = soundFor(part);
    const steps: NoteEvent[][] = Array.from({ length: totalSteps }, () => []);
    for (const n of part.notes) {
      const s = quant(n.tick) - offset;
      if (s < 0 || s >= totalSteps) continue;
      const pitch = midiToNote(n.pitch);
      const length = Math.max(1, Math.round(n.duration / ticksPerStep));
      // Same pitch twice on one step after rounding: keep the longer note
      const existing = steps[s].find(e => e.note === pitch);
      if (existing) { existing.length = Math.max(existing.length, length); continue; }
      steps[s].push({ note: pitch, velocity: Math.max(0.1, Math.round((n.velocity / 127) * 100) / 100), length });
    }
    const pitches = part.notes.map(n => n.pitch).sort((a, b) => a - b);
    const median = pitches[Math.floor(pitches.length / 2)] ?? 60;
    melodicLanes.push({ name: part.name, preset, notes: steps, octave: Math.max(1, Math.min(6, Math.floor(median / 12) - 1)) });
  }
  if (unmappedDrumNotes) warnings.push(`${unmappedDrumNotes} drum hit${unmappedDrumNotes > 1 ? 's use sounds' : ' uses a sound'} the app doesn’t have and ${unmappedDrumNotes > 1 ? 'were' : 'was'} skipped.`);

  // Track identities shared by every pattern, so voices are reused across the song
  const drumKeys = DRUM_KIT.map(k => k.key).filter(k => drumLanes.has(k));
  const drumIds = new Map(drumKeys.map(k => [k, uid('drum')]));
  const melodicIds = melodicLanes.map(() => uid('synth'));

  // --- Cut into pattern-sized chunks and share identical ones --------------
  const patternSteps = opts.barsPerPattern * stepsPerBar;
  const chunkCount = Math.ceil(totalSteps / patternSteps);
  const signatureToSlot = new Map<string, number>();
  const chunkSlots: number[] = [];
  const patterns: Pattern[] = [];

  for (let c = 0; c < chunkCount; c++) {
    const from = c * patternSteps;
    const slice = <T,>(arr: T[], fill: () => T) => Array.from({ length: patternSteps }, (_, i) => arr[from + i] ?? fill());
    const drumSlices = drumKeys.map(k => slice(drumLanes.get(k)!, () => 0));
    // Notes that run past the end of a chunk are shortened to fit it
    const melodicSlices = melodicLanes.map(l => slice(l.notes, () => [] as NoteEvent[]).map((evs, i) =>
      evs.map(e => ({ ...e, length: Math.min(e.length, patternSteps - i) }))));
    const sig = JSON.stringify([drumSlices, melodicSlices]);

    let slot = signatureToSlot.get(sig);
    if (slot === undefined) {
      if (patterns.length >= PATTERN_IDS.length) break; // out of slots: stop here
      slot = patterns.length;
      signatureToSlot.set(sig, slot);
      const id = PATTERN_IDS[slot];

      const drumTracks: DrumTrack[] = drumKeys.map((k, i) => {
        const kit = DRUM_KIT.find(d => d.key === k)!;
        return { ...createEmptyDrumTrack(k, kit.name, kit.color, patternSteps), id: drumIds.get(k)!, steps: drumSlices[i] as StepValue[] };
      });
      const melodicTracks: MelodicTrack[] = melodicLanes.map((lane, i) => {
        const preset = getSynthPreset(lane.preset);
        const base = createEmptyMelodicTrack(lane.name, patternSteps, preset?.synthType ?? 'synth');
        return {
          ...base,
          id: melodicIds[i],
          octave: lane.octave,
          ...(preset ? { synthParams: { ...preset.params }, reverbSend: preset.reverbSend ?? 0, delaySend: preset.delaySend ?? 0 } : {}),
          steps: melodicSlices[i].map((evs, s) => stepFromNotes(base.steps[s], evs)),
        };
      });
      patterns.push({ id, name: patternLetter(id), numSteps: patternSteps, timeSignature: ts, stepResolution: opts.resolution, kitId: 'classic', drumTracks, melodicTracks });
    }
    chunkSlots.push(slot);
  }

  // Consecutive repeats of the same pattern become one block
  const blocks: SongBlock[] = [];
  for (const slot of chunkSlots) {
    const last = blocks[blocks.length - 1];
    const patternId = PATTERN_IDS[slot];
    if (last && last.patternId === patternId && last.repeats < 99) last.repeats++;
    else blocks.push({ id: uid('block'), patternId, repeats: 1, muted: false });
  }

  const importedBars = chunkSlots.length * opts.barsPerPattern;
  if (chunkSlots.length < chunkCount) {
    warnings.push(`The song needs more than ${PATTERN_IDS.length} different patterns, so only bars 1–${importedBars} of ${totalBars} were imported. Longer patterns (8 bars) fit more.`);
  }
  for (const lane of melodicLanes) {
    const preset = getSynthPreset(lane.preset);
    if (preset?.synthType === 'monoSynth' && lane.notes.some(evs => evs.length > 1)) {
      warnings.push(`“${lane.name}” has chords but got a Mono Synth sound, which plays one note at a time. Pick another sound in its ⚙ settings to hear them.`);
    }
  }

  return {
    patterns,
    blocks,
    bpm: data.bpm,
    timeSignature: ts,
    totalBars,
    importedBars: Math.min(importedBars, totalBars),
    skippedLeadingBars,
    unmappedDrumNotes,
    warnings,
  };
}

/** Open a .mid file and hand it to the import dialog */
export async function pickMidiFile(): Promise<{ fileName: string; buffer: ArrayBuffer } | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.mid,.midi,audio/midi,audio/x-midi';
    input.onchange = async () => {
      const file = input.files?.[0];
      resolve(file ? { fileName: file.name, buffer: await file.arrayBuffer() } : null);
    };
    input.click();
  });
}
