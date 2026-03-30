import type { RawAnalysisResult, RawJsonReport, ReportEnvelope } from "@/lib/reports/types";

type SpectralBandFrame = {
  tSec?: unknown;
  bands?: {
    sub_20_60?: unknown;
    bass_60_120?: unknown;
    lowmid_120_250?: unknown;
    mid_250_500?: unknown;
    uppermid_500_2000?: unknown;
    presence_2000_4000?: unknown;
    brilliance_4000_8000?: unknown;
    air_8000_20000?: unknown;
  };
};

type StereoFrame = {
  tSec?: unknown;
  correlation?: unknown;
  midRmsDbfs?: unknown;
  lrBalanceDb?: unknown;
};

type LoudnessFrame = {
  tSec?: unknown;
  rmsDbfs?: unknown;
  lufsMomentary?: unknown;
  lufsShortTerm?: unknown;
};

type TruePeakFrame = {
  tSec?: unknown;
  truePeakDbtp?: unknown;
};

function numOrZero(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function makeEnvelope(): ReportEnvelope {
  return {
    schema_version: "raw-json-v1",
    app: "TruLab Meter",
    generated_at: new Date().toISOString(),
    privacy: {
      audio_uploaded: false,
      filename_included: false,
      pii_included: false,
    },
  };
}

function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function normalizeArray(values: number[]): number[] {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return values.map(() => 0);
  return values.map((value) => value / total);
}

function getBandValue(frame: SpectralBandFrame, key: keyof SpectralBandFrame["bands"]) {
  return numOrZero(frame.bands?.[key]);
}

export function generateRawJsonReport(params: {
  raw: RawAnalysisResult;
  plan: "free" | "lite" | "pro" | "premium";
  style: string;
}): RawJsonReport {
  const { raw, plan, style } = params;
  const rawGlobal = raw.global as Record<string, unknown> | undefined;
  const spectralGlobal = rawGlobal?.spectral as Record<string, unknown> | undefined;
  const transientsGlobal = rawGlobal?.transients as Record<string, unknown> | undefined;
  const analysisDurationMs =
    typeof (raw as Record<string, unknown>).analysisDurationMs === "number"
      ? (raw as Record<string, unknown>).analysisDurationMs
      : null;

  const bandFrames = Array.isArray(raw.timeSeries?.spectralBandFrames)
    ? (raw.timeSeries?.spectralBandFrames as SpectralBandFrame[])
    : [];

  const timeline_sec = bandFrames.map((frame) => numOrZero(frame?.tSec));

  const b60 = bandFrames.map((frame) => getBandValue(frame, "sub_20_60"));
  const b120 = bandFrames.map((frame) => getBandValue(frame, "bass_60_120"));
  const b240 = bandFrames.map((frame) => getBandValue(frame, "lowmid_120_250"));
  const b480 = bandFrames.map((frame) => getBandValue(frame, "mid_250_500"));
  const b960 = bandFrames.map((frame) => getBandValue(frame, "uppermid_500_2000"));
  const b1920 = bandFrames.map((frame) => getBandValue(frame, "presence_2000_4000"));
  const b3840 = bandFrames.map((frame) => getBandValue(frame, "brilliance_4000_8000"));
  const b7680 = bandFrames.map((frame) => getBandValue(frame, "air_8000_20000"));

  const spectralHistogram = normalizeArray([
    mean(b60),
    mean(b120),
    mean(b240),
    mean(b480),
    mean(b960),
    mean(b1920),
    mean(b3840),
    mean(b7680),
  ]);

  const spectralFrames = bandFrames.map((frame) => ({
    t_sec: numOrZero(frame?.tSec),
    bins: [
      getBandValue(frame, "sub_20_60"),
      getBandValue(frame, "bass_60_120"),
      getBandValue(frame, "lowmid_120_250"),
      getBandValue(frame, "mid_250_500"),
      getBandValue(frame, "uppermid_500_2000"),
      getBandValue(frame, "presence_2000_4000"),
      getBandValue(frame, "brilliance_4000_8000"),
      getBandValue(frame, "air_8000_20000"),
    ],
  }));

  const stereoFrames = Array.isArray(raw.timeSeries?.stereoFrames)
    ? (raw.timeSeries?.stereoFrames as StereoFrame[])
    : [];
  const stereoTimeline = stereoFrames.map((frame) => numOrZero(frame?.tSec));

  const phaseCorrelation = stereoFrames.map((frame) => numOrZero(frame?.correlation));
  const stereoEnergyLeft = stereoFrames.map((frame) => {
    const mid = numOrZero(frame?.midRmsDbfs);
    const balance = numOrZero(frame?.lrBalanceDb);
    return mid + balance / 2;
  });
  const stereoEnergyRight = stereoFrames.map((frame) => {
    const mid = numOrZero(frame?.midRmsDbfs);
    const balance = numOrZero(frame?.lrBalanceDb);
    return mid - balance / 2;
  });

  const loudnessFrames = Array.isArray(raw.timeSeries?.loudnessFrames)
    ? (raw.timeSeries?.loudnessFrames as LoudnessFrame[])
    : [];
  const truePeakFrames = Array.isArray(raw.timeSeries?.truePeakFrames)
    ? (raw.timeSeries?.truePeakFrames as TruePeakFrame[])
    : [];

  const dynamicTimeline = loudnessFrames.map((frame) => numOrZero(frame?.tSec));
  const rmsTimeline = loudnessFrames.map((frame) => numOrZero(frame?.rmsDbfs));
  const lufsMomentaryTimeline = loudnessFrames.map((frame) => numOrZero(frame?.lufsMomentary));
  const lufsShortTermTimeline = loudnessFrames.map((frame) => numOrZero(frame?.lufsShortTerm));

  const peakTimeline = truePeakFrames.map((frame) => numOrZero(frame?.truePeakDbtp));

  const transientTimes = Array.isArray(raw.timeSeries?.onsetTimesSec) ? raw.timeSeries?.onsetTimesSec : [];
  const onsetMeanStrength = numOrZero(transientsGlobal?.onsetStrengthMean);
  const transientStrength = transientTimes.map(() => onsetMeanStrength);

  return {
    ...makeEnvelope(),
    plan,
    style,
    analysis_metadata: {
      engine_version: "1.0",
      analysis_window_seconds: typeof raw.meta?.durationSec === "number" ? raw.meta.durationSec : null,
      analysis_duration_sec: analysisDurationMs !== null ? analysisDurationMs / 1000 : null,
      fft_size: typeof raw.meta?.frameSize === "number" ? raw.meta.frameSize : null,
      sample_rate_hz: typeof raw.meta?.sampleRate === "number" ? raw.meta.sampleRate : null,
      frame_hop_samples: typeof raw.meta?.hopSize === "number" ? raw.meta.hopSize : null,
    },
    spectral_data: {
      fft_bins: [60, 120, 240, 480, 960, 1920, 3840, 7680],
      spectral_histogram: spectralHistogram,
      spectral_frames: spectralFrames,
      spectral_rolloff: typeof spectralGlobal?.rolloffHzMean === "number" ? spectralGlobal.rolloffHzMean : null,
      spectral_flatness: typeof spectralGlobal?.flatnessMean === "number" ? spectralGlobal.flatnessMean : null,
      spectral_flux: typeof spectralGlobal?.spectralFluxMean === "number" ? spectralGlobal.spectralFluxMean : null,
    },
    band_energy_timeline: {
      timeline_sec,
      band_60hz: b60,
      band_120hz: b120,
      band_240hz: b240,
      band_480hz: b480,
      band_960hz: b960,
      band_1920hz: b1920,
      band_3840hz: b3840,
      band_7680hz: b7680,
    },
    transient_data: {
      transient_times: transientTimes,
      transient_strength: transientStrength,
      attack_time_ms: null,
    },
    stereo_phase_data: {
      timeline_sec: stereoTimeline,
      phase_correlation_timeline: phaseCorrelation,
      stereo_energy_left: stereoEnergyLeft,
      stereo_energy_right: stereoEnergyRight,
    },
    dynamic_profile: {
      timeline_sec: dynamicTimeline,
      rms_timeline: rmsTimeline,
      peak_timeline: peakTimeline,
      lufs_momentary_timeline: lufsMomentaryTimeline,
      lufs_short_term_timeline: lufsShortTermTimeline,
    },
  };
}
