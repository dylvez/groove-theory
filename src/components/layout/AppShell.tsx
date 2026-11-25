import { useState, useCallback, useEffect, useRef } from 'react';
import { Header } from './Header';
import { TransportBar } from '../transport/TransportBar';
import { SequencerGrid } from '../sequencer/SequencerGrid';
import { SongArrangement } from '../song/SongArrangement';
import { TheoryTabs } from '../theory/TheoryTabs';
import { useSequencerPlayback } from '../../hooks/useSequencerPlayback';
import { useSongPlayback } from '../../hooks/useSongPlayback';
import { useGlobalShortcuts } from '../../hooks/useGlobalShortcuts';
import { useLiveKeys } from '../../hooks/useLiveKeys';
import { reconnectMidi } from '../../audio/midiInput';
import { WelcomeBar } from './WelcomeBar';
import { MidiImportDialog } from '../transport/MidiImportDialog';
import { DialogHost } from '../common/DialogHost';
import {
  useUIStore,
  MIN_PANEL_WIDTH, MAX_PANEL_WIDTH, DEFAULT_PANEL_WIDTH,
  MIN_SONG_HEIGHT, MAX_SONG_HEIGHT, DEFAULT_SONG_HEIGHT,
} from '../../store/useUIStore';
import { PRESET_GROOVES } from '../../constants/presetGrooves';
import { applyGroove } from '../../utils/grooveStorage';
import { isFirstVisit, welcomePending, setWelcomeState, claimDemoLoad, DEMO_PRESET_ID } from '../../utils/firstRun';

function StudioView() {
  const panelOpen = useUIStore(s => s.sidePanelOpen);
  const panelWidth = useUIStore(s => s.sidePanelWidth);
  const setPanelWidth = useUIStore(s => s.setSidePanelWidth);
  const songHeight = useUIStore(s => s.songHeight);
  const setSongHeight = useUIStore(s => s.setSongHeight);
  const dragging = useRef(false);
  const songDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sequencerColRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const handleSongMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    songDragging.current = true;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragging.current && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        setPanelWidth(containerRect.right - e.clientX);
      }
      if (songDragging.current && sequencerColRef.current) {
        const colRect = sequencerColRef.current.getBoundingClientRect();
        setSongHeight(colRect.bottom - e.clientY);
      }
    };

    const handleMouseUp = () => {
      if (dragging.current) {
        dragging.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
      if (songDragging.current) {
        songDragging.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [setPanelWidth, setSongHeight]);

  return (
    <div ref={containerRef} className="flex flex-1 min-h-0 overflow-hidden">
      {/* Sequencer side */}
      <div ref={sequencerColRef} className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <TransportBar />
        <SequencerGrid />

        {/* Song resize handle — drag, arrow keys, or double-click to reset */}
        <div
          role="separator"
          tabIndex={0}
          aria-orientation="horizontal"
          aria-label="Song section height"
          aria-valuemin={MIN_SONG_HEIGHT}
          aria-valuemax={MAX_SONG_HEIGHT}
          aria-valuenow={songHeight}
          onMouseDown={handleSongMouseDown}
          onDoubleClick={() => setSongHeight(DEFAULT_SONG_HEIGHT)}
          onKeyDown={(e) => {
            const step = e.key === 'ArrowUp' ? 20 : e.key === 'ArrowDown' ? -20 : 0;
            if (step) { e.preventDefault(); setSongHeight(songHeight + step); }
            if (e.key === 'Home') { e.preventDefault(); setSongHeight(MIN_SONG_HEIGHT); }
            if (e.key === 'End') { e.preventDefault(); setSongHeight(MAX_SONG_HEIGHT); }
          }}
          className="h-1.5 shrink-0 cursor-row-resize bg-accent-purple hover:bg-accent-purple/80 active:bg-accent-purple/60 transition-colors relative group"
          title="Drag, or use the up and down arrow keys, to resize the song section. Double-click to reset. Preset sizes are in the Layout menu."
        >
          <div className="absolute -top-1 -bottom-1 inset-x-0" />
        </div>

        {/* Song section */}
        {/* Capped so the grid keeps room when the window is short or zoomed in */}
        <section aria-labelledby="song-heading" className="shrink-0 overflow-hidden" style={{ height: songHeight, maxHeight: '35%' }}>
          <SongArrangement />
        </section>
      </div>

      {/* Theory panel resize handle */}
      {panelOpen && (
        <div
          role="separator"
          tabIndex={0}
          aria-orientation="vertical"
          aria-label="Side panel width"
          aria-valuemin={MIN_PANEL_WIDTH}
          aria-valuemax={MAX_PANEL_WIDTH}
          aria-valuenow={panelWidth}
          onMouseDown={handleMouseDown}
          onDoubleClick={() => setPanelWidth(DEFAULT_PANEL_WIDTH)}
          onKeyDown={(e) => {
            // The panel is on the right, so ArrowLeft makes it wider
            const step = e.key === 'ArrowLeft' ? 20 : e.key === 'ArrowRight' ? -20 : 0;
            if (step) { e.preventDefault(); setPanelWidth(panelWidth + step); }
            if (e.key === 'Home') { e.preventDefault(); setPanelWidth(MIN_PANEL_WIDTH); }
            if (e.key === 'End') { e.preventDefault(); setPanelWidth(MAX_PANEL_WIDTH); }
          }}
          className="w-1.5 shrink-0 cursor-col-resize bg-accent-teal hover:bg-accent-teal/80 active:bg-accent-teal/60 transition-colors relative group"
          title="Drag, or use the left and right arrow keys, to resize the side panel. Double-click to reset. Preset sizes are in the Layout menu."
        >
          {/* Wider invisible hit area for easier grabbing */}
          <div className="absolute inset-y-0 -left-1 -right-1" />
        </div>
      )}

      {/* Beats / Harmony panel. Kept mounted while hidden so it keeps its state. */}
      <aside
        id="side-panel"
        aria-labelledby="theory-heading"
        hidden={!panelOpen}
        className="flex flex-col overflow-hidden bg-bg-secondary shrink-0 min-h-0"
        style={{ width: panelWidth }}
      >
        <h2 id="theory-heading" className="sr-only">Beats and Harmony</h2>
        <TheoryTabs showPiano pianoOctaves={2} pianoStartOctave={4} />
      </aside>
    </div>
  );
}

export function AppShell() {
  useSequencerPlayback();
  useSongPlayback();
  useGlobalShortcuts();
  useLiveKeys();
  // A MIDI keyboard the user connected before comes back without asking
  useEffect(() => { reconnectMidi(); }, []);

  // First visit: start with a demo song instead of an empty grid
  const [showWelcome, setShowWelcome] = useState(welcomePending);
  useEffect(() => {
    if (!isFirstVisit || !claimDemoLoad()) return;
    const demo = PRESET_GROOVES.find(p => p.id === DEMO_PRESET_ID);
    if (demo) applyGroove(structuredClone(demo.groove));
    setWelcomeState('shown');
  }, []);
  const midiImport = useUIStore(s => s.midiImport);
  const dismissWelcome = useCallback(() => {
    setWelcomeState('dismissed');
    setShowWelcome(false);
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-bg-primary">
      <Header />
      <main className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {showWelcome && <WelcomeBar onDismiss={dismissWelcome} />}
        <StudioView />
      </main>
      {midiImport && <MidiImportDialog file={midiImport} />}
      <DialogHost />
    </div>
  );
}
