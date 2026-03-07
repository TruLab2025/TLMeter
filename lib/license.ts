import type { StyleProfile } from "@/lib/profiles";

export type Plan = "free" | "lite" | "pro" | "premium";

export interface SessionData {
    plan: Plan;
    code?: string;
    deviceId?: string;
    expiresAt?: number;
}

const SESSION_KEY = "tlm_session";

export function getSession(): SessionData {
    if (typeof window === "undefined") return { plan: "free" }; // DEMO
    try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw) return { plan: "free" }; // DEMO
        const data = JSON.parse(atob(raw)) as SessionData;
        if (data.expiresAt && Date.now() > data.expiresAt) {
            localStorage.removeItem(SESSION_KEY);
            return { plan: "free" }; // DEMO
        }
        return data;
    } catch {
        return { plan: "free" }; // DEMO
    }
}

/** Saves an activated session locally (MVP stub — production uses signed JWT from backend). */
export function saveSession(data: SessionData): void {
    if (typeof window === "undefined") return;
    const payload = btoa(JSON.stringify({ ...data, expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 }));
    localStorage.setItem(SESSION_KEY, payload);
}

export function clearSession(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(SESSION_KEY);
}

/** Sends activation code to backend and saves session. */
export async function activateCode(code: string): Promise<SessionData> {
    const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const fp = await getFingerprint();
    const res = await fetch(`${API}/api/license/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, fingerprint: fp }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || "Błąd aktywacji");
    }
    const backendData = await res.json() as any;
    
    // Transform backend response to SessionData
    const sessionData: SessionData = {
        plan: (backendData.plan || "free") as Plan,
        code: code,
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
    };
    
    saveSession(sessionData);
    return sessionData;
}

/** Feature gating by plan for UI */
export type PlanFeatures = {
    sectionsUnlocked: number;   // how many result sections shown (1-7)
    score: boolean;
    tipsBasic: boolean;
    tipsDetailed: boolean;
    pdf: boolean;
    history: number | null;     // null = unlimited
    compare: boolean;
    compareMulti: boolean;
    dailyLimit: number | null;  // null = unlimited
    allowedFormats: string[];   // ['mp3', 'aac'] etc, '*' for all
};

export const PLAN_FEATURES: Record<Plan, PlanFeatures> = {
    free: {
        sectionsUnlocked: 4,
        score: true,
        tipsBasic: false,
        tipsDetailed: false,
        pdf: false,
        history: 0,
        compare: false,
        compareMulti: false,
        dailyLimit: null,
        allowedFormats: ['audio/mpeg', 'audio/mp3', 'audio/aac', 'audio/x-m4a', 'audio/m4a']
    },
    lite: {
        sectionsUnlocked: 6,
        score: true,
        tipsBasic: true,
        tipsDetailed: false,
        pdf: false,
        history: 0,
        compare: false,
        compareMulti: false,
        dailyLimit: null,
        allowedFormats: ['*']
    },
    pro: {
        sectionsUnlocked: 6,
        score: true,
        tipsBasic: true,
        tipsDetailed: true,
        pdf: true,
        history: 10,
        compare: true,
        compareMulti: false,
        dailyLimit: null,
        allowedFormats: ['*']
    },
    premium: {
        sectionsUnlocked: 7,
        score: true,
        tipsBasic: true,
        tipsDetailed: true,
        pdf: true,
        history: null,
        compare: true,
        compareMulti: true,
        dailyLimit: null,
        allowedFormats: ['*']
    },
};

export function canUseFeature(plan: Plan, feature: keyof typeof PLAN_FEATURES[Plan]): boolean {
    const f = PLAN_FEATURES[plan];
    const val = f[feature as keyof typeof f];
    if (typeof val === "boolean") return val;
    if (typeof val === "number") return val > 0;
    return val !== null;
}

/** Browser fingerprint (lightweight, no library for MVP) */
async function getFingerprint(): Promise<string> {
    const data = [
        navigator.userAgent,
        navigator.language,
        screen.width + "x" + screen.height,
        Intl.DateTimeFormat().resolvedOptions().timeZone,
    ].join("|");
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}
