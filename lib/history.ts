// History & Comparison – LocalStorage-based analysis history
// Pro: 1 entry (compare with last), Premium: 4 entries

export interface HistoryEntry {
    id: string;                  // random UUID
    timestamp: number;           // Date.now()
    filename: string;
    style: string;
    styleLabel: string;
    plan: string;
    // Key metrics snapshot (enough for delta display)
    metrics: {
        integratedLufs: number | null;
        truePeakDbtp: number | null;
        lra: number | null;
        lowPct: number;
        midPct: number;
        highPct: number;
        stereoCorrelation: number | null;
        styleScore: number | null;    // 0–100
    };
}

const STORAGE_KEY = "tlmeter_history";

function getId(): string {
    return (typeof crypto !== "undefined" && crypto.randomUUID)
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function loadAll(): HistoryEntry[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        return JSON.parse(raw) as HistoryEntry[];
    } catch {
        return [];
    }
}

function saveAll(entries: HistoryEntry[]): void {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {/* quota exceeded – ignore */ }
}

/**
 * Save a new analysis to history.
 * @param limit - how many entries to keep (1 for Pro, 4 for Premium, 0 = don't save)
 */
export function saveAnalysis(entry: Omit<HistoryEntry, "id" | "timestamp">, limit: number): void {
    if (limit <= 0) return;
    const all = loadAll();
    const newEntry: HistoryEntry = { ...entry, id: getId(), timestamp: Date.now() };
    // Prepend newest, keep only `limit` entries
    const updated = [newEntry, ...all].slice(0, limit);
    saveAll(updated);
}

/**
 * Get history entries for current plan.
 * @param limit - max entries to return
 */
export function getHistory(limit: number): HistoryEntry[] {
    if (limit <= 0) return [];
    return loadAll().slice(0, limit);
}

/**
 * Get the single most recent entry (for delta comparison in Pro).
 */
export function getLastEntry(): HistoryEntry | null {
    const all = loadAll();
    return all.length > 0 ? all[0] : null;
}

/**
 * Clear all history (for testing / reset).
 */
export function clearHistory(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
}

// ── Delta helpers ──────────────────────────────────────────────────────────

export interface MetricDelta {
    key: string;
    label: string;
    current: string;
    previous: string;
    delta: number | null;    // positive = improved, negative = worse (for LUFS, higher = louder)
    deltaStr: string;
    trend: "better" | "worse" | "neutral";
}

/**
 * Compare current metrics to a previous history entry.
 */
export function computeDeltas(
    current: HistoryEntry["metrics"],
    previous: HistoryEntry["metrics"]
): MetricDelta[] {
    const deltas: MetricDelta[] = [];

    // LUFS: higher = louder (closer to target ~ -9 LUFS for rock), neutral delta direction
    if (current.integratedLufs !== null && previous.integratedLufs !== null) {
        const d = current.integratedLufs - previous.integratedLufs;
        deltas.push({
            key: "lufs",
            label: "Głośność (LUFS)",
            current: `${current.integratedLufs.toFixed(1)} LUFS`,
            previous: `${previous.integratedLufs.toFixed(1)} LUFS`,
            delta: d,
            deltaStr: d >= 0 ? `+${d.toFixed(1)}` : d.toFixed(1),
            trend: Math.abs(d) < 0.5 ? "neutral" : d > 0 ? "better" : "worse",
        });
    }

    // True Peak: lower is better (< -1 dBTP)
    if (current.truePeakDbtp !== null && previous.truePeakDbtp !== null) {
        const d = current.truePeakDbtp - previous.truePeakDbtp;
        deltas.push({
            key: "peak",
            label: "True Peak",
            current: `${current.truePeakDbtp.toFixed(1)} dBTP`,
            previous: `${previous.truePeakDbtp.toFixed(1)} dBTP`,
            delta: d,
            deltaStr: d >= 0 ? `+${d.toFixed(1)}` : d.toFixed(1),
            trend: Math.abs(d) < 0.3 ? "neutral" : d < 0 ? "better" : "worse",
        });
    }

    // Low: lower (less mud) is generally better (target ~20-30%)
    const lowD = (current.lowPct - previous.lowPct) * 100;
    deltas.push({
        key: "low",
        label: "Low End",
        current: `${Math.round(current.lowPct * 100)}%`,
        previous: `${Math.round(previous.lowPct * 100)}%`,
        delta: lowD,
        deltaStr: lowD >= 0 ? `+${lowD.toFixed(0)}%` : `${lowD.toFixed(0)}%`,
        trend: Math.abs(lowD) < 2 ? "neutral" : lowD < 0 ? "better" : "worse",
    });

    // Style score: higher = better
    if (current.styleScore !== null && previous.styleScore !== null) {
        const d = current.styleScore - previous.styleScore;
        deltas.push({
            key: "score",
            label: "Dopasowanie do stylu",
            current: `${current.styleScore}%`,
            previous: `${previous.styleScore}%`,
            delta: d,
            deltaStr: d >= 0 ? `+${d.toFixed(0)}%` : `${d.toFixed(0)}%`,
            trend: Math.abs(d) < 2 ? "neutral" : d > 0 ? "better" : "worse",
        });
    }

    return deltas;
}

/**
 * Migrate all LocalStorage history entries to server database (one-time operation)
 * Returns number of entries migrated
 */
export async function migrateHistoryToServer(): Promise<number> {
    if (typeof window === "undefined") return 0;
    const { getAuthHeaders } = await import("@/lib/license");
    
    // Check if already migrated
    const migrated = localStorage.getItem("tlmeter_migrated");
    if (migrated === "true") {
        console.log("Historia już zmigrowana do bazy");
        return 0;
    }

    const entries = loadAll();
    if (entries.length === 0) {
        localStorage.setItem("tlmeter_migrated", "true");
        return 0;
    }

    console.log(`Migracja ${entries.length} analiz do bazy...`);
    let migrated_count = 0;

    for (const entry of entries) {
        try {
            await fetch('/api/analyses', {
                method: 'POST',
                headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({
                    license_id: null, // Historic analyses don't have license
                    style: entry.style,
                    filename: entry.filename,
                    created_at: new Date(entry.timestamp).toISOString()
                })
            });
            migrated_count++;
        } catch (err) {
            console.warn('Failed to migrate entry:', entry.filename, err);
        }
    }

    localStorage.setItem("tlmeter_migrated", "true");
    console.log(`✅ Zmigrowano ${migrated_count}/${entries.length} analiz`);
    return migrated_count;
}
