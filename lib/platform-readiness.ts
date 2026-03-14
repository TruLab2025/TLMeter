// Platform targets and evaluation logic for Platform Readiness

export type PlatformKey = 'spotify' | 'youtube' | 'apple_music' | 'podcast' | 'broadcast';
export type PlatformAccessPlan = 'free' | 'lite' | 'pro' | 'premium';

export interface PlatformTarget {
  name: string;
  lufs: number | [number, number]; // number or [min, max] for broadcast
  truePeak: number;
  lra: [number, number];
}

export const PLATFORM_TARGETS: Record<PlatformKey, PlatformTarget> = {
  spotify: {
    name: 'Spotify',
    lufs: -14,
    truePeak: -1,
    lra: [4, 10],
  },
  youtube: {
    name: 'YouTube',
    lufs: -14,
    truePeak: -1,
    lra: [4, 12],
  },
  apple_music: {
    name: 'Apple Music',
    lufs: -16,
    truePeak: -1,
    lra: [5, 12],
  },
  podcast: {
    name: 'Podcast',
    lufs: -16,
    truePeak: -1,
    lra: [3, 6],
  },
  broadcast: {
    name: 'Broadcast (EBU R128)',
    lufs: [-24, -22], // -23 ±1
    truePeak: -1,
    lra: [5, 20],
  },
};

export const REQUIRED_PLAN_BY_PLATFORM: Record<PlatformKey, PlatformAccessPlan> = {
  spotify: 'free',
  apple_music: 'free',
  youtube: 'lite',
  podcast: 'pro',
  broadcast: 'premium',
};

export type MetricStatus = 'ok' | 'close' | 'problem' | 'too_loud' | 'too_high' | 'too_low' | 'too_quiet';

export interface PlatformReadinessMetric {
  value: number;
  target: number | [number, number];
  diff?: number;
  status: MetricStatus;
  range?: [number, number];
}

export interface PlatformReadinessResult {
  platform: PlatformKey;
  metrics: {
    lufs_integrated: PlatformReadinessMetric;
    true_peak: PlatformReadinessMetric;
    lra?: PlatformReadinessMetric;
  };
  score?: number;
}

// Evaluation logic
export function evaluatePlatformReadiness(
  platform: PlatformKey,
  measured: { lufs: number; truePeak: number; lra?: number }
): PlatformReadinessResult {
  const t = PLATFORM_TARGETS[platform];
  // LUFS
  const lufsTarget = t.lufs;
  const lufsDiff = Array.isArray(lufsTarget)
    ? (measured.lufs < lufsTarget[0] ? measured.lufs - lufsTarget[0] : measured.lufs - lufsTarget[1])
    : measured.lufs - lufsTarget;
  let lufsStatus: MetricStatus = 'ok';
  if (Array.isArray(lufsTarget)) {
    if (measured.lufs < lufsTarget[0] - 1 || measured.lufs > lufsTarget[1] + 1) lufsStatus = 'problem';
    else if (measured.lufs < lufsTarget[0] || measured.lufs > lufsTarget[1]) lufsStatus = 'close';
  } else {
    if (measured.lufs > lufsTarget + 1) lufsStatus = 'too_loud';
    else if (measured.lufs < lufsTarget - 1) lufsStatus = 'too_quiet';
    else if (Math.abs(measured.lufs - lufsTarget) > 0.5) lufsStatus = 'close';
  }
  // True Peak
  let tpStatus: MetricStatus = 'ok';
  if (measured.truePeak > t.truePeak + 0.3) tpStatus = 'too_high';
  else if (measured.truePeak > t.truePeak) tpStatus = 'close';
  // LRA
  let lraStatus: MetricStatus = 'ok';
  let lraMetric: PlatformReadinessMetric | undefined = undefined;
  if (measured.lra !== undefined) {
    if (measured.lra < t.lra[0]) lraStatus = 'too_low';
    else if (measured.lra > t.lra[1]) lraStatus = 'too_high';
    else if (
      measured.lra < t.lra[0] + 0.5 ||
      measured.lra > t.lra[1] - 0.5
    )
      lraStatus = 'close';
    lraMetric = {
      value: measured.lra,
      target: t.lra,
      status: lraStatus,
      range: t.lra,
    };
  }
  // Score (simple version)
  let score = 100;
  score -= Math.min(Math.abs(lufsDiff) * 10, 30);
  if (tpStatus === 'too_high') score -= 20;
  if (lraStatus === 'too_low' || lraStatus === 'too_high') score -= 10;
  if (score < 0) score = 0;
  // Result
  return {
    platform,
    metrics: {
      lufs_integrated: {
        value: measured.lufs,
        target: t.lufs,
        diff: lufsDiff,
        status: lufsStatus,
      },
      true_peak: {
        value: measured.truePeak,
        target: t.truePeak,
        status: tpStatus,
      },
      ...(lraMetric ? { lra: lraMetric } : {}),
    },
    score,
  };
}
