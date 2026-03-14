import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Plan } from "@/lib/license";
import { generatePublicReportFromAnalysis } from "@/lib/reports";
import { calculateOverallScore, type SectionResult } from "@/lib/analyze/report-sections";
import { getUploadInfoByPlan } from "@/lib/analyze/validation";
import type { AnalysisProgress, AnalysisResult } from "@/lib/analyze/types";
import type { StyleSlug } from "@/lib/profiles";

function progressTargetForStage(progress: AnalysisProgress): number {
  const text = `${progress.stage} ${progress.detail ?? ""}`.toLowerCase();
  if (text.includes("ładowanie")) return 8;
  if (text.includes("dekodowanie")) return 16;
  if (text.includes("window") || text.includes("najgłośniejsze")) return 24;
  if (text.includes("backend")) return 30;
  if (text.includes("analiza dsp")) return 36;
  if (text.includes("spektrum") || text.includes("spectrum")) return 46;
  if (text.includes("onsets") || text.includes("transients")) return 54;
  if (text.includes("rhythm")) return 60;
  if (text.includes("smi")) return 64;
  if (text.includes("meyda")) return 68;
  if (text.includes("psycho")) return 62;
  if (text.includes("hpss")) return 66;
  if (text.includes("chord")) return 69;
  if (text.includes("stability")) return 72;
  if (text.includes("truepeak") || text.includes("true peak")) {
    const detail = progress.detail ?? "";
    const percentMatch = String(detail).match(/(\d+(?:\.\d+)?)\s*%/);
    const parsedPct = percentMatch ? Number.parseFloat(percentMatch[1]) : Number.NaN;
    if (Number.isFinite(parsedPct)) {
      const clamped = Math.max(0, Math.min(100, parsedPct));
      return 63 + (clamped * 0.12);
    }
    return 75;
  }
  if (text.includes("finalizacja")) {
    if (text.includes("profilu stylu")) return 76;
    if (text.includes("tips")) return 80;
    if (text.includes("przygotowuję wyniki")) return 85;
    if (text.includes("waliduję metryki")) return 90;
    if (text.includes("buduję sekcje")) return 95;
    if (text.includes("pakuję wynik")) return 99.8;
    return 78;
  }
  if (text.includes("przygotowanie danych")) return 74;
  if (text.includes("gotowe")) return 100;
  return 50;
}

function detectUpsellPlanFromError(message: string): Plan | null {
  const lower = message.toLowerCase();
  if (lower.includes("planu premium") || lower.includes("plan premium")) return "premium";
  if (lower.includes("planu pro") || lower.includes("plan pro")) return "pro";
  if (lower.includes("planu lite") || lower.includes("plan lite")) return "lite";
  return null;
}

interface UseAnalyzePageControllerParams {
  sessionPlan: Plan;
  sections: SectionResult[];
  error: string | null;
  result: AnalysisResult | null;
  analyzedStyle: StyleSlug | null;
  setShowSponsor: Dispatch<SetStateAction<boolean>>;
  setAdMustBeClosed: Dispatch<SetStateAction<boolean>>;
  setProgress: Dispatch<SetStateAction<AnalysisProgress | null>>;
  setProgressTargetPct: Dispatch<SetStateAction<number>>;
}

export function useAnalyzePageController({
  sessionPlan,
  sections,
  error,
  result,
  analyzedStyle,
  setShowSponsor,
  setAdMustBeClosed,
  setProgress,
  setProgressTargetPct,
}: UseAnalyzePageControllerParams) {
  const canUseAutoStyle = sessionPlan !== "free";
  const uploadInfo = getUploadInfoByPlan(sessionPlan);
  const overallScore = calculateOverallScore(sections);
  const upsellPlan = error ? detectUpsellPlanFromError(error) : null;
  const isUpsellError = Boolean(upsellPlan) || (error ? error.toLowerCase().includes("odblokuj plan") : false);

  const closeSponsorGate = useCallback(() => {
    setShowSponsor(false);
    setAdMustBeClosed(false);
  }, [setAdMustBeClosed, setShowSponsor]);

  const updateProgress = useCallback((nextProgress: AnalysisProgress) => {
    setProgress(nextProgress);
    const target = progressTargetForStage(nextProgress);
    setProgressTargetPct((prev) => Math.max(prev, target));
  }, [setProgress, setProgressTargetPct]);

  const downloadCoreJson = useCallback(() => {
    if (!result || !analyzedStyle) return;

    const exportData = generatePublicReportFromAnalysis(result, analyzedStyle, sessionPlan);
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `TL-Meter-${exportData.schema_version}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [result, analyzedStyle, sessionPlan]);

  return {
    canUseAutoStyle,
    uploadInfo,
    overallScore,
    upsellPlan,
    isUpsellError,
    closeSponsorGate,
    updateProgress,
    downloadCoreJson,
  };
}
