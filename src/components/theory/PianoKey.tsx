import type { NoteName } from '../../types';
import { isBlackKey } from '../../utils/noteHelpers';

interface PianoKeyProps {
  note: NoteName;
  octave: number;
  isInScale: boolean;
  isInChord: boolean;
  isRoot: boolean;
  scaleDegree: number;
  onPlay: () => void;
}

export function PianoKey({ note, isInScale, isInChord, isRoot, scaleDegree, onPlay }: PianoKeyProps) {
  const black = isBlackKey(note);

  const getHighlightColor = () => {
    if (isRoot) return black ? 'bg-accent-orange' : 'bg-accent-orange/80';
    if (isInChord && isInScale) return black ? 'bg-[#00BCD4]' : 'bg-accent-cyan/40';
    if (isInChord) return black ? 'bg-accent-blue' : 'bg-accent-blue/30';
    if (isInScale) return black ? 'bg-accent-cyan/70' : 'bg-accent-cyan/20';
    return '';
  };

  if (black) {
    return (
      <button
        onMouseDown={onPlay}
        className={`absolute w-8 h-20 rounded-b-md z-10 border border-border/50 cursor-pointer transition-colors ${
          getHighlightColor() || 'bg-gray-900 hover:bg-gray-700'
        }`}
        style={{ marginLeft: '-16px' }}
      >
        {isInScale && scaleDegree >= 0 && (
          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[11px] text-white/80 font-medium">
            {note}
          </span>
        )}
      </button>
    );
  }

  return (
    <button
      onMouseDown={onPlay}
      className={`relative w-11 h-32 rounded-b-lg border border-border/30 cursor-pointer transition-colors flex flex-col items-center justify-end pb-2 ${
        getHighlightColor() || 'bg-white hover:bg-gray-100'
      } ${isInScale || isInChord || isRoot ? 'text-white' : 'text-gray-600'}`}
    >
      <span className="text-[11px] font-medium">{note}</span>
      {isInScale && scaleDegree >= 0 && (
        <span className="text-[11px] opacity-70">{scaleDegree + 1}</span>
      )}
    </button>
  );
}
