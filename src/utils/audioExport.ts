import * as Tone from 'tone';
import type { Pattern } from '../types';
import { stepNotes } from './melodicNotes';
import type { SongBlock } from '../store/useSongStore';
import { Mixer } from '../audio/Mixer';
import { DrumEngine } from '../audio/DrumEngine';
import { SynthEngine } from '../audio/SynthEngine';
import { stepSeconds } from '../audio/AudioEngine';
import { useMixerStore } from '../store/useMixerStore';
import { useTransportStore } from '../store/useTransportStore';

// ---------------------------------------------------------------------------
// Core: render a sequence of pattern blocks to an AudioBuffer via Tone.Offline
//
// The offline render builds the exact same graph as live playback (Mixer +
// DrumEngine + SynthEngine), so exports include velocity, note lengths,
// filters, sends, reverb/delay and the master bus.
// ---------------------------------------------------------------------------

interface RenderBlock {
  pattern: Pattern;
  repeats: number;
}

async function renderBlocksOffline(blocks: RenderBlock[], bpm: number): Promise<AudioBuffer> {
  const swing = useTransportStore.getState().swing;
  const mixerSettings = useMixerStore.getState();

  let songDuration = 0;
  for (const { pattern, repeats } of blocks) {
    songDuration += pattern.numSteps * repeats * stepSeconds(bpm, pattern.stepResolution);
  }
  // Tail so reverb/delay and final releases don't clip
  const tail = Math.max(1.5, mixerSettings.reverbDecay * 0.8);
  const totalDuration = songDuration + tail;

  const buffer = await Tone.Offline(async ({ transport }) => {
    transport.bpm.value = bpm;

    const mixer = new Mixer(mixerSettings);
    const drums = new DrumEngine(mixer);
    const synths = new SynthEngine(mixer);
    try {
      await mixer.ready;
    } catch {
      // Reverb generation failed in this context; continue dry rather than fail the export
    }

    let timeOffset = 0;

    for (const { pattern, repeats } of blocks) {
      const secsPerStep = stepSeconds(bpm, pattern.stepResolution);
      const drumHasSolo = pattern.drumTracks.some(t => t.solo);
      const melodicHasSolo = pattern.melodicTracks.some(t => t.solo);

      for (let rep = 0; rep < repeats; rep++) {
        // Drum tracks
        for (const track of pattern.drumTracks) {
          if (track.muted || (drumHasSolo && !track.solo)) continue;
          drums.ensureSynth(track.sampleKey, track.synthParams, track.volume, track.reverbSend ?? 0, track.delaySend ?? 0);

          for (let step = 0; step < pattern.numSteps; step++) {
            const vel = track.steps[step];
            if (!vel) continue;
            const swingOffset = step % 2 === 1 ? swing * secsPerStep * 0.5 : 0;
            const time = timeOffset + step * secsPerStep + swingOffset;
            const key = track.sampleKey;
            transport.schedule((t) => drums.trigger(key, t, vel), time);
          }
        }

        // Melodic tracks
        for (const track of pattern.melodicTracks) {
          if (track.muted || (melodicHasSolo && !track.solo)) continue;
          synths.ensureSynth(track.id, track.synthType, track.synthParams, track.volume, track.reverbSend ?? 0, track.delaySend ?? 0);

          for (let step = 0; step < pattern.numSteps; step++) {
            const notes = stepNotes(track.steps[step]);
            if (notes.length === 0) continue;
            const swingOffset = step % 2 === 1 ? swing * secsPerStep * 0.5 : 0;
            const time = timeOffset + step * secsPerStep + swingOffset;
            const id = track.id;
            for (const n of notes) {
              const duration = Math.max(0.03, Math.max(1, n.length) * secsPerStep - 0.01);
              const { note, velocity } = n;
              transport.schedule((t) => synths.playNote(id, note, duration, t, velocity), time);
            }
          }
        }

        timeOffset += pattern.numSteps * secsPerStep;
      }
    }

    transport.start(0);
  }, totalDuration);

  // ToneAudioBuffer → native AudioBuffer
  return buffer.get() as AudioBuffer;
}

function renderPatternOffline(pattern: Pattern, bpm: number): Promise<AudioBuffer> {
  return renderBlocksOffline([{ pattern, repeats: 1 }], bpm);
}

function renderSongOffline(blocks: SongBlock[], patterns: Pattern[], bpm: number): Promise<AudioBuffer> {
  const renderBlocks: RenderBlock[] = [];
  for (const block of blocks) {
    if (block.muted) continue;
    const pattern = patterns.find(p => p.id === block.patternId);
    if (pattern) renderBlocks.push({ pattern, repeats: block.repeats });
  }
  return renderBlocksOffline(renderBlocks, bpm);
}

