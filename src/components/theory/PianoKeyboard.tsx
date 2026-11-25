import { useCallback } from 'react';
import type { NoteName, NoteWithOctave } from '../../types';
import { NOTE_NAMES } from '../../constants';
import { useTheoryStore } from '../../store/useTheoryStore';
import { useUIStore } from '../../store/useUIStore';
import { AudioEngine } from '../../audio/AudioEngine';
import { useKeyboardInput } from '../../hooks/useKeyboardInput';
import { isBlackKey, spokenNote } from '../../utils/noteHelpers';
import { getScaleNotes, getChordNotes, getScaleDegree } from '../../utils/musicTheory';

interface PianoKeyboardProps {
  startOctave?: number;
  numOctaves?: number;
}

export function PianoKeyboard({ startOctave = 3, numOctaves = 3 }: PianoKeyboardProps) {
  const rootNote = useTheoryStore(s => s.rootNote);
  const selectedScale = useTheoryStore(s => s.selectedScale);
  const chordRoot = useTheoryStore(s => s.chordRoot);
  const selectedChord = useTheoryStore(s => s.selectedChord);
  const highlightMode = useTheoryStore(s => s.highlightMode);
  // When a sequencer track is armed, the keyboard plays that track instead
  const armedTrackId = useUIStore(s => s.armedTrackId);
  const singleKeyShortcuts = useUIStore(s => s.singleKeyShortcuts);

  const scaleNotes = getScaleNotes(rootNote, selectedScale);
  const chordNotes = highlightMode === 'chord' ? getChordNotes(chordRoot, selectedChord) : [];

  const playNote = useCallback((note: NoteWithOctave) => {
    const engine = AudioEngine.getInstance();
    // The first sound needs the audio context started by a user gesture
    engine.init().then(() => engine.synthEngine.previewNote(note, '8n'));
  }, []);

  const keyLabel = (note: NoteName, octave: number, inScale: boolean, isRoot: boolean, degree: number) => {
    const name = spokenNote(`${note}${octave}`);
    if (isRoot) return `${name}, root`;
    if (inScale && degree >= 0) return `${name}, scale degree ${degree + 1}`;
    return name;
  };

  // Mouse plays on press for responsiveness; keyboard and screen readers send a click
  const keyHandlers = (noteStr: NoteWithOctave) => ({
    onMouseDown: () => playNote(noteStr),
    onClick: (e: React.MouseEvent) => { if (e.detail === 0) playNote(noteStr); },
  });

  // Letter keys play this piano only while it's on screen
  const panelOpen = useUIStore(s => s.sidePanelOpen);
  useKeyboardInput({
    baseOctave: startOctave + 1,
    onNoteOn: playNote,
    enabled: armedTrackId === null && singleKeyShortcuts && panelOpen,
  });

  // Build key layout
  const keys: { note: NoteName; octave: number; isBlack: boolean }[] = [];
  for (let oct = startOctave; oct < startOctave + numOctaves; oct++) {
    for (const note of NOTE_NAMES) {
      keys.push({ note, octave: oct, isBlack: isBlackKey(note) });
    }
  }
  // Add final C
  keys.push({ note: 'C', octave: startOctave + numOctaves, isBlack: false });

  const whiteKeys = keys.filter(k => !k.isBlack);
  const blackKeys = keys.filter(k => k.isBlack);

  // Position mapping for black keys relative to white key index
  const blackKeyPositions: Record<string, number> = {
    'C#': 0.65, 'D#': 1.65, 'F#': 3.65, 'G#': 4.65, 'A#': 5.65,
  };

  return (
    <div className="relative select-none w-max" role="group" aria-label="Piano">
      {/* White keys */}
      <div className="flex">
        {whiteKeys.map((k, i) => {
          const noteStr = `${k.note}${k.octave}` as NoteWithOctave;
          const isInScale = scaleNotes.includes(k.note);
          const isInChord = chordNotes.includes(k.note);
          const isRoot = k.note === rootNote;
          const degree = getScaleDegree(k.note, rootNote, selectedScale);

          // Degree label color based on scale/chord context — darker shades so
          // they keep at least 4.5:1 contrast on the white keys
          const getDegreeColor = () => {
            if (isRoot) return 'text-orange-700';
            if (highlightMode === 'chord' && isInChord && isInScale) return 'text-cyan-800';
            if (highlightMode === 'chord' && isInChord) return 'text-blue-700';
            if (isInScale) return 'text-cyan-800';
            return '';
          };

          return (
            <button
              key={`${k.note}${k.octave}-${i}`}
              {...keyHandlers(noteStr)}
              aria-label={keyLabel(k.note, k.octave, isInScale, isRoot, degree)}
              className="focus-on-light relative w-11 shrink-0 h-32 rounded-b-lg border border-gray-400 cursor-pointer transition-colors flex flex-col items-center justify-end pb-2 bg-[#ececf1] hover:bg-white active:bg-gray-200"
            >
              <span aria-hidden="true" className={`text-[11px] font-medium ${isInScale ? getDegreeColor() : 'text-gray-600'}`}>{k.note}</span>
              {isInScale && degree >= 0 && (
                <span aria-hidden="true" className={`text-[11px] font-bold ${getDegreeColor()}`}>{degree + 1}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Black keys */}
      {blackKeys.map((k) => {
        const noteStr = `${k.note}${k.octave}` as NoteWithOctave;
        const isInScale = scaleNotes.includes(k.note);
        const isInChord = chordNotes.includes(k.note);
        const isRoot = k.note === rootNote;
        const degree = getScaleDegree(k.note, rootNote, selectedScale);

        // Calculate position
        const octOffset = k.octave - startOctave;
        const posInOctave = blackKeyPositions[k.note] || 0;
        const whiteKeyWidth = 44; // w-11 = 2.75rem = 44px
        const leftPos = (octOffset * 7 + posInOctave) * whiteKeyWidth;

        // Degree label color based on scale/chord context
        const getDegreeColor = () => {
          if (isRoot) return 'text-accent-orange-fg';
          if (highlightMode === 'chord' && isInChord && isInScale) return 'text-accent-cyan-fg';
          if (highlightMode === 'chord' && isInChord) return 'text-accent-blue-fg';
          if (isInScale) return 'text-accent-cyan-fg';
          return '';
        };

        return (
          <button
            key={`${k.note}${k.octave}`}
            {...keyHandlers(noteStr)}
            aria-label={keyLabel(k.note, k.octave, isInScale, isRoot, degree)}
            className="absolute top-0 w-7 h-20 rounded-b-md z-10 border border-border-soft cursor-pointer transition-colors flex flex-col items-end justify-center pb-1 bg-[#1c1c25] hover:bg-[#2a2a36] active:bg-[#34344a]"
            style={{ left: `${leftPos}px` }}
          >
            {isInScale && degree >= 0 && (
              <span aria-hidden="true" className={`text-[11px] font-bold w-full text-center ${getDegreeColor()}`}>{degree + 1}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
