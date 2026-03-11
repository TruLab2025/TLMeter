"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AVAILABLE_STYLES, loadProfile, scoreInRange, getStatus, type StyleSlug, type StyleProfile } from "@/lib/profiles";
import { getSession, clearSession, PLAN_FEATURES, type Plan, type SessionData } from "@/lib/license";
import { loadAllTips, detectProblems, matchTips, type Tip } from "@/lib/tips";
import { saveAnalysis, getHistory, clearHistory, type HistoryEntry } from "@/lib/history";
import { calculateStyleMatch } from "@/lib/reports/style-match";
import HistoryPanel from "@/components/HistoryPanel";
import SponsorScreen, { type Sponsor } from "@/components/SponsorScreen";
import BrandLogo from "@/components/BrandLogo";
import { detectIfReference } from "@/lib/calibration/reference-detection";
import { generateCoreReportFromAnalysis, generateRawDspDump, generatePublicReportFromAnalysis } from "@/lib/reports";

// Types for raw DSP output (subset used for display)
interface AnalysisResult {
    meta: { durationSec: number; sampleRate: number };
    analysisDurationMs?: number; // Time taken to analyze
    styleMatch?: {
        selected_genre: string;
        selected_score: number;
        best_match: {
            genre: string;
            score: number;
        };
        all_scores: Record<string, number>;
        explanations: string[];
    };
    global: {
        integratedLufs: number | null;
        truePeakDbtp: number | null;
        lra: number | null;
        energyDistribution: { low: number; mid: number; high: number };
        stereo?: { correlation?: number; width?: number };
        spectral?: { 
            flatnessMean?: number; 
            hfcMean?: number;
            spectralHistogram?: number[]; // 8-band spectrum for style matching
            centroidHzMean?: number;
        };
        crestFactorDbMean?: number | null;
        transients?: { onsetStrengthMean?: number };
        rhythm?: { tempoBpm?: number };
    };
    timeSeries?: {
        onsetTimesSec?: number[];
    };
}

type SectionStatus = "ok" | "warn" | "bad";

