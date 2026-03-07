"use client";

import { useState } from "react";
import type { HistoryEntry, MetricDelta } from "@/lib/history";
import { computeDeltas, clearHistory } from "@/lib/history";

interface Props {
    history: HistoryEntry[];
    current: HistoryEntry["metrics"] | null;
    plan: string;
    onClear: () => void;
}

function DeltaRow({ d }: { d: MetricDelta }) {
    const color =
        d.trend === "better" ? "var(--ok)" :
            d.trend === "worse" ? "var(--bad)" :
                "var(--text-muted)";
    const arrow = d.trend === "better" ? "↑" : d.trend === "worse" ? "↓" : "→";

    return (
        <div className="flex items-center justify-between py-1.5 border-b border-[var(--border)] last:border-0">
            <span className="text-xs text-[var(--text-secondary)]">{d.label}</span>
            <div className="flex items-center gap-3 font-mono text-xs">
                <span className="text-[var(--text-muted)]">{d.previous}</span>
                <span style={{ color }} className="font-bold">
                    {arrow} {d.deltaStr}
                </span>
                <span className="text-[var(--text-primary)]">{d.current}</span>
            </div>
        </div>
    );
}

export default function HistoryPanel({ history, current, plan, onClear }: Props) {
    const [selectedIdx, setSelectedIdx] = useState<number>(0);

    if (history.length === 0) return null;

    const isPremium = plan === "premium";
    const compared = history[selectedIdx];
    const deltas: MetricDelta[] = current ? computeDeltas(current, compared.metrics) : [];

    return (
        <div className="card mt-6 p-0 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)] bg-[var(--bg-card)]">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[var(--text-primary)]">
                        Historia analiz
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-widest"
                        style={{ background: "var(--accent)", color: "#000" }}>
                        {isPremium ? "Premium" : "Pro"}
                    </span>
                </div>
                <button
                    onClick={onClear}
                    className="text-[10px] uppercase font-bold text-[var(--text-muted)] hover:text-[var(--bad)] transition-colors"
                >
                    Wyczyść
                </button>
            </div>

            <div className="flex">
                {/* Sidebar – list of entries */}
                {isPremium && history.length > 1 && (
                    <div className="w-48 shrink-0 border-r border-[var(--border)] bg-[rgba(0,0,0,0.2)]">
                        {history.map((entry, idx) => (
                            <button
                                key={entry.id}
                                onClick={() => setSelectedIdx(idx)}
                                className={`w-full text-left px-4 py-3 border-b border-[var(--border)] transition-colors ${idx === selectedIdx
                                        ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                    }`}
                            >
                                <div className="text-[11px] font-bold truncate">{entry.filename}</div>
                                <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
                                    {new Date(entry.timestamp).toLocaleDateString("pl-PL", {
                                        day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
                                    })}
                                </div>
                                <div className="text-[10px] mt-0.5">
                                    {entry.metrics.integratedLufs?.toFixed(1)} LUFS
                                    {entry.metrics.styleScore !== null && (
                                        <span className="ml-1 opacity-60">· {entry.metrics.styleScore}%</span>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* Delta comparison panel */}
                <div className="flex-1 p-5">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <div className="text-xs text-[var(--text-muted)]">Porównujesz z</div>
                            <div className="text-sm font-bold text-[var(--text-primary)] truncate">{compared.filename}</div>
                            <div className="text-[10px] text-[var(--text-muted)]">
                                {new Date(compared.timestamp).toLocaleDateString("pl-PL", {
                                    weekday: "short", day: "2-digit", month: "short",
                                    hour: "2-digit", minute: "2-digit"
                                })}
                                {" · "}{compared.styleLabel}
                            </div>
                        </div>
                        {compared.metrics.styleScore !== null && (
                            <div className="text-right">
                                <div className="text-[10px] text-[var(--text-muted)]">Styl poprzedni</div>
                                <div className="text-xl font-black" style={{ color: "var(--accent)" }}>
                                    {compared.metrics.styleScore}%
                                </div>
                            </div>
                        )}
                    </div>

                    {deltas.length > 0 ? (
                        <div className="space-y-0">
                            {deltas.map(d => <DeltaRow key={d.key} d={d} />)}
                        </div>
                    ) : (
                        <div className="text-sm text-[var(--text-muted)] text-center py-4">
                            Brak danych do porównania
                        </div>
                    )}

                    <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center gap-2">
                        <span className="text-[10px] text-[var(--text-muted)]">↑ lepsza wartość</span>
                        <span className="mx-1 text-[var(--border)]">·</span>
                        <span className="text-[10px] text-[var(--text-muted)]">↓ gorsza wartość</span>
                        <span className="mx-1 text-[var(--border)]">·</span>
                        <span className="text-[10px] text-[var(--text-muted)]">→ bez zmian</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
