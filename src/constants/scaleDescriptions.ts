/** Brief descriptions of each scale's character and typical usage. */
export const SCALE_DESCRIPTIONS: Record<string, string> = {
  'Major':
    'Bright, happy, and resolved. The foundation of Western music, used across pop, classical, country, and jazz.',
  'Natural Minor':
    'Dark and melancholic with a softer, unresolved quality. Common in rock, pop ballads, and classical music.',
  'Harmonic Minor':
    'Dramatic and exotic due to the raised 7th creating a leading tone. Frequently heard in classical, flamenco, and metal.',
  'Melodic Minor':
    'Smooth and sophisticated with both the 6th and 7th raised. A staple of jazz improvisation and classical melody.',
  'Dorian':
    'Minor with a brighter edge thanks to the raised 6th. Popular in jazz, funk, blues, and classic rock.',
  'Phrygian':
    'Dark and tense with a distinctive flat 2nd. Evokes Spanish, Middle Eastern, and metal sounds.',
  'Lydian':
    'Dreamy and floating due to the raised 4th. Used in film scores, jazz fusion, and progressive rock.',
  'Mixolydian':
    'Major but with a bluesy, laid-back feel from the flat 7th. Essential for blues rock, funk, and folk.',
  'Locrian':
    'Unstable and dissonant with a diminished tonic chord. Rarely used as a key center but appears in metal and jazz.',
  'Pentatonic Major':
    'Warm and universally pleasant with just five notes. Found in folk, country, pop melodies, and world music.',
  'Pentatonic Minor':
    'Soulful and versatile — the go-to scale for rock and blues soloing. Works over almost any minor context.',
  'Blues':
    'The pentatonic minor plus a chromatic "blue note" for grit and tension. The backbone of blues, rock, and jazz.',
  'Chromatic':
    'All twelve notes with no tonal center. Used for chromatic runs, passing tones, and atonal or avant-garde music.',
};

export interface ScaleSongExample {
  title: string;
  key: string;
  url: string;
}

