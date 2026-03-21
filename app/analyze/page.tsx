"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AVAILABLE_STYLES, loadProfile, type StyleSlug } from "@/lib/profiles";
import { getSession, clearSession, PLAN_FEATURES, getAuthHeaders, type SessionData } from "@/lib/license";
import { loadAllTips, detectProblems, matchTips, type Tip } from "@/lib/tips";
import { saveAnalysis, getHistory, clearHistory, type HistoryEntry } from "@/lib/history";
import { type Sponsor } from "@/components/SponsorScreen";
import BrandLogo from "@/components/BrandLogo";
import AnalyzeControls from "@/components/analyze/AnalyzeControls";
import AnalyzeErrorModal from "@/components/analyze/AnalyzeErrorModal";
import AnalysisHistorySection from "@/components/analyze/AnalysisHistorySection";
import AnalysisProgressPanel from "@/components/analyze/AnalysisProgressPanel";
import AnalysisResults from "@/components/analyze/AnalysisResults";
import LoadingTipCard from "@/components/analyze/LoadingTipCard";
import SponsorPromo from "@/components/analyze/SponsorPromo";
import { detectReference } from "@/lib/calibration/reference-detection";
import { PlatformKey } from "@/lib/platform-readiness";
import { buildReportSections, calculateOverallScore, type SectionResult } from "@/lib/analyze/report-sections";
import { buildPlatformReportSections, buildPlatformTips } from "@/lib/analyze/platform-report";
import {
    validateAnalysisModeAccess,
    validateFileForAnalysis,
    validateManualStyleAccess,
    validateSelectedFile,
} from "@/lib/analyze/validation";
import { runAudioAnalysisPipeline } from "@/lib/analyze/run-analysis";
import type { AnalysisProgress, AnalysisResult } from "@/lib/analyze/types";
import { useAnalyzePageController } from "@/hooks/useAnalyzePageController";
import {
    ANALYZE_LOADING_TIPS,
    COMING_SOON_STYLES,
    FINAL_PROGRESS_HOLD_MS,
    getHistoryLimit,
    PLAN_MIN_ANALYSIS_MS,
    PLAN_PROGRESS_TUNING,
    REQUIRED_PLAN_BY_STYLE,
    STYLES_BY_PLAN,
} from "@/lib/analyze/config";

async function waitWithAbort(ms: number, isAborted: () => boolean) {
    if (ms <= 0) return;
    const tickMs = 80;
    let elapsed = 0;
    while (elapsed < ms) {
        if (isAborted()) throw new Error("Analiza została anulowana.");
        const step = Math.min(tickMs, ms - elapsed);
        await new Promise((r) => setTimeout(r, step));
        elapsed += step;
    }
}

