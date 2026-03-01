import { useState, useCallback } from 'react';
import { AudioEngine } from './AudioEngine';

export function useAudioInit() {
  const [ready, setReady] = useState(false);

  const init = useCallback(async () => {
    if (ready) return;
    const engine = AudioEngine.getInstance();
    await engine.init();
    setReady(true);
  }, [ready]);

  return { ready, init };
}
