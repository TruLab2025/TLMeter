/**
 * Genre Profile Style Matching System
 * Redesigned with richer spectral + transient features for credible results
 */

export interface StyleMatchResult {
  selected_genre: string;
  selected_score: number;
  best_match: {
    genre: string;
    score: number;
  };
  all_scores: Record<string, number>;
  explanations: string[];
}

export interface StyleMatchFeatures {
  spectralHistogram: number[];
  spectralCentroid?: number | null;
  spectralTilt?: number | null;
  transientDensity?: number | null;
}

interface GenreReferenceProfile {
  slug: string;
  spectral: number[];
  centroid: number;
  tilt: number;
  transientDensity: number;
}

const BAND_FREQS = [60, 120, 240, 480, 960, 1920, 3840, 7680];
const DEFAULT_HISTOGRAM = new Array(8).fill(1 / 8);
const DEFAULT_TRANSIENT_DENSITY = 2.2; // transients per second
const TILT_NORMALIZER = 0.6; // approx max delta between bass & treble energy
const CENTROID_NORMALIZER = 3200; // Hz
const TRANSIENT_NORMALIZER = 3.5; // transients/s delta range

const GENRE_DISPLAY_NAMES: Record<string, string> = {
  rock: "Rock",
  grunge: "Grunge",
  metal: "Metal",
  pop: "Pop",
  hiphop: "Hip-Hop",
  edm: "EDM",
  house: "House",
  techno: "Techno",
  trap: "Trap",
  indie: "Indie",
  folk: "Folk",
  classic: "Classic",
  jazz: "Jazz",
  rnb: "R&B",
  ambient: "Ambient",
};

const BASE_GENRE_PROFILES: Record<string, { spectral: number[]; centroid: number; transientDensity: number; tilt?: number }> = {
  pop: { spectral: [0.2, 0.18, 0.16, 0.13, 0.11, 0.09, 0.07, 0.06], centroid: 2200, transientDensity: 2.8 },
  rock: { spectral: [0.22, 0.2, 0.17, 0.14, 0.11, 0.08, 0.05, 0.03], centroid: 1700, transientDensity: 3.4 },
  grunge: { spectral: [0.24, 0.2, 0.18, 0.15, 0.1, 0.07, 0.04, 0.02], centroid: 1500, transientDensity: 3.3 },
  metal: { spectral: [0.25, 0.22, 0.18, 0.14, 0.09, 0.07, 0.03, 0.02], centroid: 1600, transientDensity: 3.6 },
  hiphop: { spectral: [0.3, 0.22, 0.16, 0.1, 0.08, 0.06, 0.05, 0.03], centroid: 1100, transientDensity: 2.5 },
  edm: { spectral: [0.28, 0.2, 0.15, 0.12, 0.1, 0.08, 0.05, 0.02], centroid: 2400, transientDensity: 2.1 },
  house: { spectral: [0.3, 0.22, 0.15, 0.11, 0.09, 0.07, 0.04, 0.02], centroid: 2300, transientDensity: 1.8 },
  techno: { spectral: [0.28, 0.2, 0.16, 0.12, 0.1, 0.08, 0.04, 0.02], centroid: 2500, transientDensity: 2.2 },
  trap: { spectral: [0.32, 0.24, 0.14, 0.1, 0.08, 0.06, 0.04, 0.02], centroid: 1300, transientDensity: 2.4 },
  indie: { spectral: [0.21, 0.19, 0.2, 0.15, 0.11, 0.08, 0.04, 0.02], centroid: 2000, transientDensity: 2.7 },
  folk: { spectral: [0.2, 0.18, 0.22, 0.16, 0.12, 0.07, 0.03, 0.02], centroid: 1800, transientDensity: 2.3 },
  classic: { spectral: [0.18, 0.17, 0.21, 0.17, 0.13, 0.08, 0.04, 0.02], centroid: 1500, transientDensity: 1.6 },
  jazz: { spectral: [0.19, 0.18, 0.2, 0.16, 0.13, 0.08, 0.04, 0.02], centroid: 2100, transientDensity: 2.6 },
  rnb: { spectral: [0.24, 0.21, 0.18, 0.14, 0.09, 0.07, 0.04, 0.03], centroid: 1700, transientDensity: 2.3 },
  ambient: { spectral: [0.16, 0.15, 0.16, 0.16, 0.15, 0.1, 0.07, 0.05], centroid: 2500, transientDensity: 1.2 },
};

const GENRE_REFERENCE_PROFILES: Record<string, GenreReferenceProfile> = Object.entries(BASE_GENRE_PROFILES).reduce(
  (acc, [slug, cfg]) => {
    const spectral = normalizeHistogram(cfg.spectral);
    acc[slug] = {
      slug,
      spectral,
      centroid: cfg.centroid ?? computeSpectralCentroidFromHistogram(spectral),
      tilt: cfg.tilt ?? computeSpectralTiltFromHistogram(spectral),
      transientDensity: cfg.transientDensity,
    };
    return acc;
  },
  {} as Record<string, GenreReferenceProfile>
);

