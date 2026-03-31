#!/usr/bin/env python3
"""Cluster calibration feature vectors with KMeans."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Iterable

import numpy as np
from sklearn.cluster import KMeans


def load_vectors(path: Path) -> tuple[list[str], list[list[float]]]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    feature_names = payload.get("feature_names", [])
    samples = payload.get("samples", [])
    vectors: list[list[float]] = []
    for sample in samples:
        vector = sample.get("features")
        if not vector or len(vector) != len(feature_names):
            continue
        vectors.append(vector)
    return feature_names, vectors


def normalize(vectors: Iterable[list[float]], names: list[str], stats: dict[str, dict[str, float]]) -> list[list[float]]:
    normalized: list[list[float]] = []
    for vector in vectors:
        row: list[float] = []
        for idx, name in enumerate(names):
            value = vector[idx]
            entry = stats[name]
            mean = entry.get("mean", 0.0)
            std = entry.get("std", 1.0) or 1.0
            row.append((value - mean) / std)
        normalized.append(row)
    return normalized


def centroid_raw_levels(centroid: list[float], names: list[str], stats: dict[str, dict[str, float]]) -> dict[str, str]:
    levels: dict[str, str] = {}
    for idx, name in enumerate(names):
        entry = stats[name]
        mean = entry.get("mean", 0.0)
        std = entry.get("std", 1.0) or 1.0
        raw_value = centroid[idx] * std + mean
        if raw_value < entry.get("p25", 0.0):
            levels[name] = "low"
        elif raw_value > entry.get("p75", 0.0):
            levels[name] = "high"
        else:
            levels[name] = "medium"
    return levels


def main() -> None:
    parser = argparse.ArgumentParser(description="Cluster calibration feature vectors via KMeans.")
    parser.add_argument("--features", type=Path, required=True, help="Path to features JSON")
    parser.add_argument("--stats", type=Path, required=True, help="Path to stats JSON")
    parser.add_argument("--clusters", type=int, default=4, help="Number of clusters")
    parser.add_argument("--output", type=Path, default=Path("calibration/clusters.json"), help="Destination JSON file.")
    args = parser.parse_args()

    feature_names, vectors = load_vectors(args.features)
    stats_payload = json.loads(args.stats.read_text(encoding="utf-8"))
    stats = stats_payload.get("stats", {})
    normalized = normalize(vectors, feature_names, stats)

    model = KMeans(n_clusters=args.clusters, random_state=42)
    labels = model.fit_predict(normalized)
    centroids = model.cluster_centers_.tolist()

    clusters = []
    for idx, centroid in enumerate(centroids):
        clusters.append({
            "cluster_id": idx,
            "centroid": centroid,
            "feature_levels": centroid_raw_levels(centroid, feature_names, stats),
            "label": f"cluster_{idx}",
        })

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps({"feature_names": feature_names, "clusters": clusters}, indent=2),
        encoding="utf-8",
    )
    print(f"Wrote {len(clusters)} clusters to {args.output}")


if __name__ == "__main__":
    main()