interface SectionResult {
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

function estimateTransientDensity(raw: AnalysisResult): number | null {
    const duration = raw.meta?.durationSec;
    const onsets = raw.timeSeries?.onsetTimesSec;
    if (!duration || duration <= 0 || !Array.isArray(onsets) || onsets.length === 0) {
        return null;
    }
    return onsets.length / duration;
}

const STATUS_LABEL: Record<SectionStatus, string> = { ok: "Idealnie", warn: "Ostrzeżenie", bad: "Problem" };
const STATUS_COLOR: Record<SectionStatus, string> = {
    ok: "var(--ok)",
    warn: "var(--warn)",
    bad: "var(--bad)",
};

const LOADING_TIPS = [
    "Złota zasada miksu: zacznij od wyrównania proporcji głośności samych śladów be użycia wtyczek.",
    "Wiesz że...? Usunięcie dudniącego dołu z gitar robi ogromnie dużo wolnego pasma przestrzeni dla gitary basowej i stopy.",
    "Mastering nie naprawi w magiczny sposób zepsutego miksu. Najlepiej brzmiące produkcje są świetne już na etapie surowych zgrywek.",
    "Zawsze sprawdzaj miks w trybie mono. Jeśli elementy giną, to dowód, że masz ukryte problemy z korelacją fazową instrumentów.",
    "Loudness Penalty: serwisy streamingowe bezpowrotnie przyciszają głośność przelimitowanych, 'ceglastych' utworów. Czasem ciszej znaczy głośniej.",
    "Essentia.js wykonuje pod spodem potężne analizy psychoakustyczne oparte na badaniach akademickich percepcji słuchu.",
    "Pamiętaj o headroomie! Zostaw ok. -3dB do -6dB na sumie przed masteringiem, żeby procesor dynamiki miał miejsce na pracę.",
    "Zbyt dużo pasma niskiego (sub-bass) na ścieżkach niebasowych to najczęstszy powód braku klarowności w miksie.",
    "Używaj filtrów górnoprzepustowych (HPF) z rozwagą – zbyt mocne cięcie może pozbawić miks naturalnego ciepła i fundamentu.",
    "Wokale najlepiej brzmią, gdy ich dynamika jest kontrolowana dwustopniowo: najpierw szybki kompresor (szczyty), potem wolniejszy (wyrównanie).",
    "Prawidłowy balans tonalny jest ważniejszy niż głośność. Jeśli miks jest zrównoważony, łatwiej go potem pogłośnić bez artefaktów.",
    "Słuchaj swojego miksu na różnych poziomach głośności. Ciche słuchanie ujawnia błędy w proporcjach wokalu i instrumentów prowadzących.",
    "Mniej znaczy więcej – często usunięcie jednej niepotrzebnej wtyczki poprawia brzmienie bardziej niż dodanie trzech nowych.",
    "TL Meter to Twój obiektywny sędzia. Jeśli on mówi, że jest 'bad', to Twoje uszy prawdopodobnie przyzwyczaiły się do błędu."
];

// Security: tighten accepted uploads to well-known audio formats + per-plan size caps
const SUPPORTED_FILE_EXTENSIONS = [".wav", ".aiff", ".aif", ".mp3", ".flac", ".ogg", ".m4a"] as const;
const MAX_UPLOAD_SIZE_MB: Record<Plan, number> = {
    free: 5,
    lite: 40,
    pro: 80,
    premium: 100,
};

function getRecommendedPlanForFileSize(fileSizeBytes: number): Plan | null {
    const fileSizeMb = fileSizeBytes / 1024 / 1024;
    if (fileSizeMb <= MAX_UPLOAD_SIZE_MB.lite) return "lite";
    if (fileSizeMb <= MAX_UPLOAD_SIZE_MB.pro) return "pro";
    if (fileSizeMb <= MAX_UPLOAD_SIZE_MB.premium) return "premium";
    return null;
}

const PLAN_MIN_ANALYSIS_MS: Record<Plan, number> = {
    free: 12000,
    lite: 8000,
    pro: 3500,
    premium: 1200,
};

const PLAN_PROGRESS_TUNING: Record<Plan, { intervalMs: number; easing: number; minStep: number }> = {
    free: { intervalMs: 110, easing: 0.045, minStep: 0.06 },
    lite: { intervalMs: 100, easing: 0.06, minStep: 0.1 },
    pro: { intervalMs: 90, easing: 0.09, minStep: 0.16 },
    premium: { intervalMs: 78, easing: 0.15, minStep: 0.28 },
};

const FINAL_PROGRESS_HOLD_MS = 900;

function progressTargetForStage(progress: { stage: string; detail?: string }): number {
    const text = `${progress.stage} ${progress.detail ?? ""}`.toLowerCase();
    if (text.includes("ładowanie")) return 8;
    if (text.includes("dekodowanie")) return 16;
    if (text.includes("window") || text.includes("najgłośniejsze")) return 24;
    if (text.includes("backend")) return 30;
    if (text.includes("analiza dsp")) return 36;
    if (text.includes("spektrum") || text.includes("spectrum")) return 46;
    if (text.includes("onsets") || text.includes("transients")) return 54;
    if (text.includes("rhythm")) return 60;
    if (text.includes("smi")) return 64;
    if (text.includes("meyda")) return 68;
    if (text.includes("psycho")) return 62;
    if (text.includes("hpss")) return 66;
    if (text.includes("chord")) return 69;
    if (text.includes("stability")) return 72;
    if (text.includes("truepeak") || text.includes("true peak")) {
        const detail = progress.detail ?? "";
        const percentMatch = String(detail).match(/(\d+(?:\.\d+)?)\s*%/);
        const parsedPct = percentMatch ? Number.parseFloat(percentMatch[1]) : Number.NaN;
        if (Number.isFinite(parsedPct)) {
            const clamped = Math.max(0, Math.min(100, parsedPct));
            return 63 + (clamped * 0.12); // 63% -> 75%
        }
        return 75;
    }
    if (text.includes("finalizacja")) {
        if (text.includes("profilu stylu")) return 76;
        if (text.includes("tips")) return 80;
        if (text.includes("przygotowuję wyniki")) return 85;
        if (text.includes("waliduję metryki")) return 90;
        if (text.includes("buduję sekcje")) return 95;
        if (text.includes("pakuję wynik")) return 99.8;
        return 78;
    }
    if (text.includes("przygotowanie danych")) return 74;
    if (text.includes("gotowe")) return 100;
    return 50;
}

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
    const [style, setStyle] = useState<StyleSlug | 'suggest'>('suggest');
    const [analyzedStyle, setAnalyzedStyle] = useState<StyleSlug | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [dragging, setDragging] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [progress, setProgress] = useState<{ stage: string; detail?: string } | null>(null);
    const [progressPct, setProgressPct] = useState(0);
    const [progressTargetPct, setProgressTargetPct] = useState(0);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [sections, setSections] = useState<SectionResult[]>([]);
    const [tips, setTips] = useState<Tip[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loadingTip, setLoadingTip] = useState(LOADING_TIPS[0]);
    const [showAllTips, setShowAllTips] = useState(false);
    const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
    const [stats, setStats] = useState({ total: 0, today: 0 });
    const [sponsors, setSponsors] = useState<Sponsor[]>([]);
    const [currentSponsor, setCurrentSponsor] = useState<Sponsor | null>(null);
    const [showSponsor, setShowSponsor] = useState(false);
    const [adMustBeClosed, setAdMustBeClosed] = useState(false);
    const [analysisMode, setAnalysisMode] = useState<'suggest' | 'manual'>('suggest');
    // Reference detection state
    const [referenceDetected, setReferenceDetected] = useState<{ isReference: boolean; confidence: number; reason: string } | null>(null);
    const [contributeToProfile, setContributeToProfile] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);
    const abortRef = useRef<boolean>(false);
    const progressSectionRef = useRef<HTMLDivElement>(null);
    const mobileScrolledToProgressRef = useRef(false);
    const progressPctRef = useRef(0);
    const router = useRouter();

    // Hydration-safe: avoid SSR/client mismatch
    const [session, setSession] = useState<SessionData>({ plan: "free" });
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // Load real session on client only
        setSession(getSession());
        setMounted(true);
    }, []);

    const planFeatures = PLAN_FEATURES[session.plan];
    const canUseAutoStyle = session.plan !== "free";
    const uploadInfoByPlan: Record<Plan, string> = {
        free: `Plan FREE: MP3 / AAC / M4A (stratne) · do ${MAX_UPLOAD_SIZE_MB.free} MB`,
        lite: `Plan LITE: WAV / AIFF + MP3 / AAC / M4A · do ${MAX_UPLOAD_SIZE_MB.lite} MB`,
        pro: `Plan PRO: + FLAC / OGG oraz wszystkie niższe formaty · do ${MAX_UPLOAD_SIZE_MB.pro} MB`,
        premium: `Plan PREMIUM: + FLAC / OGG oraz wszystkie niższe formaty · do ${MAX_UPLOAD_SIZE_MB.premium} MB`,
    };

    const stylesByPlan: Record<Plan, StyleSlug[]> = {
        free: ["rock", "grunge", "metal"],
        lite: ["rock", "grunge", "metal", "pop", "hiphop", "edm"],
        pro: ["rock", "grunge", "metal", "pop", "hiphop", "edm", "house", "techno", "trap", "indie", "folk", "classic", "jazz", "rnb", "ambient"],
        premium: ["rock", "grunge", "metal", "pop", "hiphop", "edm", "house", "techno", "trap", "indie", "folk", "classic", "jazz", "rnb", "ambient"],
    };

    const requiredPlanByStyle: Record<StyleSlug, "lite" | "pro"> = {
        rock: "lite",
        grunge: "lite",
        metal: "lite",
        pop: "lite",
        hiphop: "lite",
        edm: "lite",
        house: "pro",
        techno: "pro",
        trap: "pro",
        indie: "pro",
        folk: "pro",
        classic: "pro",
        jazz: "pro",
        rnb: "pro",
        ambient: "pro",
    };

    const comingSoonStyles: StyleSlug[] = ["jazz", "rnb", "ambient"];

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
        const histLimit = session.plan === "premium" ? 4 : session.plan === "pro" ? 1 : 0;
        setHistoryEntries(getHistory(histLimit));
    }, [session.plan, mounted]);

    // Fetch analysis statistics
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch('http://localhost:3000/api/stats');
                if (res.ok) {
                    const data = await res.json();
                    setStats({ total: data?.total || 0, today: data?.today || 0 });
                }
            } catch (err) {
                console.warn('Stats endpoint unavailable:', err);
            }
        };
        fetchStats();
    }, []);

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
        const dotIndex = f.name.lastIndexOf(".");
        const extension = dotIndex >= 0 ? f.name.slice(dotIndex).toLowerCase() : "";
        const isExtensionSupported = SUPPORTED_FILE_EXTENSIONS.includes(extension as typeof SUPPORTED_FILE_EXTENSIONS[number]);
        if (!isExtensionSupported) {
            setError("Format nie jest obsługiwany. Dozwolone: WAV / AIFF / MP3 / FLAC / OGG / M4A.");
            setFile(null);
            return;
        }

        const maxSizeBytes = MAX_UPLOAD_SIZE_MB[session.plan] * 1024 * 1024;
        if (f.size > maxSizeBytes) {
            const recommendedPlan = getRecommendedPlanForFileSize(f.size);
            const sizeError = recommendedPlan
                ? `Plik przekracza limit ${MAX_UPLOAD_SIZE_MB[session.plan]} MB dla planu ${session.plan.toUpperCase()}. Odblokuj plan ${recommendedPlan.toUpperCase()}, aby analizować większe pliki.`
                : `Plik przekracza limit ${MAX_UPLOAD_SIZE_MB[session.plan]} MB dla planu ${session.plan.toUpperCase()}. Maksymalny obsługiwany rozmiar to ${MAX_UPLOAD_SIZE_MB.premium} MB w planie PREMIUM.`;
            setError(sizeError);
            setFile(null);
            return;
        }

        setError(null);
        setFile(f);
        setContributeToProfile(false); // Reset checkbox

        // Detect if this file might be a reference for the current style
        const detection = detectIfReference(f.name, style);
        if (detection.isReference || detection.confidence > 0.3) {
            setReferenceDetected(detection);
        } else {
            setReferenceDetected(null);
        }
    }, [style, session.plan]);

    // Drop handlers
    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) handleFileSelected(f);
    }, [handleFileSelected]);
    const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
    const onDragLeave = () => setDragging(false);

    const updateProgress = useCallback((nextProgress: { stage: string; detail?: string }) => {
        setProgress(nextProgress);
        const target = progressTargetForStage(nextProgress);
        setProgressTargetPct((prev) => Math.max(prev, target));
    }, []);

    useEffect(() => {
        progressPctRef.current = progressPct;
    }, [progressPct]);

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

    const closeSponsorGate = useCallback(() => {
        setShowSponsor(false);
        setAdMustBeClosed(false);
    }, []);

    async function runAnalysis() {
        if (!file || analyzing) {
            return;
        }

        if (session.plan === "free" && analysisMode === "suggest") {
            setError("Tryb auto „Sugeruj styl” jest dostępny od planu Lite. Odblokuj plan Lite, aby używać auto‑wykrywania stylu.");
            return;
        }

        const analysisStartTime = performance.now();

        // Check format based on plan (MIME + extension fallback)
        const extension = file.name.split('.').pop()?.toLowerCase() ?? "";
        const allowedExtensionsByPlan: Record<Plan, string[]> = {
            free: ["mp3", "aac", "m4a"],
            lite: ["mp3", "aac", "m4a", "wav", "aiff", "aif"],
            pro: ["*"],
            premium: ["*"],
        };
        const extensionAllowed = allowedExtensionsByPlan[session.plan].includes("*") || allowedExtensionsByPlan[session.plan].includes(extension);
        const mimeAllowed = planFeatures.allowedFormats.includes('*') || planFeatures.allowedFormats.includes(file.type);
        const isAllowed = mimeAllowed || extensionAllowed;
        if (!isAllowed) {
            const isFlacOrOgg = ["flac", "ogg", "oga"].includes(extension) || ["audio/flac", "audio/ogg", "audio/oga", "application/ogg"].includes(file.type);
            if (isFlacOrOgg) {
                setError("Format FLAC/OGG jest dostępny od planu Pro. Odblokuj plan Pro, aby analizować ten format.");
            } else {
                setError(`Format ${file.type.split('/')[1]?.toUpperCase() || extension.toUpperCase() || 'wybrany'} wymaga planu Lite/Pro (bezstratna analiza WAV/AIFF). Odblokuj plan Lite, aby analizować ten format.`);
            }
            setFile(null);
            return;
        }

        const maxSizeBytes = MAX_UPLOAD_SIZE_MB[session.plan] * 1024 * 1024;
        if (file.size > maxSizeBytes) {
            const recommendedPlan = getRecommendedPlanForFileSize(file.size);
            const sizeError = recommendedPlan
                ? `Plik przekracza limit ${MAX_UPLOAD_SIZE_MB[session.plan]} MB dla planu ${session.plan.toUpperCase()}. Odblokuj plan ${recommendedPlan.toUpperCase()}, aby analizować większe pliki.`
                : `Plik przekracza limit ${MAX_UPLOAD_SIZE_MB[session.plan]} MB dla planu ${session.plan.toUpperCase()}. Maksymalny obsługiwany rozmiar to ${MAX_UPLOAD_SIZE_MB.premium} MB w planie PREMIUM.`;
            setError(sizeError);
            setFile(null);
            return;
        }

        const manualStyleSlug = style !== 'suggest' ? style as StyleSlug : null;
        if (analysisMode === 'manual' && manualStyleSlug) {
            const allowedStyles = stylesByPlan[session.plan];
            if (!allowedStyles.includes(manualStyleSlug)) {
                const requiredPlan = requiredPlanByStyle[manualStyleSlug] ?? 'pro';
                const styleLabel = AVAILABLE_STYLES.find(s => s.slug === manualStyleSlug)?.name ?? manualStyleSlug;
                setError(`Styl ${styleLabel} wymaga planu ${requiredPlan.toUpperCase()}.`);
                return;
            }
        }

        setAnalyzing(true);
        setError(null);
        setResult(null);
        setSections([]);
        setTips([]);
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
            console.log('[ANALYZA] Start', { file, session, style, analysisMode });
            const autoEligibleStyles = AVAILABLE_STYLES.map(s => s.slug as StyleSlug).filter(slug => !comingSoonStyles.includes(slug));

            // Determine which style to analyze
            let styleForAnalysis: StyleSlug;
            
            if (analysisMode === 'suggest') {
                // In suggest mode, we'll determine the best style after DSP analysis
                // For now, use a default style for initial profile loading
                styleForAnalysis = "rock" as StyleSlug;
            } else {
                // In manual mode, use the selected style
                styleForAnalysis = style as StyleSlug;
            }
            
            const profile = await loadProfile(styleForAnalysis);
            const currentStyleRun = styleForAnalysis;

            // Load audio
            if (abortRef.current) throw new Error("Analiza została anulowana.");
            updateProgress({ stage: "Ładowanie pliku..." });
            let arrayBuffer;
            try {
                arrayBuffer = await file.arrayBuffer();
            } catch (e) {
                console.error('[ANALYZA] Błąd arrayBuffer', e);
                throw e;
            }

            if (abortRef.current) throw new Error("Analiza została anulowana.");
            let audioCtx: AudioContext | null = null;
            let audioBuffer: AudioBuffer | null = null;
            try {
                audioCtx = new AudioContext();
                if (abortRef.current) throw new Error("Analiza została anulowana.");
                updateProgress({ stage: "Dekodowanie audio..." });
                audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
            } catch (e) {
                console.error('[ANALYZA] Błąd decodeAudioData', e);
                throw e;
            } finally {
                if (audioCtx && audioCtx.state !== "closed") {
                    await audioCtx.close().catch(() => undefined);
                }
            }

            if (!audioBuffer) {
                console.error('[ANALYZA] audioBuffer niezainicjalizowany!');
                throw new Error("Nie udało się zdekodować pliku audio.");
            }

            // Dynamically import the analyzer (DSP engine)
            if (abortRef.current) throw new Error("Analiza została anulowana.");
            updateProgress({ stage: "Analiza DSP...", detail: "loudness" });
            let analyzeAudioBuffer;
            try {
                ({ analyzeAudioBuffer } = await import("@/lib/dsp/analyze"));
            } catch (e) {
                console.error('[ANALYZA] Błąd importu analyzeAudioBuffer', e);
                throw e;
            }
            // Dla Premium większe frameMs/hopMs (szybsza analiza)
            const isPremium = session.plan === "premium";
            let raw;
            try {
                raw = await analyzeAudioBuffer(audioBuffer, {
                frameMs: isPremium ? 128 : 46,
                hopMs: isPremium ? 64 : 23,
                rolloffPercent: 95,
                forceEssentia: isPremium ? true : false,
                // @ts-ignore - dodane specjalnie w JS zeby backend zatrzymywał skan
                isAborted: () => abortRef.current,
                onProgress: (p: { stage: string; detail?: string }) => {
                    if (!abortRef.current) updateProgress(p);
                },
                }) as AnalysisResult;
            } catch (e) {
                console.error('[ANALYZA] Błąd analyzeAudioBuffer', e);
                throw e;
            }

            if (abortRef.current) throw new Error("Analiza została anulowana.");

            const analysisDurationMs = performance.now() - analysisStartTime;
            
            // Calculate style match scores using 8-band spectral histogram from DSP
            const spectralHistogram = raw.global.spectral?.spectralHistogram || [];
            const styleMatchFeatures = {
                spectralHistogram,
                spectralCentroid: raw.global.spectral?.centroidHzMean ?? null,
                transientDensity: estimateTransientDensity(raw),
            };
            const initialStyleMatch = calculateStyleMatch(styleMatchFeatures, currentStyleRun);
            
            // Determine the final style to use based on analysis mode
            let finalStyleForDisplay: StyleSlug;
            let styleMatch = initialStyleMatch;
            
            if (analysisMode === 'suggest') {
                // In suggest mode, pick the best available genre that we actually support in the UI
                const rankedGenres = Object.entries(initialStyleMatch.all_scores).sort((a, b) => b[1] - a[1]);
                const bestSupported = rankedGenres.find(([genre]) => autoEligibleStyles.includes(genre as StyleSlug));
                finalStyleForDisplay = (bestSupported?.[0] ?? "rock") as StyleSlug;
                // Recalculate to make the best-match genre the "selected" genre in the result
                styleMatch = calculateStyleMatch(styleMatchFeatures, finalStyleForDisplay);
            } else {
                // In manual mode, use the selected genre
                finalStyleForDisplay = currentStyleRun;
                styleMatch = initialStyleMatch;
            }
            
            const rawWithMetadata = { ...raw, analysisDurationMs, styleMatch };

            updateProgress({ stage: "Przygotowanie danych...", detail: "Ładowanie profilu stylu" });
            // Load the profile for the determined style
            const profileForDisplay = await loadProfile(finalStyleForDisplay);

            updateProgress({ stage: "Przygotowanie danych...", detail: "Dobieram tips" });
            // Compute Tips
            const allTips = await loadAllTips();
            const detectedProblems = detectProblems({
                lufs: raw.global.integratedLufs,
                truePeak: raw.global.truePeakDbtp,
                lowRatio: raw.global.energyDistribution.low,
                midRatio: raw.global.energyDistribution.mid,
                highRatio: raw.global.energyDistribution.high,
                stereoWidth: raw.global.stereo?.correlation ?? null,
                dynamicRange: raw.global.lra,
                harshnessIndex: null // TODO: map from spectral/psycho properly if needed
            }, profileForDisplay.targets);

            const matchedTips = matchTips(detectedProblems, allTips, session.plan);

            const minDurationMs = PLAN_MIN_ANALYSIS_MS[session.plan] ?? 0;
            const remainingDelayMs = Math.max(0, minDurationMs - analysisDurationMs);
            setProgressTargetPct((prev) => Math.max(prev, 75));
            await waitUntilProgressReaches(74.8, 1500);
            await runFinalizationSequence(remainingDelayMs);

            setProgressTargetPct((prev) => Math.max(prev, 100));
            await waitUntilProgressReaches(99.2, 2200);
            setProgressPct(100);
            await waitWithAbort(120, () => abortRef.current);
            updateProgress({ stage: "Gotowe!", detail: "Wyniki gotowe" });
            await waitWithAbort(FINAL_PROGRESS_HOLD_MS, () => abortRef.current);

            setResult(rawWithMetadata);
            computeSections(raw, profileForDisplay, planFeatures.sectionsUnlocked);
            setTips(matchedTips);

            if (abortRef.current) throw new Error("Analiza została anulowana.");
            setAnalyzedStyle(finalStyleForDisplay); // Dopiero na końcu uaktualniamy stan sukcesu

            // Save analysis to server database (ALWAYS, for all plans including FREE)
            try {
                await fetch('http://localhost:3000/api/analyses', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        license_id: session.code || null,
                        style: finalStyleForDisplay,
                        filename: file?.name || 'Unknown'
                    })
                });
                // Update local stats counter after successful save
                setStats(prev => ({ total: prev.total + 1, today: prev.today + 1 }));
            } catch (err) {
                console.warn('Could not save analysis to API:', err);
                // Nie przerwywaj analizy jeśli serwer nie odpowie
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
                    await submitMetricsToServer(metricsForCalibration, finalStyleForDisplay);
                    console.log(`✓ Reference metrics submitted for ${finalStyleForDisplay} calibration`);
                } else if (referenceDetected && referenceDetected.confidence > 0) {
                    console.log(`ℹ️ Detected possible reference (${referenceDetected.confidence.toFixed(0)}%) but user didn't confirm: ${referenceDetected.reason}`);
                }
            } catch (err) {
                console.warn("Calibration submit skipped:", err);
                // Nie przerwywaj - to jest opcjonalne
            }

            // Save to LocalStorage history if plan supports it (Pro/Premium only)
            const histLimit = session.plan === "premium" ? 4 : session.plan === "pro" ? 1 : 0;
            if (histLimit > 0 && file) {
                const overallScoreNow = sections.filter(s => !s.locked).length > 0
                    ? Math.round(sections.filter(s => !s.locked).reduce((sum, s) => sum + s.score, 0) / sections.filter(s => !s.locked).length)
                    : null;
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

    const downloadCoreJson = useCallback(() => {
        if (!result || !analyzedStyle) return;

        const exportData = generatePublicReportFromAnalysis(result, analyzedStyle, session.plan);
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `TL-Meter-${exportData.schema_version}-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [result, analyzedStyle, session.plan]);

    const downloadRawJson = useCallback(() => {
        if (!result || !analyzedStyle) return;

        const rawDump = generateRawDspDump(result, analyzedStyle, session.plan);
        const blob = new Blob([JSON.stringify(rawDump, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `TL-Meter-raw-${session.plan}-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [result, analyzedStyle, session.plan]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        const tuning = PLAN_PROGRESS_TUNING[session.plan];
        if (analyzing && progressPct < progressTargetPct) {
            interval = setInterval(() => {
                setProgressPct((current) => {
                    if (current >= progressTargetPct) return current;
                    const diff = progressTargetPct - current;
                    const next = current + Math.max(tuning.minStep, diff * tuning.easing);
                    return Math.min(progressTargetPct, next);
                });
            }, tuning.intervalMs);
        }
        return () => clearInterval(interval);
    }, [analyzing, progressPct, progressTargetPct, session.plan]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        interval = setInterval(() => {
            setLoadingTip(prev => {
                let next;
                do {
                    next = LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)];
                } while (next === prev);
                return next;
            });
        }, 12000);
        return () => clearInterval(interval);
    }, []);

    function computeSections(raw: AnalysisResult, profile: StyleProfile, unlockedCount: number) {
        const g = raw.global;
        const t = profile.targets;

        const getRecommendationText = (status: SectionStatus, label: string) => {
            const advice: Record<string, Record<SectionStatus, string>> = {
                "Loudness": {
                    ok: "Idealna głośność odniesienia dla Twojego stylu.",
                    warn: "Głośność odbiega od standardów stylu, rozważ korektę na limiterze.",
                    bad: "Krytyczny błąd głośności – utwór może zostać drastycznie przyciszony w streamingu."
                },
                "Low End Balance": {
                    ok: "Bas i stopa siedzą idealnie, dół jest czysty i zdefiniowany.",
                    warn: "Dół pasma jest lekko zachwiany, sprawdź balans stopy i basu (ok. 1-2dB).",
                    bad: "Poważne problemy z dołem – ryzyko dudnienia i braku klarowności w aucie."
                },
                "Midrange Density": {
                    ok: "Środek pasma jest świetnie zrównoważony i selektywny.",
                    warn: "Środek wymaga uwagi, niektóre elementy (wokal, gitary) mogą się maskować.",
                    bad: "Zbyt duży bałagan w środku pasma, brak selektywności najważniejszych instrumentów."
                },
                "Harshness": {
                    ok: "Góra pasma jest jedwabista i nie męczy słuchu.",
                    warn: "Uważaj na wysokie tony, mogą być zbyt kłujące w dłuższym odsłuchu.",
                    bad: "Agresywna i kłująca góra – konieczna praca z de-esserem lub EQ na blachach/sybilantach."
                },
                "Stereo Width": {
                    ok: "Szeroka i stabilna panorama, świetna kompatybilność mono.",
                    warn: "Uważaj na fazę, obraz stereo może być nieco zbyt rozmyty lub niestabilny.",
                    bad: "Krytyczne błędy fazowe – niektóre instrumenty mogą niemal całkowicie zniknąć w mono."
                },
                "Punchiness (Transients)": {
                    ok: "Dynamika transjentów jest doskonała, miks żyje i pulsuje.",
                    warn: "Miks jest nieco zbyt skompresowany, bębny mogą tracić swój pierwotny atak.",
                    bad: "Całkowity brak dynamiki – transjenty są całkowicie zduszone przez limiter lub kompresję."
                },
                "Beat Stability": {
                    ok: "Rytmika jest nienaganna, groove trzyma się stabilnie wzorca.",
                    warn: "Dostrzeżono drobne wahania rytmiczne, sprawdź spójność sekcji rytmicznej.",
                    bad: "Poważne problemy z groovem – sekcja rytmiczna 'pływa' poza schemat stylu."
                }
            };

            return advice[label]?.[status];
        };

        const sectionsData = [
            {
                label: "Loudness",
                value: formatLufs(g.integratedLufs),
                score: scoreInRange(g.integratedLufs ?? -99, t.lufs_integrated.min, t.lufs_integrated.max, t.lufs_integrated.ideal),
                desc: "LUFS decyduje w odbiorze o tym, jak głośno zabrzmi Twój miks względem innych na Spotify czy w radiu.",
                detail: session.plan === "free" ? "Analiza Peak/LRA dostępna w planie Lite" : `True Peak: ${formatDb(g.truePeakDbtp)}  |  LRA: ${formatNum(g.lra, 1)} LU`,
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
                value: session.plan === "free" ? "—" : formatNum(g.stereo?.correlation, 3),
                score: scoreInRange(g.stereo?.correlation ?? 0, t.stereo_width.min, t.stereo_width.max),
                desc: "Poniżej zera dźwięk skasuje się z głośnika telefonu (zniknięcie szerokich śladów fazowych w mono).",
                detail: `Korelacja L-R`,
                locked: unlockedCount < 5,
            },
            {
                label: "Punchiness (Transients)",
                value: formatNum(g.transients?.onsetStrengthMean, 2),
                score: scoreInRange(g.transients?.onsetStrengthMean ?? 0, t.punchiness.min, t.punchiness.max),
                desc: "Siła przebijania bębnów przez miks (transjenty atakujące membrany głośników). Zbyt niski współczynnik zepsuje rytmikę.",
                detail: `Siła transjentów`,
                locked: unlockedCount < 6,
            },
            {
                label: "Beat Stability",
                value: g.rhythm?.tempoBpm ? `${Math.round(g.rhythm.tempoBpm)} BPM` : "—",
                score: g.rhythm?.tempoBpm ? 95 : 0,
                desc: "Sztywność uderzeń sekcji rytmicznej i poprawność groovu w oparciu o wykryte BPM utworu.",
                detail: `Estymacja tempa`,
                locked: unlockedCount < 7,
            },
        ];

        const allSections: SectionResult[] = sectionsData.map(s => {
            const status = getStatus(s.score);
            return {
                ...s,
                status,
                recommendation: getRecommendationText(status, s.label),
            };
        });

        setSections(allSections);
    }

    // Overall score
    const overallScore = sections.length > 0
        ? Math.round(sections.filter(s => !s.locked).reduce((sum, s) => sum + s.score, 0) / sections.filter(s => !s.locked).length)
        : null;

    const detectUpsellPlanFromError = (message: string): Plan | null => {
        const lower = message.toLowerCase();
        if (lower.includes("planu premium") || lower.includes("plan premium")) return "premium";
        if (lower.includes("planu pro") || lower.includes("plan pro")) return "pro";
        if (lower.includes("planu lite") || lower.includes("plan lite")) return "lite";
        return null;
    };

    const upsellPlan = error ? detectUpsellPlanFromError(error) : null;
    const isUpsellError = Boolean(upsellPlan) || (error ? error.toLowerCase().includes("odblokuj plan") : false);

    return (
        <main className="min-h-screen grid-texture">
            {/* Sponsor Modal Popup AFTER analysis - Closeable */}
            {mounted && analyzedStyle && showSponsor && currentSponsor && (session.plan === "free" || session.plan === "lite") && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center backdrop-blur-sm bg-black/70 p-4 pb-20 md:pb-4 overflow-y-auto">
                    <div className="relative max-w-5xl w-full rounded-2xl p-6 md:p-8 shadow-2xl animate-fade-in" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', border: '3px solid #ffd700' }}>
                        <button
                            onClick={closeSponsorGate}
                            className="absolute top-3 right-3 text-gray-400 hover:text-white bg-black/30 hover:bg-black/50 transition-all p-1.5 rounded-full z-10"
                            title="Zamknij"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                        <div className="flex flex-col md:flex-row items-start gap-4 md:gap-6">
                            <div className="text-5xl md:text-6xl shrink-0">{currentSponsor.logo}</div>
                            <div className="flex-1 min-w-0">
                                <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: '#ffd700' }}>📢 Reklama</div>
                                <div className="font-black text-2xl md:text-3xl mb-3" style={{ color: '#ffffff' }}>{currentSponsor.name}</div>
                                <p className="text-sm md:text-base leading-relaxed mb-6" style={{ color: '#b0b0b0' }}>{currentSponsor.description}</p>
                                <a href={currentSponsor.cta_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 px-5 md:px-6 py-2.5 md:py-3 rounded-lg font-bold text-sm md:text-base transition-all" style={{ background: '#ffd700', color: '#000000' }}>
                                    {currentSponsor.cta_text}
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Global Error Popup */}
            {error && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="card w-full max-w-xl p-6 border-[var(--warn)]/40">
                        <div className="flex items-start justify-between gap-3 mb-3">
                            <h3 className="text-base font-bold text-[var(--text-primary)]">⚠️ Wystąpił problem</h3>
                            <button
                                onClick={() => setError(null)}
                                className="btn btn-outline text-xs px-2 py-1"
                                aria-label="Zamknij komunikat"
                            >
                                ✕
                            </button>
                        </div>

                        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{error}</p>

                        <p className="text-xs text-[var(--text-muted)] mt-3">
                            {isUpsellError
                                ? "Ten limit wynika z aktualnego planu. Odblokuj wyższy plan, aby kontynuować bez ograniczenia." 
                                : "Spróbuj odświeżyć stronę lub sprawdź połączenie internetowe. Plik audio może być uszkodzony lub w nieobsługiwanym formacie."}
                        </p>

                        <div className="flex flex-wrap justify-end gap-2 mt-5">
                            <button
                                onClick={() => setError(null)}
                                className="btn btn-outline text-sm px-4 py-2"
                            >
                                Zamknij
                            </button>

                            {isUpsellError ? (
                                <button
                                    onClick={() => router.push(`/payment?plan=${upsellPlan ?? "lite"}#compare-plans`)}
                                    className="btn btn-primary text-sm px-4 py-2"
                                >
                                    Przejdź do {(upsellPlan ?? "lite").toUpperCase()}
                                </button>
                            ) : (
                                <button
                                    onClick={() => window.location.reload()}
                                    className="btn btn-primary text-sm px-4 py-2"
                                >
                                    Odśwież stronę
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Nav */}
            <nav className="sticky top-0 z-50 border-b border-[var(--border)] backdrop-blur-md bg-[rgba(9,11,15,0.85)]">
                <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
                    <Link href="/">
                        <BrandLogo size="md" />
                    </Link>
                    <div className="flex items-center justify-end gap-3 w-[320px] shrink-0">
                        <div className="flex flex-col items-end w-[88px]" suppressHydrationWarning>
                            <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-tighter">Twój Plan</span>
                            <span className="text-xs font-black uppercase text-[var(--accent)] tracking-wider w-full text-right">
                                {mounted ? session.plan : "free"}
                            </span>
                        </div>
                        <Link
                            href="/activate"
                            className={`btn btn-outline text-xs py-1.5 px-3 border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--text-primary)] transition-all whitespace-nowrap ml-3 ${mounted && session.plan === "free" ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                        >
                            Aktywuj kod
                        </Link>
                    </div>
                </div>
            </nav>

            <div className="max-w-6xl mx-auto px-6 py-10">
                <h1 className="text-2xl font-bold mb-2">TL Meter</h1>
                <p className="text-[var(--text-secondary)] mb-6 max-w-2xl">
                    Obiektywna, cyfrowa analiza Twojej muzyki z domowego studia. Sprawdź czy Twój miks trzyma standardy rynkowe zanim wyślesz go do masteringu.
                </p>

                {/* Analysis Mode Selector */}
                <div className="card p-5 mb-5">
                    <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Styl muzyczny</div>
                    <div className="flex gap-3 flex-wrap">
                        {/* Suggest Style Button */}
                        <button
                            onClick={() => {
                                if (!canUseAutoStyle) {
                                    router.push('/payment?plan=lite#compare-plans');
                                    return;
                                }
                                setStyle('suggest');
                                setAnalysisMode('suggest');
                            }}
                            className={`btn ${style === 'suggest' ? "btn-primary" : "btn-outline"} py-2 px-4 flex items-center gap-2 transition-all ${!canUseAutoStyle ? "opacity-45 border-dashed border-[var(--border)] bg-[var(--bg-card2)]/60 text-[var(--text-muted)]" : ""}`}
                            title={!canUseAutoStyle ? "Kliknij, aby odblokować w planie Lite" : undefined}
                        >
                            ✨ Sugeruj
                            {!canUseAutoStyle && <span className="text-[10px] bg-[var(--bg-card2)] px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--text-muted)] font-semibold">🔒 LITE</span>}
                        </button>
                        {AVAILABLE_STYLES.map(s => {
                            const allowedStyles = stylesByPlan[session.plan];
                            const isComingSoon = comingSoonStyles.includes(s.slug);
                            const isPlanLocked = !allowedStyles.includes(s.slug);
                            const requiredPlan = requiredPlanByStyle[s.slug];
                            return (
                                <button
                                    key={s.slug}
                                    onClick={() => {
                                        if (isComingSoon) {
                                            router.push('/roadmap');
                                            return;
                                        }
                                        if (isPlanLocked) {
                                            router.push(`/payment?plan=${requiredPlan}`);
                                            return;
                                        }
                                        setStyle(s.slug as StyleSlug);
                                        setAnalysisMode('manual');
                                    }}
                                    className={`btn ${style === s.slug ? "btn-primary" : "btn-outline"} py-2 px-4 flex items-center gap-2 transition-all ${isComingSoon ? "opacity-30 grayscale saturate-0 border-dashed border-[var(--border)] text-[var(--text-muted)]" : isPlanLocked ? "opacity-45 border-dashed border-[var(--border)] bg-[var(--bg-card2)]/60 text-[var(--text-muted)]" : "border-[var(--accent)]/80 text-[var(--text-primary)] bg-[var(--accent)]/10 shadow-[0_0_0_1px_rgba(0,212,255,0.25)] hover:bg-[var(--accent)]/18"}`}
                                    title={isComingSoon ? "Funkcja w przygotowaniu — zobacz roadmapę" : isPlanLocked ? `Dostępne od planu ${requiredPlan?.toUpperCase() ?? 'PRO'}` : undefined}
                                >
                                    {s.emoji} {s.name}
                                    {isComingSoon && <span className="text-[10px] bg-[var(--bg-card)] px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--accent)] font-bold">WKRÓTCE</span>}
                                    {!isComingSoon && isPlanLocked && <span className="text-[10px] bg-[var(--bg-card2)] px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--text-muted)] font-semibold">🔒 {requiredPlan ? requiredPlan.toUpperCase() : "PRO"}</span>}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Drop zone */}
                {!analyzing && (
                    <div
                        className={`dropzone p-12 text-center mb-5 cursor-pointer ${dragging ? "active" : ""}`}
                        onDrop={onDrop}
                        onDragOver={onDragOver}
                        onDragLeave={onDragLeave}
                        onClick={() => fileRef.current?.click()}
                    >
                        <input
                            ref={fileRef}
                            type="file"
                            accept=".wav,.aiff,.aif,.mp3,.flac,.ogg,.m4a"
                            className="hidden"
                            onClick={(e) => {
                                e.currentTarget.value = "";
                            }}
                            onChange={e => e.target.files?.[0] && handleFileSelected(e.target.files[0])}
                        />
                        {file ? (
                            <div>
                                <div className="text-2xl mb-2">🎵</div>
                                <div className="font-semibold text-[var(--text-primary)]">{file.name}</div>
                                <div className="text-sm text-[var(--text-muted)] mt-1">{(file.size / 1024 / 1024).toFixed(1)} MB</div>
                            </div>
                        ) : (
                            <div>
                                <div className="text-4xl mb-3 opacity-50">📂</div>
                                <div className="font-semibold text-[var(--text-secondary)]">Przeciągnij plik tutaj lub kliknij</div>
                                <div className="text-sm text-[var(--text-muted)] mt-1">{uploadInfoByPlan[session.plan]}</div>
                            </div>
                        )}
                    </div>
                )}

                {/* Analyze button */}
                {file && !analyzing && (
                    <div className="flex justify-center mb-6">
                        <button onClick={runAnalysis} className="btn btn-primary px-12 py-3 text-base">
                            ⚡ Analizuj — {style === 'suggest' ? "styl" : AVAILABLE_STYLES.find(s => s.slug === style)?.name}
                        </button>
                    </div>
                )}

               {/* Reference detection notification */}
               {file && !analyzing && referenceDetected && referenceDetected.confidence > 0 && (
                   <div className="card p-4 mb-5 bg-[var(--bg-card)] border border-[var(--accent)] border-opacity-40">
                       <div className="flex items-start gap-3 mb-3">
                           <span className="text-xl flex-shrink-0">📚</span>
                           <div className="flex-1">
                               <div className="font-semibold text-[var(--text-primary)]">
                                   {referenceDetected.isReference ? "✨ Referencja do profilu!" : "🔍 Możliwa referencja"}
                               </div>
                               <div className="text-sm text-[var(--text-secondary)] mt-1">
                                   {referenceDetected.reason}
                                   {referenceDetected.confidence !== undefined && (
                                       <span className="text-[var(--text-muted)] ml-2">
                                           ({Math.round(referenceDetected.confidence * 100)}% pewności)
                                       </span>
                                   )}
                               </div>
                               {referenceDetected.confidence < 0.9 && (
                                   <div className="text-xs text-[var(--text-muted)] mt-2">
                                       Czy chcesz dodać te metryki do profilu {style}?
                                   </div>
                               )}
                           </div>
                       </div>
                       {referenceDetected.confidence < 0.9 && (
                           <label className="flex items-center gap-2 cursor-pointer">
                               <input
                                   type="checkbox"
                                   checked={contributeToProfile}
                                   onChange={e => setContributeToProfile(e.target.checked)}
                                   className="w-4 h-4 rounded accent-[var(--accent)]"
                               />
                               <span className="text-sm text-[var(--text-primary)]">
                                   Tak, to jest referencja dla {style} — dodaj do profilu
                               </span>
                           </label>
                       )}
                       {referenceDetected.confidence >= 0.9 && (
                           <div className="text-xs text-[var(--accent)] font-semibold">
                               ✓ Metryki automatycznie zostaną dodane do profilu
                           </div>
                       )}
                   </div>
               )}

                {/* Progress */}
                {analyzing && progress && (
                    <div ref={progressSectionRef} className="card p-6 mb-5 animate-pulse-border relative overflow-hidden">
                        <div className="flex flex-col gap-3 relative z-10">
                            <div className="flex items-center justify-between text-sm">
                                <div className="text-[var(--accent)] font-semibold truncate">
                                    {progress.stage}
                                    {progress.detail && <span className="text-[var(--text-secondary)] font-mono ml-2 font-normal">— {progress.detail}</span>}
                                </div>
                                <div className="text-[var(--text-primary)] font-mono font-bold ml-4">
                                    {Math.round(Math.min(100, progressPct))}%
                                </div>
                            </div>
                            <div className="meter-track h-2 bg-[var(--bg-card2)] overflow-hidden rounded-full">
                                {/* Smooth progress bar */}
                                <div className="meter-fill bg-[var(--accent)] h-full transition-all duration-300" style={{ width: `${Math.min(100, progressPct)}%` }}></div>
                            </div>

                            <div className="mt-4 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
                                <div className="bg-[var(--bg-surface)] p-3 rounded-lg border border-[var(--border)] text-xs text-[var(--text-muted)] flex items-start gap-2 flex-1 order-1">
                                    <span className="text-base mt-0.5" title="Bezpieczeństwo i prywatność">🛡️</span>
                                    <div>
                                        <span className="font-semibold text-[var(--text-primary)]">Analiza w przeglądarce</span>
                                        <p className="mt-1 hidden md:block">
                                            Aby proces zakończył się pomyślnie, <b>nie zamykaj tej karty</b>. Cała analiza DSP wykonuje się bezpiecznie na procesorze Twojego urządzenia.
                                        </p>
                                        <p className="mt-1 md:hidden">
                                            <b>Nie zamykaj tej karty</b> podczas analizy.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => abortRef.current = true}
                                    className="btn btn-outline text-[var(--bad)] border-[var(--bad)] hover:bg-[var(--bad)] hover:text-white shrink-0 order-2 mx-auto md:mx-0 md:w-auto px-8"
                                >
                                    Zatrzymaj
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Sponsor Ad Card DURING analysis - Not closeable */}
                {mounted && analyzing && showSponsor && currentSponsor && (session.plan === "free" || session.plan === "lite") && (
                    <div className="rounded-2xl p-6 md:p-8 mb-6 shadow-xl animate-fade-in" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', border: '3px solid #ffd700' }}>
                        <div className="flex flex-col md:flex-row items-start gap-4 md:gap-6">
                            <div className="text-5xl md:text-6xl shrink-0">{currentSponsor.logo}</div>
                            <div className="flex-1 min-w-0">
                                <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: '#ffd700' }}>📢 Reklama</div>
                                <div className="font-black text-2xl md:text-3xl mb-3" style={{ color: '#ffffff' }}>{currentSponsor.name}</div>
                                <p className="text-sm md:text-base leading-relaxed mb-6" style={{ color: '#b0b0b0' }}>{currentSponsor.description}</p>
                                <a href={currentSponsor.cta_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 px-5 md:px-6 py-2.5 md:py-3 rounded-lg font-bold text-sm md:text-base transition-all" style={{ background: '#ffd700', color: '#000000' }}>
                                    {currentSponsor.cta_text}
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                </a>
                            </div>
                        </div>
                    </div>
                )}

                {/* Loading tip space filler */}
                {sections.length === 0 && (
                    <div className="card p-6 mb-5 bg-[var(--bg-card)] border-dashed border-[var(--border)] animate-fade-in flex flex-col items-center justify-center text-center min-h-[124px]">
                        <div className="text-sm font-bold text-[var(--accent)] mb-2 uppercase tracking-widest">💡 Miks tip</div>
                        <p className="text-sm text-[var(--text-secondary)] italic leading-relaxed">{loadingTip}</p>
                    </div>
                )}

                {/* Results - Hidden while ad is shown for Free/Lite after analysis */}
                {sections.length > 0 && !adMustBeClosed && (
                    <div className="animate-fade-in">
                        {/* Style Match — single result card */}
                        {result?.styleMatch && (() => {
                            const sm = result.styleMatch;
                            const styleObj = AVAILABLE_STYLES.find(s => s.slug === sm.selected_genre);
                            const bestStyleObj = AVAILABLE_STYLES.find(s => s.slug === sm.best_match?.genre);
                            const label = analysisMode === 'suggest' ? 'Sugerowany styl' : 'Wybrany styl';
                            const isLowMatch = sm.selected_score < 50;
                            const scoreColor = sm.selected_score < 60
                                ? "var(--warn)"
                                : sm.selected_score < 75
                                    ? "var(--ok)"
                                    : "var(--ok)";
                            const analysisSeconds = result?.analysisDurationMs ? (result.analysisDurationMs / 1000).toFixed(2) : null;
                            const fileSizeMb = file ? (file.size / 1024 / 1024).toFixed(1) : null;
                            const durationSec = result?.meta?.durationSec ? Math.round(result.meta.durationSec) : null;
                            const sampleRate = result?.meta?.sampleRate ?? null;
                            return (
                                <div className="card p-5 md:p-6 mb-5">
                                    <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-6 md:gap-8 items-start">
                                        <div>
                                            <div className="text-xs text-[var(--text-muted)] tracking-wider mb-1">{styleObj?.emoji ?? '🎧'} {label}</div>
                                            <div className="text-xl md:text-2xl font-semibold text-[var(--text-primary)] capitalize mb-5">
                                                {sm.selected_genre}
                                            </div>
                                            <div
                                                className="text-6xl md:text-7xl font-bold leading-none mb-2"
                                                style={{ color: scoreColor }}
                                            >
                                                {sm.selected_score}<span className="text-2xl text-[var(--text-muted)]">%</span>
                                            </div>
                                            <div className="text-sm md:text-base text-[var(--text-secondary)] mb-5 lowercase">
                                                {isLowMatch ? 'niskie dopasowanie' : 'dopasowanie'} do stylu {sm.selected_genre}
                                            </div>

                                            {isLowMatch && sm.best_match?.genre && sm.best_match.genre !== sm.selected_genre && (
                                                <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-[var(--ok)]/40 bg-[var(--ok)]/10 px-3 py-1.5 text-xs text-[var(--text-secondary)]">
                                                    <span>Najbliższy styl:</span>
                                                    <span className="font-semibold text-[var(--text-primary)]">{bestStyleObj?.emoji ? `${bestStyleObj.emoji} ` : ''}{bestStyleObj?.name ?? sm.best_match.genre}</span>
                                                    <span className="font-mono text-[var(--ok)]">({sm.best_match.score}%)</span>
                                                </div>
                                            )}

                                            {sm.explanations?.length ? (
                                                <div className="mt-1 w-full text-left border-t border-[var(--border)] pt-4">
                                                    <div className="text-xs text-[var(--text-muted)] tracking-wider mb-2">
                                                        {isLowMatch ? '⚠️ Dlaczego utwór nie pasuje do wybranego stylu' : '🎛 Dlaczego pasuje do stylu muzycznego'}
                                                    </div>
                                                    <ul className="text-sm text-[var(--text-secondary)] space-y-1.5 list-disc list-inside">
                                                        {sm.explanations.slice(0, 3).map((text, idx) => (
                                                            <li key={`exp-${sm.selected_genre}-${idx}`}>{text}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ) : null}
                                        </div>

                                        <div className="md:border-l md:border-[var(--border)] md:pl-6">
                                            {analyzedStyle && (
                                                <button
                                                    onClick={downloadCoreJson}
                                                    className="btn btn-outline btn-sm w-full justify-center flex items-center gap-2 group hover:border-[var(--accent)] transition-all mb-4"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:text-[var(--accent)]"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                                                    <span className="font-bold">Pobierz {session.plan.toUpperCase()} JSON</span>
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
                                                <div className="flex items-center justify-between gap-3">
                                                    <span className="text-[var(--text-muted)]">Tryb analizy</span>
                                                    <span className="text-[var(--text-primary)]">{analysisMode === 'suggest' ? 'Auto (Sugeruj)' : 'Manual'}</span>
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

                        {/* Section grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
                            {sections.map(s => (
                                <div key={s.label} className={`card p-5 relative ${s.locked ? "overflow-hidden" : ""}`}>
                                    {s.locked && (
                                        <div className="absolute inset-0 bg-[var(--bg-card)]/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl z-10">
                                            <div className="text-2xl mb-2">🔒</div>
                                            <Link href="/payment?plan=lite" className="text-xs text-[var(--accent)] hover:underline">Odblokuj w Lite</Link>
                                        </div>
                                    )}
                                    <div className={s.locked ? "locked-blur" : ""}>
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-sm font-semibold text-[var(--text-primary)]">{s.label}</span>
                                                <div className="relative group flex items-center">
                                                    <span className="cursor-help text-xs bg-[var(--bg-surface)] w-4 h-4 flex items-center justify-center rounded-full text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--border)] transition-colors">?</span>
                                                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-secondary)] text-xs p-2 rounded shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                                                        {s.desc}
                                                    </div>
                                                </div>
                                            </div>
                                            <span className={`text-xs px-2 py-0.5 rounded-full badge-${s.status}`}>
                                                {STATUS_LABEL[s.status]}
                                            </span>
                                        </div>
                                        <div className="text-2xl font-mono font-bold mb-2" style={{ color: STATUS_COLOR[s.status] }}>
                                            {s.value}
                                        </div>
                                        <div className="meter-track h-2 mb-2">
                                            <div
                                                className="meter-fill"
                                                style={{ width: `${s.score}%`, background: STATUS_COLOR[s.status] }}
                                            ></div>
                                        </div>
                                        <div className="text-xs text-[var(--text-muted)]">{s.detail}</div>
                                        {s.recommendation && (
                                            <div className="mt-3 pt-3 border-t border-[var(--border)] text-xs text-[var(--text-secondary)] flex items-start gap-2">
                                                <span className="shrink-0 mt-0.5">
                                                    {s.status === "ok" ? "✅" : s.status === "warn" ? "⚠️" : "🚨"}
                                                </span>
                                                <span>
                                                    <span className="font-semibold text-[var(--accent)]">Rekomendacja:</span> {s.recommendation}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Upgrade CTA for free */}
                        {session.plan === "free" && (
                            <div className="card p-6 text-center border-dashed mb-10">
                                <div className="text-2xl mb-2">🔓</div>
                                <div className="font-semibold mb-1">Odblokuj pełny raport</div>
                                <div className="text-sm text-[var(--text-secondary)] mb-4">2 dodatkowe sekcje (Punchiness, Beat Stability), porady DAW i raport do analizy w zewnętrznym AI</div>
                                <Link href="/payment?plan=pro" className="btn btn-primary btn-sm">Odblokuj pełny raport</Link>
                            </div>
                        )}

                        {/* Export / Download Buttons - only for FREE/Lite plans */}
                        {(session.plan === "free" || session.plan === "lite") && (
                            <div className="mb-12 pt-8 border-t border-[var(--border)]">
                                <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-widest mb-6">Eksportuj dane i raport</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <button
                                    onClick={() => router.push("/payment?plan=pro")}
                                    className="flex items-center justify-between p-5 rounded-xl border transition-all shadow-sm bg-[var(--bg-card)] border-[var(--border)] hover:border-[var(--accent)]"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-2.5 rounded-lg bg-[var(--bg-surface)] text-[var(--text-muted)]">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
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
                                            <div className="text-base font-bold">Pobierz {session.plan.toUpperCase()} JSON</div>
                                            <div className="text-xs text-[var(--text-muted)] mt-1">Histogram spektralny (8 pasm, 60Hz-7680Hz)</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[10px] font-black px-3 py-1 rounded-full bg-[var(--accent)] text-black uppercase tracking-wider">
                                        <span>🔓</span> {session.plan.toUpperCase()}
                                    </div>
                                </button>
                            </div>
                        </div>
                        )}

                        {/* Tips Section */}
                        {tips.length > 0 && (
                            <div className="mb-20 animate-fade-in pt-8 border-t border-[var(--border)]">
                                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                    <span>🔍</span> Pełna analiza problemów & Porady DAW
                                </h2>
                                <div className="flex flex-col gap-4">
                                    {(showAllTips ? tips : tips.slice(0, 3)).map((tip, i) => {
                                        const sectionData = sections.find(s => {
                                            if (tip.section === "loudness") return s.label === "Loudness";
                                            if (tip.section === "lowend") return s.label === "Low End Balance";
                                            if (tip.section === "midrange") return s.label === "Midrange Density";
                                            if (tip.section === "harshness") return s.label === "Harshness";
                                            if (tip.section === "stereo") return s.label === "Stereo Width";
                                            if (tip.section === "dynamics") return s.label === "Punchiness (Transients)";
                                            if (tip.section === "rhythm") return s.label === "Beat Stability";
                                            return false;
                                        });
                                        const isLocked = sectionData?.locked ?? false;

                                        return (
                                            <div key={i} className="card p-5 border-l-4 border-l-[var(--warn)] relative overflow-hidden">
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
                                            onClick={() => setShowAllTips(true)}
                                            className="btn btn-outline w-full py-4 text-sm border-dashed"
                                        >
                                            Pokaż pozostałe porady ({tips.length - 3}) ▾
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* History & Comparison Panel (Pro/Premium) */}
            {mounted && historyEntries.length > 0 && result && (
                <div className="max-w-6xl mx-auto px-6 pb-6">
                    <HistoryPanel
                        history={historyEntries}
                        current={{
                            integratedLufs: result.global.integratedLufs,
                            truePeakDbtp: result.global.truePeakDbtp,
                            lra: result.global.lra,
                            lowPct: result.global.energyDistribution.low,
                            midPct: result.global.energyDistribution.mid,
                            highPct: result.global.energyDistribution.high,
                            stereoCorrelation: result.global.stereo?.correlation ?? null,
                            styleScore: overallScore,
                        }}
                        plan={session.plan}
                        onClear={() => {
                            clearHistory();
                            setHistoryEntries([]);
                        }}
                    />
                </div>
            )}

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
