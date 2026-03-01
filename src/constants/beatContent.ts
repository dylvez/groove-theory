/**
 * Extended content for the Beats tab — about grooves, songs, building blocks,
 * fill patterns, and custom beat presets.
 */

// ── About This Groove (Feature A) ──────────────────────────────────────

export const BEAT_ABOUT_GROOVE: Record<string, string> = {
  'Standard Rock Beat':
    'The most universal drum pattern in popular music, born from the marriage of blues shuffle and electric guitar in the 1950s. Its steady pulse and unmistakable backbeat became the heartbeat of rock and roll, carrying everything from Chuck Berry to Foo Fighters with an energy that feels both primal and familiar.',
  'Four on the Floor':
    'Rooted in the relentless pulse of 1970s disco, this pattern became the engine of electronic dance music. The unwavering kick on every beat creates an almost hypnotic drive — equal parts euphoric and mechanical — that keeps bodies moving from Studio 54 to modern festival stages.',
  'Boom-Bap':
    "Named for the onomatopoeia of its kick-snare punch, boom-bap defined the golden era of New York hip-hop in the late '80s and early '90s. Gritty, sample-driven, and unapologetically rhythmic, it's the head-nodding backbone that carried lyricists from the Bronx to the world stage.",
  'Shuffle':
    'The shuffle traces its lineage to early Delta blues and the swinging triplet feel of jazz. That lilting, uneven bounce gives the groove a loose, human quality — it breathes and sways rather than marches, making it the natural rhythm of storytelling and twelve-bar blues.',
  'Bossa Nova':
    'Emerging from the beaches of Rio de Janeiro in the late 1950s, bossa nova fused samba\'s rhythmic complexity with the cool restraint of West Coast jazz. The result is an understated, swaying groove — intimate, sophisticated, and effortlessly elegant.',
  'Train Beat':
    'Inspired by the chugging rhythm of steam locomotives on American rail lines, the train beat became a staple of country and rockabilly music. The alternating snare pattern mimics the clickety-clack of wheels on track, creating a propulsive, storytelling groove that rolls forward with unstoppable momentum.',
  'Reggae One Drop':
    'Born in Kingston, Jamaica in the late 1960s, the one drop revolutionized drumming by removing the downbeat entirely. That deep, spacious pocket — with everything landing on beat 3 — creates a meditative, laid-back feel that became the sonic signature of roots reggae and Rastafarian consciousness.',
  'Motown':
    "Forged in Detroit's Hitsville U.S.A. studios, the Motown groove blended gospel energy with pop precision. Those driving sixteenth-note hi-hats and punchy backbeats gave the music an irresistible forward motion — polished enough for radio, soulful enough to move your whole body.",
  'Breakbeat (Amen Break)':
    "The most sampled drum break in history, the Amen Break originated from a 1969 B-side by The Winstons. Its syncopated, slightly off-kilter feel became the DNA of jungle, drum & bass, and breakbeat culture — six seconds of funk that launched entire genres.",
  'Waltz':
    'The oldest dance pattern still in common use, the waltz emerged in 18th-century Vienna and scandalized Europe with its close-hold partner dancing. Its graceful one-two-three pulse evokes elegance and sweeping motion, equally at home in a ballroom, a country barn, or a pop ballad.',
  'Jazz Waltz':
    'A swinging reinterpretation of the classical waltz, the jazz waltz trades rigid formality for loose, conversational interplay. Popularized by Miles Davis and Bill Evans in the late 1950s, it floats with an airy sophistication — three beats that breathe, push, and pull with improvisational freedom.',
  '3/4 Ballad':
    'The gentlest of the three-four patterns, the ballad groove creates wide-open emotional space. Its sparse, delicate touch — often just a whisper of cross-stick and brushes — lets the melody and lyrics take center stage, making it the natural home for love songs and introspective storytelling.',
  'Trap / 808':
    "Emerging from Atlanta's hip-hop scene in the early 2000s, trap redefined modern rhythm with booming 808 kicks, machine-gun hi-hats, and cavernous space. The contrast between sparse, heavy low end and skittering high frequencies creates a dark, cinematic energy that dominates contemporary pop and hip-hop.",
  'Funk':
    "Funk is all about the pocket — that deep, syncopated groove where every note locks into an interlocking rhythmic web. Pioneered by James Brown's band in the mid-1960s, it shifted the emphasis from melody to rhythm itself, making the drum pattern the hook and the groove the message.",
  'Half-Time':
    'Half-time creates the illusion of slowing down while the tempo stays constant, placing the snare on beat 3 instead of 2 and 4. This spacious, heavy feel became a go-to for modern rock breakdowns and EDM drops, building tension through restraint before exploding back into full-time energy.',
  'Ska Upbeat':
    "Born in Jamaica in the early 1960s as a precursor to rocksteady and reggae, ska's signature off-beat emphasis creates an infectious, bouncing energy. The relentless upstroke rhythm — later adopted by British 2 Tone and American ska-punk — is pure joy in motion, impossible to stand still to.",
  'House':
    "Invented in Chicago's underground clubs in the early 1980s, house music stripped dance rhythm to its essence: four kicks, open hats, and a clap. That minimalist foundation became a global movement, proving that the simplest grooves can generate the most powerful collective energy on a dance floor.",
  'Drum & Bass':
    'Accelerating breakbeats to dizzying tempos, drum & bass emerged from the UK rave scene in the early 1990s. Its frenetic, syncopated patterns over deep sub-bass create a thrilling tension — simultaneously chaotic and controlled — that pushed electronic music into new territory.',
};

