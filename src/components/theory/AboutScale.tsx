import { announce } from '../../utils/announce';
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
      <h4 className="label-caps mb-1.5">
        About this scale
      </h4>
      <p className="text-xs text-text-secondary leading-relaxed">
        {description}
      </p>
      {songs && songs.length > 0 && (
        <>
          <h4 className="label-caps mt-3 mb-1.5">
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
                  onClick={() => { setRootNote(song.key as NoteName); announce(`Key set to ${song.key} ${selectedScale.name}`); }}
                  className="inline-flex items-center min-h-6 px-0.5 -my-1 text-accent-blue-fg font-bold underline decoration-dotted hover:decoration-solid cursor-pointer"
                  title={`Set key to ${song.key}`}
                  aria-label={`${song.key} ${selectedScale.name} — set the key`}
                >
                  {song.key} {selectedScale.name}
                </button>
                )
              </span>
            ))}
          </p>
        </>
      )}
    </div>
  );
}
