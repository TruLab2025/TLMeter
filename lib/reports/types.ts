import type { Plan } from "@/lib/license";
import type { StyleMatchResult } from "@/lib/reports/style-match";

export type ReportPlan = Plan;

export type ReportMetricValue = number | string | boolean | null | Record<string, unknown> | unknown[];

export interface ReportEnvelope {
  schema_version: string;
  app: "TruLab Meter";
  generated_at: string;
  privacy: {
    audio_uploaded: false;
    filename_included: false;
    pii_included: false;
  };
}

export interface ReportAnalysisContext {
  style: string;
  plan: ReportPlan;
}

// ============================================================================
// INTERNAL: Raw DSP Data (backend only, never exported)
// ============================================================================

export interface RawAnalysisResult {
  meta?: {
    durationSec?: number;
    sampleRate?: number;
    frameSize?: number;
    hopSize?: number;
  };
  global?: Record<string, any>;
  timeSeries?: Record<string, any>;
}

export interface AnalysisMetadataSection {
  engine_version: string;
  analysis_window_seconds: number | null;
  analysis_duration_sec?: number | null;
  fft_size: number | null;
  sample_rate_hz: number | null;
  frame_hop_samples: number | null;
}

export interface SpectralFrame {
  t_sec: number;
  bins: number[];
}

export interface SpectralFrameSampled {
  t: number;        // Time in seconds
  bins: number[];   // 8-band energy values
}

export interface LlmHint {
  analysis_scope: string;
  current_plan: string;
  upgrade_available: boolean;
  recommended_plan: string;
  upgrade_trigger: string;
  upgrade_prompt: string;
  upgrade_url: string;
  missing_metrics: string[];
  message: string;
  instruction_for_llm: string;
}

export interface RawJsonReport extends ReportEnvelope, ReportAnalysisContext {
  analysis_metadata: AnalysisMetadataSection;
  spectral_data: {
    fft_bins: number[];
    spectral_histogram: number[];
    spectral_frames: SpectralFrame[];
  };
  band_energy_timeline: {
    timeline_sec: number[];
    band_60hz: number[];
    band_120hz: number[];
    band_240hz: number[];
    band_480hz: number[];
    band_960hz: number[];
    band_1920hz: number[];
    band_3840hz: number[];
    band_7680hz: number[];
  };
  transient_data: {
    transient_times: number[];
    transient_strength: number[];
  };
  stereo_phase_data: {
    timeline_sec: number[];
    phase_correlation_timeline: number[];
    stereo_energy_left: number[];
    stereo_energy_right: number[];
  };
  dynamic_profile: {
    timeline_sec: number[];
    rms_timeline: number[];
    peak_timeline: number[];
    lufs_short_term_timeline: number[];
  };
}

// ============================================================================
// PUBLIC: Plan-specific JSON Exports (what users download)
// ============================================================================

/** FREE JSON: Tonal snapshot only (~1-2 KB)
 * 
 * Includes:
 * - spectral: fft_bins, spectral_histogram
 * - style_match: selected_genre, score_percent
 * - metadata: schema_version, app, plan, generated_at
 */
export interface FreeJsonReport {
  schema_version: "free-json-v1";
  app: "TL Meter";
  plan: "free";
  generated_at: string;
  analysis_id: string;
  analysis_duration_sec: number | null;
  previous_analysis_id?: string;
  tool_reference: {
    analyzer: string;
    vendor: string;
  };

  llm_hint: LlmHint;
  
  spectral: {
    fft_bins: number[];           // [60, 120, 240, 480, 960, 1920, 3840, 7680]
    spectral_histogram: number[]; // Normalized energy per band (8 values, 0-1)
  };
  
  style_match: {
    score_percent: number;        // 0-100, rounded to 3 DP
  };

  style_reason: string[];
}

/** LITE JSON: Tonal + Loudness (~3-5 KB)
 * 
 * Includes everything from FREE plus:
 * - loudness: LUFS_integrated, true_peak
 * - spectral_tilt: lightweight tonal indicator
 */
