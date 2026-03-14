import { calculateStyleMatch } from "@/lib/reports/style-match";
import type { Plan } from "@/lib/license";
import type { StyleSlug } from "@/lib/profiles";
import type { AnalysisPipelineResult, AnalysisProgress, AnalysisResult } from "@/lib/analyze/types";

function estimateTransientDensity(raw: AnalysisResult): number | null {
  const duration = raw.meta?.durationSec;
  const onsets = raw.timeSeries?.onsetTimesSec;
  if (!duration || duration <= 0 || !Array.isArray(onsets) || onsets.length === 0) {
    return null;
  }
  return onsets.length / duration;
}

function getInitialStyleForAnalysis(params: {
  analysisMode: "suggest" | "manual";
  style: StyleSlug | "suggest";
}): StyleSlug {
  if (params.analysisMode === "suggest") {
    return "rock";
  }
  return params.style as StyleSlug;
}

export async function runAudioAnalysisPipeline(params: {
  file: File;
  plan: Plan;
  style: StyleSlug | "suggest";
  analysisMode: "suggest" | "manual";
  comingSoonStyles: StyleSlug[];
  availableStyles: { slug: StyleSlug }[];
  isAborted: () => boolean;
  onProgress: (progress: AnalysisProgress) => void;
}): Promise<AnalysisPipelineResult> {
  const { file, plan, style, analysisMode, comingSoonStyles, availableStyles, isAborted, onProgress } = params;
  const analysisStartTime = performance.now();
  const currentStyleRun = getInitialStyleForAnalysis({ analysisMode, style });

  if (isAborted()) throw new Error("Analiza została anulowana.");
  onProgress({ stage: "Ładowanie pliku..." });

  let arrayBuffer: ArrayBuffer;
  try {
    arrayBuffer = await file.arrayBuffer();
  } catch (error) {
    console.error("[ANALYZA] Błąd arrayBuffer", error);
    throw error;
  }

  if (isAborted()) throw new Error("Analiza została anulowana.");

  let audioCtx: AudioContext | null = null;
  let audioBuffer: AudioBuffer | null = null;
  try {
    audioCtx = new AudioContext();
    if (isAborted()) throw new Error("Analiza została anulowana.");
    onProgress({ stage: "Dekodowanie audio..." });
    audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  } catch (error) {
    console.error("[ANALYZA] Błąd decodeAudioData", error);
    throw error;
  } finally {
    if (audioCtx && audioCtx.state !== "closed") {
      await audioCtx.close().catch(() => undefined);
    }
  }

  if (!audioBuffer) {
    console.error("[ANALYZA] audioBuffer niezainicjalizowany!");
    throw new Error("Nie udało się zdekodować pliku audio.");
  }

  if (isAborted()) throw new Error("Analiza została anulowana.");
  onProgress({ stage: "Analiza DSP...", detail: "loudness" });

  let analyzeAudioBuffer: (buffer: AudioBuffer, options: object) => Promise<unknown>;
  try {
    ({ analyzeAudioBuffer } = await import("@/lib/dsp/analyze"));
  } catch (error) {
    console.error("[ANALYZA] Błąd importu analyzeAudioBuffer", error);
    throw error;
  }

  const isPremium = plan === "premium";
  let raw: AnalysisResult;
  try {
    raw = await analyzeAudioBuffer(audioBuffer, {
      frameMs: isPremium ? 128 : 46,
      hopMs: isPremium ? 64 : 23,
      rolloffPercent: 95,
      forceEssentia: isPremium,
      isAborted,
      onProgress: (progress: AnalysisProgress) => {
        if (!isAborted()) onProgress(progress);
      },
    }) as AnalysisResult;
  } catch (error) {
    console.error("[ANALYZA] Błąd analyzeAudioBuffer", error);
    throw error;
  }

  if (isAborted()) throw new Error("Analiza została anulowana.");

  const analysisDurationMs = performance.now() - analysisStartTime;
  const spectralHistogram = raw.global.spectral?.spectralHistogram || [];
  const styleMatchFeatures = {
    spectralHistogram,
    spectralCentroid: raw.global.spectral?.centroidHzMean ?? null,
    transientDensity: estimateTransientDensity(raw),
  };
  const initialStyleMatch = calculateStyleMatch(styleMatchFeatures, currentStyleRun);
  const autoEligibleStyles = availableStyles
    .map((entry) => entry.slug)
    .filter((slug) => !comingSoonStyles.includes(slug));

  let finalStyleForDisplay: StyleSlug;
  let styleMatch = initialStyleMatch;

  if (analysisMode === "suggest") {
    const rankedGenres = Object.entries(initialStyleMatch.all_scores).sort((a, b) => b[1] - a[1]);
    const bestSupported = rankedGenres.find(([genre]) => autoEligibleStyles.includes(genre as StyleSlug));
    finalStyleForDisplay = (bestSupported?.[0] ?? "rock") as StyleSlug;
    styleMatch = calculateStyleMatch(styleMatchFeatures, finalStyleForDisplay);
  } else {
    finalStyleForDisplay = currentStyleRun;
  }

  return {
    raw,
    rawWithMetadata: { ...raw, analysisDurationMs, styleMatch },
    analysisDurationMs,
    finalStyleForDisplay,
  };
}
