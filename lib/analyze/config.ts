import type { Plan } from "@/lib/license";
import type { StyleSlug } from "@/lib/profiles";

export const ANALYZE_LOADING_TIPS = [
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
  "TL Meter to Twój obiektywny sędzia. Jeśli on mówi, że jest 'bad', to Twoje uszy prawdopodobnie przyzwyczaiły się do błędu.",
] as const;

export const PLAN_MIN_ANALYSIS_MS: Record<Plan, number> = {
  free: 12000,
  lite: 8000,
  pro: 3500,
  premium: 1200,
};

export const PLAN_PROGRESS_TUNING: Record<Plan, { intervalMs: number; easing: number; minStep: number }> = {
  free: { intervalMs: 110, easing: 0.045, minStep: 0.06 },
  lite: { intervalMs: 100, easing: 0.06, minStep: 0.1 },
  pro: { intervalMs: 90, easing: 0.09, minStep: 0.16 },
  premium: { intervalMs: 78, easing: 0.15, minStep: 0.28 },
};

export const FINAL_PROGRESS_HOLD_MS = 900;

export const STYLES_BY_PLAN: Record<Plan, StyleSlug[]> = {
  free: ["rock", "grunge", "metal"],
  lite: ["rock", "grunge", "metal", "pop", "hiphop", "edm"],
  pro: ["rock", "grunge", "metal", "pop", "hiphop", "edm", "house", "techno", "trap", "indie", "folk", "classic", "jazz", "rnb", "ambient"],
  premium: ["rock", "grunge", "metal", "pop", "hiphop", "edm", "house", "techno", "trap", "indie", "folk", "classic", "jazz", "rnb", "ambient"],
};

export const REQUIRED_PLAN_BY_STYLE: Record<StyleSlug, "lite" | "pro"> = {
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

export const COMING_SOON_STYLES: StyleSlug[] = ["jazz", "rnb", "ambient"];

export function getHistoryLimit(plan: Plan): number {
  if (plan === "premium") return 4;
  if (plan === "pro") return 1;
  return 0;
}