export default function AnalyzePage() {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
    const apiUrl = useCallback((path: string) => {
        if (!API_BASE) return path;
        const base = API_BASE.endsWith("/") ? API_BASE.slice(0, -1) : API_BASE;
        const p = path.startsWith("/") ? path : `/${path}`;
        return `${base}${p}`;
    }, [API_BASE]);

    const [style, setStyle] = useState<StyleSlug | 'suggest'>('suggest');
    const [platform, setPlatform] = useState<PlatformKey | null>(null);
    const [resultMode, setResultMode] = useState<"platform" | "style" | null>(null);
    const [resultPlatform, setResultPlatform] = useState<PlatformKey | null>(null);
    const [resultAnalysisMode, setResultAnalysisMode] = useState<'suggest' | 'manual'>('suggest');
    const [analyzedStyle, setAnalyzedStyle] = useState<StyleSlug | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [referenceFile, setReferenceFile] = useState<File | null>(null);
    const [compareWithReference, setCompareWithReference] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [progress, setProgress] = useState<AnalysisProgress | null>(null);
    const [progressPct, setProgressPct] = useState(0);
    const [progressTargetPct, setProgressTargetPct] = useState(0);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [referenceResult, setReferenceResult] = useState<AnalysisResult | null>(null);
    const [sections, setSections] = useState<SectionResult[]>([]);
    const [tips, setTips] = useState<Tip[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loadingTip, setLoadingTip] = useState<string>(ANALYZE_LOADING_TIPS[0]);
    const [showAllTips, setShowAllTips] = useState(false);
    const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
    const [stats, setStats] = useState({ total: 0, today: 0 });
    const [sponsors, setSponsors] = useState<Sponsor[]>([]);
    const [currentSponsor, setCurrentSponsor] = useState<Sponsor | null>(null);
    const [showSponsor, setShowSponsor] = useState(false);
    const [adMustBeClosed, setAdMustBeClosed] = useState(false);
    const [analysisMode, setAnalysisMode] = useState<'suggest' | 'manual'>('suggest');
    // Reference detection state
    const [referenceDetected, setReferenceDetected] = useState<{
        isReference: boolean;
        confidence: number;
        reason: string;
        matchedStyle: string | null;
        artist: string | null;
        title: string | null;
    } | null>(null);
    const [contributeToProfile, setContributeToProfile] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);
    const referenceFileRef = useRef<HTMLInputElement>(null);
    const abortRef = useRef<boolean>(false);
    const progressSectionRef = useRef<HTMLDivElement>(null);
    const mobileScrolledToProgressRef = useRef(false);
    const progressPctRef = useRef(0);
    const router = useRouter();

    const clearResults = useCallback(() => {
        setResult(null);
        setReferenceResult(null);
        setSections([]);
        setTips([]);
        setShowAllTips(false);
        setAnalyzedStyle(null);
        setResultMode(null);
        setResultPlatform(null);
    }, []);

    const submitCurrentToStyleLibrary = useCallback(async (params?: { style?: string }) => {
        if (!result) return;

        const supported = new Set(AVAILABLE_STYLES.map((s) => s.slug));
        const overrideStyle = params?.style;
        const detectedStyle = referenceDetected?.matchedStyle;
        const fallbackStyle =
            analyzedStyle && supported.has(analyzedStyle as StyleSlug)
                ? (analyzedStyle as StyleSlug)
                : (style !== "suggest" ? (style as StyleSlug) : "rock");
        let contributionStyle: StyleSlug = fallbackStyle;
        if (overrideStyle && supported.has(overrideStyle as StyleSlug)) {
            contributionStyle = overrideStyle as StyleSlug;
        } else if (detectedStyle && supported.has(detectedStyle as StyleSlug)) {
            contributionStyle = detectedStyle as StyleSlug;
        }

        try {
            const { submitMetricsToServer } = await import("@/lib/calibration");

            const metricsForCalibration = {
                lufs: result.global.integratedLufs ?? -14,
                true_peak: result.global.truePeakDbtp ?? -1,
                momentary_loudness: result.global.integratedLufs ?? -14, // approx
                low_ratio: result.global.energyDistribution.low,
                low_mid_ratio: 0.18, // TODO: calculate from spectrum
                mid_ratio: result.global.energyDistribution.mid,
                mid_high_ratio: result.global.energyDistribution.mid * 0.5, // approx
                high_ratio: result.global.energyDistribution.high,
                stereo_correlation: result.global.stereo?.correlation ?? 0.5,
                stereo_width: result.global.stereo?.width ?? 0.85,
                spectral_centroid: result.global.spectral?.centroidHzMean ?? 2500,
                spectral_spread: 4000,
                spectral_tilt: -0.5,
                low_mid_balance: result.global.energyDistribution.low / Math.max(result.global.energyDistribution.mid, 0.01),
                presence_peak: 2.0,
                transient_density: 15,
                crest_factor: 8.0,
                harshness_index: 35, // TODO: calculate from 2-8kHz band
                brightness_index: 40,
                warmth_index: 50,
                engine_version: "1.0",
                sample_rate: result.meta?.sampleRate ?? 44100,
                duration_seconds: result.meta?.durationSec ?? 180,
                analysis_timestamp: Date.now(),
            };

            await submitMetricsToServer(metricsForCalibration, contributionStyle);
            setContributeToProfile(true);
            setReferenceDetected(null);
        } catch (err) {
            console.warn("Calibration submit failed:", err);
        }
    }, [analyzedStyle, referenceDetected?.matchedStyle, result, style]);

    // Hydration-safe: avoid SSR/client mismatch
    const [session, setSession] = useState<SessionData>({ plan: "free" });
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // Load real session on client only
        setSession(getSession());
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;
        if (session.plan !== "premium" && compareWithReference) {
            setCompareWithReference(false);
            setReferenceFile(null);
            setReferenceResult(null);
        }
        if (platform !== null && compareWithReference) {
            setCompareWithReference(false);
            setReferenceFile(null);
            setReferenceResult(null);
        }
    }, [compareWithReference, mounted, platform, session.plan]);

    const planFeatures = PLAN_FEATURES[session.plan];

    useEffect(() => {
        if (!mounted) return;
        if (session.plan === "free" && analysisMode === "suggest") {
            setAnalysisMode("manual");
            setStyle("rock");
        }
    }, [mounted, session.plan, analysisMode]);

    // Load history on mount
    useEffect(() => {
        if (!mounted) return;
        const histLimit = getHistoryLimit(session.plan);
        setHistoryEntries(getHistory(histLimit));
    }, [session.plan, mounted]);

    // Fetch analysis statistics
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch(apiUrl('/api/stats'));
                if (res.ok) {
                    const data = await res.json();
                    setStats({ total: data?.total || 0, today: data?.today || 0 });
                }
            } catch (err) {
                console.warn('Stats endpoint unavailable:', err);
            }
        };
        fetchStats();
    }, [apiUrl]);

    // Keep platform results consistent when user switches platform after platform-analysis
    useEffect(() => {
        if (!result || analyzing) return;
        if (resultMode !== "platform") return;
        if (!platform) return;
        if (platform === resultPlatform) return;
        setResultPlatform(platform);
        setSections(buildPlatformReportSections(result, platform, session.plan));
        setTips(buildPlatformTips(result, platform));
        setShowAllTips(false);
    }, [analyzing, platform, result, resultMode, resultPlatform, session.plan]);

    // Load sponsors on mount
    useEffect(() => {
        const loadSponsors = async () => {
            try {
                const res = await fetch('/data/sponsors.json');
                if (res.ok) {
                    const data = await res.json() as Sponsor[];
                    setSponsors(data);
                    // Set random sponsor
                    if (data.length > 0) {
                        const randomSponsor = data[Math.floor(Math.random() * data.length)];
                        setCurrentSponsor(randomSponsor);
                    }
                }
            } catch (err) {
                console.warn('Sponsors data unavailable:', err);
            }
        };
        loadSponsors();
    }, []);

    // Helper: detect reference when file is selected
    const handleFileSelected = useCallback((f: File) => {
        const validationError = validateSelectedFile(f, session.plan);
        if (validationError) {
            setError(validationError);
            setFile(null);
            return;
        }

        setError(null);
        setFile(f);
        setContributeToProfile(false); // Reset checkbox

        // Detect if this file might be a reference for the current style
        const detection = detectReference(f.name, style === "suggest" ? null : style);
        if (detection.isReference || detection.confidence > 0.3) {
            setReferenceDetected(detection);
        } else {
            setReferenceDetected(null);
        }
    }, [style, session.plan]);

    const handleReferenceFileSelected = useCallback((f: File) => {
        const validationError = validateSelectedFile(f, session.plan);
        if (validationError) {
            setError(validationError);
            setReferenceFile(null);
            return;
        }
        setError(null);
        setReferenceFile(f);
    }, [session.plan]);

    // Drop handlers
    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) handleFileSelected(f);
    }, [handleFileSelected]);
    const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
    const onDragLeave = () => setDragging(false);

    useEffect(() => {
        progressPctRef.current = progressPct;
    }, [progressPct]);

    const {
        canUseAutoStyle,
        uploadInfo,
        overallScore,
        upsellPlan,
        isUpsellError,
        closeSponsorGate,
        updateProgress,
        downloadCoreJson,
    } = useAnalyzePageController({
        sessionPlan: session.plan,
        sections,
        error,
        result,
        referenceResult,
        analyzedStyle,
        file,
        referenceFile,
        setShowSponsor,
        setAdMustBeClosed,
        setProgress,
        setProgressTargetPct,
    });

    async function waitUntilProgressReaches(targetPct: number, timeoutMs: number) {
        const start = performance.now();
        while (progressPctRef.current < targetPct && (timeoutMs <= 0 || (performance.now() - start) < timeoutMs)) {
            if (abortRef.current) throw new Error("Analiza została anulowana.");
            await new Promise((r) => setTimeout(r, 40));
        }
    }

    const runFinalizationSequence = useCallback(async (totalMs: number) => {
        const steps = [
            { detail: "Przygotowuję wyniki", target: 93 },
            { detail: "Waliduję metryki", target: 95 },
            { detail: "Buduję sekcje raportu", target: 97 },
            { detail: "Pakuję wynik", target: 99.4 },
        ] as const;

        const boundedTotal = Math.max(900, totalMs);
        const stepMs = Math.max(180, Math.floor(boundedTotal / steps.length));

        for (let index = 0; index < steps.length; index++) {
            if (abortRef.current) throw new Error("Analiza została anulowana.");
            const step = steps[index];
            updateProgress({ stage: "Finalizacja analizy...", detail: step.detail });
            setProgressTargetPct((prev) => Math.max(prev, step.target));

            if (index < steps.length - 1) {
                await waitUntilProgressReaches(Math.max(75, step.target - 0.2), stepMs);
            } else {
                await waitWithAbort(stepMs, () => abortRef.current);
            }
        }
    }, [updateProgress]);

    const handlePlatformChange = useCallback((nextPlatform: PlatformKey | null) => {
        setPlatform(nextPlatform);

        if (!result || analyzing) return;
        if (resultMode !== "platform") {
            // Switching from style results to platform selection should invalidate old results
            if (nextPlatform) clearResults();
            return;
        }
        if (!nextPlatform) {
            clearResults();
            return;
        }

        setResultPlatform(nextPlatform);
        setSections(buildPlatformReportSections(result, nextPlatform, session.plan));
        setTips(buildPlatformTips(result, nextPlatform));
        setShowAllTips(false);
    }, [analyzing, clearResults, result, resultMode, session.plan]);

    async function runAnalysis() {
        if (!file || analyzing) {
            return;
        }

        const wantsReferenceCompare =
            compareWithReference && session.plan === "premium" && platform === null;
        if (wantsReferenceCompare) {
            if (!referenceFile) {
                setError("Dodaj plik referencyjny, aby uruchomić porównanie w Premium.");
                return;
            }
            if (analysisMode === "suggest") {
                setError("W trybie porównania wybierz styl manualnie (nie 'Sugeruj').");
                return;
            }
        }

        const modeError = validateAnalysisModeAccess(session.plan, analysisMode);
        if (modeError) {
            setError(modeError);
            return;
        }

        const fileValidationError = validateFileForAnalysis(file, session.plan, planFeatures);
        if (fileValidationError) {
            setError(fileValidationError);
            setFile(null);
            return;
        }
        if (wantsReferenceCompare && referenceFile) {
            const referenceValidationError = validateFileForAnalysis(referenceFile, session.plan, planFeatures);
            if (referenceValidationError) {
                setError(referenceValidationError);
                setReferenceFile(null);
                return;
            }
        }

        const styleValidationError = validateManualStyleAccess({
            analysisMode,
            style,
            plan: session.plan,
            stylesByPlan: STYLES_BY_PLAN,
            requiredPlanByStyle: REQUIRED_PLAN_BY_STYLE,
        });
        if (styleValidationError) {
            setError(styleValidationError);
            return;
        }

        setAnalyzing(true);
        setError(null);
        setResult(null);
        setReferenceResult(null);
        setSections([]);
        setTips([]);
        setResultMode(null);
        setResultPlatform(null);
        setShowAllTips(false);
        setAnalyzedStyle(null);
        setProgressPct(0);
        setProgressTargetPct(0);
        mobileScrolledToProgressRef.current = false;
        abortRef.current = false;

        // Show sponsor ad for free/lite users immediately
        const shouldShowAdGate = (session.plan === "free" || session.plan === "lite") && sponsors.length > 0;
        setAdMustBeClosed(shouldShowAdGate);

        if (shouldShowAdGate && !currentSponsor) {
            const randomSponsor = sponsors[Math.floor(Math.random() * sponsors.length)];
            setCurrentSponsor(randomSponsor);
            setShowSponsor(true);
        } else if (shouldShowAdGate && currentSponsor) {
            setShowSponsor(true);
        } else {
            setShowSponsor(false);
        }

        try {
            const runPlatform = platform;
            const runStyle = style;
            const runMode = analysisMode;
            console.log('[ANALYZA] Start', { file, session, style, analysisMode });
            const { raw, rawWithMetadata, analysisDurationMs, finalStyleForDisplay } = await runAudioAnalysisPipeline({
                file,
                plan: session.plan,
                style: runStyle,
                analysisMode: runMode,
                comingSoonStyles: COMING_SOON_STYLES,
                availableStyles: AVAILABLE_STYLES,
                isAborted: () => abortRef.current,
                onProgress: updateProgress,
            });

            updateProgress({ stage: "Przygotowanie danych...", detail: "Ładowanie profilu stylu" });
            // Load the profile for the determined style
            const profileForDisplay = await loadProfile(finalStyleForDisplay);

            updateProgress({ stage: "Przygotowanie danych...", detail: "Dobieram tips" });
            let matchedTips: Tip[] = [];
            if (runPlatform) {
                matchedTips = buildPlatformTips(raw, runPlatform);
            } else {
                const allTips = await loadAllTips();
                const detectedProblems = detectProblems({
                    lufs: raw.global.integratedLufs,
                    truePeak: raw.global.truePeakDbtp,
                    lowRatio: raw.global.energyDistribution.low,
                    midRatio: raw.global.energyDistribution.mid,
                    highRatio: raw.global.energyDistribution.high,
                    stereoWidth: raw.global.stereo?.correlation ?? null,
                    dynamicRange: raw.global.lra,
                    harshnessIndex: null
                }, profileForDisplay.targets);

                matchedTips = matchTips(detectedProblems, allTips, session.plan);
            }

	            const minDurationMs = PLAN_MIN_ANALYSIS_MS[session.plan] ?? 0;
	            const remainingDelayMs = wantsReferenceCompare ? 0 : Math.max(0, minDurationMs - analysisDurationMs);
	            setProgressTargetPct((prev) => Math.max(prev, 70));
	            await waitUntilProgressReaches(69.6, 1500);

            const nextSections = runPlatform
                ? buildPlatformReportSections(raw, runPlatform, session.plan)
                : buildReportSections(raw, profileForDisplay, planFeatures.sectionsUnlocked, session.plan);
            const overallScoreNow = calculateOverallScore(nextSections);

            setResult(rawWithMetadata);
            setSections(nextSections);
            setTips(matchedTips);
            setResultMode(runPlatform ? "platform" : "style");
            setResultPlatform(runPlatform);
            setResultAnalysisMode(runMode);

	            if (wantsReferenceCompare && referenceFile) {
	                updateProgress({ stage: "Analiza referencji...", detail: "Start" });
	                setProgressTargetPct((prev) => Math.max(prev, 78));
	                const { rawWithMetadata: referenceWithMetadata } = await runAudioAnalysisPipeline({
	                    file: referenceFile,
	                    plan: session.plan,
	                    style: runStyle,
	                    analysisMode: runMode,
	                    comingSoonStyles: COMING_SOON_STYLES,
	                    availableStyles: AVAILABLE_STYLES,
	                    isAborted: () => abortRef.current,
	                    onProgress: (p) => updateProgress({ stage: `Ref: ${p.stage}`, detail: p.detail }),
	                });
	                setReferenceResult(referenceWithMetadata);
	            }

	            await runFinalizationSequence(remainingDelayMs);

	            setProgressTargetPct((prev) => Math.max(prev, 100));
	            await waitUntilProgressReaches(99.2, 2200);
	            setProgressPct(100);
	            await waitWithAbort(120, () => abortRef.current);
	            updateProgress({ stage: "Gotowe!", detail: "Wyniki gotowe" });
	            await waitWithAbort(FINAL_PROGRESS_HOLD_MS, () => abortRef.current);

            if (abortRef.current) throw new Error("Analiza została anulowana.");
            setAnalyzedStyle(finalStyleForDisplay); // Dopiero na końcu uaktualniamy stan sukcesu

            // Save analysis to server database (ALWAYS, for all plans including FREE)
            try {
                const saveResponse = await fetch(apiUrl('/api/analyses'), {
                    method: 'POST',
                    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify({
                        license_id: null,
                        style: finalStyleForDisplay,
                        filename: file?.name || 'Unknown'
                    })
                });

                if (!saveResponse.ok) {
                    throw new Error(`Failed to save analysis: ${saveResponse.status}`);
                }

                try {
                    const statsResponse = await fetch(apiUrl('/api/stats'));
                    if (statsResponse.ok) {
                        const statsData = await statsResponse.json();
                        setStats({
                            total: statsData?.total || 0,
                            today: statsData?.today || 0,
                        });
                    } else {
                        setStats((prev) => ({ total: prev.total + 1, today: prev.today + 1 }));
                    }
                } catch {
                    setStats((prev) => ({ total: prev.total + 1, today: prev.today + 1 }));
                }
            } catch (err) {
                console.warn('Could not save analysis to API:', err);
                // Nie przerwywaj analizy jeśli serwer nie odpowie
                setStats((prev) => ({ total: prev.total + 1, today: prev.today + 1 }));
            }

            // 🔄 AGGREGATION: Submit metrics for calibration system (ANONYMIZED)
            // Zbieraj anonimowe metryki do aktualizacji profili stylów
            try {
                const { submitMetricsToServer } = await import("@/lib/calibration");
                
                // Konwertuj na format AnalysisMetrics (bez filename!)
                const metricsForCalibration = {
                    lufs: raw.global.integratedLufs ?? -14,
                    true_peak: raw.global.truePeakDbtp ?? -1,
                    momentary_loudness: raw.global.integratedLufs ?? -14, // approx
                    low_ratio: raw.global.energyDistribution.low,
                    low_mid_ratio: 0.18, // TODO: calculate from spectrum
                    mid_ratio: raw.global.energyDistribution.mid,
                    mid_high_ratio: raw.global.energyDistribution.mid * 0.5, // approx
                    high_ratio: raw.global.energyDistribution.high,
                    stereo_correlation: raw.global.stereo?.correlation ?? 0.5,
                    stereo_width: raw.global.stereo?.width ?? 0.85,
                    spectral_centroid: 2500, // TODO: extract from DSP
                    spectral_spread: 4000,
                    spectral_tilt: -0.5,
                    low_mid_balance: raw.global.energyDistribution.low / Math.max(raw.global.energyDistribution.mid, 0.01),
                    presence_peak: 2.0,
                    transient_density: 15,
                    crest_factor: 8.0,
                    harshness_index: 35, // TODO: calculate from 2-8kHz band
                    brightness_index: 40,
                    warmth_index: 50,
                    engine_version: "1.0",
                    sample_rate: 44100,
                    duration_seconds: 180,
                    analysis_timestamp: Date.now(),
                };

                // Wyślij do agregacji TYLKO jeśli to potwierdzona referencja
                // - contributeToProfile = jawna zgoda użytkownika
                // - confidence > 0.9 = automatyczna detekcja pewna
                const shouldContribute = contributeToProfile || (referenceDetected?.confidence ?? 0) > 0.9;
                
                if (shouldContribute) {
                    const supported = new Set(AVAILABLE_STYLES.map((s) => s.slug));
                    const detectedStyle = referenceDetected?.matchedStyle;
                    const contributionStyle = detectedStyle && supported.has(detectedStyle as StyleSlug)
                        ? (detectedStyle as StyleSlug)
                        : finalStyleForDisplay;
                    await submitMetricsToServer(metricsForCalibration, contributionStyle);
                    console.log(`✓ Reference metrics submitted for ${contributionStyle} calibration`);
                } else if (referenceDetected && referenceDetected.confidence > 0) {
                    console.log(`ℹ️ Detected possible reference (${referenceDetected.confidence.toFixed(0)}%) but user didn't confirm: ${referenceDetected.reason}`);
                }
            } catch (err) {
                console.warn("Calibration submit skipped:", err);
                // Nie przerwywaj - to jest opcjonalne
            }

            // Save to LocalStorage history if plan supports it (Pro/Premium only)
            const histLimit = getHistoryLimit(session.plan);
            if (histLimit > 0 && file) {
                const styleLabels: Record<string, string> = { rock: "Rock", metal: "Metal", grunge: "Grunge" };
                saveAnalysis({
                    filename: file.name,
                    style: finalStyleForDisplay,
                    styleLabel: styleLabels[finalStyleForDisplay] ?? finalStyleForDisplay,
                    plan: session.plan,
                    metrics: {
                        integratedLufs: raw.global.integratedLufs,
                        truePeakDbtp: raw.global.truePeakDbtp,
                        lra: raw.global.lra,
                        lowPct: raw.global.energyDistribution.low,
                        midPct: raw.global.energyDistribution.mid,
                        highPct: raw.global.energyDistribution.high,
                        stereoCorrelation: raw.global.stereo?.correlation ?? null,
                        styleScore: overallScoreNow,
                    },
                }, histLimit);
                setHistoryEntries(getHistory(histLimit));
            }

        } catch (e: unknown) {
            if (e instanceof Error && e.message === "Analiza została anulowana.") {
                setError("Analiza została zatrzymana przez użytkownika.");
            } else if (e instanceof Error) {
                setError(e.message);
            } else {
                setError("Nieznany błąd analizy");
            }
        } finally {
            setAnalyzing(false);
            setProgress(null);
            setProgressPct(0);
            setProgressTargetPct(0);
            // Keep sponsor visible after analysis completes (will become modal)
            // For free/lite users, showSponsor stays true from card -> modal transition
        }
    };

    // Effect to show sponsor during analysis for free/lite users
    useEffect(() => {
        if (analyzing && (session.plan === "free" || session.plan === "lite") && sponsors.length > 0) {
            // Pick a random sponsor when analysis starts
            const randomSponsor = sponsors[Math.floor(Math.random() * sponsors.length)];
            setCurrentSponsor(randomSponsor);
            setShowSponsor(true);
        }
    }, [analyzing, session.plan, sponsors]);

    useEffect(() => {
        if (!analyzing || !progress || typeof window === "undefined" || window.innerWidth >= 768) {
            return;
        }
        if (mobileScrolledToProgressRef.current) {
            return;
        }
        if (!progressSectionRef.current) {
            return;
        }

        const navHeight = 80;
        const element = progressSectionRef.current;
        const elementTop = element.getBoundingClientRect().top + window.scrollY;
        const offsetPosition = Math.max(0, elementTop - navHeight);

        window.scrollTo({
            top: offsetPosition,
            behavior: "smooth",
        });
        mobileScrolledToProgressRef.current = true;
    }, [analyzing, progress]);

    useEffect(() => {
        let frameId = 0;
        let lastTime = performance.now();
        const tuning = PLAN_PROGRESS_TUNING[session.plan];
        const progressText = `${progress?.stage ?? ""} ${progress?.detail ?? ""}`.toLowerCase();
        const isTruePeakStage = progressText.includes("truepeak") || progressText.includes("true peak");
        const stageEasing = tuning.easing * (isTruePeakStage ? 1.35 : 1);
        const stageMinStep = tuning.minStep * (isTruePeakStage ? 2.4 : 1);

        const tick = (now: number) => {
            setProgressPct((current) => {
                if (!analyzing || current >= progressTargetPct) {
                    return current;
                }

                const diff = progressTargetPct - current;
                const dtFactor = Math.min(Math.max((now - lastTime) / tuning.intervalMs, 0.75), 1.8);
                const next = current + Math.max(stageMinStep, diff * stageEasing) * dtFactor;
                return Math.min(progressTargetPct, next);
            });

            lastTime = now;
            frameId = requestAnimationFrame(tick);
        };

        if (analyzing && progressPct < progressTargetPct) {
            frameId = requestAnimationFrame(tick);
        }

        return () => cancelAnimationFrame(frameId);
    }, [analyzing, progress, progressPct, progressTargetPct, session.plan]);

    useEffect(() => {
        const interval = setInterval(() => {
            setLoadingTip(prev => {
                let next;
                do {
                    next = ANALYZE_LOADING_TIPS[Math.floor(Math.random() * ANALYZE_LOADING_TIPS.length)];
                } while (next === prev);
                return next;
            });
        }, 12000);
        return () => clearInterval(interval);
    }, []);

    return (
        <main className="min-h-screen grid-texture">
            <SponsorPromo
                sponsor={mounted && analyzedStyle && showSponsor && (session.plan === "free" || session.plan === "lite") ? currentSponsor : null}
                closable
                onClose={closeSponsorGate}
                modal
            />

            <AnalyzeErrorModal
                error={error}
                isUpsellError={isUpsellError}
                upsellPlan={upsellPlan}
                onClose={() => setError(null)}
                onGoToPlan={(plan) => router.push(`/payment?plan=${plan}#compare-plans`)}
                onReload={() => window.location.reload()}
            />

            {/* Nav */}
            <nav className="sticky top-0 z-50 border-b border-[var(--border)] backdrop-blur-md bg-[rgba(9,11,15,0.85)]">
                <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
                    <Link href="/">
                        <BrandLogo size="md" />
                    </Link>
                    <div className="flex flex-1 items-center justify-end">
                        <div className="flex items-center gap-4 pl-6">
                        <Link
                            href="/activate"
                            className={`btn btn-outline text-xs py-1.5 px-3 border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--text-primary)] transition-all whitespace-nowrap ${mounted && session.plan === "free" ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                        >
                            Aktywuj kod
                        </Link>
                            <div className="flex flex-col items-end w-[88px]" suppressHydrationWarning>
                                <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-tighter">Twój Plan</span>
                                <span className="text-xs font-black uppercase text-[var(--accent)] tracking-wider w-full text-right">
                                    {mounted ? session.plan : "free"}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="max-w-6xl mx-auto px-6 pt-4 pb-10 md:py-10">
                <Link
                    href="/"
                    className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-muted)] transition-colors hover:text-[var(--accent)] md:mb-6"
                >
                    <span aria-hidden="true">←</span>
                    <span>Powrót do strony głównej</span>
                </Link>
                <h1 className="text-2xl font-bold mb-2">TL Meter</h1>
                <p className="text-[var(--text-secondary)] mb-6 max-w-2xl md:max-w-3xl">
                    Obiektywna, cyfrowa analiza Twojej muzyki z domowego studia. Sprawdź czy Twój miks trzyma standardy rynkowe zanim wyślesz go do masteringu albo na platformy streamingowe.
                </p>

	                <AnalyzeControls
	                    style={style}
	                    canUseAutoStyle={canUseAutoStyle}
	                    sessionPlan={session.plan}
	                    stylesByPlan={STYLES_BY_PLAN}
	                    comingSoonStyles={COMING_SOON_STYLES}
	                    requiredPlanByStyle={REQUIRED_PLAN_BY_STYLE}
	                    platform={platform}
	                    onPlatformChange={handlePlatformChange}
	                    routerPush={router.push}
	                    setStyle={(next) => {
	                        if (result && !analyzing) {
	                            clearResults();
	                        }
	                        setStyle(next);
	                    }}
	                    setAnalysisMode={(next) => {
	                        if (result && !analyzing) {
	                            clearResults();
	                        }
	                        setAnalysisMode(next);
	                    }}
	                    analyzing={analyzing}
	                    dragging={dragging}
	                    onDrop={onDrop}
	                    onDragOver={onDragOver}
	                    onDragLeave={onDragLeave}
	                    fileRef={fileRef}
	                    onFileSelected={handleFileSelected}
	                    file={file}
	                    referenceFileRef={referenceFileRef}
	                    onReferenceFileSelected={handleReferenceFileSelected}
	                    referenceFile={referenceFile}
	                    compareWithReference={compareWithReference}
	                    onCompareWithReferenceChange={(enabled) => {
	                        setCompareWithReference(enabled);
	                        if (!enabled) {
	                            setReferenceFile(null);
	                            setReferenceResult(null);
	                            return;
	                        }
	                        // Allow enabling compare after running a non-compare analysis:
	                        // if user was in "Sugeruj", switch to manual using the resolved style.
		                        if (style === "suggest" || analysisMode === "suggest") {
		                            const supported = new Set(AVAILABLE_STYLES.map((s) => s.slug));
		                            const fromAnalyzed = analyzedStyle && supported.has(analyzedStyle) ? analyzedStyle : null;
		                            const bestGenre = result?.styleMatch?.best_match?.genre as StyleSlug | undefined;
		                            const fromResult = bestGenre && supported.has(bestGenre) ? bestGenre : null;
		                            const nextStyle = fromAnalyzed || fromResult || "rock";
		                            setStyle(nextStyle);
		                            setAnalysisMode("manual");
		                        }
	                    }}
	                    uploadInfo={uploadInfo}
	                    onRunAnalysis={runAnalysis}
	                />

                {/* Progress */}
                {analyzing && progress && (
                    <AnalysisProgressPanel
                        progress={progress}
                        progressPct={progressPct}
                        progressSectionRef={progressSectionRef}
                        onAbort={() => {
                            abortRef.current = true;
                        }}
                    />
                )}

                <SponsorPromo
                    sponsor={mounted && analyzing && showSponsor && (session.plan === "free" || session.plan === "lite") ? currentSponsor : null}
                />

                <LoadingTipCard visible={sections.length === 0} loadingTip={loadingTip} />

	                <AnalysisResults
	                    result={result}
	                    referenceResult={referenceResult}
	                    referenceFile={referenceFile}
	                    sections={sections}
	                    adMustBeClosed={adMustBeClosed}
	                    analysisMode={resultAnalysisMode}
	                    platform={resultPlatform}
	                    isPlatformMode={resultMode === "platform"}
	                    analyzedStyle={analyzedStyle}
	                    sessionPlan={session.plan}
	                    stats={stats}
	                    file={file}
	                    downloadCoreJson={downloadCoreJson}
	                    routerPush={router.push}
	                    tips={tips}
	                    showAllTips={showAllTips}
	                    onShowAllTips={() => setShowAllTips(true)}
	                    referenceDetected={referenceDetected}
	                    contributeToProfile={contributeToProfile}
	                    onAddToLibrary={async ({ style: styleOverride }) => {
	                        await submitCurrentToStyleLibrary({ style: styleOverride });
	                    }}
	                    planFeatures={planFeatures}
	                />
            </div>

            {result && !analyzing && (
                <div className="max-w-6xl mx-auto px-6 my-6">
                    <div className="flex justify-center">
                        <button
                            type="button"
                            onClick={() => {
                                clearResults();
                                setCompareWithReference(false);
                                setReferenceFile(null);
                                setReferenceDetected(null);
                                setContributeToProfile(false);
                            }}
                            className="btn btn-danger-outline text-xs px-4 py-2"
                        >
                            Wyczyść aktualną analizę
                        </button>
                    </div>
                </div>
            )}

            <AnalysisHistorySection
                mounted={mounted}
                historyEntries={historyEntries}
                current={result ? {
                    integratedLufs: result.global.integratedLufs,
                    truePeakDbtp: result.global.truePeakDbtp,
                    lra: result.global.lra,
                    lowPct: result.global.energyDistribution.low,
                    midPct: result.global.energyDistribution.mid,
                    highPct: result.global.energyDistribution.high,
                    stereoCorrelation: result.global.stereo?.correlation ?? null,
                    styleScore: overallScore,
                } : null}
                plan={session.plan}
                onClear={() => {
                    clearHistory();
                    setHistoryEntries([]);
                }}
            />

            {/* Footer */}
            <footer className="border-t border-[var(--border)] py-8 mt-12 bg-[var(--bg-surface)]">
                <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between text-sm text-[var(--text-muted)] gap-8">
                    <div className="flex flex-col md:flex-row items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-[var(--text-secondary)]">© 2026 TruLab</span>
                            <button
                                onClick={() => {
                                    clearSession();
                                    window.location.reload();
                                }}
                                className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors opacity-60 hover:opacity-100"
                                title="Resetuj sesję (Test)"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2-9m2 9a9 9 0 0 1-10 8.95"></path></svg>
                            </button>
                        </div>
                        <span className="hidden md:inline">|</span>
                        <span>TL Meter. Profesjonalne narzędzie DSP dla domowych producentów muzyki.</span>
                    </div>
                    <div className="flex gap-6">
                        <Link href="/" className="hover:text-[var(--text-secondary)] transition-colors">Kontakt</Link>
                        <Link href="/activate" className="hover:text-[var(--text-secondary)] transition-colors whitespace-nowrap">Aktywuj kod</Link>
                        <Link href="/terms" className="hover:text-[var(--text-secondary)] transition-colors">Regulamin</Link>
                    </div>
                </div>
            </footer>
        </main>
    );
}
