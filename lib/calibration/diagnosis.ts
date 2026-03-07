/**
 * System diagnozy miksu
 * Porównuje metryki użytkownika z profilem stylu
 */

import {
  AnalysisMetrics,
  StyleProfile,
  MetricDiagnosis,
  MixDiagnosis,
} from "./types";
import { assessMetricValue } from "./percentiles";

/**
 * Metadane o metryce dla diagnozy
 */
interface MetricMetadata {
  display_name: string;
  category: "loudness" | "spectrum" | "stereo" | "dynamics" | "psychoacoustic";
  unit: string;
  description: string;
  ideal_range_description: string;
  weight: number; // 0-1 (wpływ na overall score)
}

/**
 * Mapa informacji o wszystkich metrykach
 */
const METRIC_METADATA: Record<string, MetricMetadata> = {
  lufs: {
    display_name: "Integrated LUFS",
    category: "loudness",
    unit: "LUFS",
    description: "Zintegrowana głośność zgodna z EBU R128",
    ideal_range_description: "Zależy od stylu, typowo -12 do -6 LUFS",
    weight: 1.0,
  },
  true_peak: {
    display_name: "True Peak",
    category: "loudness",
    unit: "dBTP",
    description: "Najwyższy szczyt sygnału",
    ideal_range_description: "Poniżej -0.3 dBTP (bezpieczny dla konwersji)",
    weight: 0.9,
  },
  momentary_loudness: {
    display_name: "Momentary Loudness",
    category: "loudness",
    unit: "LUFS",
    description: "Głośność chwilowa (400ms)",
    ideal_range_description: "Zwykle 3-4 dB wyżej niż integrated",
    weight: 0.6,
  },
  low_ratio: {
    display_name: "Low End Energy",
    category: "spectrum",
    unit: "ratio",
    description: "Energia w 60-250 Hz vs całkowita",
    ideal_range_description: "Zależy od stylu (rock: 0.20-0.28)",
    weight: 1.0,
  },
  low_mid_ratio: {
    display_name: "Low-Mid Energy",
    category: "spectrum",
    unit: "ratio",
    description: "Energia w 250-500 Hz",
    ideal_range_description: "Zwykle 0.15-0.22",
    weight: 0.8,
  },
  mid_ratio: {
    display_name: "Midrange",
    category: "spectrum",
    unit: "ratio",
    description: "Energia w 500-2000 Hz",
    ideal_range_description: "Zwykle 0.30-0.40",
    weight: 1.0,
  },
  mid_high_ratio: {
    display_name: "Mid-High Energy",
    category: "spectrum",
    unit: "ratio",
    description: "Energia w 2000-5000 Hz (presence)",
    ideal_range_description: "Zwykle 0.15-0.25",
    weight: 0.9,
  },
  high_ratio: {
    display_name: "High End",
    category: "spectrum",
    unit: "ratio",
    description: "Energia w 5000-20000 Hz",
    ideal_range_description: "Zależy od stylu (0.08-0.15)",
    weight: 0.7,
  },
  stereo_correlation: {
    display_name: "Stereo Correlation",
    category: "stereo",
    unit: "ratio",
    description: "Podobieństwo kanałów L/R",
    ideal_range_description: "0.3-0.8 (0=różne, 1=identyczne)",
    weight: 0.7,
  },
  stereo_width: {
    display_name: "Stereo Width",
    category: "stereo",
    unit: "ratio",
    description: "Szerokość pola stereo",
    ideal_range_description: "0.7-0.95 dla produkcji",
    weight: 0.8,
  },
  spectral_centroid: {
    display_name: "Spectral Centroid",
    category: "spectrum",
    unit: "Hz",
    description: "Gdzie siedzi ciężar spektralny",
    ideal_range_description: "Zwykle 1500-3000 Hz",
    weight: 0.7,
  },
  harshness_index: {
    display_name: "Harshness Index",
    category: "psychoacoustic",
    unit: "0-100",
    description: "Intensywność kłujących wysokości (2-8 kHz)",
    ideal_range_description: "Poniżej 40 dla komfortu",
    weight: 1.0,
  },
  brightness_index: {
    display_name: "Brightness Index",
    category: "psychoacoustic",
    unit: "0-100",
    description: "Jasność wysokich tonów (8-20 kHz)",
    ideal_range_description: "Zależy od stylu (20-50)",
    weight: 0.7,
  },
  warmth_index: {
    display_name: "Warmth Index",
    category: "psychoacoustic",
    unit: "0-100",
    description: "Ciepło dołu (60-250 Hz)",
    ideal_range_description: "Zależy od stylu (30-60)",
    weight: 0.8,
  },
};

