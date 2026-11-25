import { PianoKeyboard } from './PianoKeyboard';
import { KeyScalePicker } from './KeyScalePicker';
import { UnifiedDiatonicChords } from './UnifiedDiatonicChords';
import { ProgressionDisplay } from './ProgressionDisplay';
import { MelodyHelper } from './MelodyHelper';
import { ChordExplorer } from './ChordExplorer';
import { CollapsibleSection } from './CollapsibleSection';
import { AboutScale } from './AboutScale';

interface HarmonyPanelProps {
  showPiano?: boolean;
  pianoOctaves?: number;
  pianoStartOctave?: number;
}

export function HarmonyPanel({ showPiano = true, pianoOctaves = 2, pianoStartOctave = 4 }: HarmonyPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="sr-only">Harmony</h3>
      {/* 1. Key & Scale picker */}
      <KeyScalePicker />

      {/* 2. About this scale */}
      <AboutScale />

      {/* 3. Piano keyboard (collapsible to save vertical space) */}
      {showPiano && (
        <CollapsibleSection title="Piano" defaultOpen>
          <div className="overflow-x-auto pb-1" tabIndex={-1}>
            <PianoKeyboard startOctave={pianoStartOctave} numOctaves={pianoOctaves} />
          </div>
        </CollapsibleSection>
      )}

      {/* 3. Diatonic chord grid with "+" to add to progression */}
      <UnifiedDiatonicChords />

      {/* 4. Chord progression display */}
      <ProgressionDisplay />

      {/* 5. Melody helper (only shows when progression exists) */}
      <MelodyHelper />

      {/* 6. Custom chord explorer (collapsed by default) */}
      <CollapsibleSection title="Custom Chord">
        <ChordExplorer />
      </CollapsibleSection>
    </div>
  );
}
