import { useState, useCallback, useEffect, useRef } from 'react';
import { Header } from './Header';
import { TransportBar } from '../transport/TransportBar';
import { SequencerGrid } from '../sequencer/SequencerGrid';
import { SongArrangement } from '../song/SongArrangement';
import { TheoryTabs } from '../theory/TheoryTabs';
import { useSequencerPlayback } from '../../hooks/useSequencerPlayback';
import { useSongPlayback } from '../../hooks/useSongPlayback';

const MIN_PANEL_WIDTH = 280;
const MAX_PANEL_WIDTH = 700;
const DEFAULT_PANEL_WIDTH = 280;

const MIN_SONG_HEIGHT = 60;
const MAX_SONG_HEIGHT = 400;
const DEFAULT_SONG_HEIGHT = 180;

function StudioView() {
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH);
  const [songHeight, setSongHeight] = useState(DEFAULT_SONG_HEIGHT);
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
        const newWidth = containerRect.right - e.clientX;
        setPanelWidth(Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, newWidth)));
      }
      if (songDragging.current && sequencerColRef.current) {
        const colRect = sequencerColRef.current.getBoundingClientRect();
        const newHeight = colRect.bottom - e.clientY;
        setSongHeight(Math.max(MIN_SONG_HEIGHT, Math.min(MAX_SONG_HEIGHT, newHeight)));
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
  }, []);

  return (
    <div ref={containerRef} className="flex flex-1 overflow-hidden">
      {/* Sequencer side */}
      <div ref={sequencerColRef} className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <TransportBar />
        <SequencerGrid />

        {/* Song resize handle */}
        <div
          onMouseDown={handleSongMouseDown}
          className="h-1.5 shrink-0 cursor-row-resize bg-accent-purple hover:bg-accent-purple/80 active:bg-accent-purple/60 transition-colors relative group"
          title="Drag to resize song section"
        >
          <div className="absolute -top-1 -bottom-1 inset-x-0" />
        </div>

        {/* Song section */}
        <div className="shrink-0 overflow-hidden" style={{ height: songHeight }}>
          <SongArrangement />
        </div>
      </div>

      {/* Theory panel resize handle */}
      <div
        onMouseDown={handleMouseDown}
        className="w-1.5 shrink-0 cursor-col-resize bg-[#28d7d4] hover:bg-[#28d7d4]/80 active:bg-[#28d7d4]/60 transition-colors relative group"
        title="Drag to resize"
      >
        {/* Wider invisible hit area for easier grabbing */}
        <div className="absolute inset-y-0 -left-1 -right-1" />
      </div>

      {/* Theory panel */}
      <div
        className="flex flex-col overflow-hidden bg-bg-secondary shrink-0 min-h-0"
        style={{ width: panelWidth }}
      >
        <TheoryTabs showPiano pianoOctaves={2} pianoStartOctave={4} />
      </div>
    </div>
  );
}

export function AppShell() {
  useSequencerPlayback();
  useSongPlayback();

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-bg-primary">
      <Header />
      <StudioView />
    </div>
  );
}
