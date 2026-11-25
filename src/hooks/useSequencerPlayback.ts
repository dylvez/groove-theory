import { useEffect, useRef } from 'react';
import { AudioEngine, drumStepData, melodicStepData } from '../audio/AudioEngine';
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
          () => drumStepData(useSequencerStore.getState().getActivePattern()),
          () => melodicStepData(useSequencerStore.getState().getActivePattern()),
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
