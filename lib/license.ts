export type Plan = "free" | "lite" | "pro" | "premium";

export interface SessionData {
    plan: Plan;
    code?: string;
    deviceId?: string;
    expiresAt?: number;
    token?: string;
}

const SESSION_KEY = "tlm_session"; // legacy/dev session (base64 json)
const TOKEN_KEY = "tlm_token";

type AccessTokenPayload = {
    device_id: string;
    device_pub?: string;
    plan: Exclude<Plan, "free">;
    exp: number; // unix seconds
};

function base64UrlToUtf8(input: string): string {
    const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
    const padLen = (4 - (normalized.length % 4)) % 4;
    const padded = normalized + "=".repeat(padLen);
    return atob(padded);
}

function decodeAccessToken(token: string): AccessTokenPayload | null {
    const dot = token.indexOf(".");
    if (dot <= 0) return null;
    const payloadB64 = token.slice(0, dot);
    try {
        const payloadJson = base64UrlToUtf8(payloadB64);
        const parsed = JSON.parse(payloadJson) as Partial<AccessTokenPayload>;
        if (!parsed || typeof parsed !== "object") return null;
        if (typeof parsed.device_id !== "string") return null;
        if (parsed.device_pub !== undefined && typeof parsed.device_pub !== "string") return null;
        if (parsed.plan !== "lite" && parsed.plan !== "pro" && parsed.plan !== "premium") return null;
        if (typeof parsed.exp !== "number" || !Number.isFinite(parsed.exp)) return null;
        return parsed as AccessTokenPayload;
    } catch {
        return null;
    }
}

export function getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY);
}

export function clearToken(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(TOKEN_KEY);
}

export function getSession(): SessionData {
    if (typeof window === "undefined") return { plan: "free" }; // DEMO

    // Prefer stateless signed access token (real licensing)
    try {
        const token = localStorage.getItem(TOKEN_KEY);
        if (token) {
            const payload = decodeAccessToken(token);
            if (payload) {
                const expiresAt = payload.exp * 1000;
                if (Date.now() > expiresAt) {
                    localStorage.removeItem(TOKEN_KEY);
                    return { plan: "free" };
                }
                return {
                    plan: payload.plan,
                    deviceId: payload.device_id,
                    expiresAt,
                    token,
                };
            }
        }
    } catch {
        // ignore
    }

    // Legacy/dev session fallback
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
    if (data.token) {
        localStorage.setItem(TOKEN_KEY, data.token);
    }
    const payload = btoa(JSON.stringify({ ...data, expiresAt: data.expiresAt ?? (Date.now() + 30 * 24 * 60 * 60 * 1000) }));
    localStorage.setItem(SESSION_KEY, payload);
}

export function clearSession(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(TOKEN_KEY);
}

/** Sends activation code to backend and saves session. */
export async function activateCode(code: string): Promise<SessionData> {
    const API = process.env.NEXT_PUBLIC_API_URL || "";
    const { getOrCreateDeviceId } = await import("@/lib/device");
    const { getOrCreateDeviceKeyRecord } = await import("@/lib/deviceKeys");
    const deviceId = getOrCreateDeviceId();
    const { publicSpkiB64u } = await getOrCreateDeviceKeyRecord();

    // If user pasted the access token directly, just validate & store it.
    if (code.includes(".")) {
        const res = await fetch(`${API}/api/license/validate-token`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${code}`,
                "x-device-id": deviceId,
            },
            body: JSON.stringify({}),
        });
        const data = await res.json().catch(() => ({})) as { valid?: boolean; payload?: AccessTokenPayload; error?: string };
        if (!res.ok || !data.valid || !data.payload) {
            throw new Error(data.error || "Niepoprawny klucz");
        }
        if (data.payload.device_pub && data.payload.device_pub !== publicSpkiB64u) {
            throw new Error("Ten klucz jest przypisany do innego urządzenia/przeglądarki.");
        }

        const expiresAt = data.payload.exp * 1000;
        const sessionData: SessionData = {
            plan: data.payload.plan,
            deviceId: data.payload.device_id,
            expiresAt,
            token: code,
        };
        saveSession(sessionData);
        return sessionData;
    }

    // Dry-run mode (dev): ask backend to issue a token for this device.
    const res = await fetch(`${API}/api/license/dev-issue`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-device-id": deviceId },
        body: JSON.stringify({ plan: "pro", code, device_pub: publicSpkiB64u }),
    });
    const backendData = await res.json().catch(() => ({})) as { token?: string; payload?: AccessTokenPayload; error?: string };
    if (!res.ok || !backendData.token || !backendData.payload) {
        throw new Error(backendData.error || "Błąd aktywacji");
    }

    const expiresAt = backendData.payload.exp * 1000;
    const sessionData: SessionData = {
        plan: backendData.payload.plan,
        deviceId: backendData.payload.device_id,
        expiresAt,
        token: backendData.token,
        code,
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
        allowedFormats: [
            'audio/mpeg',
            'audio/mp3',
            'audio/aac',
            'audio/x-m4a',
            'audio/m4a',
            'audio/wav',
            'audio/x-wav',
            'audio/wave',
            'audio/aiff',
            'audio/x-aiff'
        ]
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


export function getAuthHeaders(extra?: Record<string, string>): Record<string, string> {
    if (typeof window === "undefined") return extra ?? {};
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return extra ?? {};
    const deviceId = localStorage.getItem("tlm_device_id");
    return {
        ...(extra ?? {}),
        Authorization: `Bearer ${token}`,
        ...(deviceId ? { "x-device-id": deviceId } : {}),
    };
}

function base64UrlEncodeBytes(bytes: ArrayBuffer | Uint8Array): string {
    const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    let binary = "";
    for (let i = 0; i < u8.length; i++) binary += String.fromCharCode(u8[i]);
    const b64 = btoa(binary);
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sha256Base64Url(input: string): Promise<string> {
    const buf = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest("SHA-256", buf);
    return base64UrlEncodeBytes(digest);
}

export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const { signProof } = await import("@/lib/deviceKeys");
    const { getOrCreateDeviceId } = await import("@/lib/device");

    const token = getToken();
    const deviceId = getOrCreateDeviceId();

    const method = (init?.method || "GET").toUpperCase();
    const bodyStr = typeof init?.body === "string" ? init.body : "";

    const url = typeof input === "string"
        ? new URL(input, window.location.origin)
        : input instanceof URL
            ? input
            : new URL((input as Request).url, window.location.origin);

    const ts = Date.now().toString();
    const bodyHash = await sha256Base64Url(bodyStr);
    const path = url.pathname;
    const message = `${ts}.${method}.${path}.${bodyHash}`;
    const proof = await signProof(message);

    const headers = new Headers(init?.headers || {});
    if (token) headers.set("Authorization", `Bearer ${token}`);
    headers.set("x-device-id", deviceId);
    headers.set("x-proof-ts", ts);
    headers.set("x-proof", proof);

    return fetch(input, { ...(init || {}), headers });
}
