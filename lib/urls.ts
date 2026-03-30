const ANALYZER_BASE = (process.env.NEXT_PUBLIC_ANALYZER_URL || "").trim().replace(/\/+$/, "");

function normalizePath(path?: string) {
  if (!path) return "/analyze";
  if (path.startsWith("/")) return path;
  return `/${path}`;
}

export function buildAnalyzerLink(path?: string): string {
  const normalized = normalizePath(path);
  if (ANALYZER_BASE) {
    return `${ANALYZER_BASE.replace(/\/$/, "")}${normalized}`;
  }
  return normalized;
}
