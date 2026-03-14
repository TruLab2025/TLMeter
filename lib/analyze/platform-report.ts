import type { Plan } from "@/lib/license";
import {
  evaluatePlatformReadiness,
  PLATFORM_TARGETS,
  type MetricStatus,
  type PlatformKey,
} from "@/lib/platform-readiness";
import type { AnalysisReportInput, SectionResult } from "@/lib/analyze/report-sections";
import type { Tip } from "@/lib/tips";

function formatTarget(target: number | [number, number], unit: string) {
  if (Array.isArray(target)) {
    return `${target[0]} do ${target[1]} ${unit}`;
  }
  return `${target} ${unit}`;
}

function formatStatus(status: MetricStatus) {
  switch (status) {
    case "ok":
      return "ok";
    case "close":
      return "warn";
    default:
      return "bad";
  }
}

function statusText(status: MetricStatus, platformName: string, metricLabel: string) {
  const phrases: Record<MetricStatus, string> = {
    ok: `${metricLabel} jest gotowy pod ${platformName}.`,
    close: `${metricLabel} jest blisko targetu, ale warto dopracować finalny bounce.`,
    problem: `${metricLabel} wyraźnie odbiega od targetu platformy.`,
    too_loud: `Materiał jest zbyt głośny, więc ${platformName} prawdopodobnie go ściszy.`,
    too_high: `${metricLabel} jest za wysoki i może powodować problemy po transkodowaniu.`,
    too_low: `${metricLabel} jest za niski względem oczekiwanego zakresu.`,
    too_quiet: `Materiał jest zbyt cichy względem targetu ${platformName}.`,
  };

  return phrases[status];
}

function recommendationForMetric(status: MetricStatus, label: string) {
  const recommendations: Record<string, Partial<Record<MetricStatus, string>>> = {
    Loudness: {
      too_loud: "Obniż finalny limiter o 1-2 dB, żeby platforma nie ścinała miksu automatycznie.",
      too_quiet: "Podnieś poziom końcowy delikatnie limiterem lub clipperem, zachowując zapas na True Peak.",
      close: "Jesteś blisko celu. Warto sprawdzić ostatni etap limitera na referencji platformowej.",
      ok: "Głośność jest trafiona pod publikację.",
      problem: "Przeanalizuj gain staging i ustaw finalny limiter pod target platformy.",
    },
    "True Peak": {
      too_high: "Zostaw więcej headroomu na wyjściu limitera, najlepiej do okolic -1 dBTP.",
      close: "Zredukuj output limitera o kilka dziesiątych dB dla bezpieczniejszego eksportu.",
      ok: "Headroom jest bezpieczny pod kodowanie stratne.",
    },
    "Dynamics (LRA)": {
      too_low: "Miks jest zbyt płaski. Poluzuj kompresję lub limiter, żeby odzyskać oddech.",
      too_high: "Zakres dynamiki jest szeroki. Upewnij się, że ciche fragmenty nie znikają na tej platformie.",
      close: "Dynamika jest na granicy targetu, sprawdź odsłuch na docelowym urządzeniu.",
      ok: "Dynamika dobrze mieści się w oczekiwaniach platformy.",
    },
  };

  return recommendations[label]?.[status] ?? "Dopracuj ten obszar przed publikacją, żeby miks lepiej tłumaczył się na docelowej platformie.";
}

