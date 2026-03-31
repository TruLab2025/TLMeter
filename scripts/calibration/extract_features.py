#!/usr/bin/env python3
"""Extract DSP feature vectors from a folder of reference audio files."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Iterable

import librosa
import numpy as np


FEATURE_NAMES = [
    "rms",
    "crest_factor",
    "spectral_centroid",
    "spectral_rolloff",
    "low_energy",
    "mid_energy",
    "presence",
    "transient_density",
    "harmonic_ratio",
    "spectral_flatness",
    "sustain",
    "dynamic_range",
]


def find_audio_files(root: Path, extensions: Iterable[str], recursive: bool) -> list[Path]:
    files: list[Path] = []
    if recursive:
        iter_paths = root.rglob("*")
    else:
        iter_paths = root.glob("*")
    for path in iter_paths:
        if path.is_file() and path.suffix.lower() in extensions:
            files.append(path)
    return sorted(files)


def compute_band_energy(magnitude: np.ndarray, freqs: np.ndarray, low: float, high: float) -> float:
    mask = (freqs >= low) & (freqs <= high)
    if not mask.any():
        return 0.0
    band_energy = np.sum(magnitude[mask] ** 2)
    return float(band_energy)


def make_feature_vector(y: np.ndarray, sr: int) -> dict[str, float]:
    if y.size == 0:
        raise ValueError("Empty buffer")

    rms_frames = librosa.feature.rms(y=y, frame_length=2048, hop_length=512)[0]
    rms = float(np.mean(rms_frames))
    crest_factor = float(np.max(np.abs(y)) / (rms + 1e-9))

    spectral_centroid = float(np.mean(librosa.feature.spectral_centroid(y=y, sr=sr)[0]))
    spectral_rolloff = float(np.mean(librosa.feature.spectral_rolloff(y=y, sr=sr)[0]))

    stft = librosa.stft(y, n_fft=2048, hop_length=512)
    magnitude = np.abs(stft)
    freqs = librosa.fft_frequencies(sr=sr, n_fft=2048)

    low_energy = compute_band_energy(magnitude.sum(axis=1), freqs, 20, 120)
    mid_energy = compute_band_energy(magnitude.sum(axis=1), freqs, 500, 2000)
    presence = compute_band_energy(magnitude.sum(axis=1), freqs, 2000, 6000)

    onset_frames = librosa.onset.onset_detect(y=y, sr=sr, hop_length=512, backtrack=False)
    duration_sec = len(y) / sr
    transient_density = float(len(onset_frames) / duration_sec) if duration_sec > 0 else 0.0

    y_harmonic = librosa.effects.harmonic(y)
    y_percussive = librosa.effects.percussive(y)
    harmonic_energy = float(np.sum(y_harmonic ** 2))
    percussive_energy = float(np.sum(y_percussive ** 2))
    harmonic_ratio = harmonic_energy / (percussive_energy + 1e-9)

    spectral_flatness = float(np.mean(librosa.feature.spectral_flatness(y=y)[0]))

    envelope = rms_frames
    threshold = np.max(envelope) * 0.2 if envelope.size else 0.0
    sustain = float(np.mean(envelope >= threshold)) if envelope.size else 0.0

    abs_y = np.abs(y) + 1e-12
    peak = np.max(abs_y)
    trough = np.min(abs_y)
    dynamic_range = float(20 * np.log10((peak) / (trough)))

    return {
        "rms": rms,
        "crest_factor": crest_factor,
        "spectral_centroid": spectral_centroid,
        "spectral_rolloff": spectral_rolloff,
        "low_energy": low_energy,
        "mid_energy": mid_energy,
        "presence": presence,
        "transient_density": transient_density,
        "harmonic_ratio": harmonic_ratio,
        "spectral_flatness": spectral_flatness,
        "sustain": sustain,
        "dynamic_range": dynamic_range,
    }


def relative_metadata(path: Path, base: Path) -> dict[str, str | None]:
    try:
        rel = path.relative_to(base)
        parents = rel.parent.parts
    except ValueError:
        parents = []
    style = parents[0] if len(parents) > 0 else None
    instrument = parents[1] if len(parents) > 1 else None
    return {
        "style": style,
        "instrument": instrument,
    }


def extract_features(roots: list[Path], recursive: bool) -> list[dict]:
    data: list[dict] = []
    for root in roots:
        files = find_audio_files(root, {".wav", ".flac", ".mp3"}, recursive)
        for file in files:
            try:
                y, sr = librosa.load(file, sr=44100, mono=True)
                features = make_feature_vector(y, sr)
                metadata = relative_metadata(file, root)
                output = {
                    "file": str(file.relative_to(root)),
                    "path": str(file),
                    "style": metadata["style"],
                    "instrument": metadata["instrument"],
                    "features": [features[name] for name in FEATURE_NAMES],
                }
                data.append(output)
            except Exception as exc:
                print(f"warning: failed to process {file}: {exc}")
    return data


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract DSP features from a dataset.")
    parser.add_argument("--input", "-i", nargs="+", type=Path, required=True, help="Input folder(s) to scan for audio.")
    parser.add_argument("--output", "-o", type=Path, default=Path("calibration/features.json"), help="Destination JSON path.")
    parser.add_argument("--recursive", "-r", action="store_true", help="Scan directories recursively.")
    args = parser.parse_args()

    args.output.parent.mkdir(parents=True, exist_ok=True)
    features = extract_features(args.input, args.recursive)
    with args.output.open("w", encoding="utf-8") as fp:
        json.dump({"feature_names": FEATURE_NAMES, "samples": features}, fp, indent=2)
    print(f"Extracted {len(features)} samples to {args.output}")


if __name__ == "__main__":
    main()
