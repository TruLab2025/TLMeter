"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AVAILABLE_STYLES, type SectionStatus } from "@/lib/profiles";
import type { Plan, PlanFeatures } from "@/lib/license";
import type { Tip } from "@/lib/tips";
import type { SectionResult } from "@/lib/analyze/report-sections";
import type { AnalysisResult } from "@/lib/analyze/types";
import { PLATFORM_TARGETS, type PlatformKey } from "@/lib/platform-readiness";
import ReferenceComparePanel from "@/components/analyze/ReferenceComparePanel";

const STATUS_LABEL: Record<SectionStatus, string> = { ok: "Idealnie", warn: "Ostrzeżenie", bad: "Problem" };
const STATUS_COLOR: Record<SectionStatus, string> = {
  ok: "var(--ok)",
  warn: "var(--warn)",
  bad: "var(--bad)",
};

interface AnalysisResultsProps {
  result: AnalysisResult | null;
  referenceResult?: AnalysisResult | null;
  referenceFile?: File | null;
  sections: SectionResult[];
  adMustBeClosed: boolean;
  analysisMode: "suggest" | "manual";
  platform: PlatformKey | null;
  isPlatformMode: boolean;
  analyzedStyle: string | null;
  sessionPlan: Plan;
  stats: { total: number; today: number };
  file: File | null;
  downloadCoreJson: () => void;
  routerPush: (href: string) => void;
  tips: Tip[];
  showAllTips: boolean;
  onShowAllTips: () => void;
  referenceDetected?: {
    isReference: boolean;
    confidence: number;
    reason: string;
    matchedStyle: string | null;
    artist: string | null;
    title: string | null;
  } | null;
  contributeToProfile?: boolean;
  onAddToLibrary?: (params: { style: string }) => Promise<void> | void;
  planFeatures: PlanFeatures;
  calibrationSuggestions?: string[];
}

