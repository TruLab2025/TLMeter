/**
 * TruLab Meter - System kalibracji algorytmu analizy miksu
 * Struktury danych dla profili stylów, metryk i diagnozy
 */

/**
 * Metryki analizy DSP wygenerowane lokalnie w przeglądarce
 */
export interface AnalysisMetrics {
  // Głośność
  lufs: number; // Integrated LUFS
  true_peak: number; // dBTP
  momentary_loudness: number; // Momentary LUFS
  
  // Rozkład energii spektralnej
  low_ratio: number; // 60-250 Hz / total
  low_mid_ratio: number; // 250-500 Hz / total
  mid_ratio: number; // 500-2000 Hz / total
  mid_high_ratio: number; // 2000-5000 Hz / total
  high_ratio: number; // 5000-20000 Hz / total
  
  // Stereo
  stereo_correlation: number; // -1 do 1 (0 = dualne kanały, 1 = mono)
  stereo_width: number; // 0 do 1 (0 = mono, 1 = maximum width)
  
  // Spektralne
  spectral_centroid: number; // Hz (gdzie jest "ciężar" spektralny)
  spectral_spread: number; // Hz (szerokość rozkładu)
  spectral_tilt: number; // dB/octave (nachylenie spektrum)
  
  // Equalization metrics
  low_mid_balance: number; // (low_energy / mid_energy) ratio
  presence_peak: number; // Pik w rejonie 2-4 kHz, dB
  
  // Dynamika i transjenty
  transient_density: number; // liczba transients na sekundę
  crest_factor: number; // Peak / RMS ratio
  
  // Psychoakustyka
  harshness_index: number; // 0-100 (2-8 kHz intensity)
  brightness_index: number; // 0-100 (8-20 kHz intensity)
  warmth_index: number; // 0-100 (60-250 Hz presence)
  
  // Metadata
  engine_version: string; // np. "1.0.0"
  sample_rate: number;
  duration_seconds: number;
  analysis_timestamp: number; // Date.now()
}

/**
 * Renturn type dla analizy
 */
export interface AnalysisResult {
  style: string;
  metrics: AnalysisMetrics;
  analysis_id: string; // UUID
}

/**
 * Percentyle dla jednej metryki
 */
export interface MetricPercentiles {
  p10: number;
  p25: number;
  p50: number; // mediana
  p75: number;
  p90: number;
  mean: number;
  std_dev: number;
  count: number; // liczba próbek
}

/**
 * Profil stylu muzycznego (referencyjne percentyle)
 */
export interface StyleProfile {
  style: string; // "rock", "metal", "grunge", itd.
  display_name: string;
  description: string;
  
  metrics: {
    [key in keyof AnalysisMetrics]?: MetricPercentiles;
  };
  
  // Metadata
  created_at: number;
  last_updated: number;
  total_samples: number;
  
  // Wagowanie źródeł danych
  curated_weight: number; // 0-1
  user_data_weight: number; // 0-1 (suma = 1)
  
  // Wersja algorytmu
  engine_version: string;
}

/**
 * Pojedynczy rekord metryki do agregacji
 * (Anonimowy zapis do bazy)
 */
export interface MetricsRecord {
  style: string;
  metrics: Partial<AnalysisMetrics>;
  engine_version: string;
  timestamp: number;
  // NIE zawiera: nazwy pliku, nazwy artysty, audio, identyfikatora użytkownika
}

/**
 * Wynik diagnozy dla metryki
 */
export interface MetricDiagnosis {
  metric_name: string;
  user_value: number;
  p10: number;
  p50: number;
  p90: number;
  
  status: "optimal" | "low" | "high" | "critical_low" | "critical_high";
  confidence: number; // 0-1
  
  message: string;
  recommendation: string;
}

/**
 * Pełna diagnoza miksu
 */
export interface MixDiagnosis {
  style: string;
  overall_score: number; // 0-100
  
  diagnoses: MetricDiagnosis[];
  
  issues: Array<{
    severity: "low" | "medium" | "high";
    title: string;
    description: string;
    affected_metrics: string[];
  }>;
  
  strengths: string[];
  
  // Sugestie edukacyjne
  daw_tips: Array<{
    problem: string;
    tool: string; // "EQ", "Compressor", "Saturation"
    frequency: string;
    action: string;
  }>;
}

/**
 * Agregacja i statystyka dla aktualizacji profili
 */
export interface ProfileAggregation {
  style: string;
  period: {
    start: number; // timestamp
    end: number;
  };
  
  total_records: number;
  
  // Dane dla każdej metryki
  metric_calculations: {
    [key in keyof AnalysisMetrics]?: {
      values: number[];
      percentiles: MetricPercentiles;
    };
  };
  
  engine_versions: Record<string, number>; // liczba rekordów per version
}

/**
 * Konfiguracja systemu kalibracji
 */
export interface CalibrationConfig {
  // Progi dla diagnostyki
  diagnosis_thresholds: {
    optimal: {
      min: number; // percentile (np. p25)
      max: number; // percentile (np. p75)
    };
    warning: {
      min: number; // p10
      max: number; // p90
    };
  };
  
  // Wagowanie w overall score
  metric_weights: Record<string, number>;
  
  // Agregacja
  aggregation: {
    min_samples_per_metric: number;
    curated_vs_user_ratio: number; // np. 0.6 = 60% curated, 40% user
    outlier_removal_sigma: number; // ile sigma do usunięcia
  };
  
  // Wersja algorytmu
  engine_version: string;
}

/**
 * Export dla telemetrii (anonimowe zapisy na serwer)
 */
export interface AnalysisTelemetry {
  style: string;
  metrics: Partial<AnalysisMetrics>;
  engine_version: string;
  
  // NO:
  // - audio
  // - filename
  // - artist name
  // - user id
  // - timestamp (opcjonalnie, albo zaokrąglone do dnia)
}
