import { useRef, useState, useMemo } from 'react';
import { useUIStore } from '../../store/useUIStore';
import { useModal } from '../../hooks/useModal';

interface HelpModalProps {
  onClose: () => void;
}

interface HelpSection {
  id: string;
  title: string;
  icon: string;
  content: React.ReactNode;
}

export function HelpModal({ onClose }: HelpModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [activeId, setActiveId] = useState('sequencer');

  // Modal dialog: focus moves to the search box, Tab stays inside, Escape
  // closes, and focus goes back to the Help button afterwards
  const panelRef = useModal<HTMLDivElement>(onClose, searchRef);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  const sections: HelpSection[] = useMemo(() => [
    {
      id: 'sequencer',
      title: 'Sequencer Grid',
      icon: '\u{1D160}',
      content: (
        <>
          <p>Build beats and melodies on a step-based grid. Each row is a track and each column is a 16th-note step.</p>
          <Sub title="Drums & Synth Sections">
            <ul className="list-disc pl-4 space-y-1">
              <li>Tracks are grouped under <strong>Drums</strong> and <strong>Synth</strong> section headers.</li>
              <li>Click a header to <strong>collapse or expand</strong> that section.</li>
              <li>The header highlights to match the active Theory tab — Drums lights up when Beats is active, Synth when Harmony is active.</li>
              <li>Each header shows a track count on the right.</li>
            </ul>
          </Sub>
          <Sub title="Working with Steps">
            <ul className="list-disc pl-4 space-y-1">
              <li>Click a cell to toggle it on/off. <strong>Click and drag</strong> to paint (or erase) a run of steps in one gesture.</li>
              <li><strong>Shift+click</strong> an active step to cycle its <strong>velocity</strong>: accent → normal → ghost. Softer hits render dimmer.</li>
              <li>For synth tracks, clicking an empty step opens a <strong>note picker</strong>. Dragging paints the last note you picked.</li>
              <li><strong>Right-click</strong> a synth step to edit it: change the note, octave, or <strong>length</strong> (1–8 steps). Long notes draw a tail across the grid.</li>
              <li>The <strong>ruler</strong> above the grid shows bar.beat numbers and the playhead.</li>
            </ul>
          </Sub>
          <Sub title="Chance, Repeats & Timing">
            <p className="mb-1"><strong>Right-click</strong> any step (or press <Kbd>Alt + Enter</Kbd> on it) to open its step editor. Synth steps show these under the note picker.</p>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>Chance</strong> — how often the step plays: 100%, 75%, 50%, 25% or 10% of the times round. Great for hi-hats and fills that never repeat exactly. Striped cells have a chance below 100%.</li>
              <li><strong>Repeats</strong> — 2, 3 or 4 quick hits inside one step, for rolls and stutters. Small ticks along the top of a cell show the count.</li>
              <li><strong>Timing</strong> — push the step a little <strong>early</strong> or <strong>late</strong> (up to half a step) for a looser, laid-back feel. A small arrow in the cell's corner points the way it moved. Double-click the slider to put it back on the grid.</li>
              <li>Changing the note, copying, shifting, filling and resizing all keep these settings. Turning a step off clears them.</li>
            </ul>
          </Sub>
          <Sub title="Piano Roll (chords and longer notes)">
            <ul className="list-disc pl-4 space-y-1">
              <li>Click a <strong>synth track’s name</strong> to open its piano roll under the track. Rows are pitches, columns line up with the steps above.</li>
              <li><strong>Click</strong> an empty cell to add a note; <strong>drag right</strong> to make it longer. Click a note to remove it, <strong>Shift+click</strong> to change its velocity.</li>
              <li>Several notes on the same step make a <strong>chord</strong>. In the lane, a chord shows its lowest note and “+2”, “+3”… for the rest.</li>
              <li><strong>New note length</strong> sets how long clicked notes are. <strong>▼ / ▲</strong> move the two-octave view; the numbers show how many notes sit outside it.</li>
              <li><strong>Scale notes only</strong> hides rows outside the key chosen in the Harmony tab. Rows that already hold notes always stay visible.</li>
              <li>A Mono Synth plays one note at a time, so adding a note replaces the one on that step.</li>
            </ul>
          </Sub>
          <Sub title="Adding & Removing Tracks">
            <ul className="list-disc pl-4 space-y-1">
              <li><Kbd>+ Add Drum</Kbd> — pick from kick, snare, hi-hat, open HH, crash, ride, rim, clap, and toms.</li>
              <li><Kbd>Kit</Kbd> — swap every drum in the pattern to a different kit: Classic, 808, Lo-Fi, Techno, or Acoustic.</li>
              <li><Kbd>+ Add Synth</Kbd> — start from a preset (Pluck, Electric Keys, Warm Pad, Square Lead, Sub Bass, Acid Bass, Bell, Organ) or a blank engine.</li>
              <li>Remove any track with the <strong>&times;</strong> button on its header.</li>
            </ul>
          </Sub>
          <Sub title="Fill">
            <ul className="list-disc pl-4 space-y-1">
              <li><Kbd>Fill All Drums</Kbd> / <Kbd>Fill All Synths</Kbd> — auto-fills blank bars across all tracks in that section by repeating existing patterns.</li>
              <li>Each track header also has its own <strong>Fill</strong> button for per-track filling.</li>
            </ul>
          </Sub>
        </>
      ),
    },
    {
      id: 'tracks',
      title: 'Track Controls',
      icon: '\u{1F3A4}',
      content: (
        <>
          <p>Each track header provides controls for managing playback and sound.</p>
          <Sub title="Header Buttons">
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>Gear icon</strong> — open the sound settings panel for that track.</li>
              <li><strong>Track name</strong> — on drum tracks, click to <strong>audition</strong> the sound and double-click to rename. On synth tracks, click to open the <strong>piano roll</strong>. Every track can also be renamed in its ⚙ sound settings.</li>
              <li><Kbd>●</Kbd> <strong>Arm</strong> (synth tracks) — play this synth live from your computer keyboard. See <em>Live Keys</em>.</li>
              <li><Kbd>M</Kbd> <strong>Mute</strong> — silence the track (turns red when muted).</li>
              <li><Kbd>S</Kbd> <strong>Solo</strong> — hear only this track (turns amber when active).</li>
              <li><strong>&times;</strong> — remove the track entirely.</li>
              <li><strong>Fill</strong> — fill blank bars by repeating the existing pattern.</li>
            </ul>
          </Sub>
          <Sub title="Resizing">
            <ul className="list-disc pl-4 space-y-1">
              <li>Drag the thin divider between the track header and the grid to resize all headers at once.</li>
            </ul>
          </Sub>
        </>
      ),
    },
    {
      id: 'sound-design',
      title: 'Sound Design',
      icon: '\u{1F50A}',
      content: (
        <>
          <p>Click the gear icon on any track to open its settings panel.</p>
          <Sub title="Drum Sounds">
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>Membrane drums</strong> (kick, toms) — control frequency, pitch decay, octaves, oscillator type, and full ADSR envelope.</li>
              <li><strong>Noise drums</strong> (hi-hat, crash) — choose white, pink, or brown noise with ADSR control.</li>
              <li><strong>Metal drums</strong> (clap, rim) — adjust frequency, harmonicity, modulation index, resonance, and envelope.</li>
            </ul>
          </Sub>
          <Sub title="Synth Sounds">
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>Preset</strong> — load a designed sound in one click; the preset name shows under the track name.</li>
              <li><strong>Engine</strong> — Basic, FM, AM, or Mono synth. <strong>Wave</strong> — sine, square, triangle, or sawtooth.</li>
              <li><strong>Octave</strong> — transposes every note on the track.</li>
              <li><strong>ADSR envelope</strong> — attack, decay, sustain, and release.</li>
              <li><strong>Filter</strong> — low-pass cutoff and resonance. Close the cutoff for warmth, raise resonance for squelch.</li>
            </ul>
          </Sub>
          <Sub title="Mix: Volume & Sends">
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>Volume</strong> — -36 to +6 dB per track.</li>
              <li><strong>Pan</strong> — place the track left or right in the stereo picture. Spreading hats and percussion a little each way makes room in the middle for kick, bass and vocals.</li>
              <li><strong>Reverb</strong> / <strong>Delay</strong> — how much of this track is sent to the shared effect buses. Shape the buses themselves with the <Kbd>FX</Kbd> button in the transport bar.</li>
              <li><Kbd>▶ Hear</Kbd> — audition the sound while you tweak it. <strong>Reset</strong> restores defaults.</li>
            </ul>
          </Sub>
          <Sub title="Mixer & Effects (FX)">
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>Master</strong> — output volume and a bus <strong>compressor</strong> that glues the mix together. A <strong>limiter</strong> always protects against clipping; the meter next to FX shows the level.</li>
              <li><strong>Reverb bus</strong> — size (tail length) and return level.</li>
              <li><strong>Delay bus</strong> — tempo-synced time (1/16, 1/8, dotted 1/8, 1/4), feedback, and return level.</li>
              <li>Everything here is baked into WAV and MP3 exports.</li>
            </ul>
          </Sub>
        </>
      ),
    },
    {
      id: 'transport',
      title: 'Transport & Playback',
      icon: '\u{25B6}',
      content: (
        <>
          <p>Controls along the top of the sequencer manage playback and timing.</p>
          <ul className="list-disc pl-4 space-y-1">
            <li><Kbd>Play / Stop</Kbd> — start or stop pattern playback. The playhead animates across the grid.</li>
            <li><Kbd>BPM</Kbd> — set tempo from 40 to 300 using the input field or slider, or click <Kbd>Tap</Kbd> in time with a beat.</li>
            <li><Kbd>●</Kbd> <strong>Record</strong> — with a synth track armed, writes what you play on the keyboard into the grid. See <em>Live Keys</em>.</li>
            <li><Kbd>Swing</Kbd> — add rhythmic feel from 0% (straight) to 75% (heavy triplet swing).</li>
            <li><Kbd>Loop</Kbd> — toggle pattern looping on or off.</li>
            <li><Kbd>Follow</Kbd> — while a pattern or song plays, the grid scrolls a page at a time to keep the playing step in view. Turn it off to scroll freely. Track names stay pinned on the left as the grid scrolls.</li>
            <li><Kbd>4/4</Kbd> / <Kbd>3/4</Kbd> — switch between common and waltz time.</li>
            <li><Kbd>1</Kbd> / <Kbd>2</Kbd> / <Kbd>4</Kbd> / <Kbd>8</Kbd> bars — set how many bars each pattern contains.</li>
            <li><Kbd>1/16</Kbd> / <Kbd>1/32</Kbd> — step resolution. 1/32 doubles the grid for rolls and fast hats.</li>
            <li><Kbd>Undo</Kbd> / <Kbd>Redo</Kbd> — step backwards and forwards through sequencer changes (up to 50).</li>
            <li><Kbd>⋯</Kbd> next to the pattern buttons opens the <strong>pattern menu</strong>: copy to another slot, copy/paste, shift left/right, humanize velocities, fill empty bars, or clear.</li>
            <li><Kbd>Side panel</Kbd> (top right) — hide the Beats and Harmony panel to give the grid the full width, and bring it back the same way. The <Kbd>\</Kbd> key does the same.</li>
            <li><Kbd>Layout</Kbd> (top right) — preset sizes for the side panel, the song section and the track name column. You can also drag the coloured dividers, or focus one and use the arrow keys.</li>
          </ul>
        </>
      ),
    },
    {
      id: 'patterns',
      title: 'Patterns A–H',
      icon: '\u{1F3B5}',
      content: (
        <>
          <p>Eight independent pattern slots let you build different sections of a song.</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Click <Kbd>A</Kbd>–<Kbd>H</Kbd> (or press <Kbd>1</Kbd>–<Kbd>8</Kbd>) to switch patterns. Each is color-coded.</li>
            <li><strong>Bars</strong> sets a pattern’s length: 1, 2, 4 or 8 bars.</li>
            <li>Use the <Kbd>⋯</Kbd> menu to <strong>copy a pattern into another slot</strong> — the fastest way to build a variation.</li>
            <li>Every pattern has its own drum tracks, synth tracks, time signature, and bar count.</li>
            <li>Each pattern maintains its own undo history.</li>
            <li>Arrange patterns into a full song in the Song Arrangement section below the sequencer.</li>
          </ul>
        </>
      ),
    },
    {
      id: 'harmony',
      title: 'Theory: Harmony',
      icon: '\u{1F3B9}',
      content: (
        <>
          <p>The Harmony tab in the Theory panel helps you write music that sounds good together.</p>
          <Sub title="Key & Scale">
            <ul className="list-disc pl-4 space-y-1">
              <li>Pick a root note (C through B) and a scale (Major, Minor, Pentatonic, Blues, Dorian, and more).</li>
              <li>See a description of the scale's character and songs that use it.</li>
              <li>Scale notes highlight on the interactive piano keyboard.</li>
            </ul>
          </Sub>
          <Sub title="Piano Keyboard">
            <ul className="list-disc pl-4 space-y-1">
              <li>Collapsible 2-octave keyboard starting at C4.</li>
              <li>Scale notes shown in cyan, root note in orange, with degree numbers.</li>
              <li>Click any key to hear the note.</li>
              <li>Chord notes highlight when a chord is selected.</li>
            </ul>
          </Sub>
          <Sub title="Diatonic Chords">
            <ul className="list-disc pl-4 space-y-1">
              <li>Shows all chords that naturally belong to the selected scale.</li>
              <li>Displayed as Roman numerals (i, III, iv, v, etc.) with chord names.</li>
              <li>Click a chord to hear it and see its notes on the piano.</li>
            </ul>
          </Sub>
          <Sub title="Chord Progression">
            <ul className="list-disc pl-4 space-y-1">
              <li>Click the <strong>+</strong> on any diatonic chord to add it to your progression.</li>
              <li>Build multi-chord sequences that drive the Melody Helper.</li>
              <li>Remove chords from the progression or reorder them.</li>
            </ul>
          </Sub>
          <Sub title="Melody Helper">
            <ul className="list-disc pl-4 space-y-1">
              <li>Auto-generates melodic patterns based on your chord progression.</li>
              <li>Choose a pattern type: root notes, arpeggiate up/down, scale walk up/down, or chord + passing tones.</li>
              <li>Select which synth track to target.</li>
              <li><strong>Preview</strong> to hear the melody, <strong>Apply</strong> to write it to the sequencer.</li>
              <li>Requires a chord progression to be built first.</li>
            </ul>
          </Sub>
          <Sub title="Custom Chord Explorer">
            <ul className="list-disc pl-4 space-y-1">
              <li>Collapsible section for exploring any chord outside the current scale.</li>
              <li>Pick any root note and chord type (20+ types including 7ths, suspended, diminished, augmented).</li>
              <li>Cycle through inversions (root, 1st, 2nd, etc.).</li>
              <li>Click Play to hear the chord.</li>
            </ul>
          </Sub>
        </>
      ),
    },
    {
      id: 'beats',
      title: 'Theory: Beats',
      icon: '\u{1F941}',
      content: (
        <>
          <p>The Beats tab is a comprehensive rhythm learning and building tool.</p>
          <Sub title="Beat Explorer">
            <ul className="list-disc pl-4 space-y-1">
              <li>Browse 15+ pre-defined grooves — Four-on-Floor, Backbeat, Shuffle, Swing, Bossa Nova, and more.</li>
              <li>Each beat shows a description, genre tags, BPM range, and real songs that use it.</li>
              <li><strong>Play</strong> to preview the beat, <strong>Apply to Track</strong> to load it into your sequencer.</li>
            </ul>
          </Sub>
          <Sub title="Variations & Fills">
            <ul className="list-disc pl-4 space-y-1">
              <li>Switch between <Kbd>Basic</Kbd> (1 bar), <Kbd>Variation</Kbd> (2-bar pattern), and <Kbd>Fill</Kbd> (bar + fill ending).</li>
            </ul>
          </Sub>
          <Sub title="Rhythm Map & Grid Preview">
            <ul className="list-disc pl-4 space-y-1">
              <li>Collapsible color-coded visualization of the beat's instruments across all steps.</li>
              <li>Grid preview shows the exact step pattern with beat markers and bar separators.</li>
            </ul>
          </Sub>
          <Sub title="Building Blocks">
            <ul className="list-disc pl-4 space-y-1">
              <li>Pre-designed rhythm components for individual instruments (kick patterns, snare fills, hi-hat variations).</li>
              <li>Hover to reveal a <strong>+</strong> button to add blocks to the Groove Builder.</li>
            </ul>
          </Sub>
          <Sub title="Groove Builder">
            <ul className="list-disc pl-4 space-y-1">
              <li>Combine building blocks to create custom drum patterns.</li>
              <li>See a merged pattern preview of all combined blocks.</li>
              <li><strong>Play Groove</strong> to preview, <strong>Apply to Track</strong> to load into the sequencer.</li>
              <li>Remove individual blocks or clear the whole groove.</li>
            </ul>
          </Sub>
          <Sub title="Fill Helper">
            <ul className="list-disc pl-4 space-y-1">
              <li>Auto-generates 3 fill suggestions (light, medium, heavy) based on your current groove.</li>
              <li>Each shows a mini grid preview with play and insert buttons.</li>
              <li>Activates once you've built a groove in the Groove Builder.</li>
            </ul>
          </Sub>
          <Sub title="Custom Beat">
            <ul className="list-disc pl-4 space-y-1">
              <li>Collapsible section with 4 dropdown selectors: kick pattern, snare pattern, hi-hat pattern, and accent.</li>
              <li>Mix and match to create unique beats from preset components.</li>
              <li>Preview and apply independently from the beat explorer.</li>
            </ul>
          </Sub>
        </>
      ),
    },
    {
      id: 'song',
      title: 'Song Arrangement',
      icon: '\u{1F4CB}',
      content: (
        <>
          <p>Below the sequencer, arrange patterns into a full song structure.</p>
          <Sub title="Building a Song">
            <ul className="list-disc pl-4 space-y-1">
              <li>Click <strong>+</strong> to add pattern blocks (A, B, C, D) to the timeline.</li>
              <li>Each block can repeat multiple times — set the repeat count.</li>
              <li>Add optional section labels like "Intro", "Verse", "Chorus".</li>
              <li>Blocks are color-coded to match their pattern.</li>
            </ul>
          </Sub>
          <Sub title="Rearranging">
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>Drag and drop</strong> blocks to reorder them.</li>
              <li>Hover between blocks to reveal insertion zones, or use <strong>Insert before / after</strong> in a block’s options.</li>
              <li>Click a block’s letter, or right-click the block, for options (move, insert, remove, change pattern, set repeats, loop range).</li>
            </ul>
          </Sub>
          <Sub title="Loop Range">
            <ul className="list-disc pl-4 space-y-1">
              <li><Kbd>Shift + click</Kbd> a block to set the loop start, then Shift+click another for loop end.</li>
              <li>The loop region highlights visually and the Loop button shows the active range.</li>
              <li>Click Loop to clear the range.</li>
            </ul>
          </Sub>
          <Sub title="Open Song">
            <ul className="list-disc pl-4 space-y-1">
              <li>Click <strong>Open Song</strong> to browse preset songs and beat presets.</li>
              <li><strong>Preset songs</strong> — full arrangements with drums, bass, and melodies (e.g. Midnight in Tokyo, Solar Flare, Carnival de Luna, Neon Dystopia).</li>
              <li><strong>Beat presets</strong> — drum-only patterns to use as starting points (e.g. Classic Rock, Boom-Bap, Dance Floor).</li>
              <li>You can also import a <code className="text-accent-cyan-fg">.song</code> file from disk.</li>
            </ul>
          </Sub>
          <Sub title="Song Playback">
            <ul className="list-disc pl-4 space-y-1">
              <li>The song transport has its own Play/Stop, BPM, and Swing controls.</li>
              <li>A playback cursor follows progress across blocks in real time.</li>
              <li>Song playback and pattern playback are mutually exclusive.</li>
            </ul>
          </Sub>
        </>
      ),
    },
    {
      id: 'saving',
      title: 'Saving & Loading',
      icon: '\u{1F4BE}',
      content: (
        <>
          <Sub title="Header Controls">
            <ul className="list-disc pl-4 space-y-1">
              <li><Kbd>Save</Kbd> — save the groove to your browser's local storage, or download as a <code className="text-accent-cyan-fg">.groove</code> file to share.</li>
              <li><Kbd>Open</Kbd> — load a previously saved groove from storage, browse preset songs and beat presets, or import a file.</li>
              <li><Kbd>New</Kbd> — start fresh with a blank project (clears all patterns and song blocks).</li>
            </ul>
          </Sub>
          <Sub title="Presets">
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>Preset songs</strong> — complete arrangements with drums, bass, melodies, and song structure. Available from both the header <Kbd>Open</Kbd> menu and the song area's <strong>Open Song</strong> button.</li>
              <li><strong>Beat presets</strong> — drum-only grooves to jumpstart a new project.</li>
              <li>Loading a preset replaces all current patterns, tracks, and song arrangement.</li>
            </ul>
          </Sub>
          <Sub title="Importing MIDI">
            <ul className="list-disc pl-4 space-y-1">
              <li><Kbd>Open</Kbd> → <strong>Import MIDI file</strong> reads a <code className="text-accent-cyan-fg">.mid</code> file. Choose which parts to bring in, the pattern length, and whether notes snap to 1/16 or 1/32.</li>
              <li>The music is cut into patterns; sections that repeat exactly share a pattern, and the song arrangement plays them in order. Up to 8 different patterns fit — with 8-bar patterns that’s 64 bars of different music, plus any repeats.</li>
              <li>Drums on MIDI channel 10 become drum tracks; other parts become synth tracks with a sound picked from their instrument (or their name). Chords and note lengths come through.</li>
              <li>Limits: only 4/4 and 3/4 (6/8 is laid out as 3/4), one tempo for the whole song, and timing snaps to the grid. The dialog says what was changed or left out before you import.</li>
              <li>Importing replaces all patterns and the song; Undo brings them back.</li>
            </ul>
          </Sub>
          <Sub title="File Formats">
            <ul className="list-disc pl-4 space-y-1">
              <li><code className="text-accent-cyan-fg">.groove</code> — full project: all patterns, tracks, sound settings, song arrangement, BPM, and swing.</li>
              <li><code className="text-accent-cyan-fg">.patterns</code> — pattern bank only (drums + synths, no song arrangement).</li>
              <li><code className="text-accent-cyan-fg">.song</code> — song arrangement and structure.</li>
            </ul>
          </Sub>
        </>
      ),
    },
    {
      id: 'exporting',
      title: 'Exporting',
      icon: '\u{1F4E4}',
      content: (
        <>
          <p>Export your work in three professional formats from the header buttons.</p>
          <Sub title="MIDI">
            <ul className="list-disc pl-4 space-y-1">
              <li>Exports the active pattern (or full song) as a standard <code className="text-accent-cyan-fg">.mid</code> file.</li>
              <li>Drums are mapped to General MIDI percussion (channel 10).</li>
              <li>Each synth track gets its own MIDI track with correct pitches.</li>
              <li>Tempo and time signature are embedded in the file.</li>
              <li>Repeats and timing shifts are written as real notes. Steps with a chance below 100% roll the dice once, so each export is one take.</li>
            </ul>
          </Sub>
          <Sub title="WAV">
            <ul className="list-disc pl-4 space-y-1">
              <li>Renders lossless audio at 44.1kHz / 16-bit stereo.</li>
              <li>If you have a song arrangement, choose to export the pattern or the full song.</li>
              <li>Muted tracks are excluded, solo is respected.</li>
              <li>Chance is rolled each time round, just as you hear it, so two exports of the same pattern can differ.</li>
            </ul>
          </Sub>
          <Sub title="MP3">
            <ul className="list-disc pl-4 space-y-1">
              <li>Compressed export at 192 kbps — great for sharing.</li>
              <li>Same pattern-or-song choice as WAV.</li>
              <li>Encoder loads on demand, so first export may take a moment.</li>
            </ul>
          </Sub>
        </>
      ),
    },
    {
      id: 'live-keys',
      title: 'Live Keys & Recording',
      icon: '\u{1F3B9}',
      content: (
        <>
          <p>Play any synth track from your computer keyboard, and record what you play straight into the grid.</p>
          <Sub title="Playing">
            <ul className="list-disc pl-4 space-y-1">
              <li>Click <Kbd>●</Kbd> on a synth track's header to <strong>arm</strong> it. The transport shows a <strong>Keys</strong> badge with the current octave.</li>
              <li>Keys <Kbd>A</Kbd> <Kbd>W</Kbd> <Kbd>S</Kbd> <Kbd>E</Kbd> <Kbd>D</Kbd> <Kbd>F</Kbd> <Kbd>T</Kbd> <Kbd>G</Kbd> <Kbd>Y</Kbd> <Kbd>H</Kbd> <Kbd>U</Kbd> <Kbd>J</Kbd> <Kbd>K</Kbd> … play a piano layout from C. <Kbd>Z</Kbd> / <Kbd>X</Kbd> move the octave down / up.</li>
              <li>Notes are held for as long as the key is down, through the track's own sound, filter, and effects.</li>
              <li>Press <Kbd>Escape</Kbd> or click <Kbd>●</Kbd> again to disarm. While nothing is armed, the keys play the theory panel's piano instead.</li>
            </ul>
          </Sub>
          <Sub title="Recording">
            <ul className="list-disc pl-4 space-y-1">
              <li>Start playback, then press <Kbd>●</Kbd> in the transport (or <Kbd>R</Kbd>) to enable <strong>REC</strong>.</li>
              <li>Every key press is quantized to the nearest step and written into the armed track. Hold a key and the note's <strong>length</strong> follows.</li>
              <li>Recording loops — keep playing to layer more notes, and use Undo if you fumble.</li>
            </ul>
          </Sub>
        </>
      ),
    },
    {
      id: 'shortcuts',
      title: 'Keyboard Shortcuts',
      icon: '\u{2328}',
      content: (
        <>
          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 items-center">
            <Kbd>Space</Kbd> <span>Play / Stop playback (anywhere outside a text field)</span>
            <Kbd>1 – 8</Kbd> <span>Select pattern A – H</span>
            <Kbd>⌘/Ctrl + Z</Kbd> <span>Undo the last change to the patterns or the song</span>
            <Kbd>⌘/Ctrl + Shift + Z</Kbd> <span>Redo</span>
            <Kbd>⌘/Ctrl + C</Kbd> <span>Copy the active pattern</span>
            <Kbd>⌘/Ctrl + V</Kbd> <span>Paste into the active pattern</span>
            <Kbd>[</Kbd> / <Kbd>]</Kbd> <span>Shift the pattern one step left / right</span>
            <Kbd>\</Kbd> <span>Show / hide the Beats and Harmony side panel</span>
            <Kbd>Shift + click</Kbd> <span>Cycle a step's velocity</span>
            <Kbd>Right-click</Kbd> <span>Open the step editor: note and length (synth), velocity (drums), chance, repeats and timing</span>
            <Kbd>R</Kbd> <span>Toggle recording (when a track is armed)</span>
            <Kbd>Z</Kbd> / <Kbd>X</Kbd> <span>Live keys octave down / up</span>
            <Kbd>Escape</Kbd> <span>Close a menu or panel / disarm live keys / close this help</span>
          </div>
          <Sub title="Using the grid with a keyboard">
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 items-center">
              <Kbd>Tab</Kbd> <span>Move into the grid (one stop), then on to the next control</span>
              <Kbd>Arrow keys</Kbd> <span>Move between steps and tracks</span>
              <Kbd>Home</Kbd> / <Kbd>End</Kbd> <span>First / last step of the track</span>
              <Kbd>Enter</Kbd> <span>Turn a drum step on or off · open the note editor on a synth step</span>
              <Kbd>Shift + Enter</Kbd> <span>Cycle the velocity of an active step</span>
              <Kbd>Alt + Enter</Kbd> <span>Open the step editor (chance, repeats, timing). The context-menu key works too.</span>
              <Kbd>Delete</Kbd> <span>Clear the step</span>
            </div>
            <p className="mt-2">Each position is read as bar.beat.subdivision, for example “2.3.1” is bar 2, beat 3, first sixteenth.</p>
          </Sub>
          <Sub title="Using the piano roll with a keyboard">
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 items-center">
              <Kbd>Arrow keys</Kbd> <span>Move between pitches (up / down) and steps (left / right)</span>
              <Kbd>Enter</Kbd> <span>Add a note of the chosen length, or remove the note under the cursor</span>
              <Kbd>Shift + ← / →</Kbd> <span>Make the note shorter / longer</span>
              <Kbd>Shift + ↑ / ↓</Kbd> <span>Move the note to the next row up / down</span>
              <Kbd>Shift + Enter</Kbd> <span>Cycle the note’s velocity</span>
              <Kbd>Delete</Kbd> <span>Remove the note</span>
            </div>
            <p className="mt-1">Song blocks: Tab to a block’s letter and press Enter for its options — move left or right, set the loop range, mute, relabel or remove.</p>
            <p className="mt-1">The dividers between the panels can be focused and moved with the arrow keys.</p>
          </Sub>
          <Sub title="Single-key shortcuts">
            <SingleKeyToggle />
          </Sub>
        </>
      ),
    },
    {
      id: 'contact',
      title: 'Questions & Feedback',
      icon: '\u{2709}',
      content: (
        <>
          <p>Have a question, feature request, or found a bug?</p>
          <ul className="list-disc pl-4 space-y-1 mt-2">
            <li>Email: <a href="mailto:groovetheoryapp@gmail.com" className="text-accent-cyan-fg underline">groovetheoryapp@gmail.com</a></li>
            <li>GitHub: <a href="https://github.com/dylvez/groove-theory/issues" target="_blank" rel="noopener noreferrer" className="text-accent-cyan-fg underline">Open an issue<span className="sr-only"> (opens in a new tab)</span></a></li>
          </ul>
        </>
      ),
    },
    {
      id: 'about',
      title: 'About & License',
      icon: '\u{2696}',
      content: (
        <>
          <p>Groove Theory is a free, open-source music workstation that runs entirely in your browser.</p>
          <Sub title="Open Source">
            <ul className="list-disc pl-4 space-y-1">
              <li>Source code: <a href="https://github.com/dylvez/groove-theory" target="_blank" rel="noopener noreferrer" className="text-accent-cyan-fg underline">github.com/dylvez/groove-theory<span className="sr-only"> (opens in a new tab)</span></a></li>
              <li>Licensed under the <strong>MIT License</strong> — you are free to use, copy, modify, and distribute this software.</li>
              <li>Contributions, forks, and pull requests are welcome.</li>
            </ul>
          </Sub>
          <Sub title="Privacy & Data">
            <ul className="list-disc pl-4 space-y-1">
              <li>All your data stays in your browser's local storage. Nothing is sent to a server.</li>
              <li>No accounts, no tracking, no analytics, no cookies.</li>
              <li>Exported files (MIDI, WAV, MP3) are generated locally and downloaded directly to your device.</li>
            </ul>
          </Sub>
          <Sub title="Copyright">
            <p>&copy; 2026 Groove Theory. All rights reserved under the terms of the MIT License.</p>
          </Sub>
        </>
      ),
    },
  ], []);

  const filtered = useMemo(() => {
    if (!search.trim()) return sections;
    const q = search.toLowerCase();
    return sections.filter(s =>
      s.title.toLowerCase().includes(q) ||
      getTextContent(s.content).toLowerCase().includes(q)
    );
  }, [search, sections]);

  const scrollTo = (id: string) => {
    setActiveId(id);
    const el = contentRef.current?.querySelector<HTMLElement>(`[data-section="${id}"]`);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    // Move focus to the section so screen reader and keyboard users land there
    el?.focus({ preventScroll: true });
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
        className="bg-bg-secondary border border-border-control rounded-xl shadow-2xl w-[92vw] max-w-3xl max-h-[85vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
          <h2 id="help-title" className="text-sm font-bold text-text-primary">Groove Theory Guide</h2>
          <button
            onClick={onClose}
            aria-label="Close help"
            className="w-7 h-7 flex items-center justify-center rounded text-text-muted hover:text-text-primary transition-colors cursor-pointer -mr-1"
            title="Close"
          >
            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-2.5 border-b border-border/50 shrink-0">
          <div className="relative">
            <svg aria-hidden="true" className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.45 4.39l3.58 3.58a.75.75 0 1 1-1.06 1.06l-3.58-3.58A7 7 0 0 1 2 9Z" clipRule="evenodd" />
            </svg>
            <input
              ref={searchRef}
              type="search"
              aria-label="Search help"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search help..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-bg-cell border border-border/50 rounded-md text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-orange/50"
            />
            {search && (
              <button
                onClick={() => { setSearch(''); searchRef.current?.focus(); }}
                aria-label="Clear search"
                className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded text-text-muted hover:text-text-primary cursor-pointer"
              >
                <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                  <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Body: TOC + Content */}
        <div className="flex min-h-0 flex-1">
          {/* TOC sidebar */}
          {!search && (
            <nav aria-label="Help topics" className="w-44 shrink-0 border-r border-border/50 overflow-y-auto py-2 hidden sm:block">
              {sections.map(s => (
                <button
                  key={s.id}
                  onClick={() => scrollTo(s.id)}
                  aria-current={activeId === s.id ? 'true' : undefined}
                  className={`w-full text-left px-4 py-1.5 text-[11px] cursor-pointer transition-colors truncate ${
                    activeId === s.id
                      ? 'text-accent-orange-fg bg-accent-orange/10 border-r-2 border-accent-orange'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-cell/50'
                  }`}
                >
                  <span aria-hidden="true" className="mr-1.5">{s.icon}</span>
                  {s.title}
                </button>
              ))}
            </nav>
          )}

          {/* Content */}
          <div
            ref={contentRef}
            tabIndex={0}
            aria-label="Help content"
            className="overflow-y-auto flex-1 px-5 py-4 text-xs text-text-secondary leading-relaxed space-y-6"
            onScroll={() => {
              if (search) return;
              const container = contentRef.current;
              if (!container) return;
              const nodes = container.querySelectorAll('[data-section]');
              for (const node of nodes) {
                const rect = node.getBoundingClientRect();
                const containerRect = container.getBoundingClientRect();
                if (rect.top >= containerRect.top - 10 && rect.top < containerRect.top + 80) {
                  setActiveId((node as HTMLElement).dataset.section || '');
                  break;
                }
              }
            }}
          >
            <p className="sr-only" role="status">
              {search ? `${filtered.length} topic${filtered.length === 1 ? '' : 's'} found` : ''}
            </p>
            {filtered.length === 0 && (
              <p className="text-text-muted text-center py-8">No results for "{search}"</p>
            )}
            {filtered.map(s => (
              <section key={s.id} data-section={s.id} tabIndex={-1} aria-labelledby={`help-${s.id}`} className="focus:outline-none">
                <h3 id={`help-${s.id}`} className="text-xs font-semibold text-accent-orange-fg mb-2 flex items-center gap-1.5">
                  <span aria-hidden="true">{s.icon}</span> {s.title}
                </h3>
                {s.content}
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Sub({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-2.5">
      <h4 className="text-[11px] font-semibold text-text-primary mb-1">{title}</h4>
      {children}
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="px-1 py-0.5 bg-bg-cell border border-border rounded text-[11px] text-text-primary font-mono">
      {children}
    </kbd>
  );
}

/** Extract plain text from React nodes for search filtering */
function getTextContent(node: React.ReactNode): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (!node) return '';
  if (Array.isArray(node)) return node.map(getTextContent).join(' ');
  if (typeof node === 'object' && 'props' in node) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return getTextContent((node as any).props.children);
  }
  return '';
}

function SingleKeyToggle() {
  const on = useUIStore(s => s.singleKeyShortcuts);
  const setOn = useUIStore(s => s.setSingleKeyShortcuts);
  return (
    <label className="flex items-start gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={on}
        onChange={e => setOn(e.target.checked)}
        className="mt-0.5 w-4 h-4 accent-accent-orange cursor-pointer"
      />
      <span>
        Use single-key shortcuts (<Kbd>1</Kbd>–<Kbd>8</Kbd>, <Kbd>[</Kbd> <Kbd>]</Kbd>, <Kbd>\</Kbd>, <Kbd>R</Kbd>, and letter keys playing the Harmony piano).
        Turn this off if you use speech input or keep triggering them by accident. Space, ⌘/Ctrl shortcuts and armed live keys still work.
      </span>
    </label>
  );
}
