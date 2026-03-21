/**
 * TruLab Meter - Calibration System
 * Eksport wszystkich modułów systemu kalibracji
 */

export * from "./types";
export * from "./percentiles";
export * from "./profiles";
export * from "./diagnosis";
export * from "./aggregation";

// Główne funkcje użyteczne
export {
  getStyleProfile,
  getAvailableStyles,
  clearProfileCache,
} from "./profiles";

export {
  calculatePercentiles,
  assessMetricValue,
  normalizeValue,
  blendPercentiles,
} from "./percentiles";

export {
  diagnoseMix,
} from "./diagnosis";

export {
  submitMetrics,
  aggregateMetricsForStyle,
  updateStyleProfileFromAggregation,
  aggregateAllStyles,
  getAggregationStats,
  clearMetricsStore,
} from "./aggregation";

/**
 * Proste API dla aplikacji
 */
export async function analyzeAndDiagnose(
  metrics: import("./types").AnalysisMetrics,
  style: string
): Promise<import("./types").MixDiagnosis | null> {
  const { diagnoseMix } = await import("./diagnosis");
  const { getStyleProfile } = await import("./profiles");

  const profile = await getStyleProfile(style);
  if (!profile) {
    return null;
  }

  return diagnoseMix(metrics, profile);
}

/**
 * Backward-compatible helper for examples/tests
 */
export async function recordAnalysis(
  metrics: import("./types").AnalysisMetrics,
  style: string
): Promise<void> {
  const { submitMetrics } = await import("./aggregation");
  submitMetrics(metrics, style);
}

/**
 * Export dla telemetrii (wysłanie na serwer)
 */
export async function submitMetricsToServer(
  metrics: import("./types").AnalysisMetrics,
  style: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const { getAuthHeaders } = await import("@/lib/license");
    const response = await fetch("/api/analyses/submit-metrics", {
      method: "POST",
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        style,
        metrics: {
          lufs: metrics.lufs,
          true_peak: metrics.true_peak,
          momentary_loudness: metrics.momentary_loudness,
          low_ratio: metrics.low_ratio,
          low_mid_ratio: metrics.low_mid_ratio,
          mid_ratio: metrics.mid_ratio,
          mid_high_ratio: metrics.mid_high_ratio,
          high_ratio: metrics.high_ratio,
          stereo_correlation: metrics.stereo_correlation,
          stereo_width: metrics.stereo_width,
          spectral_centroid: metrics.spectral_centroid,
          spectral_spread: metrics.spectral_spread,
          spectral_tilt: metrics.spectral_tilt,
          low_mid_balance: metrics.low_mid_balance,
          presence_peak: metrics.presence_peak,
          transient_density: metrics.transient_density,
          crest_factor: metrics.crest_factor,
          harshness_index: metrics.harshness_index,
          brightness_index: metrics.brightness_index,
          warmth_index: metrics.warmth_index,
          engine_version: metrics.engine_version,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || "Failed to submit metrics" };
    }

    return { success: true, message: data.message };
  } catch (error) {
    console.error("Failed to submit metrics:", error);
    return { success: false, error: "Network error" };
  }
}

