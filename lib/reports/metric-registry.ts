import type { MetricDefinition, RawAnalysisResult } from "@/lib/reports/types";

type TonalBalanceBand = {
  name?: string;
  energyNorm?: unknown;
  loHz?: unknown;
  hiHz?: unknown;
  centerHz?: unknown;
};

type StereoFrame = {
  correlation?: unknown;
};

function numOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getBandEnergy(raw: RawAnalysisResult, bandName: string): number | null {
  const tonalBalance = Array.isArray(raw.global?.tonalBalance)
    ? (raw.global?.tonalBalance as TonalBalanceBand[])
    : [];
  const found = tonalBalance.find((band) => band?.name === bandName);
  return numOrNull(found?.energyNorm);
}

function meanStd(values: number[]): { mean: number; std: number } | null {
  if (!values.length) return null;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
  return { mean, std: Math.sqrt(variance) };
}

function compact<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== null && value !== undefined)) as T;
}

export const METRIC_REGISTRY: MetricDefinition[] = [
  {
    key: "lufs_integrated",
    minPlan: "free",
    extract: (raw) => numOrNull(raw.global?.integratedLufs),
  },
  {
    key: "true_peak",
    minPlan: "free",
    extract: (raw) => numOrNull(raw.global?.truePeakDbtp),
  },
  {
    key: "lra",
    minPlan: "free",
    extract: (raw) => numOrNull(raw.global?.lra),
  },
  {
    key: "low_ratio",
    minPlan: "free",
    extract: (raw) => numOrNull(raw.global?.energyDistribution?.low),
  },
  {
    key: "mid_ratio",
    minPlan: "free",
    extract: (raw) => numOrNull(raw.global?.energyDistribution?.mid),
  },
  {
    key: "high_ratio",
    minPlan: "free",
    extract: (raw) => numOrNull(raw.global?.energyDistribution?.high),
  },
  {
    key: "stereo_width",
    minPlan: "free",
    extract: (raw) => {
      const stereo = raw.global?.stereo;
      return numOrNull(stereo?.width ?? stereo?.correlation);
    },
  },
  {
    key: "spectral_tilt",
    minPlan: "lite",
    extract: (raw) => numOrNull(raw.global?.spectralAdvanced?.slope),
  },
  {
    key: "low_mid_balance",
    minPlan: "lite",
    extract: (raw) => {
      const lowBand = getBandEnergy(raw, "bass_60_120");
      const lowMidBand = getBandEnergy(raw, "mid_250_500");
      if (lowBand === null || lowBand <= 0 || lowMidBand === null) return null;
      return lowMidBand / lowBand;
    },
  },
  {
    key: "presence_energy",
    minPlan: "lite",
    extract: (raw) => numOrNull(getBandEnergy(raw, "presence_2000_4000")),
  },
  {
    key: "air_band_energy",
    minPlan: "lite",
    extract: (raw) => numOrNull(getBandEnergy(raw, "air_8000_20000")),
  },
  {
    key: "stereo_correlation",
    minPlan: "lite",
    extract: (raw) => numOrNull(raw.global?.stereo?.correlation),
  },
  {
    key: "spectral_centroid",
    minPlan: "pro",
    extract: (raw) => numOrNull(raw.global?.spectral?.centroidHzMean),
  },
  {
    key: "transient_density",
    minPlan: "pro",
    extract: (raw) => numOrNull(raw.global?.transients?.onsetStrengthMean),
  },
  {
    key: "midrange_density",
    minPlan: "pro",
    extract: (raw) => numOrNull(raw.global?.energyDistribution?.mid),
  },
  {
    key: "low_end_masking",
    minPlan: "pro",
    extract: (raw) => numOrNull(raw.global?.spectralAdvanced?.lowMid?.fraction),
  },
  {
    key: "dynamic_range_profile",
    minPlan: "pro",
    extract: (raw) => compact({
      lra: numOrNull(raw.global?.lra),
      short_term_std: numOrNull(raw.global?.shortTermLufsStd),
      crest_factor_mean: numOrNull(raw.global?.crestFactorDbMean),
      crest_factor_std: numOrNull(raw.global?.crestFactorDbStd),
    }),
  },
  {
    key: "stereo_field_profile",
    minPlan: "pro",
    extract: (raw) => compact({
      width: numOrNull(raw.global?.stereo?.width),
      correlation: numOrNull(raw.global?.stereo?.correlation),
      side_mid_ratio: numOrNull(raw.global?.stereo?.sideMidRatio),
    }),
  },
];

export function buildPremiumExtensions(raw: RawAnalysisResult) {
  const stereoFrames = Array.isArray(raw.timeSeries?.stereoFrames)
    ? (raw.timeSeries.stereoFrames as StereoFrame[])
    : [];
  const correlationValues = stereoFrames
    .map((frame) => numOrNull(frame?.correlation))
    .filter((value: number | null): value is number => value !== null);

  const stereoStats = meanStd(correlationValues);

  const tonalBalanceArray = Array.isArray(raw.global?.tonalBalance)
    ? (raw.global.tonalBalance as TonalBalanceBand[])
    : [];
  const spectralProfile = tonalBalanceArray.map((band) => ({
    band: band?.name ?? null,
    lo_hz: numOrNull(band?.loHz),
    hi_hz: numOrNull(band?.hiHz),
    center_hz: numOrNull(band?.centerHz),
    energy: numOrNull(band?.energyNorm),
  }));

  return {
    spectral_profile: spectralProfile,
    transient_profile: compact({
      onset_strength_mean: numOrNull(raw.global?.transients?.onsetStrengthMean),
      onset_strength_std: numOrNull(raw.global?.transients?.onsetStrengthStd),
      transient_sharpness: raw.global?.transientSharpness ?? null,
    }),
    section_analysis: (raw.global?.sections as Record<string, unknown>) ?? {},
    stereo_field_map: compact({
      summary: compact({
        correlation_mean: stereoStats?.mean ?? null,
        correlation_std: stereoStats?.std ?? null,
        frame_count: correlationValues.length || null,
      }),
      timeline: stereoFrames.slice(0, 240),
    }),
  };
}
