import type { SavedGroove, SavedPatternBank, SavedSongArrangement, GrooveSlotEntry } from '../types';
import { useSequencerStore } from '../store/useSequencerStore';
import { useTransportStore } from '../store/useTransportStore';
import { useTheoryStore } from '../store/useTheoryStore';
import { useSongStore } from '../store/useSongStore';
import { useMixerStore, type MixerSettings } from '../store/useMixerStore';
import { withUndoGroup } from '../store/history';
import { markWorkSaved } from './workState';

const INDEX_KEY = 'groove-theory-saves-index';
const SAVE_PREFIX = 'groove-theory-save-';
const CURRENT_VERSION = 1;

// ---------------------------------------------------------------------------
// Index
// ---------------------------------------------------------------------------

export function listGrooves(): GrooveSlotEntry[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveIndex(entries: GrooveSlotEntry[]): void {
  localStorage.setItem(INDEX_KEY, JSON.stringify(entries));
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export function saveGroove(groove: SavedGroove): GrooveSlotEntry {
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const json = JSON.stringify(groove);

  try {
    localStorage.setItem(`${SAVE_PREFIX}${id}`, json);
  } catch {
    throw new Error('Storage full — delete old saves or export to file instead.');
  }

  const entry: GrooveSlotEntry = {
    id,
    name: groove.name,
    savedAt: groove.savedAt,
    sizeBytes: new Blob([json]).size,
  };

  const entries = listGrooves();
  entries.unshift(entry); // newest first
  saveIndex(entries);
  return entry;
}

export function loadGroove(id: string): SavedGroove | null {
  try {
    const raw = localStorage.getItem(`${SAVE_PREFIX}${id}`);
    if (!raw) return null;
    const groove = JSON.parse(raw) as SavedGroove;
    if (!validateGroove(groove)) {
      // Self-heal: remove corrupted entry from index
      const entries = listGrooves().filter(e => e.id !== id);
      saveIndex(entries);
      localStorage.removeItem(`${SAVE_PREFIX}${id}`);
      return null;
    }
    return groove;
  } catch {
    return null;
  }
}

export function deleteGroove(id: string): void {
  localStorage.removeItem(`${SAVE_PREFIX}${id}`);
  const entries = listGrooves().filter(e => e.id !== id);
  saveIndex(entries);
}

// ---------------------------------------------------------------------------
// File export / import
// ---------------------------------------------------------------------------

export function exportGrooveToFile(groove: SavedGroove): void {
  const json = JSON.stringify(groove, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${sanitizeFilename(groove.name)}.groove`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function importGrooveFromFile(): Promise<SavedGroove> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.groove,.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) { reject(new Error('No file selected')); return; }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const groove = JSON.parse(reader.result as string) as SavedGroove;
          if (!validateGroove(groove)) {
            reject(new Error('Invalid groove file — missing required data.'));
            return;
          }
          resolve(groove);
        } catch {
          reject(new Error('Could not parse groove file.'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file.'));
      reader.readAsText(file);
    };
    input.click();
  });
}

// ---------------------------------------------------------------------------
// Snapshot builder — collects current state from all stores
// ---------------------------------------------------------------------------

export function buildGrooveSnapshot(name: string): SavedGroove {
  const seq = useSequencerStore.getState();
  const transport = useTransportStore.getState();
  const theory = useTheoryStore.getState();
  const song = useSongStore.getState();
  const m = useMixerStore.getState();
  const mixer: MixerSettings = {
    masterVolume: m.masterVolume,
    reverbDecay: m.reverbDecay,
    reverbLevel: m.reverbLevel,
    delayTime: m.delayTime,
    delayFeedback: m.delayFeedback,
    delayLevel: m.delayLevel,
    compressor: m.compressor,
  };

  return {
    version: CURRENT_VERSION,
    name,
    savedAt: new Date().toISOString(),
    patterns: seq.patterns,
    activePatternId: seq.activePatternId,
    bpm: transport.bpm,
    swing: transport.swing,
    rootNote: theory.rootNote,
    selectedScale: theory.selectedScale,
    selectedChord: theory.selectedChord,
    chordRoot: theory.chordRoot,
    chordInversion: theory.chordInversion,
    progression: theory.progression,
    songBlocks: song.blocks.length > 0 ? song.blocks : undefined,
    mixer,
  };
}

// ---------------------------------------------------------------------------
// Apply a loaded groove to all stores
// ---------------------------------------------------------------------------

export function applyGroove(groove: SavedGroove): void {
  // Stop playback first to prevent half-updated reads
  useTransportStore.getState().stop();
  useSongStore.getState().stopSong();

  // Patterns + song arrangement replace together as one undo step
  withUndoGroup(() => {
    useSequencerStore.getState().loadPatterns(groove.patterns, groove.activePatternId);
    useSongStore.getState().loadBlocks(groove.songBlocks ?? []);
  });

  // Load transport
  useTransportStore.getState().setBpm(groove.bpm);
  if (groove.swing !== undefined) {
    useTransportStore.getState().setSwing(groove.swing);
  }

  // Load theory (bulk action)
  useTheoryStore.getState().loadTheoryState({
    rootNote: groove.rootNote,
    selectedScale: groove.selectedScale,
    selectedChord: groove.selectedChord,
    chordRoot: groove.chordRoot,
    chordInversion: groove.chordInversion,
    progression: groove.progression,
  });

  // Mixer: saves without one (older saves, presets) get the default sound
  if (groove.mixer) useMixerStore.getState().setMixer(groove.mixer);
  else useMixerStore.getState().resetMixer();

  markWorkSaved();
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateGroove(g: unknown): g is SavedGroove {
  if (!g || typeof g !== 'object') return false;
  const obj = g as Record<string, unknown>;
  return (
    typeof obj.name === 'string' &&
    typeof obj.savedAt === 'string' &&
    Array.isArray(obj.patterns) &&
    obj.patterns.length > 0 &&
    typeof obj.activePatternId === 'string' &&
    typeof obj.bpm === 'number' &&
    typeof obj.rootNote === 'string'
  );
}

// ---------------------------------------------------------------------------
// Pattern bank — snapshot / export / import / apply
// ---------------------------------------------------------------------------

export function buildPatternSnapshot(name: string): SavedPatternBank {
  const seq = useSequencerStore.getState();
  const transport = useTransportStore.getState();
  const theory = useTheoryStore.getState();

  return {
    version: CURRENT_VERSION as 1,
    type: 'patterns',
    name,
    savedAt: new Date().toISOString(),
    patterns: seq.patterns,
    activePatternId: seq.activePatternId,
    bpm: transport.bpm,
    swing: transport.swing,
    rootNote: theory.rootNote,
    selectedScale: theory.selectedScale,
    selectedChord: theory.selectedChord,
    chordRoot: theory.chordRoot,
    chordInversion: theory.chordInversion,
    progression: theory.progression,
  };
}

export function exportPatternsToFile(data: SavedPatternBank): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${sanitizeFilename(data.name)}.patterns`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function importPatternsFromFile(): Promise<SavedPatternBank> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.patterns,.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) { reject(new Error('No file selected')); return; }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string) as SavedPatternBank;
          if (!validatePatternBank(data)) {
            reject(new Error('Invalid pattern file — missing required data.'));
            return;
          }
          resolve(data);
        } catch {
          reject(new Error('Could not parse pattern file.'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file.'));
      reader.readAsText(file);
    };
    input.click();
  });
}

