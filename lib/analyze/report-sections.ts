import type { Plan } from "@/lib/license";
import { getStatus, scoreInRange, type SectionStatus, type StyleProfile } from "@/lib/profiles";

export interface AnalysisReportInput {
  global: {
    integratedLufs: number | null;
    truePeakDbtp: number | null;
    lra: number | null;
    clipping?: {
      clippedSamples?: number;
      clipEvents?: number;
      clipThresholdAbs?: number;
    };
    energyDistribution: { low: number; mid: number; high: number };
    stereo?: { correlation?: number };
    spectral?: {
      flatnessMean?: number;
      hfcMean?: number;
    };
    transients?: { onsetStrengthMean?: number };
    rhythm?: { tempoBpm?: number; tempoStd?: number | null; tempoConfidence?: number };
  };
}

export interface SectionResult {
  label: string;
  value: string;
  score: number;
  status: SectionStatus;
  detail: string;
  locked: boolean;
  desc: string;
  recommendation?: string;
}

function formatLufs(v: number | null): string {
  if (v === null || !isFinite(v)) return "—";
  return `${v.toFixed(1)} LUFS`;
}

function formatDb(v: number | null): string {
  if (v === null || !isFinite(v)) return "—";
  return `${v.toFixed(1)} dBTP`;
}

function formatPct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

function formatNum(v: number | null | undefined, decimals = 2): string {
  if (v === null || v === undefined || !isFinite(v)) return "—";
  return v.toFixed(decimals);
}

function formatInt(v: number | null | undefined): string {
  if (v === null || v === undefined || !isFinite(v)) return "—";
  return `${Math.round(v)}`;
}

function getRecommendationText(status: SectionStatus, label: string) {
  const advice: Record<string, Record<SectionStatus, string>> = {
    Loudness: {
      ok: "Idealna głośność odniesienia dla Twojego stylu.",
      warn: "Głośność odbiega od standardów stylu, rozważ korektę na limiterze.",
      bad: "Krytyczny błąd głośności – utwór może zostać drastycznie przyciszony w streamingu.",
    },
    "Low End Balance": {
      ok: "Bas i stopa siedzą idealnie, dół jest czysty i zdefiniowany.",
      warn: "Dół pasma jest lekko zachwiany, sprawdź balans stopy i basu (ok. 1-2dB).",
      bad: "Poważne problemy z dołem – ryzyko dudnienia i braku klarowności w aucie.",
    },
    "Midrange Density": {
      ok: "Środek pasma jest świetnie zrównoważony i selektywny.",
      warn: "Środek wymaga uwagi, niektóre elementy (wokal, gitary) mogą się maskować.",
      bad: "Zbyt duży bałagan w środku pasma, brak selektywności najważniejszych instrumentów.",
    },
    Harshness: {
      ok: "Góra pasma jest jedwabista i nie męczy słuchu.",
      warn: "Uważaj na wysokie tony, mogą być zbyt kłujące w dłuższym odsłuchu.",
      bad: "Agresywna i kłująca góra – konieczna praca z de-esserem lub EQ na blachach/sybilantach.",
    },
    "Stereo Width": {
      ok: "Szeroka i stabilna panorama, świetna kompatybilność mono.",
      warn: "Uważaj na fazę, obraz stereo może być nieco zbyt rozmyty lub niestabilny.",
      bad: "Krytyczne błędy fazowe – niektóre instrumenty mogą niemal całkowicie zniknąć w mono.",
    },
    "Punchiness (Transients)": {
      ok: "Dynamika transjentów jest doskonała, miks żyje i pulsuje.",
      warn: "Miks jest nieco zbyt skompresowany, bębny mogą tracić swój pierwotny atak.",
      bad: "Całkowity brak dynamiki – transjenty są całkowicie zduszone przez limiter lub kompresję.",
    },
    "Beat Stability": {
      ok: "Rytmika jest nienaganna, groove trzyma się stabilnie wzorca.",
      warn: "Dostrzeżono drobne wahania rytmiczne, sprawdź spójność sekcji rytmicznej.",
      bad: "Poważne problemy z groovem – sekcja rytmiczna 'pływa' poza schemat stylu.",
    },
  };

  return advice[label]?.[status];
}

