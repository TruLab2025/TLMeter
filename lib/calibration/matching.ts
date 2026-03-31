import type { CalibrationClustersPayload, CalibrationStatsPayload, CalibrationCluster, FeatureLevel } from "./types";

const LEVEL_VALUE: Record<FeatureLevel, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

const SUGGESTION_RULES: Record<string, { tooHigh: string; tooLow: string }> = {
  low_energy: {
    tooHigh: "Przytnij 100–200 Hz, żeby uszczelnić dół",
    tooLow: "Dodaj więcej energii w 80–150 Hz dla masy",
  },
  mid_energy: {
    tooHigh: "Zredukuj średnicę (250–800 Hz), żeby odciążyć miks",
    tooLow: "Podbij 500–1 kHz, żeby nadać więcej wyrazu",
  },
  presence: {
    tooHigh: "Zbij 3–5 kHz, żeby złagodzić ostrą górę",
    tooLow: "Podbij 3–5 kHz, by podkreślić obecność",
  },
  sustain: {
    tooHigh: "Skróć sustain albo dodaj gating dla czystszej końcówki",
    tooLow: "Pozwól wybrzmieć ogonowi lub dołóż przestrzeni",
  },
};

function normalizeVector(input: number[], statsPayload: CalibrationStatsPayload): number[] {
  const { feature_names, stats } = statsPayload;
  if (input.length !== feature_names.length) {
    throw new Error("Feature vector length mismatch");
  }
  return input.map((value, idx) => {
    const name = feature_names[idx];
    const entry = stats[name];
    const mean = entry?.mean ?? 0;
    const std = entry?.std || 1;
    return (value - mean) / std;
  });
}

function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    const delta = a[i] - b[i];
    sum += delta * delta;
  }
  return Math.sqrt(sum);
}

function computeMaxDistance(centroids: number[][]): number {
  let maxDistance = 0;
  for (let i = 0; i < centroids.length; i += 1) {
    for (let j = i + 1; j < centroids.length; j += 1) {
      const distance = euclideanDistance(centroids[i], centroids[j]);
      if (distance > maxDistance) maxDistance = distance;
    }
  }
  return maxDistance || 1;
}

type FeatureLevelEntry = { p25: number; p75: number };

function featureLevel(value: number, entry: FeatureLevelEntry | undefined): FeatureLevel {
  if (!entry) return "medium";
  if (value < entry.p25) return "low";
  if (value > entry.p75) return "high";
  return "medium";
}

type FeatureLevelEntry = { p25: number; p75: number };

function buildFeatureLevels(input: number[], statsPayload: CalibrationStatsPayload): Record<string, FeatureLevel> {
  const { feature_names, stats } = statsPayload;
  return feature_names.reduce<Record<string, FeatureLevel>>((acc, name, idx) => {
    const entry = stats[name];
    acc[name] = featureLevel(input[idx], entry);
    return acc;
  }, {});
}

function generateSuggestions(
  inputLevels: Record<string, FeatureLevel>,
  clusterLevels: Record<string, FeatureLevel>
): string[] {
  const results: string[] = [];
  for (const [feature, rule] of Object.entries(SUGGESTION_RULES)) {
    const inputLevel = inputLevels[feature] ?? "medium";
    const clusterLevel = clusterLevels[feature] ?? "medium";
    const diff = LEVEL_VALUE[inputLevel] - LEVEL_VALUE[clusterLevel];
    if (diff >= 1) {
      results.push(rule.tooHigh);
    } else if (diff <= -1) {
      results.push(rule.tooLow);
    }
  }
  return Array.from(new Set(results));
}

export interface MatchResult {
  similarity: number;
  distance: number;
  closestCluster: CalibrationCluster | null;
  feature_levels: Record<string, FeatureLevel>;
  suggestions: string[];
}

export function createCalibrationMatcher(
  statsPayload: CalibrationStatsPayload,
  clustersPayload: CalibrationClustersPayload
): (featureVector: number[]) => MatchResult {
  const centroids = clustersPayload.clusters.map((cluster) => cluster.centroid);
  const scale = computeMaxDistance(centroids);
  return (featureVector: number[]) => {
    const normalized = normalizeVector(featureVector, statsPayload);
    let best: { cluster: CalibrationCluster | null; distance: number } = { cluster: null, distance: Infinity };
    for (const cluster of clustersPayload.clusters) {
      if (cluster.centroid.length !== normalized.length) continue;
      const distance = euclideanDistance(normalized, cluster.centroid);
      if (distance < best.distance) {
        best = { cluster, distance };
      }
    }
    const similarity = 1 - Math.min(best.distance / scale, 1);
    const levels = buildFeatureLevels(featureVector, statsPayload);
    const suggestions = best.cluster ? generateSuggestions(levels, best.cluster.feature_levels) : [];
    return {
      similarity,
      distance: best.distance === Infinity ? 0 : best.distance,
      closestCluster: best.cluster,
      feature_levels: levels,
      suggestions,
    };
  };
}
