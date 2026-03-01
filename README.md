# Groove Theory

A browser-based drum machine and music theory workstation. Create beats with drum and melodic sequencers, explore scales and chords, build chord progressions, arrange songs, and export to MIDI, WAV, or MP3.

**Live:** [groove-theory.web.app](https://groove-theory.web.app)

## Features

- 16-step drum sequencer with velocity control
- Melodic step sequencer with multiple synth voices
- 4 pattern slots (A-D) with song arrangement
- Scale explorer, chord explorer, and diatonic chord grids
- Chord progression builder with audio preview
- Export patterns and songs to MIDI, WAV, or MP3
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
