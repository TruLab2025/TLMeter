export interface Tip {
    problem_id: string;
    section: string;
    title: string;
    description: string;
    freq_range: string | null;
    action: string;
    eq_hint: string | null;
    comp_hint: string | null;
    general: string;
    plan_required: "free" | "lite" | "pro" | "premium";
}

type TipsBySection = Record<string, Tip[]>;
let cache: TipsBySection = {};

const SECTIONS = ["loudness", "lowend", "harshness", "stereo", "dynamics", "midrange"];

/** Loads all tip files and merges them */
export async function loadAllTips(): Promise<TipsBySection> {
    if (Object.keys(cache).length > 0) return cache;
    const all: Tip[] = [];
    for (const section of SECTIONS) {
        try {
            const res = await fetch(`/data/tips/${section}-tips.json`);
            if (res.ok) {
                const tips = await res.json() as Tip[];
                all.push(...tips);
            }
        } catch {
            // section tips not yet created — skip
        }
    }
    const bySection: TipsBySection = {};
    for (const tip of all) {
        if (!bySection[tip.section]) bySection[tip.section] = [];
        bySection[tip.section].push(tip);
    }
    cache = bySection;
    return cache;
}

/** Maps analysis results to matching tips */
export function matchTips(
    problems: string[],
    allTips: TipsBySection,
    plan: "free" | "lite" | "pro" | "premium"
): Tip[] {
    const planOrder = ["free", "lite", "pro", "premium"];
    const planIndex = planOrder.indexOf(plan);
    const result: Tip[] = [];

    for (const section of Object.values(allTips)) {
        for (const tip of section) {
            const tipPlanIndex = planOrder.indexOf(tip.plan_required);
            if (problems.includes(tip.problem_id) && tipPlanIndex <= planIndex) {
                result.push(tip);
            }
        }
    }
    return result;
}

/** Determines problem IDs from analysis results vs style profile targets */
export function detectProblems(metrics: AnalysisMetrics, targets: import("./profiles").StyleTargets): string[] {
    const problems: string[] = [];

    if (metrics.lufs !== null) {
        if (metrics.lufs < targets.lufs_integrated.min - 2) problems.push("lufs_too_low");
        else if (metrics.lufs > targets.lufs_integrated.max + 2) problems.push("lufs_too_high");
    }
    if (metrics.truePeak !== null && metrics.truePeak > targets.true_peak.max) {
        problems.push("true_peak_exceeded");
    }
    if (metrics.highRatio !== null && metrics.highRatio > targets.high_ratio.max + 0.05) {
        problems.push("high_harshness");
    }
    if (metrics.lowRatio !== null && metrics.lowRatio > targets.low_ratio.max + 0.05) {
        problems.push("low_end_heavy");
    }
    if (metrics.stereoWidth !== null) {
        if (metrics.stereoWidth < targets.stereo_width.min - 0.1) problems.push("stereo_too_narrow");
        else if (metrics.stereoWidth > targets.stereo_width.max + 0.05) problems.push("stereo_too_wide");
    }
    if (metrics.dynamicRange !== null) {
        if (metrics.dynamicRange < targets.dynamic_range.min - 1) problems.push("dynamics_too_compressed");
        else if (metrics.dynamicRange > targets.dynamic_range.max + 2) problems.push("dynamics_too_wide");
    }
    if (metrics.midRatio !== null) {
        if (metrics.midRatio < targets.mid_ratio.min - 0.05) problems.push("midrange_too_thin");
        else if (metrics.midRatio > targets.mid_ratio.max + 0.05) problems.push("midrange_too_boxy");
    }
    if (metrics.lowRatio !== null && metrics.lowRatio < targets.low_ratio.min - 0.05) {
        problems.push("low_end_thin");
    }

    return problems;
}

export interface AnalysisMetrics {
    lufs: number | null;
    truePeak: number | null;
    lowRatio: number | null;
    midRatio: number | null;
    highRatio: number | null;
    stereoWidth: number | null;
    dynamicRange: number | null;
    harshnessIndex: number | null;
}
