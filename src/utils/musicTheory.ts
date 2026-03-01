import type { NoteName, NoteWithOctave, ScaleDefinition, ChordDefinition } from '../types';
import { NOTE_NAMES } from '../constants';

export function getScaleNotes(root: NoteName, scale: ScaleDefinition): NoteName[] {
  const rootIndex = NOTE_NAMES.indexOf(root);
  return scale.intervals.map(interval => NOTE_NAMES[(rootIndex + interval) % 12]);
}

export function getChordNotes(root: NoteName, chord: ChordDefinition): NoteName[] {
  const rootIndex = NOTE_NAMES.indexOf(root);
  return chord.intervals.map(interval => NOTE_NAMES[(rootIndex + interval) % 12]);
}

export function getChordNotesWithOctave(
  root: NoteName,
  chord: ChordDefinition,
  baseOctave: number,
  inversion: number = 0
): NoteWithOctave[] {
  const rootIndex = NOTE_NAMES.indexOf(root);
  const notes: NoteWithOctave[] = chord.intervals.map(interval => {
    const noteIndex = (rootIndex + interval) % 12;
    const octaveOffset = Math.floor((rootIndex + interval) / 12);
    return `${NOTE_NAMES[noteIndex]}${baseOctave + octaveOffset}` as NoteWithOctave;
  });

  // Apply inversion: move bottom notes up an octave
  for (let i = 0; i < inversion && i < notes.length; i++) {
    const note = notes.shift()!;
    const match = note.match(/^([A-G]#?)(\d)$/);
    if (match) {
      const [, name, oct] = match;
      notes.push(`${name}${parseInt(oct) + 1}` as NoteWithOctave);
    }
  }

  return notes;
}

export function getScaleNotesWithOctave(
  root: NoteName,
  scale: ScaleDefinition,
  startOctave: number,
  numOctaves: number = 1
): NoteWithOctave[] {
  const rootIndex = NOTE_NAMES.indexOf(root);
  const notes: NoteWithOctave[] = [];

  for (let oct = 0; oct < numOctaves; oct++) {
    for (const interval of scale.intervals) {
      const noteIndex = (rootIndex + interval) % 12;
      const octaveOffset = Math.floor((rootIndex + interval) / 12);
      notes.push(`${NOTE_NAMES[noteIndex]}${startOctave + oct + octaveOffset}` as NoteWithOctave);
    }
  }

  return notes;
}

export function getScaleDegree(note: NoteName, root: NoteName, scale: ScaleDefinition): number {
  const scaleNotes = getScaleNotes(root, scale);
  return scaleNotes.indexOf(note);
}

export type MelodyPatternType = 'roots' | 'arp-up' | 'arp-down' | 'scale-up' | 'scale-down' | 'chord-passing';

export function generateMelodyPattern(
  progression: { scaleDegree: number; chordDefinition: { intervals: number[] } }[],
  rootNote: NoteName,
  scale: ScaleDefinition,
  patternType: MelodyPatternType,
  baseOctave: number
): (NoteWithOctave | null)[] {
  const stepsPerChord = 4;
  const totalSteps = progression.length * stepsPerChord;
  const result: (NoteWithOctave | null)[] = new Array(totalSteps).fill(null);
  const scaleNotes = getScaleNotes(rootNote, scale);

  progression.forEach((slot, slotIndex) => {
    const chordRoot = scaleNotes[slot.scaleDegree] || scaleNotes[0];
    const chordRootIndex = NOTE_NAMES.indexOf(chordRoot);
    const startStep = slotIndex * stepsPerChord;
    if (startStep >= totalSteps) return;

    // Build chord tones with octave
    const chordTones = slot.chordDefinition.intervals.map(interval => {
      const noteIndex = (chordRootIndex + interval) % 12;
      const oct = baseOctave + Math.floor((chordRootIndex + interval) / 12);
      return `${NOTE_NAMES[noteIndex]}${oct}` as NoteWithOctave;
    });

    // Build scale tones starting from chord root
    const rootScaleIndex = scaleNotes.indexOf(chordRoot);
    const walkNotes = (direction: 1 | -1): NoteWithOctave[] => {
      const notes: NoteWithOctave[] = [];
      for (let i = 0; i < stepsPerChord; i++) {
        const idx = rootScaleIndex + (i * direction);
        const wrappedIdx = ((idx % scaleNotes.length) + scaleNotes.length) % scaleNotes.length;
        const octShift = Math.floor(idx / scaleNotes.length) - (idx < 0 ? 1 : 0);
        const adjustedOct = direction === -1
          ? baseOctave + Math.floor((rootScaleIndex + i * direction) / scaleNotes.length)
          : baseOctave + octShift;
        notes.push(`${scaleNotes[wrappedIdx]}${adjustedOct}` as NoteWithOctave);
      }
      return notes;
    };

    switch (patternType) {
      case 'roots':
        result[startStep] = `${chordRoot}${baseOctave}` as NoteWithOctave;
        break;

      case 'arp-up':
        for (let i = 0; i < stepsPerChord; i++) {
          result[startStep + i] = chordTones[i % chordTones.length];
        }
        break;

      case 'arp-down':
        for (let i = 0; i < stepsPerChord; i++) {
          const idx = (chordTones.length - 1) - (i % chordTones.length);
          result[startStep + i] = chordTones[idx];
        }
        break;

      case 'scale-up': {
        const notes = walkNotes(1);
        notes.forEach((n, i) => { result[startStep + i] = n; });
        break;
      }

      case 'scale-down': {
        const notes = walkNotes(-1);
        notes.forEach((n, i) => { result[startStep + i] = n; });
        break;
      }

      case 'chord-passing': {
        // Beats 1,3 = chord root and 5th; beats 2,4 = scale passing tones
        result[startStep] = chordTones[0]; // root
        result[startStep + 2] = chordTones.length > 2 ? chordTones[2] : chordTones[0]; // 5th or root

        // Passing tones: scale notes between chord tones
        const scaleUp = walkNotes(1);
        result[startStep + 1] = scaleUp[1]; // 2nd scale step from root
        result[startStep + 3] = scaleUp[3] || scaleUp[1]; // 4th step or fallback
        break;
      }
    }
  });

  return result;
}

export function getDiatonicChord(
  root: NoteName,
  scale: ScaleDefinition,
  degree: number
): { root: NoteName; intervals: number[] } {
  const scaleNotes = getScaleNotes(root, scale);
  const chordRoot = scaleNotes[degree];

  // Build triad from scale degrees
  const rootIdx = NOTE_NAMES.indexOf(chordRoot);
  const thirdIdx = NOTE_NAMES.indexOf(scaleNotes[(degree + 2) % scaleNotes.length]);
  const fifthIdx = NOTE_NAMES.indexOf(scaleNotes[(degree + 4) % scaleNotes.length]);

  const third = ((thirdIdx - rootIdx) % 12 + 12) % 12;
  const fifth = ((fifthIdx - rootIdx) % 12 + 12) % 12;

  return { root: chordRoot, intervals: [0, third, fifth] };
}