// ── Songs with This Beat (Feature B) ───────────────────────────────────

export interface BeatSong {
  title: string;
  artist: string;
  url: string;
  bpm: number;
}

export const BEAT_SONGS: Record<string, BeatSong[]> = {
  'Standard Rock Beat': [
    { title: 'Back in Black', artist: 'AC/DC', url: 'https://www.youtube.com/watch?v=pAgnJDJN4VA', bpm: 120 },
    { title: 'Smells Like Teen Spirit', artist: 'Nirvana', url: 'https://www.youtube.com/watch?v=hTWKbfoikeg', bpm: 117 },
    { title: 'Billie Jean', artist: 'Michael Jackson', url: 'https://www.youtube.com/watch?v=Zi_XLOBDo_Y', bpm: 117 },
  ],
  'Four on the Floor': [
    { title: "Stayin' Alive", artist: 'Bee Gees', url: 'https://www.youtube.com/watch?v=I_izvAbhExk', bpm: 104 },
    { title: 'Around the World', artist: 'Daft Punk', url: 'https://www.youtube.com/watch?v=yca6UsllwYs', bpm: 121 },
    { title: 'I Feel Love', artist: 'Donna Summer', url: 'https://www.youtube.com/watch?v=Nm-ISatLDG0', bpm: 126 },
  ],
  'Boom-Bap': [
    { title: 'N.Y. State of Mind', artist: 'Nas', url: 'https://www.youtube.com/watch?v=UKjj4hk0pV4', bpm: 90 },
    { title: 'C.R.E.A.M.', artist: 'Wu-Tang Clan', url: 'https://www.youtube.com/watch?v=PBwAxmrE194', bpm: 83 },
    { title: 'Can I Kick It?', artist: 'A Tribe Called Quest', url: 'https://www.youtube.com/watch?v=71ubKHzujy8', bpm: 96 },
  ],
  'Shuffle': [
    { title: 'Pride and Joy', artist: 'Stevie Ray Vaughan', url: 'https://www.youtube.com/watch?v=0vo23H9J8o8', bpm: 122 },
    { title: 'Fool in the Rain', artist: 'Led Zeppelin', url: 'https://www.youtube.com/watch?v=vwM7MSg7rck', bpm: 132 },
    { title: 'Before You Accuse Me', artist: 'Eric Clapton', url: 'https://www.youtube.com/watch?v=DVDvS3-CzLk', bpm: 116 },
  ],
  'Bossa Nova': [
    { title: 'The Girl from Ipanema', artist: 'Stan Getz & João Gilberto', url: 'https://www.youtube.com/watch?v=c5QfXjsoNhk', bpm: 140 },
    { title: 'Corcovado (Quiet Nights)', artist: 'Antonio Carlos Jobim', url: 'https://www.youtube.com/watch?v=ZHwVBirqD2s', bpm: 108 },
    { title: 'Desafinado', artist: 'João Gilberto', url: 'https://www.youtube.com/watch?v=zH-5Bp1ggEw', bpm: 132 },
  ],
  'Train Beat': [
    { title: 'Folsom Prison Blues', artist: 'Johnny Cash', url: 'https://www.youtube.com/watch?v=bDktBZzQIiU', bpm: 116 },
    { title: 'Ring of Fire', artist: 'Johnny Cash', url: 'https://www.youtube.com/watch?v=It7107ELQvY', bpm: 108 },
    { title: 'Mama Tried', artist: 'Merle Haggard', url: 'https://www.youtube.com/watch?v=EF0Jvlxwhgw', bpm: 130 },
  ],
  'Reggae One Drop': [
    { title: 'Three Little Birds', artist: 'Bob Marley & The Wailers', url: 'https://www.youtube.com/watch?v=zaGUr6wzyT8', bpm: 74 },
    { title: 'No Woman No Cry', artist: 'Bob Marley & The Wailers', url: 'https://www.youtube.com/watch?v=x59kS2AOrGM', bpm: 80 },
    { title: "54-46 That's My Number", artist: 'Toots & the Maytals', url: 'https://www.youtube.com/watch?v=wOsHfpSMEfM', bpm: 80 },
  ],
  'Motown': [
    { title: 'Superstition', artist: 'Stevie Wonder', url: 'https://www.youtube.com/watch?v=0CFuCYNx-1g', bpm: 101 },
    { title: "Ain't No Mountain High Enough", artist: 'Marvin Gaye & Tammi Terrell', url: 'https://www.youtube.com/watch?v=IC5PL0XImjw', bpm: 122 },
    { title: 'My Girl', artist: 'The Temptations', url: 'https://www.youtube.com/watch?v=djV11Xbc914', bpm: 104 },
  ],
  'Breakbeat (Amen Break)': [
    { title: 'Amen Brother', artist: 'The Winstons', url: 'https://www.youtube.com/watch?v=GxZuq57_bYM', bpm: 138 },
    { title: 'Think (About It)', artist: 'Lyn Collins', url: 'https://www.youtube.com/watch?v=2NXOyKL3wgQ', bpm: 108 },
    { title: 'Funky Drummer', artist: 'James Brown', url: 'https://www.youtube.com/watch?v=AoQ4AtsFWVM', bpm: 102 },
  ],
  'Waltz': [
    { title: 'Tennessee Waltz', artist: 'Patti Page', url: 'https://www.youtube.com/watch?v=C0PNY-HF34c', bpm: 110 },
    { title: 'My Favorite Things', artist: 'Julie Andrews', url: 'https://www.youtube.com/watch?v=33o32C0ogVM', bpm: 140 },
    { title: 'Norwegian Wood', artist: 'The Beatles', url: 'https://www.youtube.com/watch?v=Y_V6y1ZCg_8', bpm: 88 },
  ],
  'Jazz Waltz': [
    { title: 'Someday My Prince Will Come', artist: 'Miles Davis', url: 'https://www.youtube.com/watch?v=BvJx2txXGEo', bpm: 168 },
    { title: 'All Blues', artist: 'Miles Davis', url: 'https://www.youtube.com/watch?v=rLvRQyf-FoA', bpm: 138 },
    { title: 'Waltz for Debby', artist: 'Bill Evans Trio', url: 'https://www.youtube.com/watch?v=xzJqKzqiFCQ', bpm: 160 },
  ],
  '3/4 Ballad': [
    { title: 'Nothing Else Matters', artist: 'Metallica', url: 'https://www.youtube.com/watch?v=tAGnKpE4NCI', bpm: 69 },
    { title: 'Take It to the Limit', artist: 'Eagles', url: 'https://www.youtube.com/watch?v=ZSQo-2fVWOU', bpm: 72 },
    { title: 'Breakaway', artist: 'Kelly Clarkson', url: 'https://www.youtube.com/watch?v=c-3vPxKdj6o', bpm: 72 },
  ],
  'Trap / 808': [
    { title: 'Mask Off', artist: 'Future', url: 'https://www.youtube.com/watch?v=xvZqHgFz51I', bpm: 150 },
    { title: 'SICKO MODE', artist: 'Travis Scott', url: 'https://www.youtube.com/watch?v=6ONRf7h3Mdk', bpm: 155 },
    { title: 'Bad and Boujee', artist: 'Migos ft. Lil Uzi Vert', url: 'https://www.youtube.com/watch?v=S-sJp1FfG7Q', bpm: 127 },
  ],
  'Funk': [
    { title: 'Get Up (I Feel Like Being a) Sex Machine', artist: 'James Brown', url: 'https://www.youtube.com/watch?v=8mjQ1i5V0cE', bpm: 112 },
    { title: 'Give Up the Funk (Tear the Roof off the Sucker)', artist: 'Parliament', url: 'https://www.youtube.com/watch?v=gBbUCBRm9hA', bpm: 108 },
    { title: 'Cissy Strut', artist: 'The Meters', url: 'https://www.youtube.com/watch?v=4_iC0MyIykM', bpm: 96 },
  ],
  'Half-Time': [
    { title: 'In the Air Tonight', artist: 'Phil Collins', url: 'https://www.youtube.com/watch?v=YkADj0TPrJA', bpm: 108 },
    { title: 'Heathens', artist: 'Twenty One Pilots', url: 'https://www.youtube.com/watch?v=UprcpdwuwCg', bpm: 90 },
    { title: 'Lovely', artist: 'Billie Eilish & Khalid', url: 'https://www.youtube.com/watch?v=V1Pl8CzNzCw', bpm: 115 },
  ],
  'Ska Upbeat': [
    { title: 'A Message to You Rudy', artist: 'The Specials', url: 'https://www.youtube.com/watch?v=cntvEDbagAw', bpm: 168 },
    { title: 'Santeria', artist: 'Sublime', url: 'https://www.youtube.com/watch?v=AEYN5w4T_aM', bpm: 90 },
    { title: 'The Impression That I Get', artist: 'Mighty Mighty Bosstones', url: 'https://www.youtube.com/watch?v=NIGMUAMevH0', bpm: 168 },
  ],
  'House': [
    { title: 'Your Love', artist: 'Frankie Knuckles', url: 'https://www.youtube.com/watch?v=LOLE1YE_oFQ', bpm: 122 },
    { title: 'One More Time', artist: 'Daft Punk', url: 'https://www.youtube.com/watch?v=FGBhQbmPwH8', bpm: 123 },
    { title: 'Show Me Love', artist: 'Robin S', url: 'https://www.youtube.com/watch?v=Ps2Jc28tQrw', bpm: 124 },
  ],
  'Drum & Bass': [
    { title: 'Inner City Life', artist: 'Goldie', url: 'https://www.youtube.com/watch?v=wI3Ay7V_JoA', bpm: 170 },
    { title: 'Brown Paper Bag', artist: 'Roni Size & Reprazent', url: 'https://www.youtube.com/watch?v=cwI0gbGEU_A', bpm: 170 },
    { title: 'Original Nuttah', artist: 'UK Apache & Shy FX', url: 'https://www.youtube.com/watch?v=w3eBiCmR3eQ', bpm: 170 },
  ],
};