export function applyPatternBank(data: SavedPatternBank): void {
  useTransportStore.getState().stop();
  useSongStore.getState().stopSong();

  useSequencerStore.getState().loadPatterns(data.patterns, data.activePatternId);
  useTransportStore.getState().setBpm(data.bpm);
  if (data.swing !== undefined) {
    useTransportStore.getState().setSwing(data.swing);
  }
  useTheoryStore.getState().loadTheoryState({
    rootNote: data.rootNote,
    selectedScale: data.selectedScale,
    selectedChord: data.selectedChord,
    chordRoot: data.chordRoot,
    chordInversion: data.chordInversion,
    progression: data.progression,
  });
}

function validatePatternBank(g: unknown): g is SavedPatternBank {
  if (!g || typeof g !== 'object') return false;
  const obj = g as Record<string, unknown>;
  return (
    typeof obj.name === 'string' &&
    typeof obj.savedAt === 'string' &&
    Array.isArray(obj.patterns) &&
    obj.patterns.length > 0 &&
    typeof obj.activePatternId === 'string' &&
    typeof obj.bpm === 'number' &&
    typeof obj.rootNote === 'string'
  );
}

// ---------------------------------------------------------------------------
// Song arrangement — snapshot / export / import / apply
// ---------------------------------------------------------------------------

