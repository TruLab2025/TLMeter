export type FeatureLevel = "low" | "medium" | "high";

export interface FeatureStatsEntry {
  mean: number;
  std: number;
  p25: number;
  p50: number;
  p75: number;
}

export interface CalibrationStatsPayload {
  feature_names: string[];
  stats: Record<string, FeatureStatsEntry>;
}

export interface CalibrationCluster {
  cluster_id: number;
  centroid: number[];
  feature_levels: Record<string, FeatureLevel>;
  label: string;
}

export interface CalibrationClustersPayload {
  feature_names: string[];
  clusters: CalibrationCluster[];
}