// ---------------------------------------------------------------------------
// WAV encoder (pure JS — no dependencies)
// ---------------------------------------------------------------------------

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const numFrames = buffer.length;

  // Interleave channels
  const interleaved = new Int16Array(numFrames * numChannels);
  for (let ch = 0; ch < numChannels; ch++) {
    const channelData = buffer.getChannelData(ch);
    for (let i = 0; i < numFrames; i++) {
      // Clamp float32 [-1,1] → int16
      const s = Math.max(-1, Math.min(1, channelData[i]));
      interleaved[i * numChannels + ch] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
  }

  const dataLength = interleaved.length * bytesPerSample;
  const headerLength = 44;
  const arrayBuffer = new ArrayBuffer(headerLength + dataLength);
  const view = new DataView(arrayBuffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');

  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);                              // chunk size
  view.setUint16(20, 1, true);                               // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true); // byte rate
  view.setUint16(32, numChannels * bytesPerSample, true);    // block align
  view.setUint16(34, bitsPerSample, true);

  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  // Write PCM samples
  const output = new Int16Array(arrayBuffer, headerLength);
  output.set(interleaved);

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

// ---------------------------------------------------------------------------
// MP3 encoder (lamejs)
// ---------------------------------------------------------------------------

async function audioBufferToMp3(buffer: AudioBuffer): Promise<Blob> {
  // Dynamic import — lamejs is only loaded when MP3 export is used
  const { Mp3Encoder } = await import('@breezystack/lamejs');

  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const kbps = 192;
  const encoder = new Mp3Encoder(numChannels, sampleRate, kbps);

  const numFrames = buffer.length;
  const chunkSize = 1152; // MP3 frame size

  // Convert float32 → int16 per channel
  const channels: Int16Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    const float32 = buffer.getChannelData(ch);
    const int16 = new Int16Array(numFrames);
    for (let i = 0; i < numFrames; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    channels.push(int16);
  }

  const mp3Chunks: Uint8Array[] = [];

  for (let i = 0; i < numFrames; i += chunkSize) {
    const leftChunk = channels[0].subarray(i, i + chunkSize);
    const rightChunk = numChannels > 1
      ? channels[1].subarray(i, i + chunkSize)
      : leftChunk;

    const mp3buf = numChannels > 1
      ? encoder.encodeBuffer(leftChunk, rightChunk)
      : encoder.encodeBuffer(leftChunk);

    if (mp3buf.length > 0) {
      mp3Chunks.push(new Uint8Array(mp3buf));
    }
  }

  const flush = encoder.flush();
  if (flush.length > 0) {
    mp3Chunks.push(new Uint8Array(flush));
  }

  // Concatenate all chunks into a single ArrayBuffer for Blob compatibility
  const totalLength = mp3Chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of mp3Chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return new Blob([result.buffer], { type: 'audio/mpeg' });
}

// ---------------------------------------------------------------------------
// Download helper
// ---------------------------------------------------------------------------

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function exportPatternToWav(pattern: Pattern, bpm: number): Promise<void> {
  const audioBuffer = await renderPatternOffline(pattern, bpm);
  const wavBlob = audioBufferToWav(audioBuffer);
  downloadBlob(wavBlob, `groove-theory-${pattern.name}.wav`);
}

export async function exportPatternToMp3(pattern: Pattern, bpm: number): Promise<void> {
  const audioBuffer = await renderPatternOffline(pattern, bpm);
  const mp3Blob = await audioBufferToMp3(audioBuffer);
  downloadBlob(mp3Blob, `groove-theory-${pattern.name}.mp3`);
}

export async function exportSongToWav(
  blocks: SongBlock[],
  patterns: Pattern[],
  bpm: number
): Promise<void> {
  const audioBuffer = await renderSongOffline(blocks, patterns, bpm);
  const wavBlob = audioBufferToWav(audioBuffer);
  downloadBlob(wavBlob, 'groove-theory-song.wav');
}

export async function exportSongToMp3(
  blocks: SongBlock[],
  patterns: Pattern[],
  bpm: number
): Promise<void> {
  const audioBuffer = await renderSongOffline(blocks, patterns, bpm);
  const mp3Blob = await audioBufferToMp3(audioBuffer);
  downloadBlob(mp3Blob, 'groove-theory-song.mp3');
}
