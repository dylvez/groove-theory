import { useEffect, useRef } from 'react';
import { AudioEngine } from '../audio/AudioEngine';
import { useTransportStore } from '../store/useTransportStore';
import { useSequencerStore } from '../store/useSequencerStore';

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
                active: step === 1,
                muted: isMuted,
                synthParams: track.synthParams,
                volume: track.volume,
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
                note: step.note,
                active: step.active,
                muted: isMuted,
                synthType: track.synthType,
                synthParams: track.synthParams,
                volume: track.volume,
              }));
            });
          },
          () => useSequencerStore.getState().getActivePattern().numSteps,
          () => useTransportStore.getState().loop,
          () => useTransportStore.getState().stop(),
          () => useTransportStore.getState().swing
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
