import { useEffect, useRef } from 'react';
import { AudioEngine } from '../audio/AudioEngine';
import { useTransportStore } from '../store/useTransportStore';
import { useSequencerStore } from '../store/useSequencerStore';
import { stepNotes } from '../utils/melodicNotes';

export function useSequencerPlayback() {
  const engine = AudioEngine.getInstance();
  const bpm = useTransportStore(s => s.bpm);
  const transportState = useTransportStore(s => s.state);
  const setCurrentStep = useTransportStore(s => s.setCurrentStep);
  const scheduledRef = useRef(false);

  // Sync BPM
  useEffect(() => {
    engine.setBpm(bpm);
  }, [bpm, engine]);

  // Schedule and start/stop
  useEffect(() => {
    if (transportState === 'playing') {
      if (!scheduledRef.current) {
        engine.setStepCallback(setCurrentStep);

        engine.scheduleRepeat(
          // Read drum steps imperatively to avoid stale closures
          () => {
            const pattern = useSequencerStore.getState().getActivePattern();
            const hasSolo = pattern.drumTracks.some(t => t.solo);
            return pattern.drumTracks.map(track => {
              const isMuted = track.muted || (hasSolo && !track.solo);
              return track.steps.map(step => ({
                sampleKey: track.sampleKey,
                velocity: step,
                muted: isMuted,
                synthParams: track.synthParams,
                volume: track.volume,
                reverbSend: track.reverbSend ?? 0,
                delaySend: track.delaySend ?? 0,
              }));
            });
          },
          // Read melodic steps imperatively
          () => {
            const pattern = useSequencerStore.getState().getActivePattern();
            const hasSolo = pattern.melodicTracks.some(t => t.solo);
            return pattern.melodicTracks.map(track => {
              const isMuted = track.muted || (hasSolo && !track.solo);
              return track.steps.map(step => ({
                trackId: track.id,
                notes: stepNotes(step),
                muted: isMuted,
                synthType: track.synthType,
                synthParams: track.synthParams,
                volume: track.volume,
                reverbSend: track.reverbSend ?? 0,
                delaySend: track.delaySend ?? 0,
              }));
            });
          },
          () => useSequencerStore.getState().getActivePattern().numSteps,
          () => useTransportStore.getState().loop,
          () => useTransportStore.getState().stop(),
          () => useTransportStore.getState().swing,
          () => useSequencerStore.getState().getActivePattern().stepResolution
        );
        scheduledRef.current = true;
      }
      engine.start();
    } else {
      engine.stop();
      engine.clearSchedule();
      scheduledRef.current = false;
    }
  }, [transportState, engine, setCurrentStep]);
}
