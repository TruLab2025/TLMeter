import React from "react";
import { PLATFORM_TARGETS, PlatformKey, PlatformReadinessResult } from "@/lib/platform-readiness";

interface PlatformSelectorProps {
  platform: PlatformKey;
  onChange: (platform: PlatformKey) => void;
}

export const PlatformSelector: React.FC<PlatformSelectorProps> = ({ platform, onChange }) => (
  <div className="platform-selector">
    <span style={{ fontWeight: 600, marginRight: 16 }}>PLATFORM</span>
    {Object.entries(PLATFORM_TARGETS).map(([key, t]) => (
      <label key={key} style={{ marginRight: 18, cursor: "pointer" }}>
        <input
          type="radio"
          name="platform"
          value={key}
          checked={platform === key}
          onChange={() => onChange(key as PlatformKey)}
          style={{ marginRight: 6 }}
        />
        {t.name}
      </label>
    ))}
  </div>
);

interface PlatformReadinessProps {
  result: PlatformReadinessResult;
  isPro: boolean;
}

export const PlatformReadinessPanel: React.FC<PlatformReadinessProps> = ({ result, isPro }) => {
  const { metrics, score } = result;
  return (
    <div className="platform-readiness-panel" style={{ marginTop: 24, padding: 24, borderRadius: 16, background: "#0b1422", boxShadow: "0 2px 12px #0003" }}>
      <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 18 }}>Platform Readiness</h3>
      <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
        <div>
          <div><b>LUFS Integrated:</b> {metrics.lufs_integrated.value.toFixed(1)} LUFS <span style={{ color: statusColor(metrics.lufs_integrated.status), marginLeft: 8 }}>{statusLabel(metrics.lufs_integrated.status)}</span></div>
          <div><b>True Peak:</b> {metrics.true_peak.value.toFixed(1)} dBTP <span style={{ color: statusColor(metrics.true_peak.status), marginLeft: 8 }}>{statusLabel(metrics.true_peak.status)}</span></div>
          {isPro && metrics.lra && (
            <div><b>LRA:</b> {metrics.lra.value.toFixed(1)} ({metrics.lra.range?.[0]}–{metrics.lra.range?.[1]}) <span style={{ color: statusColor(metrics.lra.status), marginLeft: 8 }}>{statusLabel(metrics.lra.status)}</span></div>
          )}
        </div>
        {isPro && (
          <div style={{ fontSize: 18, fontWeight: 600, color: scoreColor(score ?? 0) }}>Platform Score: {score ?? "—"}/100</div>
        )}
      </div>
    </div>
  );
};

function statusLabel(status: string) {
  switch (status) {
    case "ok": return "OK";
    case "close": return "CLOSE";
    case "problem": return "PROBLEM";
    case "too_loud": return "TOO LOUD";
    case "too_high": return "TOO HIGH";
    case "too_low": return "TOO LOW";
    case "too_quiet": return "TOO QUIET";
    default: return status;
  }
}
function statusColor(status: string) {
  switch (status) {
    case "ok": return "#3ecf8e";
    case "close": return "#ffb300";
    case "problem":
    case "too_loud":
    case "too_high":
    case "too_low":
    case "too_quiet": return "#ff3b3b";
    default: return "#b7d6f7";
  }
}
function scoreColor(score: number) {
  if (score >= 90) return "#3ecf8e";
  if (score >= 70) return "#ffb300";
  return "#ff3b3b";
}
