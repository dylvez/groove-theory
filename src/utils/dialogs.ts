import { create } from 'zustand';

/**
 * In-app replacements for window.alert / confirm / prompt. Each returns a
 * promise; the dialog itself is drawn by <DialogHost />. Requests queue, so
 * two at once show one after the other.
 */

interface Base {
  id: number;
  title: string;
  message?: string;
}

export type DialogRequest =
  | (Base & { kind: 'alert'; okLabel: string; resolve: () => void })
  | (Base & { kind: 'confirm'; confirmLabel: string; cancelLabel: string; danger: boolean; resolve: (ok: boolean) => void })
  | (Base & { kind: 'prompt'; label: string; defaultValue: string; confirmLabel: string; resolve: (value: string | null) => void });

interface DialogStore {
  queue: DialogRequest[];
  push: (r: DialogRequest) => void;
  /** Remove the request at the front of the queue */
  shift: () => void;
}

export const useDialogStore = create<DialogStore>()((set) => ({
  queue: [],
  push: (r) => set(s => ({ queue: [...s.queue, r] })),
  shift: () => set(s => ({ queue: s.queue.slice(1) })),
}));

let nextId = 1;

export function showAlert(title: string, message?: string, { okLabel = 'OK' } = {}): Promise<void> {
  return new Promise(resolve => {
    useDialogStore.getState().push({ id: nextId++, kind: 'alert', title, message, okLabel, resolve });
  });
}

export function showConfirm(
  title: string,
  message?: string,
  { confirmLabel = 'OK', cancelLabel = 'Cancel', danger = false } = {},
): Promise<boolean> {
  return new Promise(resolve => {
    useDialogStore.getState().push({ id: nextId++, kind: 'confirm', title, message, confirmLabel, cancelLabel, danger, resolve });
  });
}

/** Resolves to the trimmed text, or null when cancelled or left empty */
export function showPrompt(
  title: string,
  { label = 'Name', defaultValue = '', confirmLabel = 'OK', message }: { label?: string; defaultValue?: string; confirmLabel?: string; message?: string } = {},
): Promise<string | null> {
  return new Promise(resolve => {
    useDialogStore.getState().push({ id: nextId++, kind: 'prompt', title, message, label, defaultValue, confirmLabel, resolve });
  });
}
