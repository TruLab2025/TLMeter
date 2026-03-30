/**
 * Obliczanie percentyli dla metryk
 */

import { MetricPercentiles } from "./types";

/**
 * Oblicza percentyle dla zbioru wartości
 */
export function calculatePercentiles(values: number[]): MetricPercentiles {
  if (values.length === 0) {
    throw new Error("Cannot calculate percentiles for empty array");
  }

  // Usuń outliers (3 sigma rule)
  const mean = values.reduce((a, b) => a + b) / values.length;
  const std_dev = Math.sqrt(
    values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length
  );

  const filtered = values.filter(v => Math.abs(v - mean) <= 3 * std_dev);

  if (filtered.length < Math.max(values.length * 0.5, 2)) {
    // Jeśli zbyt wiele wartości usunęliśmy, użyj oryginału
    return calculatePercentilesRaw(values);
  }

  return calculatePercentilesRaw(filtered);
}

/**
 * Surowe obliczenie percentyli (bez filtracji)
 */
export function calculatePercentilesRaw(values: number[]): MetricPercentiles {
  const sorted = [...values].sort((a, b) => a - b);
  const len = sorted.length;

  const getPercentile = (p: number): number => {
    const index = (p / 100) * (len - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;

    if (lower === upper) {
      return sorted[lower];
    }

    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  };

  const mean = sorted.reduce((a, b) => a + b) / len;
  const std_dev = Math.sqrt(
    sorted.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / len
  );

  return {
    p10: getPercentile(10),
    p25: getPercentile(25),
    p50: getPercentile(50),
    p75: getPercentile(75),
    p90: getPercentile(90),
    mean,
    std_dev,
    count: sorted.length,
  };
}

/**
 * Porównuje wartość metryki z percentylami
 * Zwraca status i confidence
 */
export function assessMetricValue(
  value: number,
  percentiles: MetricPercentiles,
  criticalMargin: number = 0.5 // jak daleko poza p10/p90 to "critical"
): {
  status: "optimal" | "low" | "high" | "critical_low" | "critical_high";
  confidence: number;
} {
  const { p10, p50, p90, std_dev } = percentiles;

  // Margines dla critical (1.5 * std_dev poza range)
  const critical_low = p10 - std_dev * criticalMargin;
  const critical_high = p90 + std_dev * criticalMargin;

  if (value < critical_low) {
    return {
      status: "critical_low",
      confidence: Math.min(1, (critical_low - value) / (std_dev * 0.5)),
    };
  }

  if (value > critical_high) {
    return {
      status: "critical_high",
      confidence: Math.min(1, (value - critical_high) / (std_dev * 0.5)),
    };
  }

  if (value < p10) {
    return {
      status: "low",
      confidence: (p10 - value) / (p10 - critical_low),
    };
  }

  if (value > p90) {
    return {
      status: "high",
      confidence: (value - p90) / (critical_high - p90),
    };
  }

  // W zakresie optimal (p10-p90)
  // Confidence najwyższa po środku (p50)
  const fromCenter = Math.abs(value - p50);
  const maxDistance = Math.max(p50 - p10, p90 - p50);
  const confidence = 1 - (fromCenter / maxDistance) * 0.3; // max 0.7-1.0

  return {
    status: "optimal",
    confidence: Math.max(0.7, confidence),
  };
}

/**
 * Normalizuje wartość do zakresu 0-1 na podstawie percentyli
 * Przydatne do liczenia overall score
 */
export function normalizeValue(
  value: number,
  percentiles: MetricPercentiles
): number {
  const { p10, p90 } = percentiles;
  const range = p90 - p10;

  if (range === 0) return 0.5;

  const normalized = (value - p10) / range;
  return Math.max(0, Math.min(1, normalized));
}

/**
 * Scalenie dwóch profili percentyli (dla curated + user data)
 */
export function blendPercentiles(
  curated: MetricPercentiles,
  userData: MetricPercentiles,
  curatedWeight: number = 0.6
): MetricPercentiles {
  const blend = (a: number, b: number) =>
    a * curatedWeight + b * (1 - curatedWeight);

  return {
    p10: blend(curated.p10, userData.p10),
    p25: blend(curated.p25, userData.p25),
    p50: blend(curated.p50, userData.p50),
    p75: blend(curated.p75, userData.p75),
    p90: blend(curated.p90, userData.p90),
    mean: blend(curated.mean, userData.mean),
    std_dev: Math.sqrt(
      curatedWeight * curated.std_dev ** 2 +
        (1 - curatedWeight) * userData.std_dev ** 2
    ),
    count: curated.count + userData.count,
  };
}
