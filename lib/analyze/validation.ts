import type { Plan, PlanFeatures } from "@/lib/license";
import { AVAILABLE_STYLES, type StyleSlug } from "@/lib/profiles";

export const SUPPORTED_FILE_EXTENSIONS = [".wav", ".aiff", ".aif", ".mp3", ".flac", ".ogg", ".m4a"] as const;

export const MAX_UPLOAD_SIZE_MB: Record<Plan, number> = {
  free: 5,
  lite: 40,
  pro: 80,
  premium: 100,
};

const ALLOWED_EXTENSIONS_BY_PLAN: Record<Plan, string[]> = {
  free: ["mp3", "aac", "m4a"],
  lite: ["mp3", "aac", "m4a", "wav", "aiff", "aif"],
  pro: ["*"],
  premium: ["*"],
};

export function getRecommendedPlanForFileSize(fileSizeBytes: number): Plan | null {
  const fileSizeMb = fileSizeBytes / 1024 / 1024;
  if (fileSizeMb <= MAX_UPLOAD_SIZE_MB.lite) return "lite";
  if (fileSizeMb <= MAX_UPLOAD_SIZE_MB.pro) return "pro";
  if (fileSizeMb <= MAX_UPLOAD_SIZE_MB.premium) return "premium";
  return null;
}

export function getUploadInfoByPlan(plan: Plan): string {
  return {
    free: `Plan FREE: MP3 / AAC / M4A (stratne) · do ${MAX_UPLOAD_SIZE_MB.free} MB`,
    lite: `Plan LITE: WAV / AIFF + MP3 / AAC / M4A · do ${MAX_UPLOAD_SIZE_MB.lite} MB`,
    pro: `Plan PRO: + FLAC / OGG oraz wszystkie niższe formaty · do ${MAX_UPLOAD_SIZE_MB.pro} MB`,
    premium: `Plan PREMIUM: + FLAC / OGG oraz wszystkie niższe formaty · do ${MAX_UPLOAD_SIZE_MB.premium} MB`,
  }[plan];
}

export function validateSelectedFile(file: File, plan: Plan): string | null {
  const dotIndex = file.name.lastIndexOf(".");
  const extension = dotIndex >= 0 ? file.name.slice(dotIndex).toLowerCase() : "";
  const isExtensionSupported = SUPPORTED_FILE_EXTENSIONS.includes(extension as (typeof SUPPORTED_FILE_EXTENSIONS)[number]);
  if (!isExtensionSupported) {
    return "Format nie jest obsługiwany. Dozwolone: WAV / AIFF / MP3 / FLAC / OGG / M4A.";
  }

  return validateFileSize(file, plan);
}

export function validateAnalysisModeAccess(plan: Plan, analysisMode: "suggest" | "manual"): string | null {
  if (plan === "free" && analysisMode === "suggest") {
    return "Tryb auto „Sugeruj styl” jest dostępny od planu Lite. Odblokuj plan Lite, aby używać auto‑wykrywania stylu.";
  }

  return null;
}

export function validateFileForAnalysis(file: File, plan: Plan, planFeatures: PlanFeatures): string | null {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const extensionAllowed = ALLOWED_EXTENSIONS_BY_PLAN[plan].includes("*") || ALLOWED_EXTENSIONS_BY_PLAN[plan].includes(extension);
  const mimeAllowed = planFeatures.allowedFormats.includes("*") || planFeatures.allowedFormats.includes(file.type);
  const isAllowed = mimeAllowed || extensionAllowed;

  if (!isAllowed) {
    const isFlacOrOgg =
      ["flac", "ogg", "oga"].includes(extension) ||
      ["audio/flac", "audio/ogg", "audio/oga", "application/ogg"].includes(file.type);
    if (isFlacOrOgg) {
      return "Format FLAC/OGG jest dostępny od planu Pro. Odblokuj plan Pro, aby analizować ten format.";
    }

    return `Format ${file.type.split("/")[1]?.toUpperCase() || extension.toUpperCase() || "wybrany"} wymaga planu Lite/Pro (bezstratna analiza WAV/AIFF). Odblokuj plan Lite, aby analizować ten format.`;
  }

  return validateFileSize(file, plan);
}

export function validateManualStyleAccess(params: {
  analysisMode: "suggest" | "manual";
  style: StyleSlug | "suggest";
  plan: Plan;
  stylesByPlan: Record<Plan, StyleSlug[]>;
  requiredPlanByStyle: Record<StyleSlug, "lite" | "pro">;
}): string | null {
  const { analysisMode, style, plan, stylesByPlan, requiredPlanByStyle } = params;
  const manualStyleSlug = style !== "suggest" ? (style as StyleSlug) : null;
  if (analysisMode !== "manual" || !manualStyleSlug) {
    return null;
  }

  const allowedStyles = stylesByPlan[plan];
  if (allowedStyles.includes(manualStyleSlug)) {
    return null;
  }

  const requiredPlan = requiredPlanByStyle[manualStyleSlug] ?? "pro";
  const styleLabel = AVAILABLE_STYLES.find((entry) => entry.slug === manualStyleSlug)?.name ?? manualStyleSlug;
  return `Styl ${styleLabel} wymaga planu ${requiredPlan.toUpperCase()}.`;
}

function validateFileSize(file: File, plan: Plan): string | null {
  const maxSizeBytes = MAX_UPLOAD_SIZE_MB[plan] * 1024 * 1024;
  if (file.size <= maxSizeBytes) {
    return null;
  }

  const recommendedPlan = getRecommendedPlanForFileSize(file.size);
  if (recommendedPlan) {
    return `Plik przekracza limit ${MAX_UPLOAD_SIZE_MB[plan]} MB dla planu ${plan.toUpperCase()}. Odblokuj plan ${recommendedPlan.toUpperCase()}, aby analizować większe pliki.`;
  }

  return `Plik przekracza limit ${MAX_UPLOAD_SIZE_MB[plan]} MB dla planu ${plan.toUpperCase()}. Maksymalny obsługiwany rozmiar to ${MAX_UPLOAD_SIZE_MB.premium} MB w planie PREMIUM.`;
}