export function buildPlatformReportSections(
  raw: AnalysisReportInput,
  platform: PlatformKey,
  plan: Plan
): SectionResult[] {
  const readiness = evaluatePlatformReadiness(platform, {
    lufs: raw.global.integratedLufs ?? -99,
    truePeak: raw.global.truePeakDbtp ?? 0,
    lra: raw.global.lra ?? undefined,
  });

  const platformName = PLATFORM_TARGETS[platform].name;
  const sections: SectionResult[] = [
    {
      label: "Loudness",
      value: raw.global.integratedLufs !== null ? `${raw.global.integratedLufs.toFixed(1)} LUFS` : "—",
      score: Math.max(0, 100 - Math.min(Math.abs(readiness.metrics.lufs_integrated.diff ?? 0) * 18, 100)),
      status: formatStatus(readiness.metrics.lufs_integrated.status),
      detail: `Target: ${formatTarget(readiness.metrics.lufs_integrated.target, "LUFS")}`,
      locked: false,
      desc: `Ocena głośności względem targetu ${platformName}.`,
      recommendation: recommendationForMetric(readiness.metrics.lufs_integrated.status, "Loudness"),
    },
    {
      label: "True Peak",
      value: raw.global.truePeakDbtp !== null ? `${raw.global.truePeakDbtp.toFixed(1)} dBTP` : "—",
      score: readiness.metrics.true_peak.status === "ok" ? 100 : readiness.metrics.true_peak.status === "close" ? 76 : 42,
      status: formatStatus(readiness.metrics.true_peak.status),
      detail: `Limit platformy: ${formatTarget(readiness.metrics.true_peak.target, "dBTP")}`,
      locked: false,
      desc: `Bezpieczeństwo szczytów po enkodowaniu na ${platformName}.`,
      recommendation: recommendationForMetric(readiness.metrics.true_peak.status, "True Peak"),
    },
    {
      label: "Dynamics (LRA)",
      value: raw.global.lra !== null ? `${raw.global.lra.toFixed(1)} LU` : "—",
      score:
        !readiness.metrics.lra
          ? 0
          : readiness.metrics.lra.status === "ok"
            ? 100
            : readiness.metrics.lra.status === "close"
              ? 78
              : 48,
      status: !readiness.metrics.lra ? "warn" : formatStatus(readiness.metrics.lra.status),
      detail: `Zakres docelowy: ${formatTarget(PLATFORM_TARGETS[platform].lra, "LU")}`,
      locked: plan === "free" && platform !== "spotify" && platform !== "apple_music",
      desc: `Zakres dynamiki oczekiwany przez ${platformName}.`,
      recommendation: !readiness.metrics.lra
        ? "Brak danych o dynamice do pełnej oceny platformy."
        : recommendationForMetric(readiness.metrics.lra.status, "Dynamics (LRA)"),
    },
  ];

  return sections;
}

export function buildPlatformTips(raw: AnalysisReportInput, platform: PlatformKey): Tip[] {
  const readiness = evaluatePlatformReadiness(platform, {
    lufs: raw.global.integratedLufs ?? -99,
    truePeak: raw.global.truePeakDbtp ?? 0,
    lra: raw.global.lra ?? undefined,
  });
  const platformName = PLATFORM_TARGETS[platform].name;

  const tips: Tip[] = [
    {
      problem_id: `${platform}-summary`,
      section: "platform",
      title: `Publikacja pod ${platformName}`,
      description: `TL Meter sprawdził ten sam miks względem targetu ${platformName} i ocenił najważniejsze ryzyka publikacyjne.`,
      freq_range: null,
      action: "Sprawdź trzy kluczowe metryki poniżej i dopracuj eksport przed wrzutką.",
      eq_hint: null,
      comp_hint: null,
      general: "Tryb platformy interpretuje gotowe metryki pod wymagania serwisów i broadcastu.",
      plan_required: "free",
    },
  ];

  if (readiness.metrics.lufs_integrated.status !== "ok") {
    tips.push({
      problem_id: `${platform}-lufs`,
      section: "platform",
      title: `Loudness wymaga korekty pod ${platformName}`,
      description: statusText(readiness.metrics.lufs_integrated.status, platformName, "Głośność"),
      freq_range: null,
      action: recommendationForMetric(readiness.metrics.lufs_integrated.status, "Loudness"),
      eq_hint: null,
      comp_hint: "Sprawdź finalny limiter i output ceiling na master busie.",
      general: "Platformy często normalizują głośność do swoich targetów.",
      plan_required: "free",
    });
  }

  if (readiness.metrics.true_peak.status !== "ok") {
    tips.push({
      problem_id: `${platform}-true-peak`,
      section: "platform",
      title: `True Peak może sprawiać problemy po eksporcie`,
      description: statusText(readiness.metrics.true_peak.status, platformName, "True Peak"),
      freq_range: null,
      action: recommendationForMetric(readiness.metrics.true_peak.status, "True Peak"),
      eq_hint: null,
      comp_hint: "Obniż ceiling limitera i sprawdź oversampling w limiterze, jeśli jest dostępny.",
      general: "Kodowanie stratne potrafi podnieść rzeczywiste szczyty sygnału.",
      plan_required: "free",
    });
  }

  if (readiness.metrics.lra && readiness.metrics.lra.status !== "ok") {
    tips.push({
      problem_id: `${platform}-lra`,
      section: "platform",
      title: `Dynamika nie jest jeszcze optymalna`,
      description: statusText(readiness.metrics.lra.status, platformName, "Dynamika"),
      freq_range: null,
      action: recommendationForMetric(readiness.metrics.lra.status, "Dynamics (LRA)"),
      eq_hint: null,
      comp_hint: "Skoryguj bus compression lub limiter zależnie od tego, czy miks jest zbyt płaski czy zbyt skokowy.",
      general: "Różne platformy preferują różny poziom dynamiki programu.",
      plan_required: "free",
    });
  }

  return tips;
}
