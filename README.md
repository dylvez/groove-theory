# Groove Theory

A browser-based drum machine and music theory workstation. Create beats with drum and melodic sequencers, explore scales and chords, build chord progressions, arrange songs, and export to MIDI, WAV, or MP3.

**Live:** [groove-theory.web.app](https://groove-theory.web.app)

## Features

- Step sequencer with drag-to-paint, per-step velocity (accent / normal / ghost), and 1/16 or 1/32 resolution
- Melodic sequencer with note lengths, scale-aware note picker, and multiple synth engines
- Play any synth live from your keyboard and record it straight into the grid
- 5 drum kits (Classic, 808, Lo-Fi, Techno, Acoustic) and 8 synth presets
- Real mixer: per-track reverb/delay sends, global reverb & tempo-synced delay buses, bus compressor, limiter, and level meter
- Low-pass filter on every synth track
- 4 pattern slots (A-D) with copy/paste, shift, humanize, undo/redo, and song arrangement
- Tap tempo and swing
- Scale explorer, chord explorer, and diatonic chord grids
- Chord progression builder with audio preview
- Export patterns and songs to MIDI (with velocities and note lengths), WAV, or MP3 (with all effects)
- Preset beats and full song demos
- All data stored locally in the browser — no accounts, no server

## Tech Stack

- React 19, TypeScript, Vite
- Tailwind CSS
- Zustand (state management)
- Tone.js (audio engine)
- Web Audio API, lamejs (MP3 encoding), midi-writer-js (MIDI export)

## Getting Started

```bash
git clone https://github.com/dylvez/groove-theory.git
cd groove-theory
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Build & Deploy

```bash
# Production build
npm run build

# Deploy to Firebase Hosting
npm run deploy
```

## License

[MIT](LICENSE)

## Contact

[groovetheoryapp@gmail.com](mailto:groovetheoryapp@gmail.com)
