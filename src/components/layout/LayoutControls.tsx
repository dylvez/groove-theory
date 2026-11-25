import { useId, useState } from 'react';
import { usePopover } from '../../hooks/usePopover';
import { useUIStore } from '../../store/useUIStore';
import { announce } from '../../utils/announce';
import { toggleSidePanel } from '../../utils/sidePanel';

// Night Glow: plain pills; "on" (menu open, panel showing) is a bright outline
const BUTTON = 'pill text-[13px]';
const ACTIVE = '!border-text-primary !bg-[#2a2a3a] !text-white';

const PANEL_SIZES = [
  { label: 'Narrow', value: 280 },
  { label: 'Medium', value: 420 },
  { label: 'Wide', value: 560 },
];
const SONG_SIZES = [
  { label: 'Short', value: 100 },
  { label: 'Medium', value: 180 },
  { label: 'Tall', value: 300 },
];
const NAME_SIZES = [
  { label: 'Narrow', value: 200 },
  { label: 'Medium', value: 240 },
  { label: 'Wide', value: 300 },
];

function PanelIcon({ open }: { open: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1.75" y="2.75" width="12.5" height="10.5" rx="1.5" />
      <path d="M10 3v10" />
      {open && <rect x="10.5" y="3.5" width="3" height="9" fill="currentColor" stroke="none" />}
    </svg>
  );
}

function SizeChoice({ legend, options, value, onPick }: {
  legend: string;
  options: { label: string; value: number }[];
  value: number;
  onPick: (v: number, label: string) => void;
}) {
  const name = useId();
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="label-caps mb-1">{legend}</legend>
      <div className="flex gap-1">
        {options.map(o => (
          <label
            key={o.value}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 min-h-7 rounded-md border text-xs font-semibold cursor-pointer has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-[var(--focus-ring)] ${
              value === o.value
                ? 'border-text-primary bg-text-primary text-bg-primary shadow-[0_0_12px_rgb(255_255_255/0.2)]'
                : 'border-border-soft text-text-secondary hover:bg-bg-cell-hover'
            }`}
          >
            <input
              type="radio"
              name={name}
              checked={value === o.value}
              onChange={() => onPick(o.value, o.label)}
              className="sr-only"
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function LayoutPopover({ onClose }: { onClose: () => void }) {
  const ref = usePopover<HTMLDivElement>(onClose);
  const panelWidth = useUIStore(s => s.sidePanelWidth);
  const setPanelWidth = useUIStore(s => s.setSidePanelWidth);
  const setPanelOpen = useUIStore(s => s.setSidePanelOpen);
  const songHeight = useUIStore(s => s.songHeight);
  const setSongHeight = useUIStore(s => s.setSongHeight);
  const nameWidth = useUIStore(s => s.trackHeaderWidth);
  const setNameWidth = useUIStore(s => s.setTrackHeaderWidth);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Layout"
      className="absolute top-full right-0 mt-2 z-50 w-72 flex flex-col gap-3 p-3 bg-bg-secondary border border-border-soft rounded-xl shadow-2xl"
    >
      <SizeChoice
        legend="Side panel width"
        options={PANEL_SIZES}
        value={panelWidth}
        onPick={(v, label) => { setPanelWidth(v); setPanelOpen(true); announce(`Side panel ${label.toLowerCase()}`); }}
      />
      <SizeChoice
        legend="Song section height"
        options={SONG_SIZES}
        value={songHeight}
        onPick={(v, label) => { setSongHeight(v); announce(`Song section ${label.toLowerCase()}`); }}
      />
      <SizeChoice
        legend="Track name column"
        options={NAME_SIZES}
        value={nameWidth}
        onPick={(v, label) => { setNameWidth(v); announce(`Track names ${label.toLowerCase()}`); }}
      />
      <p className="text-[11px] text-text-muted leading-snug">
        You can also drag the dividers, or focus one and use the arrow keys.
      </p>
    </div>
  );
}

/** Header controls for the page layout: preset sizes, and the side panel toggle. */
export function LayoutControls() {
  const [open, setOpen] = useState(false);
  const panelOpen = useUIStore(s => s.sidePanelOpen);

  return (
    <div className="flex items-center gap-1.5">
      <div className="relative">
        <button
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
          aria-haspopup="dialog"
          title="Preset sizes for the side panel, song section and track names"
          className={`${BUTTON} ${open ? ACTIVE : ''}`}
        >
          <svg aria-hidden="true" viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="1.75" y="2.75" width="12.5" height="10.5" rx="1.5" />
            <path d="M1.75 9.5h8.5M10.25 2.75v10.5" />
          </svg>
          Layout
        </button>
        {open && <LayoutPopover onClose={() => setOpen(false)} />}
      </div>
      <button
        id="side-panel-toggle"
        onClick={toggleSidePanel}
        aria-expanded={panelOpen}
        aria-controls="side-panel"
        title={`${panelOpen ? 'Hide' : 'Show'} the Beats and Harmony panel (\\ key)`}
        className={`${BUTTON} ${panelOpen ? ACTIVE : ''}`}
      >
        <PanelIcon open={panelOpen} />
        Side panel
      </button>
    </div>
  );
}
