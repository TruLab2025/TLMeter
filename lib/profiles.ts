export interface StyleTargets {
    lufs_integrated: { min: number; max: number; ideal: number };
    true_peak: { max: number };
    dynamic_range: { min: number; max: number };
    low_ratio: { min: number; max: number };
    mid_ratio: { min: number; max: number };
    high_ratio: { min: number; max: number };
    stereo_width: { min: number; max: number };
    harshness_index: { max: number };
    punchiness: { min: number; max: number };
}

export interface StyleWeights {
    loudness: number;
    low_end: number;
    midrange: number;
    harshness: number;
    stereo: number;
    dynamics: number;
    punchiness: number;
}

export interface StyleProfile {
    slug: string;
    name: string;
    targets: StyleTargets;
    weights: StyleWeights;
}

export type StyleSlug = "rock" | "grunge" | "metal" | "pop" | "hiphop" | "edm" | "house" | "techno" | "trap" | "indie" | "folk" | "classic" | "jazz" | "rnb" | "ambient";

const cache: Record<string, StyleProfile> = {};

/** Loads a style profile JSON from /data/profiles/ */
export async function loadProfile(slug: StyleSlug): Promise<StyleProfile> {
    if (cache[slug]) return cache[slug];
    const res = await fetch(`/data/profiles/${slug}.json`);
    if (!res.ok) throw new Error(`Nie można załadować profilu: ${slug}`);
    const data = await res.json() as StyleProfile;
    cache[slug] = data;
    return data;
}

export const AVAILABLE_STYLES: { slug: StyleSlug; name: string; emoji: string }[] = [
    { slug: "rock", name: "Rock", emoji: "🎸" },
    { slug: "grunge", name: "Grunge", emoji: "🎙️" },
    { slug: "metal", name: "Metal", emoji: "🤘" },
    { slug: "pop", name: "Pop", emoji: "🎤" },
    { slug: "hiphop", name: "Hip-Hop", emoji: "🎧" },
    { slug: "edm", name: "EDM", emoji: "🎛️" },
    { slug: "house", name: "House", emoji: "🪩" },
    { slug: "techno", name: "Techno", emoji: "⚡" },
    { slug: "trap", name: "Trap", emoji: "🥁" },
    { slug: "indie", name: "Indie", emoji: "🎶" },
    { slug: "folk", name: "Folk", emoji: "🪕" },
    { slug: "classic", name: "Classic", emoji: "🎻" },
    { slug: "jazz", name: "Jazz", emoji: "🎷" },
    { slug: "rnb", name: "R&B", emoji: "🎙️" },
    { slug: "ambient", name: "Ambient", emoji: "🌌" },
];

/** Section score: 0–100, how well the measured value fits the target range */
export function scoreInRange(value: number, min: number, max: number, ideal?: number): number {
    if (value >= min && value <= max) {
        if (ideal !== undefined) {
            const deviation = Math.abs(value - ideal) / ((max - min) / 2);
            return Math.round(100 - deviation * 20); // 80–100 when in range
        }
        return 90;
    }
    // Out of range — penalize proportionally
    const range = max - min;
    const distance = value < min ? min - value : value - max;
    const penalty = Math.min(1, distance / (range * 0.5));
    return Math.round(Math.max(0, 60 - penalty * 60));
}

export type SectionStatus = "ok" | "warn" | "bad";

export function getStatus(score: number): SectionStatus {
    if (score >= 75) return "ok";
    if (score >= 45) return "warn";
    return "bad";
}