export function buildReportSections(
  raw: AnalysisReportInput,
  profile: StyleProfile,
  unlockedCount: number,
  plan: Plan
): SectionResult[] {
  const g = raw.global;
  const t = profile.targets;

  const sectionsData = [
    {
      label: "Loudness",
      value: formatLufs(g.integratedLufs),
      score: scoreInRange(g.integratedLufs ?? -99, t.lufs_integrated.min, t.lufs_integrated.max, t.lufs_integrated.ideal),
      desc: "LUFS decyduje w odbiorze o tym, jak głośno zabrzmi Twój miks względem innych na Spotify czy w radiu.",
      detail: plan === "free"
        ? "Analiza Peak/LRA dostępna w planie Lite"
        : `True Peak: ${formatDb(g.truePeakDbtp)}  |  LRA: ${formatNum(g.lra, 1)} LU  |  Clipping: ${formatInt(g.clipping?.clipEvents)}`,
      locked: false,
    },
    {
      label: "Low End Balance",
      value: `${formatPct(g.energyDistribution.low)} low`,
      score: scoreInRange(g.energyDistribution.low, t.low_ratio.min, t.low_ratio.max),
      desc: "Sprawdza, czy nie wpompowałeś za dużo buczącego dołu w miks. Zły balans tu zepsuje odsłuch w aucie.",
      detail: `Mid: ${formatPct(g.energyDistribution.mid)}  |  High: ${formatPct(g.energyDistribution.high)}`,
      locked: unlockedCount < 2,
    },
    {
      label: "Midrange Density",
      value: `${formatPct(g.energyDistribution.mid)} mid`,
      score: scoreInRange(g.energyDistribution.mid, t.mid_ratio.min, t.mid_ratio.max),
      desc: "Gęstość najważniejszego środkowego pasma, gdzie żyje wokal, gitary i werbel.",
      detail: `Flatness: ${formatNum(g.spectral?.flatnessMean, 3)}  |  HFC: ${formatNum(g.spectral?.hfcMean, 1)}`,
      locked: unlockedCount < 3,
    },
    {
      label: "Harshness",
      value: `${formatPct(g.energyDistribution.high)} high`,
      score: scoreInRange(g.energyDistribution.high, 0, t.high_ratio.max),
      desc: "Psychoakustyczna zdolność dźwięku do męczenia słuchacza (kłujące góry blach i sybilantów).",
      detail: `HFC: ${formatNum(g.spectral?.hfcMean, 1)}`,
      locked: unlockedCount < 4,
    },
    {
      label: "Stereo Width",
      value: plan === "free" ? "—" : formatNum(g.stereo?.correlation, 3),
      score: scoreInRange(g.stereo?.correlation ?? 0, t.stereo_width.min, t.stereo_width.max),
      desc: "Poniżej zera dźwięk skasuje się z głośnika telefonu (zniknięcie szerokich śladów fazowych w mono).",
      detail: "Korelacja L-R",
      locked: unlockedCount < 5,
    },
    {
      label: "Punchiness (Transients)",
      value: formatNum(g.transients?.onsetStrengthMean, 2),
      score: scoreInRange(g.transients?.onsetStrengthMean ?? 0, t.punchiness.min, t.punchiness.max),
      desc: "Siła przebijania bębnów przez miks (transjenty atakujące membrany głośników). Zbyt niski współczynnik zepsuje rytmikę.",
      detail: "Siła transjentów",
      locked: unlockedCount < 6,
    },
	    {
	      label: "Beat Stability",
	      value: g.rhythm?.tempoBpm
	        ? `${Math.round(g.rhythm.tempoBpm)} BPM${typeof g.rhythm.tempoConfidence === "number" && g.rhythm.tempoConfidence < 0.18 ? " (low conf.)" : ""}`
	        : "—",
	      score: g.rhythm?.tempoBpm ? 95 : 0,
	      desc: "Sztywność uderzeń sekcji rytmicznej i poprawność groovu w oparciu o wykryte BPM utworu.",
	      detail:
	        typeof g.rhythm?.tempoConfidence === "number"
	          ? `Estymacja tempa · confidence ${(g.rhythm.tempoConfidence * 100).toFixed(0)}%`
	          : "Estymacja tempa",
	      locked: unlockedCount < 7,
	    },
  ];

  return sectionsData.map((section) => {
    const status = getStatus(section.score);
    return {
      ...section,
      status,
      recommendation: getRecommendationText(status, section.label),
    };
  });
}

export function calculateOverallScore(sections: SectionResult[]): number | null {
  const unlockedSections = sections.filter((section) => !section.locked);
  if (unlockedSections.length === 0) {
    return null;
  }

  const total = unlockedSections.reduce((sum, section) => sum + section.score, 0);
  return Math.round(total / unlockedSections.length);
}