// ── Building Blocks (Feature E) ────────────────────────────────────────

export interface BuildingBlock {
  name: string;
  shortLabel: string;
  instrument: string;      // drum key (e.g. 'kick', 'hihat-closed')
  instrumentLabel: string;  // display name
  description: string;
  steps: number[];          // 16-step pattern (1 bar of 16th notes in 4/4)
}

export const BUILDING_BLOCKS: BuildingBlock[] = [
  {
    name: 'Four on the Floor', shortLabel: '4otF', instrument: 'kick', instrumentLabel: 'Kick',
    description: 'Kick drum on every quarter note — the driving pulse behind disco, house, and EDM.',
    steps: [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],
  },
  {
    name: 'Backbeat', shortLabel: 'Back', instrument: 'snare', instrumentLabel: 'Snare',
    description: 'Snare on beats 2 and 4 — the defining accent of rock, pop, and nearly all Western popular music.',
    steps: [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
  },
  {
    name: 'Straight 8ths', shortLabel: '8ths', instrument: 'hihat-closed', instrumentLabel: 'Hi-Hat',
    description: 'Closed hi-hat on every eighth note — the steady rhythmic grid that anchors most rock and pop grooves.',
    steps: [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0],
  },
  {
    name: 'Straight 16ths', shortLabel: '16ths', instrument: 'hihat-closed', instrumentLabel: 'Hi-Hat',
    description: 'Closed hi-hat on every sixteenth note — a driving, busy pattern that adds urgency and forward motion to funk and R&B.',
    steps: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  },
  {
    name: 'Offbeat Hat', shortLabel: 'Off', instrument: 'hihat-closed', instrumentLabel: 'Hi-Hat',
    description: "Hi-hat on the 'and' of every beat — the rhythmic skeleton of reggae, ska, and dance music's signature bounce.",
    steps: [0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0],
  },
  {
    name: 'Shuffle Hat', shortLabel: 'Shfl', instrument: 'hihat-closed', instrumentLabel: 'Hi-Hat',
    description: 'Triplet-based hi-hat with the middle note skipped — the swinging, lopsided pulse that gives blues and jazz their groove.',
    steps: [1,0,0,1,0,1,1,0,0,1,0,1,1,0,0,1],
  },
  {
    name: 'Ghost Notes', shortLabel: 'Ghost', instrument: 'snare', instrumentLabel: 'Snare',
    description: 'Quiet snare hits between the backbeat — the subtle texture that separates a flat beat from a living, breathing groove.',
    steps: [0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0],
  },
  {
    name: 'Syncopated Kick', shortLabel: 'Sync', instrument: 'kick', instrumentLabel: 'Kick',
    description: 'Kick on offbeats and unexpected subdivisions — the push-pull tension that makes funk, hip-hop, and breakbeats feel alive.',
    steps: [0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,1],
  },
  {
    name: 'Open Hat Accent', shortLabel: 'Open', instrument: 'hihat-open', instrumentLabel: 'Open HH',
    description: 'Open hi-hat on specific offbeats for lift and release — a bright, sustained splash that creates tension before snapping shut.',
    steps: [0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0],
  },
  {
    name: 'Cross-stick Pulse', shortLabel: 'Xstk', instrument: 'rim', instrumentLabel: 'Rim',
    description: 'Rim click on steady quarter notes — a dry, woody tick that adds texture without overpowering, essential to bossa nova and ballads.',
    steps: [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],
  },
];

// ── Fill Patterns (Feature G) ──────────────────────────────────────────

export interface FillPattern {
  name: string;
  description: string;
  duration: string;
  intensity: 'light' | 'medium' | 'heavy';
  genres: string[];
  steps: Record<string, number[]>; // instrument -> 16-step pattern
}

export const FILL_PATTERNS: FillPattern[] = [
  {
    name: 'Single Flam',
    description: 'A quick snare accent to mark a transition — the smallest possible fill.',
    duration: '1 beat', intensity: 'light', genres: ['Rock', 'Pop', 'Funk'],
    steps: { snare: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1] },
  },
  {
    name: 'Snare Roll Build',
    description: 'Increasing snare density from quarters to eighths to sixteenths, building momentum into a downbeat.',
    duration: 'half-bar', intensity: 'medium', genres: ['Rock', 'Pop', 'EDM'],
    steps: { snare: [0,0,0,0,0,0,0,0,1,0,1,0,1,1,1,1] },
  },
  {
    name: 'Tom Cascade',
    description: 'Descending tom hits from high to floor — a dramatic, sweeping fill that commands attention.',
    duration: 'full bar', intensity: 'heavy', genres: ['Rock', 'Prog', 'Metal'],
    steps: { snare: [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], rim: [0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0], kick: [0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0] },
  },
  {
    name: 'Kick Build',
    description: 'Accelerating kick drum pattern that drives into a drop or chorus.',
    duration: 'full bar', intensity: 'heavy', genres: ['EDM', 'House', 'Trap'],
    steps: { kick: [1,0,0,0,1,0,0,0,1,0,1,0,1,1,1,1] },
  },
  {
    name: 'Hat Open Swell',
    description: 'Gradually opening the hi-hat over two beats to create rising tension.',
    duration: '2 beats', intensity: 'light', genres: ['Jazz', 'Funk', 'R&B'],
    steps: { 'hihat-open': [0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,1] },
  },
  {
    name: 'Crash Accent',
    description: 'A single crash cymbal with kick on the downbeat to punctuate a section change.',
    duration: '1 beat', intensity: 'light', genres: ['Rock', 'Pop', 'Punk'],
    steps: { crash: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], kick: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1] },
  },
  {
    name: 'Breakdown Drop',
    description: 'All drums cut except the kick for one bar, creating sudden contrast and space.',
    duration: 'full bar', intensity: 'medium', genres: ['EDM', 'Hip-Hop', 'Rock'],
    steps: { kick: [1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0] },
  },
  {
    name: 'Snare-to-Tom Fill',
    description: 'Classic descending pattern from snare to tom — the fill every drummer learns first.',
    duration: 'full bar', intensity: 'medium', genres: ['Rock', 'Pop', 'Funk'],
    steps: { snare: [1,0,1,0,1,0,1,0,0,0,0,0,0,0,0,0], rim: [0,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0], kick: [0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0] },
  },
];

