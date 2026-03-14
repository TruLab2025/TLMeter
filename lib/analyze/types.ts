import type { StyleSlug } from "@/lib/profiles";

export interface AnalysisResult {
  meta: { durationSec: number; sampleRate: number };
  analysisDurationMs?: number;
  styleMatch?: {
    selected_genre: string;
    selected_score: number;
    best_match: {
      genre: string;
      score: number;
    };
    all_scores: Record<string, number>;
    explanations: string[];
  };
  global: {
    integratedLufs: number | null;
    truePeakDbtp: number | null;
    lra: number | null;
    energyDistribution: { low: number; mid: number; high: number };
    stereo?: { correlation?: number; width?: number };
    spectral?: {
      flatnessMean?: number;
      hfcMean?: number;
      spectralHistogram?: number[];
      centroidHzMean?: number;
    };
    crestFactorDbMean?: number | null;
    transients?: { onsetStrengthMean?: number };
    rhythm?: { tempoBpm?: number };
  };
  timeSeries?: {
    onsetTimesSec?: number[];
  };
}

export interface AnalysisProgress {
  stage: string;
  detail?: string;
}

export interface AnalysisPipelineResult {
  raw: AnalysisResult;
  rawWithMetadata: AnalysisResult;
  analysisDurationMs: number;
  finalStyleForDisplay: StyleSlug;
}
