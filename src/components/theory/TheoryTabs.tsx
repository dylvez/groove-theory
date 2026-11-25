import { useUIStore } from '../../store/useUIStore';
import type { StudioTab } from '../../store/useUIStore';
import { HarmonyPanel } from './HarmonyPanel';
import { BeatExplorer } from './BeatExplorer';

const TABS: { key: StudioTab; label: string }[] = [
  { key: 'beats', label: 'Beats' },
  { key: 'harmony', label: 'Harmony' },
];

interface TheoryTabsProps {
  showPiano?: boolean;
  pianoOctaves?: number;
  pianoStartOctave?: number;
}

export function TheoryTabs({ showPiano = true, pianoOctaves = 2, pianoStartOctave = 4 }: TheoryTabsProps) {
  const studioTab = useUIStore(s => s.studioTab);
  const setStudioTab = useUIStore(s => s.setStudioTab);

  // Tab pattern: arrow keys move between tabs (and select them)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const i = TABS.findIndex(t => t.key === studioTab);
    let next = -1;
    if (e.key === 'ArrowRight') next = (i + 1) % TABS.length;
    else if (e.key === 'ArrowLeft') next = (i - 1 + TABS.length) % TABS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = TABS.length - 1;
    if (next < 0) return;
    e.preventDefault();
    setStudioTab(TABS[next].key);
    document.getElementById(`theory-tab-${TABS[next].key}`)?.focus();
  };

  return (
    <>
      {/* Tab bar — the same height as the transport bar beside it */}
      <div className="shrink-0 h-[63px] px-4 flex items-center bg-bg-tertiary border-b border-border">
      <div role="tablist" aria-label="Theory tools" onKeyDown={handleKeyDown} className="seg w-full !rounded-[10px]">
        {TABS.map(tab => (
          <button
            key={tab.key}
            id={`theory-tab-${tab.key}`}
            role="tab"
            aria-selected={studioTab === tab.key}
            aria-controls="theory-tabpanel"
            tabIndex={studioTab === tab.key ? 0 : -1}
            onClick={() => setStudioTab(tab.key)}
            className="seg-item flex-1 !min-h-[30px] !rounded-[8px] font-display !text-[13px] tracking-[0.04em]"
          >
            {tab.label}
          </button>
        ))}
      </div>
      </div>

      {/* Tab content */}
      <div
        id="theory-tabpanel"
        role="tabpanel"
        aria-labelledby={`theory-tab-${studioTab}`}
        tabIndex={0}
        className="flex-1 overflow-auto p-4 flex flex-col gap-4 cramped:overflow-visible"
      >
        {studioTab === 'harmony' && (
          <HarmonyPanel
            showPiano={showPiano}
            pianoOctaves={pianoOctaves}
            pianoStartOctave={pianoStartOctave}
          />
        )}
        {studioTab === 'beats' && (
          <BeatExplorer />
        )}
      </div>
    </>
  );
}