function normalizeHistogram(histogram: number[]): number[] {
  if (!Array.isArray(histogram) || histogram.length === 0) {
    return DEFAULT_HISTOGRAM.slice();
  }
  const trimmed = histogram.slice(0, 8).map((value) => (Number.isFinite(value) && value > 0 ? value : 0));
  while (trimmed.length < 8) trimmed.push(0);
  const total = trimmed.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return DEFAULT_HISTOGRAM.slice();
  return trimmed.map((value) => value / total);
}

function computeSpectralTiltFromHistogram(histogram: number[]): number {
  const hist = normalizeHistogram(histogram);
  const low = hist[0] + hist[1] + hist[2];
  const high = hist[5] + hist[6] + hist[7];
  return low - high; // positive => darker, negative => brighter
}

function computeSpectralCentroidFromHistogram(histogram: number[]): number {
  const hist = normalizeHistogram(histogram);
  const numerator = hist.reduce((sum, value, index) => sum + value * BAND_FREQS[index], 0);
  const denominator = hist.reduce((sum, value) => sum + value, 0) || 1;
  return numerator / denominator;
}

function meanAbsoluteDiff(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length);
  if (length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < length; i++) {
    sum += Math.abs(a[i] - b[i]);
  }
  return sum / length;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function calibrateScores(rawScores: Record<string, number>): Record<string, number> {
  const entries = Object.entries(rawScores);
  if (!entries.length) return {};

  const sorted = entries.slice().sort((a, b) => b[1] - a[1]);
  const bestRaw = sorted[0][1];
  const worstRaw = sorted[sorted.length - 1][1];
  const spread = Math.max(0.001, bestRaw - worstRaw);

  const rankByGenre = new Map<string, number>();
  sorted.forEach(([genre], idx) => rankByGenre.set(genre, idx));

  const all_scores: Record<string, number> = {};
  for (const [genre, raw] of entries) {
    const normalized = clamp((raw - worstRaw) / spread, 0, 1);
    const sharpened = Math.pow(normalized, 1.8);
    const rank = rankByGenre.get(genre) ?? 0;
    const rankPenalty = rank * 2;
    all_scores[genre] = clamp(Math.round(8 + sharpened * 87 - rankPenalty), 5, 95);
  }

  return all_scores;
}

interface MixFeatureSummary {
  histogram: number[];
  tilt: number;
  centroid: number;
  transientDensity: number | null;
}

function generatePositiveExplanations(features: MixFeatureSummary, genre: string): string[] {
  const low = features.histogram[0] + features.histogram[1];
  const mid = features.histogram[2] + features.histogram[3] + features.histogram[4];
  const high = features.histogram[5] + features.histogram[6] + features.histogram[7];
  const bullets: string[] = [];

  if (low >= 0.32) bullets.push("mocna energia basu (60–120 Hz)");
  else if (low <= 0.2) bullets.push("lekki dół – miks skupiony na średnicy");

  if (mid >= 0.36) bullets.push("wyraźny środek pasma");
  else if (mid <= 0.26) bullets.push("umiarkowany środek – dużo miejsca na wokal");

  if (high >= 0.18) bullets.push("jasna góra powyżej 6 kHz");
  else if (high <= 0.1) bullets.push("ciemniejsza góra – wygładzone wysokie częstotliwości");

  if (typeof features.transientDensity === "number") {
    if (features.transientDensity >= 3.5) bullets.push("duża gęstość transjentów (charakter perkusyjny)");
    else if (features.transientDensity <= 1.5) bullets.push("gładkie transjenty – bardziej elektroniczne");
  }

  if (features.tilt >= 0.12) bullets.push("ciepły, basowy balans tonalny");
  else if (features.tilt <= -0.08) bullets.push("jasny balans tonalny");

  if (features.centroid >= 2400) bullets.push("wysoki środek ciężkości widma");
  else if (features.centroid <= 1400) bullets.push("nisko położony środek ciężkości widma");

  const unique = Array.from(new Set(bullets)).filter(Boolean);
  if (!unique.length) {
    unique.push(`profil tonalny pasuje do ${GENRE_DISPLAY_NAMES[genre] ?? genre}`);
  } else if (unique.length === 1) {
    unique.push(`balans częstotliwości wspiera styl ${GENRE_DISPLAY_NAMES[genre] ?? genre}`);
  }
  return unique.slice(0, 3);
}

