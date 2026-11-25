import { create } from 'zustand';

/**
 * Which step cell is the grid's single Tab stop (roving tabindex). Arrow keys
 * move it; Tab enters and leaves the grid in one press.
 */
interface GridFocusStore {
  trackId: string | null;
  step: number;
  setGridFocus: (trackId: string | null, step: number) => void;
}

export const useGridFocusStore = create<GridFocusStore>((set) => ({
  trackId: null,
  step: 0,
  setGridFocus: (trackId, step) => set({ trackId, step }),
}));

/** Position of a step as bar.beat.subdivision, e.g. "2.3.1" */
export function stepPosition(step: number, stepsPerMeasure: number, stepsPerBeat: number): string {
  const bar = Math.floor(step / stepsPerMeasure) + 1;
  const beat = Math.floor((step % stepsPerMeasure) / stepsPerBeat) + 1;
  const sub = (step % stepsPerBeat) + 1;
  return `${bar}.${beat}.${sub}`;
}

export function velocityName(v: number): string {
  return `velocity ${Math.round(v * 100)}%`;
}
