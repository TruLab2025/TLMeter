/**
 * Style Profiles - Zarządzanie profilami stylów muzycznych
 * Zawiera domyślne profile oraz logikę ładowania/cachowania
 */

import { StyleProfile, MetricPercentiles } from "./types";

/**
 * Domyślne profile stylów (oparte na referencjach curated)
 * Te wartości są wstępnie ustawione na podstawie analizy referencynych utworów
 */
const DEFAULT_PROFILES: Record<string, Partial<StyleProfile>> = {
  rock: {
    style: "rock",
    display_name: "Rock",
    description: "Classic rock, hard rock, rock alternatywny",
    curated_weight: 0.6,
    user_data_weight: 0.4,
    engine_version: "1.0",
    total_samples: 150,
    created_at: Date.now() - 30 * 24 * 60 * 60 * 1000,
    last_updated: Date.now(),
    metrics: {
      lufs: {
        p10: -11,
        p25: -10,
        p50: -9,
        p75: -8,
        p90: -7,
        mean: -9,
        std_dev: 1.2,
        count: 150,
      },
      true_peak: {
        p10: -2.0,
        p25: -1.5,
        p50: -1.0,
        p75: -0.5,
        p90: -0.3,
        mean: -1.0,
        std_dev: 0.6,
        count: 150,
      },
      low_ratio: {
        p10: 0.18,
        p25: 0.21,
        p50: 0.24,
        p75: 0.27,
        p90: 0.3,
        mean: 0.24,
        std_dev: 0.04,
        count: 150,
      },
      mid_ratio: {
        p10: 0.28,
        p25: 0.30,
        p50: 0.32,
        p75: 0.35,
        p90: 0.38,
        mean: 0.32,
        std_dev: 0.04,
        count: 150,
      },
      high_ratio: {
        p10: 0.08,
        p25: 0.10,
        p50: 0.12,
        p75: 0.14,
        p90: 0.16,
        mean: 0.12,
        std_dev: 0.03,
        count: 150,
      },
      stereo_width: {
        p10: 0.75,
        p25: 0.82,
        p50: 0.88,
        p75: 0.92,
        p90: 0.95,
        mean: 0.88,
        std_dev: 0.08,
        count: 150,
      },
      harshness_index: {
        p10: 20,
        p25: 28,
        p50: 35,
        p75: 42,
        p90: 50,
        mean: 35,
        std_dev: 10,
        count: 150,
      },
    },
  },

  metal: {
    style: "metal",
    display_name: "Metal",
    description: "Heavy metal, thrash metal, death metal",
    curated_weight: 0.6,
    user_data_weight: 0.4,
    engine_version: "1.0",
    total_samples: 120,
    created_at: Date.now() - 30 * 24 * 60 * 60 * 1000,
    last_updated: Date.now(),
    metrics: {
      lufs: {
        p10: -11,
        p25: -10,
        p50: -9,
        p75: -8,
        p90: -7,
        mean: -9,
        std_dev: 1.1,
        count: 120,
      },
      true_peak: {
        p10: -1.8,
        p25: -1.2,
        p50: -0.8,
        p75: -0.4,
        p90: -0.2,
        mean: -0.8,
        std_dev: 0.7,
        count: 120,
      },
      low_ratio: {
        p10: 0.22,
        p25: 0.25,
        p50: 0.28,
        p75: 0.31,
        p90: 0.34,
        mean: 0.28,
        std_dev: 0.05,
        count: 120,
      },
      mid_ratio: {
        p10: 0.26,
        p25: 0.29,
        p50: 0.31,
        p75: 0.34,
        p90: 0.37,
        mean: 0.31,
        std_dev: 0.04,
        count: 120,
      },
      high_ratio: {
        p10: 0.1,
        p25: 0.12,
        p50: 0.14,
        p75: 0.16,
        p90: 0.18,
        mean: 0.14,
        std_dev: 0.035,
        count: 120,
      },
      stereo_width: {
        p10: 0.7,
        p25: 0.78,
        p50: 0.85,
        p75: 0.9,
        p90: 0.93,
        mean: 0.83,
        std_dev: 0.09,
        count: 120,
      },
      harshness_index: {
        p10: 30,
        p25: 38,
        p50: 45,
        p75: 52,
        p90: 60,
        mean: 45,
        std_dev: 12,
        count: 120,
      },
    },
  },

  grunge: {
    style: "grunge",
    display_name: "Grunge",
    description: "Grunge, post-grunge",
    curated_weight: 0.6,
    user_data_weight: 0.4,
    engine_version: "1.0",
    total_samples: 90,
    created_at: Date.now() - 30 * 24 * 60 * 60 * 1000,
    last_updated: Date.now(),
    metrics: {
      lufs: {
        p10: -11.5,
        p25: -10.5,
        p50: -9.5,
        p75: -8.5,
        p90: -7.5,
        mean: -9.5,
        std_dev: 1.3,
        count: 90,
      },
      true_peak: {
        p10: -2.2,
        p25: -1.6,
        p50: -1.2,
        p75: -0.6,
        p90: -0.3,
        mean: -1.2,
        std_dev: 0.8,
        count: 90,
      },
      low_ratio: {
        p10: 0.2,
        p25: 0.23,
        p50: 0.26,
        p75: 0.3,
        p90: 0.34,
        mean: 0.26,
        std_dev: 0.055,
        count: 90,
      },
      mid_ratio: {
        p10: 0.3,
        p25: 0.32,
        p50: 0.35,
        p75: 0.38,
        p90: 0.41,
        mean: 0.35,
        std_dev: 0.045,
        count: 90,
      },
      high_ratio: {
        p10: 0.07,
        p25: 0.09,
        p50: 0.11,
        p75: 0.13,
        p90: 0.15,
        mean: 0.11,
        std_dev: 0.03,
        count: 90,
      },
      stereo_width: {
        p10: 0.72,
        p25: 0.8,
        p50: 0.87,
        p75: 0.92,
        p90: 0.96,
        mean: 0.87,
        std_dev: 0.085,
        count: 90,
      },
      harshness_index: {
        p10: 25,
        p25: 33,
        p50: 40,
        p75: 47,
        p90: 55,
        mean: 40,
        std_dev: 11,
        count: 90,
      },
    },
  },

  pop: {
    style: "pop",
    display_name: "Pop",
    description: "Pop, indie pop, pop rock",
    curated_weight: 0.6,
    user_data_weight: 0.4,
    engine_version: "1.0",
    total_samples: 200,
    created_at: Date.now() - 30 * 24 * 60 * 60 * 1000,
    last_updated: Date.now(),
    metrics: {
      lufs: {
        p10: -10,
        p25: -8.5,
        p50: -7,
        p75: -5.5,
        p90: -4,
        mean: -7,
        std_dev: 2.0,
        count: 200,
      },
      true_peak: {
        p10: -1.5,
        p25: -1.0,
        p50: -0.5,
        p75: 0,
        p90: 0.1,
        mean: -0.3,
        std_dev: 0.8,
        count: 200,
      },
      low_ratio: {
        p10: 0.16,
        p25: 0.19,
        p50: 0.22,
        p75: 0.25,
        p90: 0.29,
        mean: 0.22,
        std_dev: 0.045,
        count: 200,
      },
      mid_ratio: {
        p10: 0.34,
        p25: 0.37,
        p50: 0.40,
        p75: 0.43,
        p90: 0.47,
        mean: 0.40,
        std_dev: 0.04,
        count: 200,
      },
      high_ratio: {
        p10: 0.1,
        p25: 0.13,
        p50: 0.16,
        p75: 0.19,
        p90: 0.23,
        mean: 0.16,
        std_dev: 0.04,
        count: 200,
      },
      stereo_width: {
        p10: 0.8,
        p25: 0.87,
        p50: 0.92,
        p75: 0.96,
        p90: 0.98,
        mean: 0.91,
        std_dev: 0.07,
        count: 200,
      },
      harshness_index: {
        p10: 15,
        p25: 22,
        p50: 30,
        p75: 38,
        p90: 45,
        mean: 30,
        std_dev: 10,
        count: 200,
      },
    },
  },

  edm: {
    style: "edm",
    display_name: "EDM",
    description: "Electronic Dance Music, House, Techno, Drum & Bass",
    curated_weight: 0.6,
    user_data_weight: 0.4,
    engine_version: "1.0",
    total_samples: 180,
    created_at: Date.now() - 30 * 24 * 60 * 60 * 1000,
    last_updated: Date.now(),
    metrics: {
      lufs: {
        p10: -9,
        p25: -7.5,
        p50: -6,
        p75: -4.5,
        p90: -3,
        mean: -6,
        std_dev: 2.1,
        count: 180,
      },
      true_peak: {
        p10: -1.2,
        p25: -0.7,
        p50: -0.2,
        p75: 0.2,
        p90: 0.5,
        mean: 0,
        std_dev: 0.9,
        count: 180,
      },
      low_ratio: {
        p10: 0.24,
        p25: 0.28,
        p50: 0.32,
        p75: 0.36,
        p90: 0.40,
        mean: 0.32,
        std_dev: 0.056,
        count: 180,
      },
      mid_ratio: {
        p10: 0.24,
        p25: 0.27,
        p50: 0.30,
        p75: 0.33,
        p90: 0.37,
        mean: 0.30,
        std_dev: 0.04,
        count: 180,
      },
      high_ratio: {
        p10: 0.12,
        p25: 0.15,
        p50: 0.18,
        p75: 0.21,
        p90: 0.25,
        mean: 0.18,
        std_dev: 0.045,
        count: 180,
      },
      stereo_width: {
        p10: 0.78,
        p25: 0.85,
        p50: 0.90,
        p75: 0.95,
        p90: 0.98,
        mean: 0.90,
        std_dev: 0.075,
        count: 180,
      },
      harshness_index: {
        p10: 18,
        p25: 26,
        p50: 34,
        p75: 42,
        p90: 50,
        mean: 34,
        std_dev: 11,
        count: 180,
      },
    },
  },
};

