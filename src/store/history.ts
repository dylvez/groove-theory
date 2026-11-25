import type { Pattern } from '../types';
import type { SongBlock } from './useSongStore';

/**
 * One undo/redo history shared by the sequencer patterns, the song
 * arrangement and the tempo and swing, so "undo" after loading a groove or
 * clearing the song brings them all back together.
 *
 * Stores register getters/restorers at creation time (avoids an import cycle)
 * and call `recordChange` from inside their `set` wrapper with the value they
 * had *before* the change.
 *
 * Two ways to keep one gesture from flooding the stack:
 *  - `withUndoGroup` / `beginUndoGroup` + `endUndoGroup`: every change while a
 *    group is open becomes a single undo step (drag-paint, "apply to track").
 *  - `coalesced(key, fn)`: repeated changes with the same key less than
 *    COALESCE_MS apart merge (slider drags, typing in a number field).
 */

export interface TransportSnapshot {
  bpm: number;
  swing: number;
}

interface Snapshot {
  patterns: Pattern[];
  blocks: SongBlock[];
  transport: TransportSnapshot;
}

const MAX_UNDO = 50;
const COALESCE_MS = 1000;

const undoStack: Snapshot[] = [];
const redoStack: Snapshot[] = [];

let restoring = false;
let groupOpen = false;
let groupRecorded = false;
let nextCoalesceKey: string | null = null;
let lastCoalesceKey: string | null = null;
let lastChangeAt = 0;

let getPatterns: () => Pattern[] = () => [];
let getBlocks: () => SongBlock[] = () => [];
let restorePatterns: (p: Pattern[]) => void = () => {};
let restoreBlocks: (b: SongBlock[]) => void = () => {};
let getTransport: () => TransportSnapshot = () => ({ bpm: 120, swing: 0 });
let restoreTransport: (t: TransportSnapshot) => void = () => {};
let depthListener: (undo: number, redo: number) => void = () => {};

export function registerPatternHistory(get: () => Pattern[], restore: (p: Pattern[]) => void) {
  getPatterns = get;
  restorePatterns = restore;
}

export function registerSongHistory(get: () => SongBlock[], restore: (b: SongBlock[]) => void) {
  getBlocks = get;
  restoreBlocks = restore;
}

export function registerTransportHistory(get: () => TransportSnapshot, restore: (t: TransportSnapshot) => void) {
  getTransport = get;
  restoreTransport = restore;
}

export function onHistoryDepthChange(listener: (undo: number, redo: number) => void) {
  depthListener = listener;
}

function notify() {
  depthListener(undoStack.length, redoStack.length);
}

function current(): Snapshot {
  return { patterns: getPatterns(), blocks: getBlocks(), transport: getTransport() };
}

/** Called by a store after it changes, with its own previous value. */
export function recordChange(prev: Partial<Snapshot>) {
  if (restoring) return;
  const now = Date.now();
  const key = nextCoalesceKey;

  let skip = false;
  if (groupOpen) {
    skip = groupRecorded;
    groupRecorded = true;
  } else if (key !== null && key === lastCoalesceKey && now - lastChangeAt < COALESCE_MS) {
    skip = true;
  }
  lastCoalesceKey = groupOpen ? null : key;
  lastChangeAt = now;

  redoStack.length = 0;
  if (!skip) {
    const cur = current();
    undoStack.push(structuredClone({
      patterns: prev.patterns ?? cur.patterns,
      blocks: prev.blocks ?? cur.blocks,
      transport: prev.transport ?? cur.transport,
    }));
    if (undoStack.length > MAX_UNDO) undoStack.shift();
  }
  notify();
}

function apply(snapshot: Snapshot) {
  restoring = true;
  try {
    restorePatterns(snapshot.patterns);
    restoreBlocks(snapshot.blocks);
    restoreTransport(snapshot.transport);
  } finally {
    restoring = false;
  }
}

export function undo(): boolean {
  const snap = undoStack.pop();
  if (!snap) return false;
  redoStack.push(structuredClone(current()));
  apply(snap);
  lastCoalesceKey = null;
  notify();
  return true;
}

export function redo(): boolean {
  const snap = redoStack.pop();
  if (!snap) return false;
  undoStack.push(structuredClone(current()));
  apply(snap);
  lastCoalesceKey = null;
  notify();
  return true;
}

export function beginUndoGroup() {
  groupOpen = true;
  groupRecorded = false;
}

export function endUndoGroup() {
  groupOpen = false;
  groupRecorded = false;
}

/** Run `fn` so that everything it changes is one undo step. */
export function withUndoGroup<T>(fn: () => T): T {
  const wasOpen = groupOpen;
  if (!wasOpen) beginUndoGroup();
  try {
    return fn();
  } finally {
    if (!wasOpen) endUndoGroup();
  }
}

/** Run `fn` with a coalescing key: rapid repeats with the same key merge. */
export function coalesced<T>(key: string, fn: () => T): T {
  const prev = nextCoalesceKey;
  nextCoalesceKey = key;
  try {
    return fn();
  } finally {
    nextCoalesceKey = prev;
  }
}

// A drag that ends outside the window never sends mouseup to us; make sure a
// stuck group can't swallow later edits.
if (typeof window !== 'undefined') {
  window.addEventListener('blur', endUndoGroup);
}
