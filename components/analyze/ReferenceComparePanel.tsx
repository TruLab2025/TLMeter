import type { AnalysisResult } from "@/lib/analyze/types";

function formatMaybe(value: number | null | undefined, suffix: string, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value.toFixed(digits)}${suffix}`;
}

function pctMaybe(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${Math.round(value * 100)}%`;
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

export default function ReferenceComparePanel({
  mix,
  reference,
  mixName,
  referenceName,
  mixFile,
  referenceFile,
}: {
  mix: AnalysisResult;
  reference: AnalysisResult;
  mixName: string;
  referenceName: string;
  mixFile?: File;
  referenceFile?: File;
}) {
  function formatFileFormat(file?: File, name?: string) {
    const ext = (name ?? file?.name ?? "").split(".").pop()?.toLowerCase();
    const mime = file?.type || "";
    if (mime && ext && ext !== name) return `${mime} · .${ext}`;
    if (mime) return mime;
    if (ext) return `.${ext}`;
    return "—";
  }

  function formatSizeMb(file?: File) {
    if (!file) return "—";
    return `${(file.size / 1024 / 1024).toFixed(1)} MB`;
  }

  function formatDuration(result: AnalysisResult) {
    const sec = result?.meta?.durationSec;
    if (!sec || !Number.isFinite(sec)) return "—";
    const rounded = Math.round(sec);
    const m = Math.floor(rounded / 60);
    const s = rounded % 60;
    return `${m}:${String(s).padStart(2, "0")} (${rounded}s)`;
  }

  function formatSampleRate(result: AnalysisResult) {
    const sr = result?.meta?.sampleRate;
    if (!sr || !Number.isFinite(sr)) return "—";
    return `${sr} Hz`;
  }
  const mixLufs = mix.global.integratedLufs;
  const refLufs = reference.global.integratedLufs;
  const lufsDelta = mixLufs !== null && refLufs !== null ? mixLufs - refLufs : null;

  const mixTp = mix.global.truePeakDbtp;
  const refTp = reference.global.truePeakDbtp;
  const tpDelta = mixTp !== null && refTp !== null ? mixTp - refTp : null;

  const mixLra = mix.global.lra;
  const refLra = reference.global.lra;
  const lraDelta = mixLra !== null && refLra !== null ? mixLra - refLra : null;

  const mixClip = mix.global.clipping?.clipEvents ?? null;
  const refClip = reference.global.clipping?.clipEvents ?? null;
  const clipDelta = mixClip !== null && refClip !== null ? mixClip - refClip : null;

  const mixLow = mix.global.energyDistribution.low;
  const refLow = reference.global.energyDistribution.low;
  const lowDelta = (mixLow - refLow) * 100;

  const mixMid = mix.global.energyDistribution.mid;
  const refMid = reference.global.energyDistribution.mid;
  const midDelta = (mixMid - refMid) * 100;

  const mixHigh = mix.global.energyDistribution.high;
  const refHigh = reference.global.energyDistribution.high;
  const highDelta = (mixHigh - refHigh) * 100;

  const mixStereo = mix.global.stereo?.correlation ?? null;
  const refStereo = reference.global.stereo?.correlation ?? null;
  const stereoDelta = mixStereo !== null && refStereo !== null ? mixStereo - refStereo : null;

  const rows = [
    {
      label: "Głośność (LUFS)",
      ref: formatMaybe(refLufs, " LUFS"),
      mix: formatMaybe(mixLufs, " LUFS"),
      delta: lufsDelta,
      deltaText: lufsDelta === null ? "—" : `${lufsDelta >= 0 ? "+" : ""}${lufsDelta.toFixed(1)}`,
      maxAbs: 6,
    },
    {
      label: "True Peak (dBTP)",
      ref: formatMaybe(refTp, " dBTP"),
      mix: formatMaybe(mixTp, " dBTP"),
      delta: tpDelta,
      deltaText: tpDelta === null ? "—" : `${tpDelta >= 0 ? "+" : ""}${tpDelta.toFixed(1)}`,
      maxAbs: 3,
    },
    {
      label: "Dynamika (LRA)",
      ref: formatMaybe(refLra, " LU"),
      mix: formatMaybe(mixLra, " LU"),
      delta: lraDelta,
      deltaText: lraDelta === null ? "—" : `${lraDelta >= 0 ? "+" : ""}${lraDelta.toFixed(1)}`,
      maxAbs: 6,
    },
    {
      label: "Clipping (events)",
      ref: refClip === null ? "—" : `${Math.round(refClip)}`,
      mix: mixClip === null ? "—" : `${Math.round(mixClip)}`,
      delta: clipDelta,
      deltaText: clipDelta === null ? "—" : `${clipDelta >= 0 ? "+" : ""}${Math.round(clipDelta)}`,
      maxAbs: 1200,
    },
    {
      label: "Low (%)",
      ref: pctMaybe(refLow),
      mix: pctMaybe(mixLow),
      delta: lowDelta,
      deltaText: `${lowDelta >= 0 ? "+" : ""}${lowDelta.toFixed(0)}%`,
      maxAbs: 20,
    },
    {
      label: "Mid (%)",
      ref: pctMaybe(refMid),
      mix: pctMaybe(mixMid),
      delta: midDelta,
      deltaText: `${midDelta >= 0 ? "+" : ""}${midDelta.toFixed(0)}%`,
      maxAbs: 20,
    },
    {
      label: "High (%)",
      ref: pctMaybe(refHigh),
      mix: pctMaybe(mixHigh),
      delta: highDelta,
      deltaText: `${highDelta >= 0 ? "+" : ""}${highDelta.toFixed(0)}%`,
      maxAbs: 20,
    },
    {
      label: "Stereo corr.",
      ref: refStereo === null ? "—" : refStereo.toFixed(2),
      mix: mixStereo === null ? "—" : mixStereo.toFixed(2),
      delta: stereoDelta,
      deltaText: stereoDelta === null ? "—" : `${stereoDelta >= 0 ? "+" : ""}${stereoDelta.toFixed(2)}`,
      maxAbs: 0.5,
    },
  ] as const;

  return (
    <div className="card mt-6 p-0 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)] bg-[var(--bg-card)]">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-[var(--text-primary)]">Porównanie z referencją</span>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-widest"
            style={{ background: "var(--accent)", color: "#000" }}
          >
            Premium
          </span>
        </div>
        <div className="text-[10px] text-[var(--text-muted)] font-mono truncate max-w-[55%]">
          {referenceName} ⇄ {mixName}
        </div>
      </div>

      <div className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)]/60 p-3">
            <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-2">Mix</div>
            <div className="text-xs font-semibold text-[var(--text-primary)] truncate">{mixName}</div>
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
              <div className="text-[var(--text-muted)]">Format</div>
              <div className="text-right font-mono text-[var(--text-secondary)]">{formatFileFormat(mixFile, mixName)}</div>
              <div className="text-[var(--text-muted)]">Rozmiar</div>
              <div className="text-right font-mono text-[var(--text-secondary)]">{formatSizeMb(mixFile)}</div>
              <div className="text-[var(--text-muted)]">Długość</div>
              <div className="text-right font-mono text-[var(--text-secondary)]">{formatDuration(mix)}</div>
              <div className="text-[var(--text-muted)]">Sample rate</div>
              <div className="text-right font-mono text-[var(--text-secondary)]">{formatSampleRate(mix)}</div>
            </div>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)]/60 p-3">
            <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-2">Referencja</div>
            <div className="text-xs font-semibold text-[var(--text-primary)] truncate">{referenceName}</div>
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
              <div className="text-[var(--text-muted)]">Format</div>
              <div className="text-right font-mono text-[var(--text-secondary)]">{formatFileFormat(referenceFile, referenceName)}</div>
              <div className="text-[var(--text-muted)]">Rozmiar</div>
              <div className="text-right font-mono text-[var(--text-secondary)]">{formatSizeMb(referenceFile)}</div>
              <div className="text-[var(--text-muted)]">Długość</div>
              <div className="text-right font-mono text-[var(--text-secondary)]">{formatDuration(reference)}</div>
              <div className="text-[var(--text-muted)]">Sample rate</div>
              <div className="text-right font-mono text-[var(--text-secondary)]">{formatSampleRate(reference)}</div>
            </div>
          </div>
        </div>

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
                <th className="py-2 px-3 text-right font-semibold truncate" title={mixName}>
                  Mix
                </th>
                <th className="py-2 px-3 text-center font-semibold">Porównanie</th>
                <th className="py-2 px-3 text-right font-semibold truncate" title={referenceName}>
                  Referencja
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const deltaNum = row.delta ?? null;
                const color = deltaNum === null ? "var(--text-muted)" : deltaColor(deltaNum);
                return (
                  <tr key={row.label} className="border-b border-[var(--border)] last:border-0">
                    <td className="py-3 pr-4 text-[var(--text-secondary)] whitespace-nowrap">{row.label}</td>
                    <td className="py-3 px-3 text-right font-mono text-sm text-[var(--text-primary)] whitespace-nowrap">{row.mix}</td>
                    <td className="py-2 px-3">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-[var(--text-muted)]">REF</span>
                          <span className="font-bold text-sm" style={{ color }}>
                            {row.deltaText}
                          </span>
                          <span className="text-[var(--text-muted)]">MIX</span>
                        </div>
                        <DeltaMeter delta={deltaNum} maxAbs={row.maxAbs} />
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-sm text-[var(--text-muted)] whitespace-nowrap">{row.ref}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