/**
 * Cache dla profili (loaded on demand)
 */
let profileCache: Map<string, StyleProfile> | null = null;

/**
 * Załaduj lub pobrań profil stylu
 */
export async function getStyleProfile(
  style: string
): Promise<StyleProfile | null> {
  // Sprawdź cache
  if (profileCache && profileCache.has(style)) {
    return profileCache.get(style)!;
  }

  // Jeśli brak, załaduj z defaults
  const defaultProfile = DEFAULT_PROFILES[style];
  if (!defaultProfile) {
    return null;
  }

  // Uzupełnij do pełnego profilu (w przyszłości mogą być aktualizacje z serwera)
  const fullProfile = {
    style: defaultProfile.style || style,
    display_name: defaultProfile.display_name || style,
    description: defaultProfile.description || "",
    metrics: defaultProfile.metrics || {},
    created_at: defaultProfile.created_at || Date.now(),
    last_updated: defaultProfile.last_updated || Date.now(),
    total_samples: defaultProfile.total_samples || 0,
    curated_weight: defaultProfile.curated_weight || 0.6,
    user_data_weight: defaultProfile.user_data_weight || 0.4,
    engine_version: defaultProfile.engine_version || "1.0",
  } as StyleProfile;

  // Cache
  if (!profileCache) {
    profileCache = new Map();
  }
  profileCache.set(style, fullProfile);

  return fullProfile;
}

/**
 * Pobierz wszystkie dostępne style
 */
export function getAvailableStyles(): string[] {
  return Object.keys(DEFAULT_PROFILES);
}

/**
 * Wyczyść cache (dla testów)
 */
export function clearProfileCache(): void {
  profileCache = null;
}

/**
 * Zaktualizuj profil na podstawie nowych danych agregacyjnych
 * (Ten prosty wariant robi in-memory update, ale w produkcji byłoby w DB)
 */
export function updateProfileWithAggregation(
  style: string,
  newPercentiles: Record<string, MetricPercentiles>
): void {
  if (!profileCache) {
    profileCache = new Map();
  }

  const profile = profileCache.get(style);
  if (!profile) return;

  // Zaktualizuj percentyle dla każdej metryki
  Object.entries(newPercentiles).forEach(([metricName, percentiles]) => {
    const key = metricName as keyof typeof profile.metrics;
    profile.metrics[key] = percentiles;
  });

  profile.last_updated = Date.now();
}
