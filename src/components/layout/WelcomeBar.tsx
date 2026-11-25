import { useCallback, useState } from 'react';
import { PRESET_GROOVES } from '../../constants/presetGrooves';
import { useSongStore } from '../../store/useSongStore';
import { useTransportStore } from '../../store/useTransportStore';
import { useSequencerStore } from '../../store/useSequencerStore';
import { useUIStore } from '../../store/useUIStore';
import { withUndoGroup } from '../../store/history';
import { AudioEngine } from '../../audio/AudioEngine';
import { applyGroove } from '../../utils/grooveStorage';
import { confirmReplaceWork } from '../../utils/workState';
import { announce } from '../../utils/announce';
import { DEMO_PRESET_ID } from '../../utils/firstRun';

/**
 * Shown on a first visit, above the studio, with a demo song already loaded.
 * It doesn't take focus or block anything: play the demo, try another, start
 * empty, open Help, or dismiss it.
 */
export function WelcomeBar({ onDismiss }: { onDismiss: () => void }) {
  const songState = useSongStore(s => s.songState);
  const playSong = useSongStore(s => s.playSong);
  const stopSong = useSongStore(s => s.stopSong);
  const clearSong = useSongStore(s => s.clearSong);
  const clearAllPatterns = useSequencerStore(s => s.clearAllPatterns);
  const setHelpOpen = useUIStore(s => s.setHelpOpen);
  const [demoId, setDemoId] = useState(DEMO_PRESET_ID);

  const demos = PRESET_GROOVES.filter(p => p.category === 'song');
  const demo = demos.find(d => d.id === demoId) ?? demos[0];
  const playing = songState === 'playing';

  const togglePlay = useCallback(async () => {
    if (useSongStore.getState().songState === 'playing') { stopSong(); return; }
    await AudioEngine.getInstance().init();
    const transport = useTransportStore.getState();
    if (transport.state === 'playing') transport.stop();
    playSong();
  }, [playSong, stopSong]);

  const loadDemo = async (id: string) => {
    const preset = demos.find(d => d.id === id);
    if (!preset || !(await confirmReplaceWork(`Opening the demo "${preset.name}"`))) return;
    stopSong();
    applyGroove(structuredClone(preset.groove));
    setDemoId(id);
    announce(`Loaded ${preset.name}. Press Play the demo to hear it.`);
  };

  const startEmpty = () => {
    stopSong();
    useTransportStore.getState().stop();
    withUndoGroup(() => {
      clearAllPatterns();
      clearSong();
    });
    announce('Empty grid. Undo brings the demo back.');
    onDismiss();
  };

  return (
    <section
      aria-labelledby="welcome-title"
      className="shrink-0 border-b border-accent-teal/40 bg-gradient-to-r from-accent-teal/10 via-bg-secondary to-accent-purple/10 px-4 sm:px-6 py-2.5 flex flex-wrap items-center gap-x-6 gap-y-2"
    >
      <div className="min-w-0 flex-1 basis-80">
        <h2 id="welcome-title" className="text-sm font-semibold text-text-primary">Welcome to Groove Theory</h2>
        <p className="text-xs text-text-secondary">
          A demo song, <strong className="text-text-primary">{demo.name}</strong> ({demo.genre}), is loaded so you can hear what this does.
          Play it, change the grid, or start fresh. Everything stays in your browser.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={togglePlay}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
            playing ? 'bg-accent-red text-on-accent' : 'bg-accent-green text-on-accent hover:brightness-110'
          }`}
        >
          <span aria-hidden="true">{playing ? '■' : '▶'}</span>
          {playing ? 'Stop the demo' : 'Play the demo'}
        </button>

        <div role="group" aria-labelledby="welcome-other" className="flex items-center gap-1">
          <span id="welcome-other" className="text-[11px] text-text-muted mr-1">Other demos</span>
          {demos.filter(d => d.id !== demo.id).map(d => (
            <button
              key={d.id}
              onClick={() => loadDemo(d.id)}
              title={`${d.genre} · ${d.bpm} BPM`}
              className="px-2 py-1 min-h-6 rounded text-[11px] text-text-secondary bg-bg-cell border border-border-control hover:text-text-primary hover:bg-bg-cell-hover cursor-pointer transition-colors"
            >
              {d.name}
            </button>
          ))}
        </div>

        <button
          onClick={startEmpty}
          className="px-2 py-1 min-h-6 rounded text-[11px] text-text-secondary bg-bg-cell border border-border-control hover:text-text-primary hover:bg-bg-cell-hover cursor-pointer transition-colors"
        >
          Start with an empty grid
        </button>
        <button
          onClick={() => setHelpOpen(true)}
          aria-haspopup="dialog"
          className="px-2 py-1 min-h-6 rounded text-[11px] text-accent-teal-fg underline decoration-dotted hover:decoration-solid cursor-pointer"
        >
          How it works
        </button>
        <button
          onClick={onDismiss}
          aria-label="Dismiss the welcome message"
          title="Dismiss"
          className="w-7 h-7 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-bg-cell cursor-pointer"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
    </section>
  );
}
