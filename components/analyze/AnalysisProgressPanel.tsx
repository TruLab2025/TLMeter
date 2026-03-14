import type React from "react";
import type { AnalysisProgress } from "@/lib/analyze/types";

interface AnalysisProgressPanelProps {
  progress: AnalysisProgress;
  progressPct: number;
  progressSectionRef: React.RefObject<HTMLDivElement | null>;
  onAbort: () => void;
}

export default function AnalysisProgressPanel({
  progress,
  progressPct,
  progressSectionRef,
  onAbort,
}: AnalysisProgressPanelProps) {
  return (
    <div ref={progressSectionRef} className="card p-6 mb-5 animate-pulse-border relative overflow-hidden">
      <div className="flex flex-col gap-3 relative z-10">
        <div className="flex items-center justify-between text-sm">
          <div className="text-[var(--accent)] font-semibold truncate">
            {progress.stage}
            {progress.detail && <span className="text-[var(--text-secondary)] font-mono ml-2 font-normal">— {progress.detail}</span>}
          </div>
          <div className="text-[var(--text-primary)] font-mono font-bold ml-4">
            {Math.round(Math.min(100, progressPct))}%
          </div>
        </div>
        <div className="meter-track h-2 bg-[var(--bg-card2)] overflow-hidden rounded-full">
          <div className="meter-fill bg-[var(--accent)] h-full transition-all duration-300" style={{ width: `${Math.min(100, progressPct)}%` }}></div>
        </div>

        <div className="mt-4 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
          <div className="bg-[var(--bg-surface)] p-3 rounded-lg border border-[var(--border)] text-xs text-[var(--text-muted)] flex items-start gap-2 flex-1 order-1">
            <span className="text-base mt-0.5" title="Bezpieczeństwo i prywatność">🛡️</span>
            <div>
              <span className="font-semibold text-[var(--text-primary)]">Analiza w przeglądarce</span>
              <p className="mt-1 hidden md:block">
                Aby proces zakończył się pomyślnie, <b>nie zamykaj tej karty</b>. Cała analiza DSP wykonuje się bezpiecznie na procesorze Twojego urządzenia.
              </p>
              <p className="mt-1 md:hidden">
                <b>Nie zamykaj tej karty</b> podczas analizy.
              </p>
            </div>
          </div>
          <button
            onClick={onAbort}
            className="btn btn-outline text-[var(--bad)] border-[var(--bad)] hover:bg-[var(--bad)] hover:text-white shrink-0 order-2 mx-auto md:mx-0 md:w-auto px-8"
          >
            Zatrzymaj
          </button>
        </div>
      </div>
    </div>
  );
}