function generateMismatchExplanations(features: MixFeatureSummary, genre: string, bestGenre: string): string[] {
  const selectedProfile = GENRE_REFERENCE_PROFILES[genre];
  if (!selectedProfile) {
    return [
      `profil tonalny odbiega od wzorca ${GENRE_DISPLAY_NAMES[genre] ?? genre}`,
      `większe podobieństwo do ${GENRE_DISPLAY_NAMES[bestGenre] ?? bestGenre}`,
    ];
  }

  const bullets: string[] = [];

  const selectedLow = selectedProfile.spectral[0] + selectedProfile.spectral[1];
  const selectedMid = selectedProfile.spectral[2] + selectedProfile.spectral[3] + selectedProfile.spectral[4];
  const selectedHigh = selectedProfile.spectral[5] + selectedProfile.spectral[6] + selectedProfile.spectral[7];

  const low = features.histogram[0] + features.histogram[1];
  const mid = features.histogram[2] + features.histogram[3] + features.histogram[4];
  const high = features.histogram[5] + features.histogram[6] + features.histogram[7];

  if (Math.abs(low - selectedLow) >= 0.06) {
    bullets.push(low > selectedLow
      ? "za dużo energii w dole względem wybranego stylu"
      : "za mało energii w dole względem wybranego stylu");
  }

  if (Math.abs(mid - selectedMid) >= 0.06) {
    bullets.push(mid > selectedMid
      ? "środek pasma jest zbyt eksponowany dla tego stylu"
      : "środek pasma jest zbyt cofnięty dla tego stylu");
  }

  if (Math.abs(high - selectedHigh) >= 0.05) {
    bullets.push(high > selectedHigh
      ? "góra pasma jest zbyt jasna dla wybranego stylu"
      : "góra pasma jest zbyt ciemna dla wybranego stylu");
  }

  if (Math.abs(features.centroid - selectedProfile.centroid) >= 350) {
    bullets.push(features.centroid > selectedProfile.centroid
      ? "środek ciężkości widma jest zbyt wysoko"
      : "środek ciężkości widma jest zbyt nisko");
  }

  if (typeof features.transientDensity === "number" && Math.abs(features.transientDensity - selectedProfile.transientDensity) >= 0.8) {
    bullets.push(features.transientDensity > selectedProfile.transientDensity
      ? "transjenty są gęstsze niż typowo dla tego stylu"
      : "transjenty są rzadsze niż typowo dla tego stylu");
  }

  if (Math.abs(features.tilt - selectedProfile.tilt) >= 0.1) {
    bullets.push(features.tilt > selectedProfile.tilt
      ? "balans tonalny jest zbyt ciemny względem wzorca"
      : "balans tonalny jest zbyt jasny względem wzorca");
  }

  if (bestGenre !== genre) {
    bullets.push(`profil częstotliwości jest bliżej stylu ${GENRE_DISPLAY_NAMES[bestGenre] ?? bestGenre}`);
  }

  const unique = Array.from(new Set(bullets)).filter(Boolean);
  if (!unique.length) {
    unique.push(`brzmienie odbiega od typowego profilu ${GENRE_DISPLAY_NAMES[genre] ?? genre}`);
    if (bestGenre !== genre) unique.push(`bliższy charakter ma styl ${GENRE_DISPLAY_NAMES[bestGenre] ?? bestGenre}`);
  }

  return unique.slice(0, 3);
}

export function calculateStyleMatch(
  features: StyleMatchFeatures,
  selectedGenre: string
): StyleMatchResult {
  const histogram = normalizeHistogram(features.spectralHistogram);
  const tilt = typeof features.spectralTilt === "number" ? features.spectralTilt : computeSpectralTiltFromHistogram(histogram);
  const centroid = typeof features.spectralCentroid === "number" && Number.isFinite(features.spectralCentroid)
    ? features.spectralCentroid
    : computeSpectralCentroidFromHistogram(histogram);
  const measuredTransientDensity = typeof features.transientDensity === "number" && features.transientDensity > 0
    ? features.transientDensity
    : null;
  const transientDensityForScoring = measuredTransientDensity ?? DEFAULT_TRANSIENT_DENSITY;

  const rawScores: Record<string, number> = {};

  for (const [genre, profile] of Object.entries(GENRE_REFERENCE_PROFILES)) {
    const spectralDistance = meanAbsoluteDiff(histogram, profile.spectral);
    const tiltDistance = Math.min(1, Math.abs(tilt - profile.tilt) / TILT_NORMALIZER);
    const centroidDistance = Math.min(1, Math.abs(centroid - profile.centroid) / CENTROID_NORMALIZER);
    const transientDistance = Math.min(1, Math.abs(transientDensityForScoring - profile.transientDensity) / TRANSIENT_NORMALIZER);
    const totalDistance = (spectralDistance * 0.5) + (tiltDistance * 0.2) + (centroidDistance * 0.15) + (transientDistance * 0.15);
    rawScores[genre] = clamp(1 - totalDistance, 0, 1);
  }

  const all_scores = calibrateScores(rawScores);

  const bestEntry = Object.entries(all_scores).sort((a, b) => b[1] - a[1])[0];
  const best_match = bestEntry ? { genre: bestEntry[0], score: bestEntry[1] } : { genre: selectedGenre, score: all_scores[selectedGenre] ?? 0 };
  const selected_score = all_scores[selectedGenre] ?? (bestEntry ? bestEntry[1] : 0);
  const explanations = selected_score < 50
    ? generateMismatchExplanations(
        { histogram, tilt, centroid, transientDensity: measuredTransientDensity },
        selectedGenre,
        best_match.genre
      )
    : generatePositiveExplanations({ histogram, tilt, centroid, transientDensity: measuredTransientDensity }, selectedGenre);

  return {
    selected_genre: selectedGenre,
    selected_score,
    best_match,
    all_scores,
    explanations,
  };
}
