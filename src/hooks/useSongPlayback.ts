import { useEffect, useRef } from 'react';
import { AudioEngine, drumStepData, melodicStepData } from '../audio/AudioEngine';
import { useTransportStore } from '../store/useTransportStore';
import { useSequencerStore } from '../store/useSequencerStore';
import { useSongStore } from '../store/useSongStore';

/**
 * Find the next non-muted block index starting from `from`.
 * Returns -1 if no non-muted block is found.
 * When a loop range is active, wraps around from loopEnd to loopStart.
 */
function findNextPlayableBlock(
  blocks: { muted: boolean }[],
  from: number,
  loopStart: number | null,
  loopEnd: number | null,
): number {
  const hasLoop = loopStart !== null && loopEnd !== null;

  // If past the end (or past loopEnd), check for loop wrap
  if (hasLoop && from > loopEnd!) {
    // Loop: wrap back to loopStart
    let idx = loopStart!;
    while (idx <= loopEnd! && blocks[idx]?.muted) idx++;
    return idx <= loopEnd! ? idx : -1;
  }

  // Normal forward search
  let idx = from;
  const end = hasLoop ? loopEnd! : blocks.length - 1;
  while (idx <= end && blocks[idx]?.muted) idx++;

  if (idx <= end) return idx;

  // Past end — check loop wrap
  if (hasLoop) {
    idx = loopStart!;
    while (idx <= loopEnd! && blocks[idx]?.muted) idx++;
    return idx <= loopEnd! ? idx : -1;
  }

  return -1; // No playable block found
}

/**
 * Song playback hook — orchestrates stepping through song blocks
 * using the existing AudioEngine and Tone.js transport.
 *
 * Supports muted block skipping and loop range playback.
 */
export function useSongPlayback() {
  const engine = AudioEngine.getInstance();
  const songState = useSongStore((s) => s.songState);
  const scheduledRef = useRef(false);
  const prevPatternRef = useRef<string | null>(null);

  useEffect(() => {
    if (songState === 'playing') {
      if (!scheduledRef.current) {
        prevPatternRef.current = useSequencerStore.getState().activePatternId;

        const store = useSongStore.getState();
        const blocks = store.blocks;
        const { loopStart, loopEnd } = store;

        if (blocks.length === 0) {
          store.stopSong();
          return;
        }

        // Find first playable block (skip muted), respecting loop range
        const hasLoop = loopStart !== null && loopEnd !== null;
        const startFrom = hasLoop ? loopStart! : 0;
        const firstPlayable = findNextPlayableBlock(blocks, startFrom, loopStart, loopEnd);

        if (firstPlayable === -1) {
          // All blocks muted (or all in loop range muted)
          store.stopSong();
          return;
        }

        // Taking over from the pattern: start the song from its first step
        if (engine.getTransportState() === 'started') engine.stop();

        store.setCurrentBlockIndex(firstPlayable);
        useSequencerStore.getState().setActivePattern(blocks[firstPlayable].patternId);

        engine.setStepCallback((step: number) => {
          useSongStore.getState().setCurrentStep(step);
          useTransportStore.getState().setCurrentStep(step);
        });

        engine.scheduleRepeat(
          () => drumStepData(useSequencerStore.getState().getActivePattern()),
          () => melodicStepData(useSequencerStore.getState().getActivePattern()),
          () => useSequencerStore.getState().getActivePattern().numSteps,
          () => true,
          undefined,
          () => useTransportStore.getState().swing,
          () => useSequencerStore.getState().getActivePattern().stepResolution
        );

        // Step callback with block transitions, mute skipping, and loop support
        engine.setStepCallback((step: number) => {
          const store = useSongStore.getState();
          const blocks = store.blocks;
          const { loopStart, loopEnd } = store;

          if (blocks.length === 0 || store.songState !== 'playing') return;

          const currentBlock = blocks[store.currentBlockIndex];
          if (!currentBlock) {
            stopAndRestore();
            return;
          }

          const pattern = useSequencerStore.getState().patterns.find(
            (p) => p.id === currentBlock.patternId
          );
          if (!pattern) return;

          store.setCurrentStep(step);
          useTransportStore.getState().setCurrentStep(step);

          // Check if we've completed a full pass through the pattern
          if (step === pattern.numSteps - 1) {
            const nextRepeat = store.currentRepeat + 1;

            if (nextRepeat >= currentBlock.repeats) {
              // Move to next block, skipping muted ones
              const nextCandidate = store.currentBlockIndex + 1;
              let nextPlayable = findNextPlayableBlock(blocks, nextCandidate, loopStart, loopEnd);
              // Loop (in the transport) on and no loop range: go round the whole song again
              if (nextPlayable === -1 && useTransportStore.getState().loop) {
                nextPlayable = findNextPlayableBlock(blocks, 0, null, null);
              }

              if (nextPlayable === -1) {
                // Song/loop complete
                setTimeout(() => {
                  const s = useSongStore.getState();
                  if (s.songState === 'playing') stopAndRestore();
                }, 50);
              } else {
                store.setCurrentBlockIndex(nextPlayable);
                store.setCurrentRepeat(0);
                useSequencerStore.getState().setActivePattern(blocks[nextPlayable].patternId);
              }
            } else {
              store.setCurrentRepeat(nextRepeat);
            }
          }
        });

        scheduledRef.current = true;
      }
      engine.start();
    } else {
      if (scheduledRef.current) {
        scheduledRef.current = false;
        // Switching to the pattern: it has already taken the engine over
        if (useTransportStore.getState().state !== 'playing') {
          engine.stop();
          engine.clearSchedule();
          useTransportStore.getState().setCurrentStep(0);
        }
      }
    }

    function stopAndRestore() {
      useSongStore.getState().stopSong();
      engine.stop();
      engine.clearSchedule();
      scheduledRef.current = false;
      if (prevPatternRef.current) {
        useSequencerStore.getState().setActivePattern(prevPatternRef.current);
      }
    }
  }, [songState, engine]);
}
