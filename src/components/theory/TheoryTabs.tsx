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
      {/* Tab bar — height matches the TransportBar (py-2.5 + h-9 = h-14) */}
      <div role="tablist" aria-label="Theory tools" onKeyDown={handleKeyDown} className="flex shrink-0 h-[60px] bg-bg-tertiary">
        {TABS.map(tab => (
          <button
            key={tab.key}
            id={`theory-tab-${tab.key}`}
            role="tab"
            aria-selected={studioTab === tab.key}
            aria-controls="theory-tabpanel"
            tabIndex={studioTab === tab.key ? 0 : -1}
            onClick={() => setStudioTab(tab.key)}
            className={`flex-1 px-3 flex items-center justify-center text-xs font-medium uppercase tracking-wider transition-colors cursor-pointer border-b-2 ${
              studioTab === tab.key
                ? 'text-accent-orange-fg border-accent-orange'
                : 'text-text-muted hover:text-text-secondary border-border'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div
        id="theory-tabpanel"
        role="tabpanel"
        aria-labelledby={`theory-tab-${studioTab}`}
        tabIndex={0}
        className="flex-1 overflow-auto p-4 flex flex-col gap-4"
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
