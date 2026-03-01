import { useTheoryStore } from '../../store/useTheoryStore';
import { SCALE_DESCRIPTIONS, SCALE_SONG_EXAMPLES } from '../../constants/scaleDescriptions';
import type { NoteName } from '../../types';

export function AboutScale() {
  const selectedScale = useTheoryStore(s => s.selectedScale);
  const setRootNote = useTheoryStore(s => s.setRootNote);
  const description = SCALE_DESCRIPTIONS[selectedScale.name];
  const songs = SCALE_SONG_EXAMPLES[selectedScale.name];

  if (!description) return null;

  return (
    <div>
      <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
        About this scale
      </h4>
      <p className="text-xs text-text-secondary leading-relaxed">
        {description}
      </p>
      {songs && songs.length > 0 && (
        <>
          <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mt-3 mb-1.5">
            Songs in this {selectedScale.mode ? 'mode' : 'scale'}
          </h4>
          <p className="text-xs text-text-secondary leading-relaxed">
            {songs.map((song, i) => (
              <span key={i}>
                {i > 0 && ' | '}
                <a
                  href={song.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent underline"
                >
                  {song.title}
                </a>
                {' '}(
                <button
                  onClick={() => setRootNote(song.key as NoteName)}
                  className="text-accent-blue font-bold hover:underline cursor-pointer"
                  title={`Set key to ${song.key}`}
                >
                  {song.key}
                </button>
                {' '}{selectedScale.name})
              </span>
            ))}
          </p>
        </>
      )}
    </div>
  );
}
