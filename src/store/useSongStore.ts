import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as history from './history';

export interface SongBlock {
  id: string;
  patternId: string; // "pattern-a" | "pattern-b" | "pattern-c" | "pattern-d"
  repeats: number;   // 1–99
  muted: boolean;
  sectionLabel?: string;
}

interface SongStore {
  blocks: SongBlock[];
  songState: 'stopped' | 'playing';
  currentBlockIndex: number;
  currentRepeat: number;
  currentStep: number;
  loopStart: number | null;
  loopEnd: number | null;

  // Block management
  addBlock: (patternId: string) => void;
  removeBlock: (blockId: string) => void;
  reorderBlock: (fromIndex: number, toIndex: number) => void;
  setBlockPattern: (blockId: string, patternId: string) => void;
  setBlockRepeats: (blockId: string, repeats: number) => void;
  duplicateBlock: (blockId: string) => void;
  toggleBlockMute: (blockId: string) => void;
  insertBlock: (patternId: string, atIndex: number) => void;
  setSectionLabel: (blockId: string, label: string | null) => void;
  duplicateSection: (startIndex: number, endIndex: number) => void;
  clearSong: () => void;
  loadBlocks: (blocks: SongBlock[]) => void;

  // Loop
  setLoopRange: (start: number | null, end: number | null) => void;
  clearLoopRange: () => void;

  // Song transport
  playSong: () => void;
  stopSong: () => void;
  setCurrentBlockIndex: (index: number) => void;
  setCurrentRepeat: (repeat: number) => void;
  setCurrentStep: (step: number) => void;
}

function uid(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export const useSongStore = create<SongStore>()(
  persist(
    (_set, get) => {
      // Record arrangement edits in the shared undo history
      const set = (
        partial: SongStore | Partial<SongStore> | ((state: SongStore) => SongStore | Partial<SongStore>),
        replace?: boolean,
      ) => {
        const prevBlocks = get().blocks;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        _set(partial as any, replace as any);
        if (get().blocks !== prevBlocks) history.recordChange({ blocks: prevBlocks });
      };
      history.registerSongHistory(
        () => get().blocks,
        (blocks) => _set((s) => ({
          blocks,
          // A loop range that points past the restored arrangement is dropped
          ...(s.loopEnd !== null && s.loopEnd >= blocks.length ? { loopStart: null, loopEnd: null } : {}),
        })),
      );

      return {
      blocks: [],
      songState: 'stopped',
      currentBlockIndex: 0,
      currentRepeat: 0,
      currentStep: 0,
      loopStart: null,
      loopEnd: null,

      addBlock: (patternId) =>
        set((s) => ({
          blocks: [...s.blocks, { id: uid(), patternId, repeats: 1, muted: false }],
        })),

      removeBlock: (blockId) =>
        set((s) => ({
          blocks: s.blocks.filter((b) => b.id !== blockId),
        })),

      reorderBlock: (fromIndex, toIndex) =>
        set((s) => {
          const blocks = [...s.blocks];
          const [moved] = blocks.splice(fromIndex, 1);
          blocks.splice(toIndex, 0, moved);
          return { blocks };
        }),

      setBlockPattern: (blockId, patternId) =>
        set((s) => ({
          blocks: s.blocks.map((b) =>
            b.id === blockId ? { ...b, patternId } : b
          ),
        })),

      setBlockRepeats: (blockId, repeats) => history.coalesced(`repeats:${blockId}`, () =>
        set((s) => ({
          blocks: s.blocks.map((b) =>
            b.id === blockId ? { ...b, repeats: Math.max(1, Math.min(99, repeats)) } : b
          ),
        }))),

      duplicateBlock: (blockId) =>
        set((s) => {
          const idx = s.blocks.findIndex((b) => b.id === blockId);
          if (idx === -1) return s;
          const original = s.blocks[idx];
          const copy: SongBlock = { ...original, id: uid(), sectionLabel: undefined };
          const blocks = [...s.blocks];
          blocks.splice(idx + 1, 0, copy);
          return { blocks };
        }),

      toggleBlockMute: (blockId) =>
        set((s) => ({
          blocks: s.blocks.map((b) =>
            b.id === blockId ? { ...b, muted: !b.muted } : b
          ),
        })),

      insertBlock: (patternId, atIndex) =>
        set((s) => {
          const blocks = [...s.blocks];
          blocks.splice(atIndex, 0, { id: uid(), patternId, repeats: 1, muted: false });
          return { blocks };
        }),

      setSectionLabel: (blockId, label) =>
        set((s) => ({
          blocks: s.blocks.map((b) =>
            b.id === blockId ? { ...b, sectionLabel: label || undefined } : b
          ),
        })),

      duplicateSection: (startIndex, endIndex) =>
        set((s) => {
          const sectionBlocks = s.blocks.slice(startIndex, endIndex + 1);
          const copies = sectionBlocks.map((b, i) => ({
            ...b,
            id: uid(),
            // Only keep section label on the first block of the copy
            sectionLabel: i === 0 ? b.sectionLabel : undefined,
          }));
          const blocks = [...s.blocks];
          blocks.splice(endIndex + 1, 0, ...copies);
          return { blocks };
        }),

      clearSong: () =>
        set({
          blocks: [],
          songState: 'stopped',
          currentBlockIndex: 0,
          currentRepeat: 0,
          currentStep: 0,
          loopStart: null,
          loopEnd: null,
        }),

      loadBlocks: (blocks) =>
        set({
          // Ensure backward compat: old blocks may lack muted field
          blocks: blocks.map((b) => ({ ...b, muted: b.muted ?? false })),
          songState: 'stopped',
          currentBlockIndex: 0,
          currentRepeat: 0,
          currentStep: 0,
          loopStart: null,
          loopEnd: null,
        }),

      setLoopRange: (start, end) => set({ loopStart: start, loopEnd: end }),
      clearLoopRange: () => set({ loopStart: null, loopEnd: null }),

      playSong: () =>
        set({
          songState: 'playing',
          currentBlockIndex: 0,
          currentRepeat: 0,
          currentStep: 0,
        }),

      stopSong: () =>
        set({
          songState: 'stopped',
          currentBlockIndex: 0,
          currentRepeat: 0,
          currentStep: 0,
        }),

      setCurrentBlockIndex: (index) => set({ currentBlockIndex: index }),
      setCurrentRepeat: (repeat) => set({ currentRepeat: repeat }),
      setCurrentStep: (step) => _set({ currentStep: step }),
    };
    },
    {
      name: 'groove-theory-song',
      version: 2,
      partialize: (state) => ({
        blocks: state.blocks,
        loopStart: state.loopStart,
        loopEnd: state.loopEnd,
      }),
      migrate: (persisted: unknown, version: number) => {
        if (version < 2) {
          const old = persisted as { blocks?: Array<Record<string, unknown>> };
          return {
            ...old,
            blocks: (old.blocks ?? []).map((b) => ({ ...b, muted: false })),
            loopStart: null,
            loopEnd: null,
          };
        }
        return persisted;
      },
    }
  )
);
