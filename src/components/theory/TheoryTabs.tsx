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

  return (
    <>
      {/* Tab bar — height matches the TransportBar (py-2.5 + h-9 = h-14) */}
      <div className="flex shrink-0 h-[60px] bg-bg-tertiary">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setStudioTab(tab.key)}
            className={`flex-1 px-3 flex items-center justify-center text-xs font-medium uppercase tracking-wider transition-colors cursor-pointer border-b-2 ${
              studioTab === tab.key
                ? 'text-accent-orange border-accent-orange'
                : 'text-text-muted hover:text-text-secondary border-border'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto p-4 flex flex-col gap-4">
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