/**
 * Diagnozy dla konkretnych problemów
 */
interface ProblemAggregation {
  problem: string;
  severity: "low" | "medium" | "high";
  description: string;
  metrics: string[];
  how_to_fix: string;
}

/**
 * Wygeneruj diagnozę dla jednej metryki
 */
function diagnoseSingleMetric(
  metricName: string,
  userValue: number,
  profile: StyleProfile
): MetricDiagnosis | null {
  const metadata = METRIC_METADATA[metricName];
  if (!metadata) {
    console.warn(`Unknown metric: ${metricName}`);
    return null;
  }

  const percentiles = profile.metrics[metricName as keyof typeof profile.metrics];
  if (!percentiles) {
    return null; // Brak danych dla tej metryki w profilu
  }

  const { status, confidence } = assessMetricValue(userValue, percentiles);

  // Generuj wiadomość
  let message = "";
  let recommendation = "";

  switch (status) {
    case "critical_low":
      message = `${metadata.display_name} jest **znacznie poniżej** normy dla ${profile.style}. Miks może brzmieć zbyt cienko.`;
      recommendation = `Zwiększ energię w tym paśmie lub sprawdź ustawienia masterningu.`;
      break;

    case "low":
      message = `${metadata.display_name} jest poniżej typowego zakresu. Rezultat może być mniej pełny.`;
      recommendation = `Rozważ wzmocnienie tego aspektu wobec referencji.`;
      break;

    case "critical_high":
      message = `${metadata.display_name} jest **znacznie powyżej** normy. Miks może brzmieć zniekształcony lub zmęczający.`;
      recommendation = `Zmniejsz lub wyrównaj to pasmo. Sprawdź czy nie ma saturacji.`;
      break;

    case "high":
      message = `${metadata.display_name} jest powyżej typowego zakresu. Może być przetakowany.`;
      recommendation = `Zmniejsz lekko i słuchaj odowienia.`;
      break;

    case "optimal":
      message = `${metadata.display_name} jest w świetnym zakresie dla ${profile.style}.`;
      recommendation = `Dobrze! Utrzymaj obecne ustawienia.`;
      break;
  }

  return {
    metric_name: metricName,
    user_value: userValue,
    p10: percentiles.p10,
    p50: percentiles.p50,
    p90: percentiles.p90,
    status,
    confidence,
    message,
    recommendation,
  };
}

/**
 * Agreguj diagnoz do problemów
 */
