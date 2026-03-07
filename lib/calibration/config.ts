/**
 * Konfiguracja systemu kalibracji
 */

import { CalibrationConfig } from "./types";

export const DEFAULT_CALIBRATION_CONFIG: CalibrationConfig = {
  // Progi dla diagnostyki
  diagnosis_thresholds: {
    optimal: {
      min: 0.25, // p25
      max: 0.75, // p75
    },
    warning: {
      min: 0.1, // p10
      max: 0.9, // p90
    },
  },

  // Wagowanie metryk w overall score
  // Wyższe wagi = większy wpływ na wynik
  metric_weights: {
    lufs: 1.0,
    true_peak: 0.95,
    momentary_loudness: 0.6,

    low_ratio: 1.0,
    low_mid_ratio: 0.8,
    mid_ratio: 1.0,
    mid_high_ratio: 0.9,
    high_ratio: 0.7,

    stereo_correlation: 0.7,
    stereo_width: 0.8,

    spectral_centroid: 0.7,
    spectral_spread: 0.6,
    spectral_tilt: 0.6,

    low_mid_balance: 0.9,
    presence_peak: 0.85,

    transient_density: 0.6,
    crest_factor: 0.7,

    harshness_index: 1.0,
    brightness_index: 0.7,
    warmth_index: 0.8,
  },

  // Agregacja
  aggregation: {
    min_samples_per_metric: 10, // Minimałna liczba próbek do zaufania percentylom
    curated_vs_user_ratio: 0.6, // 60% curated, 40% user
    outlier_removal_sigma: 3.0, // Usuń wartości poza 3 sigma
  },

  engine_version: "1.0",
};

/**
 * Gets konfigurację dla konkretnych stylów
 * (Możliwość override dla różnych stylów)
 */
export function getStyleSpecificConfig(
  style: string
): CalibrationConfig {
  // Domyślnie zwróć default config
  // W przyszłości: mogą być style-specific overrides
  return DEFAULT_CALIBRATION_CONFIG;
}

/**
 * Profil diagnostyki - określa jak "ścisłej" oceny doradztwa
 */
export type DiagnosisProfile = "lenient" | "standard" | "strict";

export function getDiagnosisThresholds(
  profile: DiagnosisProfile
): CalibrationConfig["diagnosis_thresholds"] {
  switch (profile) {
    case "lenient":
      // Twardy standard, ale mniej ostrzeżeń
      return {
        optimal: { min: 0.2, max: 0.8 },
        warning: { min: 0.05, max: 0.95 },
      };

    case "strict":
      // Bardziej wymagający
      return {
        optimal: { min: 0.3, max: 0.7 },
        warning: { min: 0.15, max: 0.85 },
      };

    case "standard":
    default:
      return DEFAULT_CALIBRATION_CONFIG.diagnosis_thresholds;
  }
}