export default function AnalysisResults({
  result,
  referenceResult,
  referenceFile,
  sections,
  adMustBeClosed,
  analysisMode,
  platform,
  isPlatformMode,
  analyzedStyle,
  sessionPlan,
  stats,
  file,
  downloadCoreJson,
  routerPush,
  tips,
  showAllTips,
  onShowAllTips,
  referenceDetected,
  contributeToProfile,
  onAddToLibrary,
  planFeatures,
  calibrationSuggestions = [],
}: AnalysisResultsProps) {
  const [addingToLibrary, setAddingToLibrary] = useState(false);
  const [libraryArtist, setLibraryArtist] = useState<string>("");
  const [libraryStyle, setLibraryStyle] = useState<string>("");
  const waitingForReferenceCompare = Boolean(
    sessionPlan === "premium" && referenceFile && file && !referenceResult && !isPlatformMode
  );
  const fileExt = file?.name?.split(".").pop()?.toLowerCase() ?? null;
  const fileFormat = file
    ? (file.type
      ? (fileExt ? `${file.type} · .${fileExt}` : file.type)
      : (fileExt ? `.${fileExt}` : null))
    : null;
  const detectedStyleSlug = referenceDetected?.matchedStyle;
  const detectedStyleObj = detectedStyleSlug ? AVAILABLE_STYLES.find((s) => s.slug === detectedStyleSlug) : null;
  const detectedStyleLabel = detectedStyleObj?.name ?? detectedStyleSlug;

  const styleSlugs = new Set(AVAILABLE_STYLES.map((s) => s.slug));
  const styleOptions = useMemo(
    () => AVAILABLE_STYLES.map((s) => ({ value: s.slug, label: s.name })),
    []
  );
  const hasKnownStyle = (slug?: string | null): slug is string => Boolean(slug && styleSlugs.has(slug));
  const referenceGenreCandidate = result?.styleMatch?.selected_genre ?? null;
  const libraryStyleForSubmit =
    (hasKnownStyle(detectedStyleSlug) ? detectedStyleSlug : null)
    ?? (hasKnownStyle(analyzedStyle) ? analyzedStyle : null)
    ?? (hasKnownStyle(referenceGenreCandidate) ? referenceGenreCandidate : null)
    ?? "rock";

  useEffect(() => {
    if (!referenceDetected) return;
    if (!libraryStyle) setLibraryStyle(libraryStyleForSubmit);
    if (!libraryArtist) setLibraryArtist(referenceDetected.artist ?? "");
  }, [libraryArtist, libraryStyle, libraryStyleForSubmit, referenceDetected]);

  const canShowLibraryPrompt = Boolean(
    result &&
    !isPlatformMode &&
    referenceDetected &&
    referenceDetected.confidence > 0 &&
    referenceDetected.confidence < 0.9 &&
    !contributeToProfile
  );

  const handleAddToLibrary = useCallback(async () => {
    if (!onAddToLibrary) return;
    setAddingToLibrary(true);
    try {
      await onAddToLibrary({ style: libraryStyle || libraryStyleForSubmit });
    } finally {
      setAddingToLibrary(false);
    }
  }, [libraryStyle, libraryStyleForSubmit, onAddToLibrary]);

  if (sections.length === 0 || adMustBeClosed) {
    return null;
  }

  return (
    <div className="animate-fade-in">
      {result && referenceFile && file && !referenceResult && !isPlatformMode && sessionPlan === "premium" && (
        <div className="card mt-6 p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-bold text-[var(--text-primary)]">Porównanie z referencją</div>
            <div className="text-[10px] text-[var(--text-muted)] font-mono truncate">
              Trwa analiza referencji…
            </div>
          </div>
          <div className="mt-2 text-sm text-[var(--text-secondary)]">
            Wyniki miksu są już gotowe — dane porównawcze pojawią się automatycznie, gdy referencja się przeliczy.
          </div>
        </div>
      )}
      {result && referenceResult && referenceFile && file && !isPlatformMode && (
        <ReferenceComparePanel
          mix={result}
          reference={referenceResult}
          mixName={file.name}
          referenceName={referenceFile.name}
          mixFile={file}
          referenceFile={referenceFile}
        />
      )}
      {canShowLibraryPrompt && (
        <div className="card p-4 mb-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="text-2xl leading-none">{referenceDetected?.isReference ? "✨" : "🔍"}</div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-[var(--text-primary)]">
                  {referenceDetected?.isReference ? "Wykryta referencja" : "Możliwa referencja"}
                  {detectedStyleLabel ? (
                    <span className="ml-2 inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-secondary)] uppercase tracking-widest">
                      <span>{detectedStyleLabel}</span>
                    </span>
                  ) : null}
                </div>
                <div className="text-sm text-[var(--text-secondary)] truncate">
                  {referenceDetected?.reason}
                  <span className="text-[var(--text-muted)] ml-2">({Math.round((referenceDetected?.confidence ?? 0) * 100)}%)</span>
                </div>
                <div className="mt-3 flex flex-col md:flex-row md:items-center gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Styl</span>
                    <select
                      value={libraryStyle || libraryStyleForSubmit}
                      onChange={(e) => setLibraryStyle(e.target.value)}
                      className="rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-2.5 py-1.5 text-sm text-[var(--text-primary)]"
                    >
                      {styleOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] whitespace-nowrap">Zespół</span>
                    <input
                      value={libraryArtist}
                      onChange={(e) => setLibraryArtist(e.target.value)}
                      placeholder={referenceDetected?.artist ?? "np. Nirvana"}
                      className="w-full md:w-56 rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-2.5 py-1.5 text-sm text-[var(--text-primary)]"
                    />
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] md:ml-2">
                    Nazwa zespołu jest tylko lokalnie (nie wysyłamy jej).
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddToLibrary}
              disabled={addingToLibrary}
              className={`btn btn-outline btn-sm ${addingToLibrary ? "opacity-60 cursor-not-allowed" : ""}`}
              title={`Dodaj anonimowe metryki DSP do biblioteki stylu: ${libraryStyleForSubmit}`}
            >
              {addingToLibrary ? "Dodaję…" : "Dodaj do biblioteki"}
            </button>
          </div>
        </div>
      )}
      {isPlatformMode ? (() => {
        const platformName = platform ? PLATFORM_TARGETS[platform].name : "wybraną platformę";
        const score = calculatePlatformScore(sections);
        const analysisSeconds = result?.analysisDurationMs ? (result.analysisDurationMs / 1000).toFixed(2) : null;
        const fileSizeMb = file ? (file.size / 1024 / 1024).toFixed(1) : null;
        const durationSec = result?.meta?.durationSec ? Math.round(result.meta.durationSec) : null;
        const sampleRate = result?.meta?.sampleRate ?? null;

        return (
          <div className="card p-5 md:p-6 mb-5">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-6 md:gap-8 items-start">
              <div>
                <div className="text-xs text-[var(--text-muted)] tracking-wider mb-1">🎯 Tryb platformy</div>
                <div className="text-xl md:text-2xl font-semibold text-[var(--text-primary)] mb-5">
                  Gotowość pod {platformName}
                </div>
                <div className="text-6xl md:text-7xl font-bold leading-none mb-2" style={{ color: score >= 80 ? "var(--ok)" : score >= 60 ? "var(--warn)" : "var(--bad)" }}>
                  {score}<span className="text-2xl text-[var(--text-muted)]">%</span>
                </div>
                <div className="text-sm md:text-base text-[var(--text-secondary)] mb-5">
                  ocena publikacji dla {platformName}
                </div>
                <div className="mt-1 w-full text-left border-t border-[var(--border)] pt-4">
                  <div className="text-xs text-[var(--text-muted)] tracking-wider mb-2">
                    Co sprawdziliśmy
                  </div>
                  <ul className="text-sm text-[var(--text-secondary)] space-y-1.5 list-disc list-inside">
                    <li>czy głośność mieści się w targetach platformy</li>
                    <li>czy True Peak jest bezpieczny po transkodowaniu</li>
                    <li>czy dynamika programu pasuje do sposobu odsłuchu</li>
                  </ul>
                </div>
              </div>

              <div className="md:border-l md:border-[var(--border)] md:pl-6">
                <div className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-2">Podstawowe informacje</div>
                <div className="space-y-2 text-sm">
                  {analysisSeconds && (
                    <div className="flex items-center justify-between gap-3 border-b border-[var(--border)]/70 pb-1">
                      <span className="text-[var(--text-muted)]">Czas analizy</span>
                      <span className="font-mono text-[var(--text-primary)]">{analysisSeconds}s</span>
                    </div>
                  )}
                  {fileSizeMb && (
                    <div className="flex items-center justify-between gap-3 border-b border-[var(--border)]/70 pb-1">
                      <span className="text-[var(--text-muted)]">Rozmiar pliku</span>
                      <span className="font-mono text-[var(--text-primary)]">{fileSizeMb} MB</span>
                    </div>
                  )}
                  {durationSec && (
                    <div className="flex items-center justify-between gap-3 border-b border-[var(--border)]/70 pb-1">
                      <span className="text-[var(--text-muted)]">Długość utworu</span>
                      <span className="font-mono text-[var(--text-primary)]">{durationSec}s</span>
                    </div>
                  )}
	                  {sampleRate && (
	                    <div className="flex items-center justify-between gap-3 border-b border-[var(--border)]/70 pb-1">
	                      <span className="text-[var(--text-muted)]">Sample rate</span>
	                      <span className="font-mono text-[var(--text-primary)]">{sampleRate} Hz</span>
	                    </div>
	                  )}
	                  {fileFormat && (
	                    <div className="flex items-center justify-between gap-3 border-b border-[var(--border)]/70 pb-1">
	                      <span className="text-[var(--text-muted)]">Format</span>
	                      <span className="font-mono text-[var(--text-primary)]">{fileFormat}</span>
	                    </div>
	                  )}
	                  <div className="flex items-center justify-between gap-3">
	                    <span className="text-[var(--text-muted)]">Tryb analizy</span>
	                    <span className="text-[var(--text-primary)]">Platforma</span>
	                  </div>
                  <div className="mt-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)]/60">
                    <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-2">Statystyki globalne</div>
                    <div className="flex items-center justify-between gap-3 pb-1 border-b border-[var(--border)]/70">
                      <span className="text-[var(--text-muted)]">Analiz łącznie</span>
                      <span className="font-mono text-[var(--accent)] font-semibold">{stats.total.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 pt-1">
                      <span className="text-[var(--text-muted)]">Dzisiaj</span>
                      <span className="font-mono text-[#22c55e] font-semibold">{stats.today}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })() : result?.styleMatch && (() => {
        const sm = result.styleMatch;
        const styleObj = AVAILABLE_STYLES.find((style) => style.slug === sm.selected_genre);
        const bestStyleObj = AVAILABLE_STYLES.find((style) => style.slug === sm.best_match?.genre);
        const label = analysisMode === "suggest" ? "Sugerowany styl" : "Wybrany styl";
        const isLowMatch = sm.selected_score < 50;
        const scoreColor = sm.selected_score < 60 ? "var(--warn)" : "var(--ok)";
        const analysisSeconds = result.analysisDurationMs ? (result.analysisDurationMs / 1000).toFixed(2) : null;
        const fileSizeMb = file ? (file.size / 1024 / 1024).toFixed(1) : null;
        const durationSec = result.meta?.durationSec ? Math.round(result.meta.durationSec) : null;
        const sampleRate = result.meta?.sampleRate ?? null;

        return (
          <div className="card p-5 md:p-6 mb-5">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-6 md:gap-8 items-start">
              <div>
                <div className="text-xs text-[var(--text-muted)] tracking-wider mb-1">{styleObj?.emoji ?? "🎧"} {label}</div>
                <div className="text-xl md:text-2xl font-semibold text-[var(--text-primary)] capitalize mb-5">
                  {sm.selected_genre}
                </div>
                <div className="text-6xl md:text-7xl font-bold leading-none mb-2" style={{ color: scoreColor }}>
                  {sm.selected_score}<span className="text-2xl text-[var(--text-muted)]">%</span>
                </div>
                <div className="text-sm md:text-base text-[var(--text-secondary)] mb-5 lowercase">
                  {isLowMatch ? "niskie dopasowanie" : "dopasowanie"} do stylu {sm.selected_genre}
                </div>

                {isLowMatch && sm.best_match?.genre && sm.best_match.genre !== sm.selected_genre && (
                  <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-[var(--ok)]/40 bg-[var(--ok)]/10 px-3 py-1.5 text-xs text-[var(--text-secondary)]">
                    <span>Najbliższy styl:</span>
                    <span className="font-semibold text-[var(--text-primary)]">{bestStyleObj?.emoji ? `${bestStyleObj.emoji} ` : ""}{bestStyleObj?.name ?? sm.best_match.genre}</span>
                    <span className="font-mono text-[var(--ok)]">({sm.best_match.score}%)</span>
                  </div>
                )}

                {sm.explanations?.length ? (
                  <div className="mt-1 w-full text-left border-t border-[var(--border)] pt-4">
                    <div className="text-xs text-[var(--text-muted)] tracking-wider mb-2">
                      {isLowMatch ? "⚠️ Dlaczego utwór nie pasuje do wybranego stylu" : "🎛 Dlaczego pasuje do stylu muzycznego"}
                    </div>
                    <ul className="text-sm text-[var(--text-secondary)] space-y-1.5 list-disc list-inside">
                      {sm.explanations.slice(0, 3).map((text, idx) => (
                        <li key={`exp-${sm.selected_genre}-${idx}`}>{text}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {calibrationSuggestions.length > 0 && isLowMatch && (
                  <div className="mt-3 text-sm text-[var(--text-primary)]">
                    <div className="font-semibold uppercase tracking-tight text-[var(--text-muted)] text-xs">Sugestie poprawy (żeby dopasować)</div>
                    <ul className="mt-1 space-y-1 list-disc list-inside">
                      {calibrationSuggestions.map((suggestion) => (
                        <li key={suggestion}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="md:border-l md:border-[var(--border)] md:pl-6">
                {analyzedStyle && (
                  <button
                    onClick={downloadCoreJson}
                    disabled={waitingForReferenceCompare}
                    title={waitingForReferenceCompare ? "Poczekaj na zakończenie analizy referencji, aby pobrać pełny raport porównawczy." : undefined}
                    className={`btn btn-outline btn-sm w-full justify-center flex items-center gap-2 group transition-all mb-4 ${waitingForReferenceCompare ? "opacity-50 cursor-not-allowed" : "hover:border-[var(--accent)]"}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:text-[var(--accent)]"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                    <span className="font-bold">Pobierz {sessionPlan.toUpperCase()} JSON</span>
                  </button>
                )}

                <div className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-2">Podstawowe informacje</div>
                <div className="space-y-2 text-sm">
                  {analysisSeconds && (
                    <div className="flex items-center justify-between gap-3 border-b border-[var(--border)]/70 pb-1">
                      <span className="text-[var(--text-muted)]">Czas analizy</span>
                      <span className="font-mono text-[var(--text-primary)]">{analysisSeconds}s</span>
                    </div>
                  )}
                  {fileSizeMb && (
                    <div className="flex items-center justify-between gap-3 border-b border-[var(--border)]/70 pb-1">
                      <span className="text-[var(--text-muted)]">Rozmiar pliku</span>
                      <span className="font-mono text-[var(--text-primary)]">{fileSizeMb} MB</span>
                    </div>
                  )}
                  {durationSec && (
                    <div className="flex items-center justify-between gap-3 border-b border-[var(--border)]/70 pb-1">
                      <span className="text-[var(--text-muted)]">Długość utworu</span>
                      <span className="font-mono text-[var(--text-primary)]">{durationSec}s</span>
                    </div>
                  )}
	                  {sampleRate && (
	                    <div className="flex items-center justify-between gap-3 border-b border-[var(--border)]/70 pb-1">
	                      <span className="text-[var(--text-muted)]">Sample rate</span>
	                      <span className="font-mono text-[var(--text-primary)]">{sampleRate} Hz</span>
	                    </div>
	                  )}
	                  {fileFormat && (
	                    <div className="flex items-center justify-between gap-3 border-b border-[var(--border)]/70 pb-1">
	                      <span className="text-[var(--text-muted)]">Format</span>
	                      <span className="font-mono text-[var(--text-primary)]">{fileFormat}</span>
	                    </div>
	                  )}
	                  <div className="flex items-center justify-between gap-3">
	                    <span className="text-[var(--text-muted)]">Tryb analizy</span>
	                    <span className="text-[var(--text-primary)]">{analysisMode === "suggest" ? "Auto (Sugeruj)" : "Manual"}</span>
	                  </div>
                  <div className="mt-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)]/60">
                    <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-2">Statystyki globalne</div>
                    <div className="flex items-center justify-between gap-3 pb-1 border-b border-[var(--border)]/70">
                      <span className="text-[var(--text-muted)]">Analiz łącznie</span>
                      <span className="font-mono text-[var(--accent)] font-semibold">{stats.total.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 pt-1">
                      <span className="text-[var(--text-muted)]">Dzisiaj</span>
                      <span className="font-mono text-[#22c55e] font-semibold">{stats.today}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
        {sections.map((section) => (
          <div key={section.label} className={`card p-5 relative ${section.locked ? "overflow-hidden" : ""}`}>
            {section.locked && (
              <div className="absolute inset-0 bg-[var(--bg-card)]/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                <div className="text-2xl mb-2">🔒</div>
                <Link href="/payment?plan=lite" className="text-xs text-[var(--accent)] hover:underline">Odblokuj w Lite</Link>
              </div>
            )}
            <div className={section.locked ? "locked-blur" : ""}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{section.label}</span>
                  <div className="relative group flex items-center">
                    <span className="cursor-help text-xs bg-[var(--bg-surface)] w-4 h-4 flex items-center justify-center rounded-full text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--border)] transition-colors">?</span>
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-secondary)] text-xs p-2 rounded shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                      {section.desc}
                    </div>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full badge-${section.status}`}>
                  {STATUS_LABEL[section.status]}
                </span>
              </div>
              <div className="text-2xl font-mono font-bold mb-2" style={{ color: STATUS_COLOR[section.status] }}>
                {section.value}
              </div>
              <div className="meter-track h-2 mb-2">
                <div className="meter-fill" style={{ width: `${section.score}%`, background: STATUS_COLOR[section.status] }}></div>
              </div>
              <div className="text-xs text-[var(--text-muted)]">{section.detail}</div>
	              {section.recommendation && (
	                <div className="mt-3 pt-3 border-t border-[var(--border)] text-sm text-[var(--text-secondary)] flex items-start gap-2 leading-relaxed">
	                  <span className="shrink-0 mt-0.5">
	                    {section.status === "ok" ? "✅" : section.status === "warn" ? "⚠️" : "🚨"}
	                  </span>
	                  <span>
	                    <span className="font-semibold text-[var(--accent)]">Rekomendacja:</span> {section.recommendation}
	                  </span>
	                </div>
	              )}
            </div>
          </div>
        ))}
      </div>

      {sessionPlan === "free" && (
        <div className="card p-6 text-center border-dashed mb-10">
          <div className="text-2xl mb-2">🔓</div>
          <div className="font-semibold mb-1">Odblokuj pełny raport</div>
          <div className="text-sm text-[var(--text-secondary)] mb-4">2 dodatkowe sekcje (Punchiness, Beat Stability), porady DAW i raport do analizy w zewnętrznym AI</div>
          <Link href="/payment?plan=pro" className="btn btn-primary btn-sm">Odblokuj pełny raport</Link>
        </div>
      )}

      {(sessionPlan === "free" || sessionPlan === "lite") && (
        <div className="mb-12 pt-8 border-t border-[var(--border)]">
          <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-widest mb-6">Eksportuj dane i raport</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => routerPush("/payment?plan=pro")}
              className="flex items-center justify-between p-5 rounded-xl border transition-all shadow-sm bg-[var(--bg-card)] border-[var(--border)] hover:border-[var(--accent)]"
            >
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-lg bg-[var(--bg-surface)] text-[var(--text-muted)]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2v-4" /><polyline points="17 9 12 14 7 9" /><line x1="12" x2="12" y1="14" y2="3" /></svg>
                </div>
                <div className="text-left">
                  <div className="text-base font-bold">Raport PRO JSON</div>
                  <div className="text-xs text-[var(--text-secondary)] mt-1">
                    Pełne metryki diagnostyczne (LUFS, LRA, stereo, transients)
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-1.5 text-[10px] font-bold px-3 py-1 rounded-full bg-[var(--border)] text-[var(--text-muted)] uppercase tracking-wider">
                  <span>🔒</span> LOCKED
                </div>
                <span className="text-[9px] text-[var(--accent)] font-semibold animate-pulse">Odblokuj PRO &rarr;</span>
              </div>
            </button>

            <button
              onClick={downloadCoreJson}
              className="flex items-center justify-between p-5 rounded-xl border transition-all bg-[var(--accent)]/5 border-[var(--accent)]/30 hover:border-[var(--accent)] hover:bg-[var(--accent)]/10 cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-lg bg-[var(--accent)] text-black">
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 15v4c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2v-4" /><polyline points="17 9 12 14 7 9" /><line x1="12" x2="12" y1="14" y2="3" /></svg>
                </div>
                <div className="text-left">
                  <div className="text-base font-bold">Pobierz {sessionPlan.toUpperCase()} JSON</div>
                  <div className="text-xs text-[var(--text-muted)] mt-1">Histogram spektralny (8 pasm, 60Hz-7680Hz)</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-black px-3 py-1 rounded-full bg-[var(--accent)] text-black uppercase tracking-wider">
                <span>🔓</span> {sessionPlan.toUpperCase()}
              </div>
            </button>
          </div>
        </div>
      )}

      {tips.length > 0 && (
        <div className="mb-12 animate-fade-in pt-8 border-t border-[var(--border)]">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <span>{isPlatformMode ? "🎯" : "🔍"}</span>
            <span>{isPlatformMode ? "Wskazówki pod platformę" : "Pełna analiza problemów & Porady DAW"}</span>
          </h2>
          <div className="flex flex-col gap-4">
            {(showAllTips ? tips : tips.slice(0, 3)).map((tip, index) => {
              const sectionData = sections.find((section) => {
                if (tip.section === "loudness") return section.label === "Loudness";
                if (tip.section === "lowend") return section.label === "Low End Balance";
                if (tip.section === "midrange") return section.label === "Midrange Density";
                if (tip.section === "harshness") return section.label === "Harshness";
                if (tip.section === "stereo") return section.label === "Stereo Width";
                if (tip.section === "dynamics") return section.label === "Punchiness (Transients)";
                if (tip.section === "rhythm") return section.label === "Beat Stability";
                return false;
              });
              const isLocked = sectionData?.locked ?? false;

              return (
                <div key={index} className="card p-5 border-l-4 border-l-[var(--warn)] relative overflow-hidden">
                  {!planFeatures.tipsBasic && (
                    <div className="absolute inset-0 bg-[var(--bg-card)]/80 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                      <div className="text-xl mb-1">🔒</div>
                      <div className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Zablokowane w planie Free</div>
                      <Link href="/payment?plan=lite" className="text-[10px] text-[var(--accent)] hover:underline mt-1 font-semibold">Odblokuj wsparcie DAW &rarr;</Link>
                    </div>
                  )}

                  <div className={isLocked ? "blur-[6px] opacity-40 select-none pointer-events-none" : ""}>
                    <h3 className="font-semibold text-[var(--warn)] mb-1">{tip.title}</h3>
                    <p className="text-sm text-[var(--text-primary)] mb-3 leading-relaxed">{tip.description}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mt-3 pt-3 border-t border-[var(--border)]">
                      {tip.action && (
                        <div className={!planFeatures.tipsBasic ? "relative" : ""}>
                          <span className="text-[var(--text-muted)] text-xs block mb-1 uppercase tracking-tighter font-bold">Rekomendacja</span>
                          {!planFeatures.tipsBasic ? (
                            <div className="flex flex-col gap-1">
                              <span className="text-[var(--text-muted)] blur-[3px] select-none">Zalecane konkretne kroki w DAW...</span>
                              <Link href="/payment?plan=lite" className="text-[10px] text-[var(--accent)] font-bold">Odblokuj 🔓</Link>
                            </div>
                          ) : (
                            <span className="text-[var(--text-secondary)]">{tip.action}</span>
                          )}
                        </div>
                      )}
                      {(tip.eq_hint || tip.comp_hint) && (
                        <div className={!planFeatures.tipsBasic ? "relative" : ""}>
                          <span className="text-[var(--text-muted)] text-xs block mb-1 uppercase tracking-tighter font-bold">Sugestia techniczna</span>
                          {!planFeatures.tipsDetailed ? (
                            <div className="flex flex-col gap-1">
                              <span className="text-[var(--text-muted)] blur-[3px] select-none italic text-[10px]">Parametry EQ/Comp dostępne w PRO</span>
                              <Link href="/payment?plan=pro" className="text-[9px] text-[var(--accent)] font-bold">Sprawdź plan PRO &rarr;</Link>
                            </div>
                          ) : (
                            <div className="text-[var(--text-secondary)]">
                              {tip.eq_hint && <div>🎛️ {tip.eq_hint}</div>}
                              {tip.comp_hint && <div>🎚️ {tip.comp_hint}</div>}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {(tip.freq_range || tip.general) && (
                      <div className="text-xs text-[var(--text-muted)] mt-4 pt-3 border-t border-[var(--border)] border-dashed">
                        {tip.freq_range && <span>Obszar: <span className="text-[var(--text-secondary)]">{tip.freq_range}</span></span>}
                        {tip.freq_range && tip.general && <span className="mx-2">|</span>}
                        {tip.general && <span>Zależność stylu: <span className="text-[var(--text-secondary)]">{tip.general}</span></span>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {tips.length > 3 && !showAllTips && (
              <button
                onClick={onShowAllTips}
                className="btn btn-outline w-full py-4 text-sm border-dashed"
              >
                Pokaż pozostałe porady ({tips.length - 3}) ▾
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function calculatePlatformScore(sections: SectionResult[]) {
  const unlockedSections = sections.filter((section) => !section.locked);
  if (unlockedSections.length === 0) return 0;
  return Math.round(unlockedSections.reduce((sum, section) => sum + section.score, 0) / unlockedSections.length);
}