function aggregateProblems(diagnoses: MetricDiagnosis[]): Array<{
  severity: "low" | "medium" | "high";
  title: string;
  description: string;
  affected_metrics: string[];
}> {
  const issueMap = new Map<string, string[]>();

  diagnoses.forEach(d => {
    if (d.status === "optimal") return;

    const category = METRIC_METADATA[d.metric_name]?.category || "unknown";

    const key =
      d.status === "critical_low" || d.status === "low"
        ? `${category}_too_low`
        : `${category}_too_high`;

    if (!issueMap.has(key)) {
      issueMap.set(key, []);
    }
    issueMap.get(key)!.push(d.metric_name);
  });

  const issues: Array<{
    severity: "low" | "medium" | "high";
    title: string;
    description: string;
    affected_metrics: string[];
  }> = [];

  issueMap.forEach((metrics, key) => {
    const [category, direction] = key.split("_");
    const isLow = direction === "too_low";

    const categoryName = ({
      loudness: "Głośność",
      spectrum: "Spektrum",
      stereo: "Stereo",
      dynamics: "Dynamika",
      psychoacoustic: "Psychoakustyka",
    } as any)[category] || category;

    const severity = metrics.length > 2 ? "high" : "medium";

    const title = `${categoryName} ${isLow ? "poniżej normy" : "powyżej normy"}`;
    const description = isLow
      ? `${metrics.length} elementów w kategorii "${categoryName}" ma zbyt niskie wartości.`
      : `${metrics.length} elementów w kategorii "${categoryName}" ma zbyt wysokie wartości.`;

    issues.push({
      severity,
      title,
      description,
      affected_metrics: metrics,
    });
  });

  return issues;
}

/**
 * Główna funkcja diagnozy miksu
 */
export function diagnoseMix(
  metrics: AnalysisMetrics,
  profile: StyleProfile
): MixDiagnosis {
  const diagnoses: MetricDiagnosis[] = [];

  // Zdiagnozuj wszystkie metryki
  Object.entries(metrics).forEach(([key, value]) => {
    if (typeof value === "number") {
      const diagnosis = diagnoseSingleMetric(key, value, profile);
      if (diagnosis) {
        diagnoses.push(diagnosis);
      }
    }
  });

  // Oblicz overall score (średnia weighted confidence dla optimal metrics)
  const optimalDiagnoses = diagnoses.filter(d => d.status === "optimal");
  const overallScore =
    optimalDiagnoses.length > 0
      ? Math.round(
          (optimalDiagnoses.reduce((sum, d) => sum + d.confidence, 0) /
            optimalDiagnoses.length) *
            100
        )
      : 50;

  // Agreguj problemy
  const issues = aggregateProblems(diagnoses);

  // Wyciągnij strengths
  const strengths = diagnoses
    .filter(d => d.status === "optimal" && d.confidence > 0.85)
    .map(d => `${METRIC_METADATA[d.metric_name]?.display_name || d.metric_name} jest doskonały`);

  // DAW tips dla nieoptimalnych metryk
  const daw_tips = diagnoses
    .filter(d => d.status !== "optimal")
    .slice(0, 3) // Top 3 problemy
    .map(d => {
      const isLow = d.status === "critical_low" || d.status === "low";
      const metadata = METRIC_METADATA[d.metric_name];

      return {
        problem: metadata?.display_name || d.metric_name,
        tool: getTool(d.metric_name),
        frequency: getFrequency(d.metric_name),
        action: isLow ? "Zwiększ" : "Zmniejsz",
      };
    });

  return {
    style: profile.style,
    overall_score: overallScore,
    diagnoses,
    issues,
    strengths,
    daw_tips,
  };
}

/**
 * Przedpokreśl tool dla DAW tips
 */
function getTool(metricName: string): string {
  const toolMap: Record<string, string> = {
    low_ratio: "EQ",
    mid_ratio: "EQ",
    high_ratio: "EQ",
    harshness_index: "EQ",
    lufs: "Limiter/Compressor",
    true_peak: "Limiter",
    stereo_width: "Stereo Tool",
  };

  return toolMap[metricName] || "EQ";
}

/**
 * Przedpokreśl frequency range dla DAW tips
 */
function getFrequency(metricName: string): string {
  const freqMap: Record<string, string> = {
    low_ratio: "60-250 Hz",
    low_mid_ratio: "250-500 Hz",
    mid_ratio: "500-2k Hz",
    mid_high_ratio: "2k-5k Hz",
    high_ratio: "5k-20k Hz",
    harshness_index: "2k-8k Hz",
  };

  return freqMap[metricName] || "N/A";
}
