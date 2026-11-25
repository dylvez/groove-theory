/**
 * First visit: nothing saved yet and the welcome bar never shown. Read once
 * when this module first loads — before any store has written to storage —
 * so the answer doesn't change once the demo is loaded.
 */
const WELCOME_KEY = 'groove-theory-welcome';

export const DEMO_PRESET_ID = 'preset-midnight-tokyo';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export const isFirstVisit: boolean =
  read('groove-theory-sequencer') === null &&
  read('groove-theory-saves-index') === null &&
  read(WELCOME_KEY) === null;

/** Whether the welcome bar should be visible (first visit, or shown but not yet dismissed) */
export function welcomePending(): boolean {
  const state = read(WELCOME_KEY);
  return state === 'shown' || (state === null && isFirstVisit);
}

export function setWelcomeState(state: 'shown' | 'dismissed'): void {
  try {
    localStorage.setItem(WELCOME_KEY, state);
  } catch {
    // Storage blocked: the bar just won't remember being dismissed
  }
}

// StrictMode runs effects twice in development; load the demo only once
let demoLoaded = false;
export function claimDemoLoad(): boolean {
  if (demoLoaded) return false;
  demoLoaded = true;
  return true;
}
