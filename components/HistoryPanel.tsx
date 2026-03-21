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

function deltaColor(delta: number) {
    const abs = Math.abs(delta);
    if (abs < 0.5) return "var(--ok)";
    if (abs < 1.5) return "var(--warn)";
    return "var(--bad)";
}

function DeltaMeter({ delta, maxAbs }: { delta: number | null; maxAbs: number }) {
    const clamped = delta === null ? 0 : Math.max(-maxAbs, Math.min(maxAbs, delta));
    const left = delta === null ? 50 : ((clamped + maxAbs) / (2 * maxAbs)) * 100;
    const color = delta === null ? "var(--text-muted)" : deltaColor(delta);
    return (
        <div className="relative h-2 w-full rounded-full bg-[var(--bg-surface)] border border-[var(--border)] overflow-hidden">
            <div className="absolute inset-y-0 left-1/2 w-px bg-[var(--border)]" />
            <div
                className="absolute top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full border border-[var(--border)]"
                style={{ left: `${left}%`, transform: "translate(-50%, -50%)", background: color }}
            />
        </div>
    );
}

function maxAbsForKey(key: string): number {
    if (key === "lufs") return 6;
    if (key === "peak") return 3;
    if (key === "low") return 20;
    if (key === "score") return 25;
    return 10;
}

export default function HistoryPanel({ history, current, plan, onClear }: Props) {
    const [selectedIdx, setSelectedIdx] = useState<number>(0);

    if (history.length === 0) return null;

    const isPremium = plan === "premium";
    const compared = history[selectedIdx];
    const deltas: MetricDelta[] = current ? computeDeltas(current, compared.metrics) : [];
    const comparedExt = compared?.filename?.split(".").pop()?.toUpperCase() ?? null;

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
	                                    {entry.filename.includes(".") && (
	                                      <span className="ml-1 opacity-70">· {entry.filename.split(".").pop()?.toUpperCase()}</span>
	                                    )}
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
	                                {comparedExt ? ` · ${comparedExt}` : ""}
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
                        <div className="overflow-x-auto">
                            <table className="w-full table-fixed text-sm">
                                <colgroup>
                                    <col />
                                    <col style={{ width: 170 }} />
                                    <col style={{ width: 340 }} />
                                    <col style={{ width: 170 }} />
                                </colgroup>
                                <thead>
                                    <tr className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] border-b border-[var(--border)]">
                                        <th className="py-2 pr-4 text-left font-semibold">Metryka</th>
                                        <th className="py-2 px-3 text-right font-semibold">Poprzednia</th>
                                        <th className="py-2 px-3 text-center font-semibold">Porównanie</th>
                                        <th className="py-2 px-3 text-left font-semibold">Obecna</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {deltas.map((d) => {
                                        const deltaNum = d.delta ?? null;
                                        const color = deltaNum === null ? "var(--text-muted)" : deltaColor(deltaNum);
                                        return (
                                            <tr key={d.key} className="border-b border-[var(--border)] last:border-0">
                                                <td className="py-3 pr-4 text-[var(--text-secondary)] whitespace-nowrap">{d.label}</td>
                                                <td className="py-3 px-3 text-right font-mono text-sm text-[var(--text-muted)] whitespace-nowrap">{d.previous}</td>
                                                <td className="py-2 px-3">
                                                    <div className="flex flex-col gap-1.5">
                                                        <div className="flex items-center justify-between text-xs font-mono">
                                                            <span className="text-[var(--text-muted)]">POP</span>
                                                            <span className="font-bold text-sm" style={{ color }}>
                                                                {d.deltaStr}
                                                            </span>
                                                            <span className="text-[var(--text-muted)]">NOW</span>
                                                        </div>
                                                        <DeltaMeter delta={deltaNum} maxAbs={maxAbsForKey(d.key)} />
                                                    </div>
                                                </td>
                                                <td className="py-3 px-3 text-left font-mono text-sm text-[var(--text-primary)] whitespace-nowrap">{d.current}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
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