/** Three example songs for each scale, with YouTube links. */
export const SCALE_SONG_EXAMPLES: Record<string, ScaleSongExample[]> = {
  'Major': [
    { title: 'Here Comes the Sun', key: 'A', url: 'https://www.youtube.com/watch?v=KQetemT1sWc' },
    { title: "Don't Stop Believin'", key: 'E', url: 'https://www.youtube.com/watch?v=1k8craCGpgs' },
    { title: 'Happy', key: 'F', url: 'https://www.youtube.com/watch?v=ZbZSe6N_BXs' },
  ],
  'Natural Minor': [
    { title: 'Losing My Religion', key: 'A', url: 'https://www.youtube.com/watch?v=xwtdhWltSIg' },
    { title: "Ain't No Sunshine", key: 'A', url: 'https://www.youtube.com/watch?v=CICIOJqEb5c' },
    { title: 'Somebody That I Used to Know', key: 'D', url: 'https://www.youtube.com/watch?v=8UVNT4wvIGY' },
  ],
  'Harmonic Minor': [
    { title: 'Misirlou', key: 'E', url: 'https://www.youtube.com/watch?v=mKpsuGMeqHI' },
    { title: 'Hit the Road Jack', key: 'A', url: 'https://www.youtube.com/watch?v=Q8Tiz6INF7I' },
    { title: 'Phantom of the Opera', key: 'E', url: 'https://www.youtube.com/watch?v=6zU5pA1Z0pI' },
  ],
  'Melodic Minor': [
    { title: 'Yesterday', key: 'D', url: 'https://www.youtube.com/watch?v=NrgmdOz227I' },
    { title: 'Stella by Starlight', key: 'A#', url: 'https://www.youtube.com/watch?v=MyUVS6pV7G0' },
    { title: 'Solar', key: 'C', url: 'https://www.youtube.com/watch?v=0jO3oZ2Gd7U' },
  ],
  'Dorian': [
    { title: 'So What', key: 'D', url: 'https://www.youtube.com/watch?v=zqNTltOGh5c' },
    { title: 'Billie Jean', key: 'F#', url: 'https://www.youtube.com/watch?v=Zi_XLOBDo_Y' },
    { title: 'Riders on the Storm', key: 'E', url: 'https://www.youtube.com/watch?v=7G2-FPlvY58' },
  ],
  'Phrygian': [
    { title: 'White Rabbit', key: 'F#', url: 'https://www.youtube.com/watch?v=WANNqr-vcx0' },
    { title: 'Wherever I May Roam', key: 'E', url: 'https://www.youtube.com/watch?v=Z-cEyiM9adE' },
    { title: 'New Born', key: 'E', url: 'https://www.youtube.com/watch?v=qhduQhDqtb4' },
  ],
  'Lydian': [
    { title: 'The Simpsons Theme', key: 'C', url: 'https://www.youtube.com/watch?v=HRV6tMR-SSs' },
    { title: 'Flying in a Blue Dream', key: 'E', url: 'https://www.youtube.com/watch?v=SINl5JY7LhI' },
    { title: 'Freewill', key: 'F', url: 'https://www.youtube.com/watch?v=OnxkfLe4G74' },
  ],
  'Mixolydian': [
    { title: 'Sweet Home Alabama', key: 'D', url: 'https://www.youtube.com/watch?v=ye5BuYf8q4o' },
    { title: 'Norwegian Wood', key: 'E', url: 'https://www.youtube.com/watch?v=Y_V6y1ZCg_8' },
    { title: 'Royals', key: 'D', url: 'https://www.youtube.com/watch?v=nlcIKh6sBtc' },
  ],
  'Locrian': [
    { title: 'YYZ', key: 'F#', url: 'https://www.youtube.com/watch?v=LdpMpfp-J_I' },
    { title: 'Army of Me', key: 'E', url: 'https://www.youtube.com/watch?v=EwV9W9Mj9uY' },
    { title: 'Enter Sandman', key: 'E', url: 'https://www.youtube.com/watch?v=CD-E-LDc384' },
  ],
  'Pentatonic Major': [
    { title: 'My Girl', key: 'C', url: 'https://www.youtube.com/watch?v=qEztui18cA8' },
    { title: 'Amazing Grace', key: 'G', url: 'https://www.youtube.com/watch?v=rbhWn3fDfhI' },
    { title: 'Lean on Me', key: 'C', url: 'https://www.youtube.com/watch?v=gOZgo8gMIoM' },
  ],
  'Pentatonic Minor': [
    { title: 'Smoke on the Water', key: 'G', url: 'https://www.youtube.com/watch?v=Q2FzZSBd5LE' },
    { title: 'Back in Black', key: 'A', url: 'https://www.youtube.com/watch?v=pAgnJDJN4VA' },
    { title: 'Wish You Were Here', key: 'E', url: 'https://www.youtube.com/watch?v=K6qj09OHvjw' },
  ],
  'Blues': [
    { title: 'The Thrill Is Gone', key: 'B', url: 'https://www.youtube.com/watch?v=oica5jG7FpU' },
    { title: 'Crossroads', key: 'A', url: 'https://www.youtube.com/watch?v=PE9HvSdcaL4' },
    { title: 'Red House', key: 'B', url: 'https://www.youtube.com/watch?v=_CJ1duSV04s' },
  ],
  'Chromatic': [
    { title: 'Chromatic Fantasy', key: 'D', url: 'https://www.youtube.com/watch?v=1Wq9vPZf0Ew' },
    { title: 'Flight of the Bumblebee', key: 'A', url: 'https://www.youtube.com/watch?v=8alxBofd_eQ' },
    { title: 'Giant Steps', key: 'B', url: 'https://www.youtube.com/watch?v=KwIC6B_dvW4' },
  ],
};
