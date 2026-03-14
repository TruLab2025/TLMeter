import React from "react";
import type { Plan } from "@/lib/license";
import {
  PLATFORM_TARGETS,
  REQUIRED_PLAN_BY_PLATFORM,
  type PlatformKey,
} from "@/lib/platform-readiness";

interface PlatformPanelProps {
  platform: PlatformKey | null;
  sessionPlan: Plan;
  onChange: (platform: PlatformKey | null) => void;
  onLockedPlatformClick: (platform: PlatformKey) => void;
}

const PLATFORM_META: Record<PlatformKey, { icon: string; shortName: string }> = {
  spotify: { icon: "🎵", shortName: "Spotify" },
  apple_music: { icon: "🍎", shortName: "Apple Music" },
  youtube: { icon: "▶️", shortName: "YouTube" },
  podcast: { icon: "🎙️", shortName: "Podcast" },
  broadcast: { icon: "📻", shortName: "Broadcast" },
};

const PLATFORM_ORDER: PlatformKey[] = [
  "spotify",
  "apple_music",
  "youtube",
  "podcast",
  "broadcast",
];

const PLAN_ORDER: Plan[] = ["free", "lite", "pro", "premium"];

export const PlatformPanel: React.FC<PlatformPanelProps> = ({
  platform,
  sessionPlan,
  onChange,
  onLockedPlatformClick,
}) => (
  <div className="card p-5 mb-5">
    <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
      Platforma docelowa
    </div>
    <div className="flex gap-3 flex-wrap">
      {PLATFORM_ORDER.map((typedKey) => {
        const target = PLATFORM_TARGETS[typedKey];
        const active = platform === typedKey;
        const requiredPlan = REQUIRED_PLAN_BY_PLATFORM[typedKey];
        const locked = PLAN_ORDER.indexOf(sessionPlan) < PLAN_ORDER.indexOf(requiredPlan);
        const meta = PLATFORM_META[typedKey];

        return (
          <button
            key={typedKey}
            onClick={() => {
              if (locked) {
                onLockedPlatformClick(typedKey);
                return;
              }
              onChange(active ? null : typedKey);
            }}
            className={`btn ${active ? "btn-primary" : "btn-outline"} py-2 px-4 flex items-center gap-2 transition-all ${
              locked
                ? "opacity-45 border-dashed border-[var(--border)] bg-[var(--bg-card2)]/60 text-[var(--text-muted)]"
                : active
                ? ""
                : "border-[var(--border)] text-[var(--text-secondary)] bg-transparent hover:border-[var(--accent)] hover:text-[var(--text-primary)] hover:bg-[var(--accent)]/8"
            }`}
            title={locked ? `Dostępne od planu ${requiredPlan.toUpperCase()}` : `${target.name} • target LUFS: ${Array.isArray(target.lufs) ? `${target.lufs[0]} do ${target.lufs[1]}` : target.lufs}`}
            aria-pressed={active}
          >
            <span aria-hidden="true">{meta.icon}</span>
            <span>{meta.shortName}</span>
            {locked && (
              <span className="text-[10px] bg-[var(--bg-card2)] px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--text-muted)] font-semibold">
                🔒 {requiredPlan.toUpperCase()}
              </span>
            )}
          </button>
        );
      })}
    </div>
    <p className="mt-3 text-xs text-[var(--text-secondary)]">
      Kliknięcie platformy przełącza analizę w tryb publikacji. Bez wyboru platformy działasz w trybie stylu muzycznego.
    </p>
  </div>
);