// ── Custom Beat Presets (Feature H) ────────────────────────────────────

export const CUSTOM_BEAT_PRESETS: Record<string, Record<string, Record<string, number[]>>> = {
  kick: {
    none:            { kick: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] },
    'four-on-floor': { kick: [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0] },
    backbeat:        { kick: [1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0] },
    syncopated:      { kick: [1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,1] },
    sparse:          { kick: [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] },
  },
  snare: {
    none:            { snare: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] },
    backbeat:        { snare: [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0] },
    'on-3':          { snare: [0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0] },
    'ghost-notes':   { snare: [0,0,1,0,1,0,1,0,0,0,1,0,1,0,1,0] },
    sparse:          { snare: [0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0] },
  },
  hihat: {
    none:              { 'hihat-closed': [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] },
    '8ths-closed':     { 'hihat-closed': [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0] },
    '16ths-closed':    { 'hihat-closed': [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1] },
    'offbeat-open':    { 'hihat-open':   [0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0] },
    shuffle:           { 'hihat-closed': [1,0,0,1,0,1,1,0,0,1,0,1,1,0,0,1] },
  },
  accent: {
    none:              {},
    'open-hat-and4':   { 'hihat-open': [0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0] },
    'crash-on-1':      { crash: [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] },
    'ride-quarters':   { ride:  [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0] },
  },
};

