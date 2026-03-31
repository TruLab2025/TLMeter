#!/usr/bin/env python3
"""Generate normalization statistics for calibration features."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from statistics import mean, stdev
from typing import Iterable
from math import isnan
import numpy as np


def load_features(path: Path) -> tuple[list[str], list[list[float]]]:
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


def percentiles(values: Iterable[float]) -> dict[str, float]:
    array = np.array([float(v) for v in values if isinstance(v, (int, float)) and not isnan(v)])
    if array.size == 0:
        return {"p25": 0.0, "p50": 0.0, "p75": 0.0}
    return {
        "p25": float(np.percentile(array, 25)),
        "p50": float(np.percentile(array, 50)),
        "p75": float(np.percentile(array, 75)),
    }


def compute_stats(feature_vectors: list[list[float]], names: list[str]) -> dict[str, dict[str, float]]:
    stats: dict[str, dict[str, float]] = {}
    transposed = list(zip(*feature_vectors)) if feature_vectors else []
    for name, column in zip(names, transposed):
        vals = [float(v) for v in column if isinstance(v, (int, float)) and not isnan(v)]
        if not vals:
            stats[name] = {"mean": 0.0, "std": 1.0, **percentiles(vals)}
            continue
        stats[name] = {
            "mean": float(mean(vals)),
            "std": float(stdev(vals)) if len(vals) > 1 else 0.0,
            **percentiles(vals),
        }
    return stats


def main() -> None:
    parser = argparse.ArgumentParser(description="Compute normalization stats for calibration features.")
    parser.add_argument("--input", "-i", type=Path, required=True, help="Path to extracted feature JSON.")
    parser.add_argument("--output", "-o", type=Path, default=Path("calibration/stats.json"), help="Destination stats output.")
    args = parser.parse_args()

    feature_names, vectors = load_features(args.input)
    if not feature_names or not vectors:
        raise SystemExit("missing feature data")
    stats = compute_stats(vectors, feature_names)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps({"feature_names": feature_names, "stats": stats}, indent=2),
        encoding="utf-8",
    )
    print(f"Wrote stats for {len(feature_names)} features to {args.output}")


if __name__ == "__main__":
    main()
