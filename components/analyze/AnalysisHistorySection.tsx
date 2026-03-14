import HistoryPanel from "@/components/HistoryPanel";
import type { Plan } from "@/lib/license";
import type { HistoryEntry } from "@/lib/history";

interface AnalysisHistorySectionProps {
  mounted: boolean;
  historyEntries: HistoryEntry[];
  current: {
    integratedLufs: number | null;
    truePeakDbtp: number | null;
    lra: number | null;
    lowPct: number;
    midPct: number;
    highPct: number;
    stereoCorrelation: number | null;
    styleScore: number | null;
  } | null;
  plan: Plan;
  onClear: () => void;
}

export default function AnalysisHistorySection({
  mounted,
  historyEntries,
  current,
  plan,
  onClear,
}: AnalysisHistorySectionProps) {
  if (!mounted || historyEntries.length === 0 || !current) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto px-6 pb-6">
      <HistoryPanel
        history={historyEntries}
        current={current}
        plan={plan}
        onClear={onClear}
      />
    </div>
  );
}