export function buildSongSnapshot(name: string): SavedSongArrangement {
  const song = useSongStore.getState();
  return {
    version: CURRENT_VERSION as 1,
    type: 'song',
    name,
    savedAt: new Date().toISOString(),
    songBlocks: song.blocks,
  };
}

export function exportSongToFile(data: SavedSongArrangement): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${sanitizeFilename(data.name)}.song`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function importSongFromFile(): Promise<SavedSongArrangement> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.song,.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) { reject(new Error('No file selected')); return; }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string) as SavedSongArrangement;
          if (!validateSongArrangement(data)) {
            reject(new Error('Invalid song file — missing required data.'));
            return;
          }
          resolve(data);
        } catch {
          reject(new Error('Could not parse song file.'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file.'));
      reader.readAsText(file);
    };
    input.click();
  });
}

export function applySongArrangement(data: SavedSongArrangement): void {
  useSongStore.getState().stopSong();
  useSongStore.getState().loadBlocks(data.songBlocks);
}

function validateSongArrangement(g: unknown): g is SavedSongArrangement {
  if (!g || typeof g !== 'object') return false;
  const obj = g as Record<string, unknown>;
  return (
    typeof obj.name === 'string' &&
    typeof obj.savedAt === 'string' &&
    Array.isArray(obj.songBlocks) &&
    obj.songBlocks.length > 0
  );
}

// ---------------------------------------------------------------------------
// Universal file import — auto-detects .groove, .patterns, or .song
// ---------------------------------------------------------------------------

export type ImportedFile =
  | { type: 'groove'; data: SavedGroove }
  | { type: 'patterns'; data: SavedPatternBank }
  | { type: 'song'; data: SavedSongArrangement };

export function importAnyFile(): Promise<ImportedFile> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.groove,.patterns,.song,.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) { reject(new Error('No file selected')); return; }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const raw = JSON.parse(reader.result as string);
          // Detect type by explicit type field or file extension
          if (raw.type === 'song' || file.name.endsWith('.song')) {
            if (!validateSongArrangement(raw)) {
              reject(new Error('Invalid song file — missing required data.'));
              return;
            }
            resolve({ type: 'song', data: raw });
          } else if (raw.type === 'patterns' || file.name.endsWith('.patterns')) {
            if (!validatePatternBank(raw)) {
              reject(new Error('Invalid pattern file — missing required data.'));
              return;
            }
            resolve({ type: 'patterns', data: raw });
          } else {
            // Default: treat as full groove
            if (!validateGroove(raw)) {
              reject(new Error('Invalid groove file — missing required data.'));
              return;
            }
            resolve({ type: 'groove', data: raw });
          }
        } catch {
          reject(new Error('Could not parse file.'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file.'));
      reader.readAsText(file);
    };
    input.click();
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s+/g, '-') || 'groove';
}
