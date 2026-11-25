import { AudioEngine } from '../audio/AudioEngine';
import { useSongStore } from '../store/useSongStore';
import { useTransportStore } from '../store/useTransportStore';
import { useUIStore, type PlayMode } from '../store/useUIStore';
import { announce } from './announce';

/**
 * One Play button for the whole app. It plays either the selected pattern on
 * a loop or the song arrangement, chosen with the Pattern / Song switch next
 * to it. Space, the Play button and the welcome bar all come through here.
 */

/** Song only when there is something to play, otherwise the pattern */
export function effectivePlayMode(mode: PlayMode, songBlocks: number): PlayMode {
  return mode === 'song' && songBlocks > 0 ? 'song' : 'pattern';
}

export function isPlaying(): boolean {
  return useTransportStore.getState().state === 'playing' || useSongStore.getState().songState === 'playing';
}

export function stopPlayback() {
  const transport = useTransportStore.getState();
  const song = useSongStore.getState();
  if (transport.state === 'playing') transport.stop();
  if (song.songState === 'playing') song.stopSong();
}

async function start(mode: PlayMode) {
  await AudioEngine.getInstance().init();
  stopPlayback();
  if (mode === 'song') useSongStore.getState().playSong();
  else useTransportStore.getState().play();
}

/** Play / Stop: stops whatever is playing, or plays the chosen mode */
export async function togglePlayback() {
  if (isPlaying()) { stopPlayback(); return; }
  const mode = effectivePlayMode(useUIStore.getState().playMode, useSongStore.getState().blocks.length);
  await start(mode);
}

/** Choose what Play plays. While something is playing, switch over to it straight away. */
export async function choosePlayMode(mode: PlayMode) {
  if (mode === 'song' && useSongStore.getState().blocks.length === 0) {
    announce('The song is empty. Add blocks to the song first.');
    return;
  }
  const ui = useUIStore.getState();
  const changed = ui.playMode !== mode;
  ui.setPlayMode(mode);
  if (!isPlaying()) {
    if (changed) announce(mode === 'song' ? 'Play will play the song' : 'Play will loop the pattern');
    return;
  }
  const songPlaying = useSongStore.getState().songState === 'playing';
  if ((mode === 'song') !== songPlaying) await start(mode);
}

/** Play the song from the start, and leave Play set to Song */
export async function playSongNow() {
  useUIStore.getState().setPlayMode('song');
  await start('song');
}
