import type { Pattern } from './sequencer';
import type { NoteName, ScaleDefinition, ChordDefinition, ProgressionSlot } from './music';
import type { SongBlock } from '../store/useSongStore';
import type { MixerSettings } from '../store/useMixerStore';

/** Full session snapshot that can be saved/loaded/exported */
export interface SavedGroove {
  /** Format version for future migration */
  version: 1;
  /** User-assigned name */
  name: string;
  /** ISO timestamp */
  savedAt: string;

  // --- Sequencer ---
  patterns: Pattern[];
  activePatternId: string;

  // --- Transport (musically meaningful fields only) ---
  bpm: number;
  swing: number;

  // --- Theory (compositional fields only) ---
  rootNote: NoteName;
  selectedScale: ScaleDefinition;
  selectedChord: ChordDefinition;
  chordRoot: NoteName;
  chordInversion: number;
  progression: ProgressionSlot[];

  // --- Song arrangement (optional for backward compatibility) ---
  songBlocks?: SongBlock[];

  // --- Mixer & effects (optional: older saves and presets use the defaults) ---
  mixer?: MixerSettings;
}

/** Pattern bank snapshot (patterns + transport + theory, no song arrangement) */
export interface SavedPatternBank {
  version: 1;
  type: 'patterns';
  name: string;
  savedAt: string;

  patterns: Pattern[];
  activePatternId: string;
  bpm: number;
  swing: number;
  rootNote: NoteName;
  selectedScale: ScaleDefinition;
  selectedChord: ChordDefinition;
  chordRoot: NoteName;
  chordInversion: number;
  progression: ProgressionSlot[];
}

/** Song arrangement snapshot (just the block sequence) */
export interface SavedSongArrangement {
  version: 1;
  type: 'song';
  name: string;
  savedAt: string;
  songBlocks: SongBlock[];
}

/** Lightweight index entry for listing saves without deserializing full data */
export interface GrooveSlotEntry {
  id: string;
  name: string;
  savedAt: string;
  sizeBytes: number;
}
