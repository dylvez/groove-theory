import { useCallback, useState } from 'react';
import { PRESET_GROOVES } from '../../constants/presetGrooves';
import { useSongStore } from '../../store/useSongStore';
import { useTransportStore } from '../../store/useTransportStore';
import { useSequencerStore } from '../../store/useSequencerStore';
import { useUIStore } from '../../store/useUIStore';
import { withUndoGroup } from '../../store/history';
import { applyGroove } from '../../utils/grooveStorage';
import { playSongNow } from '../../utils/playback';
import { RingMark } from '../common/RhythmRing';
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
  const stopSong = useSongStore(s => s.stopSong);
  const clearSong = useSongStore(s => s.clearSong);
  const clearAllPatterns = useSequencerStore(s => s.clearAllPatterns);
  const setHelpOpen = useUIStore(s => s.setHelpOpen);
  const [demoId, setDemoId] = useState(DEMO_PRESET_ID);

  const demos = PRESET_GROOVES.filter(p => p.category === 'song');
  const demo = demos.find(d => d.id === demoId) ?? demos[0];
  const playing = songState === 'playing';

  // Plays the song and leaves the main Play switch on Song, so Space carries on from here
  const togglePlay = useCallback(async () => {
    if (useSongStore.getState().songState === 'playing') { stopSong(); return; }
    await playSongNow();
  }, [stopSong]);

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
      className="shrink-0 border-b border-border bg-bg-secondary px-4 sm:px-6 py-2.5 flex flex-wrap items-center gap-x-6 gap-y-2"
    >
      <div className="min-w-0 flex-1 basis-80 flex items-center gap-3">
        <RingMark size={34} />
        <div className="min-w-0">
        <h2 id="welcome-title" className="font-display text-[15px] font-bold tracking-tight text-text-primary">Welcome to Groove Theory</h2>
        <p className="text-xs text-text-secondary">
          A demo song, <strong className="text-text-primary">{demo.name}</strong> ({demo.genre}), is loaded so you can hear what this does.
          Play it, change the grid, or start fresh. Everything stays in your browser.
        </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={togglePlay}
          className={`flex items-center gap-1.5 h-8 px-4 rounded-full text-xs font-semibold cursor-pointer transition-[box-shadow,filter] ${
            playing
              ? 'bg-accent-red text-white shadow-[0_0_16px_rgb(239_68_68/0.5)]'
              : 'bg-[#3ddc84] text-bg-primary shadow-[0_0_16px_rgb(61_220_132/0.45)] hover:brightness-110'
          }`}
        >
          <span aria-hidden="true">{playing ? '■' : '▶'}</span>
          {playing ? 'Stop the demo' : 'Play the demo'}
        </button>

        <div role="group" aria-labelledby="welcome-other" className="flex items-center gap-1">
          <span id="welcome-other" className="text-xs text-text-muted mr-1">Other demos</span>
          {demos.filter(d => d.id !== demo.id).map(d => (
            <button
              key={d.id}
              onClick={() => loadDemo(d.id)}
              title={`${d.genre} · ${d.bpm} BPM`}
              className="pill"
            >
              {d.name}
            </button>
          ))}
        </div>

        <button
          onClick={startEmpty}
          className="pill"
        >
          Start with an empty grid
        </button>
        <button
          onClick={() => setHelpOpen(true)}
          aria-haspopup="dialog"
          className="min-h-7 px-2 rounded-full text-xs text-text-primary underline decoration-border-control underline-offset-2 hover:decoration-text-primary cursor-pointer"
        >
          How it works
        </button>
        <button
          onClick={onDismiss}
          aria-label="Dismiss the welcome message"
          title="Dismiss"
          className="w-8 h-8 flex items-center justify-center rounded-full text-text-muted hover:text-text-primary hover:bg-bg-cell cursor-pointer"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
    </section>
  );
}