export interface LiteJsonReport {
  schema_version: "lite-json-v1";
  app: "TL Meter";
  plan: "lite";
  generated_at: string;
  analysis_id: string;
  analysis_duration_sec: number | null;
  previous_analysis_id?: string;
  tool_reference: {
    analyzer: string;
    vendor: string;
  };

  llm_hint: LlmHint;
  
  spectral: {
    fft_bins: number[];           // [60, 120, 240, 480, 960, 1920, 3840, 7680]
    spectral_histogram: number[]; // Normalized energy per band (8 values, 0-1)
    spectral_tilt: number | null; // Lightweight tonal indicator
  };
  
  loudness: {
    LUFS_integrated: number | null;
    true_peak: number | null;
  };
  
  style_match: {
    selected_genre: string;
    score_percent: number;
    confidence: number;
  };

  style_reason: string[];
}

/** PRO JSON: Full mix diagnostics (~6-15 KB)
 * 
 * Includes everything from LITE plus:
 * - dynamics: peak, RMS, crest_factor
 * - loudness: LRA (added)
 * - stereo: width, correlation, balance, mid_energy, side_energy
 * - transients: density, strength
 * - spectral: spectral_centroid
 */
export interface ProJsonReport {
  schema_version: "pro-json-v1";
  app: "TL Meter";
  plan: "pro";
  generated_at: string;
  analysis_id: string;
  analysis_duration_sec: number | null;
  previous_analysis_id?: string;
  tool_reference: {
    analyzer: string;
    vendor: string;
  };

  llm_hint: LlmHint;
  
  spectral: {
    fft_bins: number[];
    spectral_histogram: number[];
    spectral_tilt: number | null;
    spectral_centroid: number | null;
  };
  
  loudness: {
    LUFS_integrated: number | null;
    true_peak: number | null;
    LRA: number | null;  // Loudness Range (EBU R128)
  };
  
  dynamics: {
    peak: number | null;           // Peak level (dBFS)
    RMS: number | null;            // RMS level (dBFS)
    crest_factor: number | null;   // peak - RMS (dynamic range indicator)
  };
  
  stereo: {
    width: number | null;          // Stereo width (0-1)
    correlation: number | null;    // Phase correlation (-1 to 1)
    balance: number | null;        // L/R energy ratio (-1 to 1)
    mid_energy: number | null;
    side_energy: number | null;
  };
  
  transients: {
    density: number | null;        // Transients per second
    strength: number | null;       // Average transient strength
  };
  
  style_match: {
    selected_genre: string;
    score_percent: number;
    confidence: number;
  };

  style_reason: string[];
}

/** PREMIUM JSON: Diagnostics + Timeline Analysis (~15-40 KB)
 * 
 * Includes everything from PRO plus:
 * - timeline: LUFS_short_term, LUFS_momentary (optimized ~100-200 samples)
 * - spectral_frames_sampled (downsampled spectral timeline)
 */
export interface PremiumJsonReport extends Omit<ProJsonReport, "schema_version" | "plan" | "spectral" | "llm_hint"> {
  schema_version: "premium-json-v1";
  plan: "premium";

  spectral: ProJsonReport["spectral"] & {
    spectral_frames_sampled: SpectralFrameSampled[]; // Downsampled ~100 frames
  };
  
  timeline?: {
    LUFS_short_term: {
      timeline_sec: number[];
      values: (number | null)[];
    };
    LUFS_momentary?: {
      timeline_sec: number[];
      values: (number | null)[];
    };
  };
}

export type PublicJsonReport = FreeJsonReport | LiteJsonReport | ProJsonReport | PremiumJsonReport;

// Legacy alias for backwards compatibility
export type CoreJsonReport = ProJsonReport;

// ============================================================================
// Metric Definitions
// ============================================================================

export interface CoreMetricDefinition {
  key: string;
  minPlan: ReportPlan;
  compute: (raw: RawJsonReport) => ReportMetricValue;
}

export type MetricExtractor = (raw: RawAnalysisResult) => ReportMetricValue;

export interface MetricDefinition {
  key: string;
  minPlan: ReportPlan;
  extract: MetricExtractor;
}