export const CUSTOM_BEAT_OPTIONS: Record<string, { value: string; label: string }[]> = {
  kick: [
    { value: 'none', label: 'None' },
    { value: 'four-on-floor', label: 'Four on the Floor' },
    { value: 'backbeat', label: 'Backbeat (1 & 3)' },
    { value: 'syncopated', label: 'Syncopated' },
    { value: 'sparse', label: 'Sparse' },
  ],
  snare: [
    { value: 'none', label: 'None' },
    { value: 'backbeat', label: 'Backbeat (2 & 4)' },
    { value: 'on-3', label: 'On Beat 3' },
    { value: 'ghost-notes', label: 'With Ghost Notes' },
    { value: 'sparse', label: 'Sparse' },
  ],
  hihat: [
    { value: 'none', label: 'None' },
    { value: '8ths-closed', label: '8ths Closed' },
    { value: '16ths-closed', label: '16ths Closed' },
    { value: 'offbeat-open', label: 'Offbeat Open' },
    { value: 'shuffle', label: 'Shuffle' },
  ],
  accent: [
    { value: 'none', label: 'None' },
    { value: 'open-hat-and4', label: 'Open Hat on &4' },
    { value: 'crash-on-1', label: 'Crash on 1' },
    { value: 'ride-quarters', label: 'Ride Quarter Notes' },
  ],
};
