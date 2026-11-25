import { useEffect, useRef } from 'react';
import { AudioEngine, drumStepData, melodicStepData } from '../audio/AudioEngine';
import { useTransportStore } from '../store/useTransportStore';
import { useSequencerStore } from '../store/useSequencerStore';
import { useSongStore } from '../store/useSongStore';

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

  // Schedule and start/stop. Pattern and song playback share one engine, and
  // the Play switch can hand it from one to the other while it runs, so each
  // side resets the clock when it takes over and leaves it alone once the
  // other side has it.
  useEffect(() => {
    if (transportState === 'playing') {
      if (!scheduledRef.current) {
        // Taking over from the song: start the pattern from its first step
        if (engine.getTransportState() === 'started') engine.stop();
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
    } else if (scheduledRef.current) {
      scheduledRef.current = false;
      // Switching to the song: it has already taken the engine over
      if (useSongStore.getState().songState !== 'playing') {
        engine.stop();
        engine.clearSchedule();
      }
    }
  }, [transportState, engine, setCurrentStep]);
}
