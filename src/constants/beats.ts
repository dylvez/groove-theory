export interface BeatDefinition {
  name: string;
  description: string;
  genre: string;
  timeSignature: string;
  subdivision: number;
  suggestedBpm: { min: number; max: number };
  tracks: {
    instrument: string;
    label: string;
    steps: boolean[];
  }[];
}

// Helper: create boolean array from active step indices
function steps(size: number, active: number[]): boolean[] {
  const arr = new Array(size).fill(false);
  for (const i of active) arr[i] = true;
  return arr;
}

export const BEATS: BeatDefinition[] = [
  // ── 1. Standard Rock Beat ──────────────────────────────────────
  // Measure 1: straight 8th-note hats, kick on 1/3, snare on 2/4
  // Measure 2: open hat on beat 4, kick adds "and of 3", snare fill on beat 4
  {
    name: 'Standard Rock Beat',
    description: 'Kick on 1 and 3, snare on 2 and 4, eighth-note hi-hats. Bar 2 adds an open hat and kick push for a classic 2-bar phrase.',
    genre: 'Rock',
    timeSignature: '4/4',
    subdivision: 32,
    suggestedBpm: { min: 80, max: 130 },
    tracks: [
      { instrument: 'hihat-open',   label: 'OHH', steps: steps(32, [28]) },
      { instrument: 'hihat-closed', label: 'HH',  steps: steps(32, [0,2,4,6,8,10,12,14, 16,18,20,22,24,26]) },
      { instrument: 'snare',        label: 'SNR', steps: steps(32, [4,12, 20,28,30]) },
      { instrument: 'kick',         label: 'KCK', steps: steps(32, [0,8, 16,24,26]) },
    ],
  },

  // ── 2. Four on the Floor ───────────────────────────────────────
  // Measure 1: classic disco — offbeat hats, kick every beat
  // Measure 2: open hat on "and of 4", adds clap layer, kick adds 16th push
  {
    name: 'Four on the Floor',
    description: 'Kick on every beat with offbeat hi-hats and snare on 2 and 4. Bar 2 swaps snare for clap, opens the hat, and adds a syncopated kick for a building 2-bar phrase.',
    genre: 'Disco / EDM',
    timeSignature: '4/4',
    subdivision: 32,
    suggestedBpm: { min: 115, max: 135 },
    tracks: [
      { instrument: 'hihat-open',   label: 'OHH', steps: steps(32, [30]) },
      { instrument: 'hihat-closed', label: 'HH',  steps: steps(32, [2,6,10,14, 18,22,26]) },
      { instrument: 'clap',         label: 'CLP', steps: steps(32, [20,28]) },
      { instrument: 'snare',        label: 'SNR', steps: steps(32, [4,12]) },
      { instrument: 'kick',         label: 'KCK', steps: steps(32, [0,4,8,12, 16,20,24,27,28]) },
    ],
  },

  // ── 3. Boom-Bap ────────────────────────────────────────────────
  // Measure 1: classic — kick on 1 and "and of 2", snare on 3
  // Measure 2: kick adds "and of 4", snare adds ghost on "a of 2", open hat accent
  {
    name: 'Boom-Bap',
    description: 'Kick on 1 and the "and" of 2, snare on 3. Bar 2 adds ghost snare and kick variations for that head-nodding golden era feel.',
    genre: 'Hip-Hop',
    timeSignature: '4/4',
    subdivision: 32,
    suggestedBpm: { min: 80, max: 100 },
    tracks: [
      { instrument: 'hihat-open',   label: 'OHH', steps: steps(32, [22]) },
      { instrument: 'hihat-closed', label: 'HH',  steps: steps(32, [0,2,4,6,8,10,12,14, 16,18,20,24,26,28,30]) },
      { instrument: 'snare',        label: 'SNR', steps: steps(32, [8, 23,24,30]) },
      { instrument: 'kick',         label: 'KCK', steps: steps(32, [0,6, 16,22,30]) },
    ],
  },

  // ── 4. Shuffle ─────────────────────────────────────────────────
  // Measure 1: standard triplet shuffle
  // Measure 2: open hat on beat 4, kick adds pickup into bar 1, snare ghost on last triplet
  {
    name: 'Shuffle',
    description: 'Triplet-based hi-hat pattern with a swing feel. Bar 2 opens up with hat accents and a kick pickup for a 2-bar blues turnaround.',
    genre: 'Blues / Rock',
    timeSignature: '3/4',
    subdivision: 24,
    suggestedBpm: { min: 100, max: 140 },
    tracks: [
      { instrument: 'hihat-open',   label: 'OHH', steps: steps(24, [21]) },
      { instrument: 'hihat-closed', label: 'HH',  steps: steps(24, [0,2,3,5,6,8,9,11, 12,14,15,17,18,20,23]) },
      { instrument: 'snare',        label: 'SNR', steps: steps(24, [3,9, 15,21,23]) },
      { instrument: 'kick',         label: 'KCK', steps: steps(24, [0,6, 12,17,18]) },
    ],
  },

  // ── 5. Bossa Nova ──────────────────────────────────────────────
  // Measure 1: standard bossa clave-style pattern
  // Measure 2: rim pattern shifts, kick adds anticipation — the classic 2-bar bossa cycle
  {
    name: 'Bossa Nova',
    description: 'A syncopated cross-stick pattern over a steady pulse. The full 2-bar clave cycle that defines the bossa groove.',
    genre: 'Brazilian Jazz',
    timeSignature: '4/4',
    subdivision: 32,
    suggestedBpm: { min: 120, max: 145 },
    tracks: [
      { instrument: 'hihat-closed', label: 'HH',  steps: steps(32, [0,2,4,6,8,10,12,14, 16,18,20,22,24,26,28,30]) },
      { instrument: 'snare',        label: 'RIM', steps: steps(32, [4,10, 20,22,28]) },
      { instrument: 'kick',         label: 'KCK', steps: steps(32, [0,6,8,14, 16,22,24,30]) },
    ],
  },

  // ── 6. Train Beat ──────────────────────────────────────────────
  // Measure 1: standard galloping snare with quarter-note hats
  // Measure 2: adds open hat accents, kick fills leading into turnaround
  {
    name: 'Train Beat',
    description: 'Alternating hands on the snare creating a galloping rhythm. Bar 2 opens the hat and drives into a turnaround fill.',
    genre: 'Country',
    timeSignature: '4/4',
    subdivision: 32,
    suggestedBpm: { min: 100, max: 140 },
    tracks: [
      { instrument: 'hihat-open',   label: 'OHH', steps: steps(32, [24]) },
      { instrument: 'hihat-closed', label: 'HH',  steps: steps(32, [0,4,8,12, 16,20,28]) },
      { instrument: 'snare',        label: 'SNR', steps: steps(32, [0,2,4,6,8,10,12,14, 16,18,20,22,24,26,28,30]) },
      { instrument: 'kick',         label: 'KCK', steps: steps(32, [0,8, 16,24,26,28]) },
    ],
  },

  // ── 7. Reggae One Drop ─────────────────────────────────────────
  // Measure 1: classic one drop — kick+snare on 3, nothing on 1
  // Measure 2: rim ghost on "and of 2", kick anticipates beat 3 — deeper pocket
  {
    name: 'Reggae One Drop',
    description: 'Kick and snare hit together on beat 3, nothing on 1. Bar 2 adds a rim ghost and kick anticipation for that deep, laid-back groove.',
    genre: 'Reggae',
    timeSignature: '4/4',
    subdivision: 32,
    suggestedBpm: { min: 65, max: 90 },
    tracks: [
      { instrument: 'hihat-closed', label: 'HH',  steps: steps(32, [0,2,4,6,8,10,12,14, 16,18,20,22,24,26,28,30]) },
      { instrument: 'snare',        label: 'RIM', steps: steps(32, [22]) },
      { instrument: 'snare',        label: 'SNR', steps: steps(32, [8, 24]) },
      { instrument: 'kick',         label: 'KCK', steps: steps(32, [8, 23,24]) },
    ],
  },

  // ── 8. Motown ──────────────────────────────────────────────────
  // Measure 1: 16th-note hats, kick on 1 and 3, snare 2 and 4
  // Measure 2: adds tambourine-like open hat accents, kick syncopation before 4
  {
    name: 'Motown',
    description: 'Driving 16th-note hi-hats with snare on 2 and 4. Bar 2 opens the hat and pushes the kick for that punchy soul build.',
    genre: 'Soul / Motown',
    timeSignature: '4/4',
    subdivision: 32,
    suggestedBpm: { min: 100, max: 130 },
    tracks: [
      { instrument: 'hihat-open',   label: 'OHH', steps: steps(32, [22,30]) },
      { instrument: 'hihat-closed', label: 'HH',  steps: steps(32, [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15, 16,17,18,19,20,21,23,24,25,26,27,28,29]) },
      { instrument: 'snare',        label: 'SNR', steps: steps(32, [4,12, 20,28]) },
      { instrument: 'kick',         label: 'KCK', steps: steps(32, [0,8, 16,24,27]) },
    ],
  },

  // ── 10. Breakbeat (Amen Break) ─────────────────────────────────
  // Measure 1: classic syncopated amen pattern
  // Measure 2: snare roll on beat 4, kick displacement, ride opens up — the classic break variation
  {
    name: 'Breakbeat (Amen Break)',
    description: 'Syncopated funk pattern inspired by the Amen Break, with displaced hits. Bar 2 adds a snare roll and kick push — a stylistic 2-bar interpretation that helped spawn jungle and D&B.',
    genre: 'Funk / D&B',
    timeSignature: '4/4',
    subdivision: 32,
    suggestedBpm: { min: 130, max: 170 },
    tracks: [
      { instrument: 'ride',  label: 'RDE', steps: steps(32, [0,2,4,6,8,10,12,14, 16,18,20,22,24,26,28,30]) },
      { instrument: 'snare', label: 'SNR', steps: steps(32, [4,10,14, 20,26,28,30]) },
      { instrument: 'kick',  label: 'KCK', steps: steps(32, [0,6,10, 16,22,25]) },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 3/4 TIME PATTERNS (24 steps = 2 measures × 12 sixteenth-notes)
  // ═══════════════════════════════════════════════════════════════

  // ── 11. Waltz ─────────────────────────────────────────────────
  // Measure 1: classic oom-pah-pah — kick on 1, snare on 2 & 3
  // Measure 2: open hat accent on "and of 2", kick anticipation into next bar
  {
    name: 'Waltz',
    description: 'Classic 1-2-3 pattern with kick on the downbeat and snare on beats 2 and 3. Bar 2 adds an open hat accent on the "and" of 2 and kick anticipation.',
    genre: 'Classical / Pop',
    timeSignature: '3/4',
    subdivision: 24,
    suggestedBpm: { min: 80, max: 140 },
    tracks: [
      { instrument: 'hihat-open',   label: 'OHH', steps: steps(24, [18]) },
      { instrument: 'hihat-closed', label: 'HH',  steps: steps(24, [0,2,4,6,8,10, 12,14,16,20,22]) },
      { instrument: 'snare',        label: 'SNR', steps: steps(24, [4,8, 16,20]) },
      { instrument: 'kick',         label: 'KCK', steps: steps(24, [0, 12,22]) },
    ],
  },

  // ── 12. Jazz Waltz ────────────────────────────────────────────
  // Measure 1: ride on quarters, brush snare ghost on "and" of 2, kick on 1 & 3
  // Measure 2: ride adds upbeat accent, kick pushes into beat 3
  {
    name: 'Jazz Waltz',
    description: 'Ride cymbal on quarter notes with ghost snare accents. Bar 2 adds ride upbeats and a kick push for a swinging 3/4 jazz feel.',
    genre: 'Jazz',
    timeSignature: '3/4',
    subdivision: 24,
    suggestedBpm: { min: 100, max: 160 },
    tracks: [
      { instrument: 'ride',         label: 'RDE', steps: steps(24, [0,4,8, 12,14,16,20]) },
      { instrument: 'hihat-closed', label: 'HH',  steps: steps(24, [2,6,10, 14,18,22]) },
      { instrument: 'snare',        label: 'SNR', steps: steps(24, [6, 16,18]) },
      { instrument: 'kick',         label: 'KCK', steps: steps(24, [0,8, 12,19]) },
    ],
  },

  // ── 13. 3/4 Ballad ───────────────────────────────────────────
  // Measure 1: gentle kick on 1, cross-stick on 3, eighth-note hats
  // Measure 2: adds open hat on beat 3 and tom fill leading into next phrase
  {
    name: '3/4 Ballad',
    description: 'A gentle, spacious pattern with light kick and cross-stick. Bar 2 opens the hat and adds a tom fill for an expressive 2-bar phrase.',
    genre: 'Ballad / Folk',
    timeSignature: '3/4',
    subdivision: 24,
    suggestedBpm: { min: 60, max: 100 },
    tracks: [
      { instrument: 'hihat-open',   label: 'OHH', steps: steps(24, [20]) },
      { instrument: 'hihat-closed', label: 'HH',  steps: steps(24, [0,2,4,6,8,10, 12,14,16,18,22]) },
      { instrument: 'snare',        label: 'SNR', steps: steps(24, [8, 20]) },
      { instrument: 'tom-mid',      label: 'TOM', steps: steps(24, [21,22,23]) },
      { instrument: 'kick',         label: 'KCK', steps: steps(24, [0, 12]) },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // ADDITIONAL 4/4 PATTERNS
  // ═══════════════════════════════════════════════════════════════

  // ── 14. Trap / 808 ──────────────────────────────────────────
  // Rapid hi-hat rolls, sparse heavy kick, clap/snare on beat 3
  {
    name: 'Trap / 808',
    description: 'Sparse, heavy kick with rapid hi-hat 16ths, stacked clap and snare on beat 3, and open hat on the "and" of 4. Bar 2 adds kick syncopation and hat accents for modern trap energy.',
    genre: 'Trap / Hip-Hop',
    timeSignature: '4/4',
    subdivision: 32,
    suggestedBpm: { min: 130, max: 160 },
    tracks: [
      { instrument: 'hihat-open',   label: 'OHH', steps: steps(32, [14, 30]) },
      { instrument: 'hihat-closed', label: 'HH',  steps: steps(32, [0,1,2,3,4,5,6,7,8,9,10,11,12,13, 16,17,18,19,20,21,22,23,24,25,26,27,28,29]) },
      { instrument: 'clap',         label: 'CLP', steps: steps(32, [8, 24]) },
      { instrument: 'snare',        label: 'SNR', steps: steps(32, [8, 24]) },
      { instrument: 'kick',         label: 'KCK', steps: steps(32, [0,3,14, 16,19,30]) },
    ],
  },

  // ── 15. Funk ────────────────────────────────────────────────
  // Syncopated kick, ghost snare notes, 16th-note hats
  {
    name: 'Funk',
    description: 'Syncopated kick and ghost snare notes over driving 8th-note hi-hats. Bar 2 opens the hat and adds kick push for a deep funk pocket.',
    genre: 'Funk',
    timeSignature: '4/4',
    subdivision: 32,
    suggestedBpm: { min: 95, max: 120 },
    tracks: [
      { instrument: 'hihat-open',   label: 'OHH', steps: steps(32, [14, 30]) },
      { instrument: 'hihat-closed', label: 'HH',  steps: steps(32, [0,2,4,6,8,10,12, 16,18,20,22,24,26,28]) },
      { instrument: 'snare',        label: 'SNR', steps: steps(32, [4,9,12, 20,25,28]) },
      { instrument: 'kick',         label: 'KCK', steps: steps(32, [0,6,10, 16,22,26]) },
    ],
  },

  // ── 16. Half-Time ───────────────────────────────────────────
  // Snare only on beat 3, spacious and heavy
  {
    name: 'Half-Time',
    description: 'Snare only on beat 3 with a heavy, spacious feel. Bar 2 adds syncopated kicks for the breakdown groove used in modern rock and EDM.',
    genre: 'Rock / EDM',
    timeSignature: '4/4',
    subdivision: 32,
    suggestedBpm: { min: 130, max: 170 },
    tracks: [
      { instrument: 'hihat-closed', label: 'HH',  steps: steps(32, [0,2,4,6,8,10,12,14, 16,18,20,22,24,26,28,30]) },
      { instrument: 'snare',        label: 'SNR', steps: steps(32, [8, 24]) },
      { instrument: 'kick',         label: 'KCK', steps: steps(32, [0,3,6, 16,19,22]) },
    ],
  },

  // ── 17. Ska Upbeat ──────────────────────────────────────────
  // Off-beat emphasis, snare on 2 and 4, classic skank
  {
    name: 'Ska Upbeat',
    description: 'Driving off-beat hi-hats with snare on 2 and 4. Bar 2 adds open hat accents for the classic skank rhythm that defines ska.',
    genre: 'Ska',
    timeSignature: '4/4',
    subdivision: 32,
    suggestedBpm: { min: 140, max: 180 },
    tracks: [
      { instrument: 'hihat-open',   label: 'OHH', steps: steps(32, [22, 30]) },
      { instrument: 'hihat-closed', label: 'HH',  steps: steps(32, [2,6,10,14, 18,26]) },
      { instrument: 'snare',        label: 'SNR', steps: steps(32, [4,12, 20,28]) },
      { instrument: 'kick',         label: 'KCK', steps: steps(32, [0,8, 16,24]) },
    ],
  },

  // ── 18. House ───────────────────────────────────────────────
  // Four-on-the-floor kick, open hats on off-beats, clap on 2 & 4
  {
    name: 'House',
    description: 'Four-on-the-floor kick with open hi-hats on the off-beat and claps on 2 and 4. The foundation of house and techno.',
    genre: 'House / Techno',
    timeSignature: '4/4',
    subdivision: 32,
    suggestedBpm: { min: 120, max: 130 },
    tracks: [
      { instrument: 'hihat-open',   label: 'OHH', steps: steps(32, [2,6,10,14, 18,22,26,30]) },
      { instrument: 'clap',         label: 'CLP', steps: steps(32, [4,12, 20,28]) },
      { instrument: 'kick',         label: 'KCK', steps: steps(32, [0,4,8,12, 16,20,24,28]) },
    ],
  },

  // ── 19. Drum & Bass ─────────────────────────────────────────
  // Fast breakbeat-influenced pattern with syncopated snare
  {
    name: 'Drum & Bass',
    description: 'Fast, syncopated breakbeat with rolling 8th-note hi-hats and displaced snare and kick hits. The backbone of jungle and D&B.',
    genre: 'Drum & Bass',
    timeSignature: '4/4',
    subdivision: 32,
    suggestedBpm: { min: 160, max: 180 },
    tracks: [
      { instrument: 'hihat-closed', label: 'HH',  steps: steps(32, [0,2,4,6,8,10,12,14, 16,18,20,22,24,26,28,30]) },
      { instrument: 'snare',        label: 'SNR', steps: steps(32, [4,14, 20,28,30]) },
      { instrument: 'kick',         label: 'KCK', steps: steps(32, [0,10, 16,26]) },
    ],
  },
];
