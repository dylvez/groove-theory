import { useUIStore } from '../store/useUIStore';
import { announce } from './announce';

/** Show or hide the Beats / Harmony panel (header button or the \ key). */
export function toggleSidePanel() {
  const ui = useUIStore.getState();
  const open = !ui.sidePanelOpen;
  // Hiding the panel while focus is inside it would drop focus to the page
  const focusInside = document.getElementById('side-panel')?.contains(document.activeElement);
  ui.setSidePanelOpen(open);
  if (!open && focusInside) document.getElementById('side-panel-toggle')?.focus();
  announce(open ? 'Side panel shown' : 'Side panel hidden');
}
