import type { RawAnalysisResult, RawJsonReport, ReportEnvelope } from "@/lib/reports/types";

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

export function generateRawJsonReport(params: {
  raw: RawAnalysisResult;
  plan: "free" | "lite" | "pro" | "premium";
  style: string;
}): RawJsonReport {
  const { raw, plan, style } = params;

  const bandFrames = Array.isArray(raw.timeSeries?.spectralBandFrames)
    ? raw.timeSeries?.spectralBandFrames
    : [];

  const timeline_sec = bandFrames.map((frame: any) => numOrZero(frame?.tSec));

  const b60 = bandFrames.map((frame: any) => numOrZero(frame?.bands?.sub_20_60));
  const b120 = bandFrames.map((frame: any) => numOrZero(frame?.bands?.bass_60_120));
  const b240 = bandFrames.map((frame: any) => numOrZero(frame?.bands?.lowmid_120_250));
  const b480 = bandFrames.map((frame: any) => numOrZero(frame?.bands?.mid_250_500));
  const b960 = bandFrames.map((frame: any) => numOrZero(frame?.bands?.uppermid_500_2000));
  const b1920 = bandFrames.map((frame: any) => numOrZero(frame?.bands?.presence_2000_4000));
  const b3840 = bandFrames.map((frame: any) => numOrZero(frame?.bands?.brilliance_4000_8000));
  const b7680 = bandFrames.map((frame: any) => numOrZero(frame?.bands?.air_8000_20000));

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

  const spectralFrames = bandFrames.map((frame: any) => ({
    t_sec: numOrZero(frame?.tSec),
    bins: [
      numOrZero(frame?.bands?.sub_20_60),
      numOrZero(frame?.bands?.bass_60_120),
      numOrZero(frame?.bands?.lowmid_120_250),
      numOrZero(frame?.bands?.mid_250_500),
      numOrZero(frame?.bands?.uppermid_500_2000),
      numOrZero(frame?.bands?.presence_2000_4000),
      numOrZero(frame?.bands?.brilliance_4000_8000),
      numOrZero(frame?.bands?.air_8000_20000),
    ],
  }));

  const stereoFrames = Array.isArray(raw.timeSeries?.stereoFrames) ? raw.timeSeries?.stereoFrames : [];
  const stereoTimeline = stereoFrames.map((frame: any) => numOrZero(frame?.tSec));

  const phaseCorrelation = stereoFrames.map((frame: any) => numOrZero(frame?.correlation));
  const stereoEnergyLeft = stereoFrames.map((frame: any) => {
    const mid = numOrZero(frame?.midRmsDbfs);
    const balance = numOrZero(frame?.lrBalanceDb);
    return mid + balance / 2;
  });
  const stereoEnergyRight = stereoFrames.map((frame: any) => {
    const mid = numOrZero(frame?.midRmsDbfs);
    const balance = numOrZero(frame?.lrBalanceDb);
    return mid - balance / 2;
  });

  const loudnessFrames = Array.isArray(raw.timeSeries?.loudnessFrames) ? raw.timeSeries?.loudnessFrames : [];
  const truePeakFrames = Array.isArray(raw.timeSeries?.truePeakFrames) ? raw.timeSeries?.truePeakFrames : [];

  const dynamicTimeline = loudnessFrames.map((frame: any) => numOrZero(frame?.tSec));
  const rmsTimeline = loudnessFrames.map((frame: any) => numOrZero(frame?.rmsDbfs));
  const lufsMomentaryTimeline = loudnessFrames.map((frame: any) => numOrZero(frame?.lufsMomentary));
  const lufsShortTermTimeline = loudnessFrames.map((frame: any) => numOrZero(frame?.lufsShortTerm));

  const peakTimeline = truePeakFrames.map((frame: any) => numOrZero(frame?.truePeakDbtp));

  const transientTimes = Array.isArray(raw.timeSeries?.onsetTimesSec) ? raw.timeSeries?.onsetTimesSec : [];
  const onsetMeanStrength = numOrZero(raw.global?.transients?.onsetStrengthMean);
  const transientStrength = transientTimes.map(() => onsetMeanStrength);

  return {
    ...makeEnvelope(),
    plan,
    style,
    analysis_metadata: {
      engine_version: "1.0",
      analysis_window_seconds: typeof raw.meta?.durationSec === "number" ? raw.meta.durationSec : null,
      analysis_duration_sec: typeof (raw as any).analysisDurationMs === "number" ? (raw as any).analysisDurationMs / 1000 : null,
      fft_size: typeof raw.meta?.frameSize === "number" ? raw.meta.frameSize : null,
      sample_rate_hz: typeof raw.meta?.sampleRate === "number" ? raw.meta.sampleRate : null,
      frame_hop_samples: typeof raw.meta?.hopSize === "number" ? raw.meta.hopSize : null,
    },
    spectral_data: {
      fft_bins: [60, 120, 240, 480, 960, 1920, 3840, 7680],
      spectral_histogram: spectralHistogram,
      spectral_frames: spectralFrames,
      spectral_rolloff: typeof raw.global?.spectral?.rolloffHzMean === "number" ? raw.global.spectral.rolloffHzMean : null,
      spectral_flatness: typeof raw.global?.spectral?.flatnessMean === "number" ? raw.global.spectral.flatnessMean : null,
      spectral_flux: typeof raw.global?.spectral?.spectralFluxMean === "number" ? raw.global.spectral.spectralFluxMean : null,
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
