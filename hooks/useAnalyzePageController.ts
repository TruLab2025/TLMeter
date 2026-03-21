import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Plan } from "@/lib/license";
import { generatePublicReportFromAnalysis } from "@/lib/reports";
import { calculateOverallScore, type SectionResult } from "@/lib/analyze/report-sections";
import { getUploadInfoByPlan } from "@/lib/analyze/validation";
import type { AnalysisProgress, AnalysisResult } from "@/lib/analyze/types";
import type { StyleSlug } from "@/lib/profiles";
import type { DownloadJsonReport, PremiumCompareJsonReport, PremiumJsonReport } from "@/lib/reports/types";

function progressTargetForStage(progress: AnalysisProgress): number {
  const rawText = `${progress.stage} ${progress.detail ?? ""}`;
  const text = rawText.toLowerCase();
  const isReference = text.startsWith("ref:") || text.includes("analiza referencji");
  const clean = isReference ? text.replace(/^ref:\s*/g, "") : text;

  function baseTarget(): number {
    if (clean.includes("ładowanie")) return 8;
    if (clean.includes("dekodowanie")) return 16;
    if (clean.includes("window") || clean.includes("najgłośniejsze")) return 24;
    if (clean.includes("backend")) return 30;
    if (clean.includes("analiza dsp")) return 36;
    if (clean.includes("spektrum") || clean.includes("spectrum")) return 46;
    if (clean.includes("onsets") || clean.includes("transients")) return 54;
    if (clean.includes("rhythm")) return 60;
    if (clean.includes("smi")) return 64;
    if (clean.includes("meyda")) return 68;
    if (clean.includes("psycho")) return 62;
    if (clean.includes("hpss")) return 66;
    if (clean.includes("chord")) return 69;
    if (clean.includes("stability")) return 72;
    if (clean.includes("truepeak") || clean.includes("true peak")) {
      const detail = progress.detail ?? "";
      const percentMatch = String(detail).match(/(\d+(?:\.\d+)?)\s*%/);
      const parsedPct = percentMatch ? Number.parseFloat(percentMatch[1]) : Number.NaN;
      if (Number.isFinite(parsedPct)) {
        const clamped = Math.max(0, Math.min(100, parsedPct));
        return 63 + (clamped * 0.12);
      }
      return 75;
    }
    if (clean.includes("finalizacja")) {
      if (clean.includes("profilu stylu")) return 76;
      if (clean.includes("tips")) return 80;
      if (clean.includes("przygotowuję wyniki")) return 85;
      if (clean.includes("waliduję metryki")) return 90;
      if (clean.includes("buduję sekcje")) return 95;
      if (clean.includes("pakuję wynik")) return 99.8;
      return 78;
    }
    if (clean.includes("przygotowanie danych")) return 74;
    if (clean.includes("gotowe")) return 100;
    return 50;
  }

  const base = baseTarget();
  if (isReference) {
    // Map DSP progress to a later band so the bar doesn't "finish" before reference is computed.
    return 72 + (base * 0.22); // ~72..94
  }
  return base * 0.72; // ~0..72 for main DSP
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
  referenceResult?: AnalysisResult | null;
  analyzedStyle: StyleSlug | null;
  file?: File | null;
  referenceFile?: File | null;
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
  referenceResult,
  analyzedStyle,
  file,
  referenceFile,
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

  function fileMetaForDownload(f?: File | null): { size_bytes: number | null; mime: string | null; ext: string | null } | undefined {
    if (!f) return undefined;
    const ext = f.name.split(".").pop()?.toLowerCase() ?? null;
    return {
      size_bytes: typeof f.size === "number" ? f.size : null,
      mime: f.type || null,
      ext: ext ? `.${ext}` : null,
    };
  }

  function asNumber(value: unknown): number | null {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  }

  function compareMetric(mixValue: number | null, refValue: number | null) {
    return {
      mix: mixValue,
      reference: refValue,
      delta: mixValue !== null && refValue !== null ? mixValue - refValue : null,
    };
  }

  const downloadCoreJson = useCallback(() => {
    if (!result || !analyzedStyle) return;

    if (sessionPlan === "premium" && referenceFile && !referenceResult) {
      // User explicitly selected reference compare: don't allow exporting partial (mix-only) JSON.
      return;
    }

    let exportData: DownloadJsonReport = generatePublicReportFromAnalysis(result, analyzedStyle, sessionPlan);

    if (sessionPlan === "premium" && referenceResult) {
      const mixReport = generatePublicReportFromAnalysis(result, analyzedStyle, sessionPlan) as PremiumJsonReport;
      const refReport = generatePublicReportFromAnalysis(referenceResult, analyzedStyle, sessionPlan) as PremiumJsonReport;

      const mixLufs = asNumber(result.global?.integratedLufs);
      const refLufs = asNumber(referenceResult.global?.integratedLufs);

      const mixTp = asNumber(result.global?.truePeakDbtp);
      const refTp = asNumber(referenceResult.global?.truePeakDbtp);

      const mixLra = asNumber(result.global?.lra);
      const refLra = asNumber(referenceResult.global?.lra);

      const mixClip = asNumber(result.global?.clipping?.clipEvents);
      const refClip = asNumber(referenceResult.global?.clipping?.clipEvents);

      const mixLow = asNumber(result.global?.energyDistribution?.low);
      const refLow = asNumber(referenceResult.global?.energyDistribution?.low);

      const mixMid = asNumber(result.global?.energyDistribution?.mid);
      const refMid = asNumber(referenceResult.global?.energyDistribution?.mid);

      const mixHigh = asNumber(result.global?.energyDistribution?.high);
      const refHigh = asNumber(referenceResult.global?.energyDistribution?.high);

      const mixStereo = asNumber(result.global?.stereo?.correlation);
      const refStereo = asNumber(referenceResult.global?.stereo?.correlation);

      const compareExport: PremiumCompareJsonReport = {
        schema_version: "premium-compare-json-v1",
        app: "TL Meter",
        plan: "premium",
        generated_at: new Date().toISOString(),
        privacy: {
          audio_uploaded: false,
          filename_included: false,
          pii_included: false,
        },
        files: {
          mix: fileMetaForDownload(file),
          reference: fileMetaForDownload(referenceFile),
        },
        mix: mixReport,
        reference: refReport,
        comparison: {
          lufs_integrated: compareMetric(mixLufs, refLufs),
          true_peak_dbtp: compareMetric(mixTp, refTp),
          lra: compareMetric(mixLra, refLra),
          clipping_events: compareMetric(mixClip, refClip),
          energy_low_pct: compareMetric(mixLow !== null ? mixLow * 100 : null, refLow !== null ? refLow * 100 : null),
          energy_mid_pct: compareMetric(mixMid !== null ? mixMid * 100 : null, refMid !== null ? refMid * 100 : null),
          energy_high_pct: compareMetric(mixHigh !== null ? mixHigh * 100 : null, refHigh !== null ? refHigh * 100 : null),
          stereo_correlation: compareMetric(mixStereo, refStereo),
        },
      };

      exportData = compareExport;
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `TL-Meter-${exportData.schema_version}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [result, analyzedStyle, file, referenceFile, referenceResult, sessionPlan]);

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
