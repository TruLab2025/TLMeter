import type React from "react";
import { AVAILABLE_STYLES, type StyleSlug } from "@/lib/profiles";
import type { Plan } from "@/lib/license";
import type { PlatformKey } from "@/lib/platform-readiness";
import { PlatformPanel } from "@/components/PlatformPanel";

interface AnalyzeControlsProps {
  style: StyleSlug | "suggest";
  canUseAutoStyle: boolean;
  sessionPlan: Plan;
  stylesByPlan: Record<Plan, StyleSlug[]>;
  comingSoonStyles: StyleSlug[];
  requiredPlanByStyle: Record<StyleSlug, "lite" | "pro">;
  platform: PlatformKey | null;
  onPlatformChange: (platform: PlatformKey | null) => void;
  routerPush: (href: string) => void;
  setStyle: (style: StyleSlug | "suggest") => void;
  setAnalysisMode: (mode: "suggest" | "manual") => void;
  analyzing: boolean;
  dragging: boolean;
  onDrop: (event: React.DragEvent) => void;
  onDragOver: (event: React.DragEvent) => void;
  onDragLeave: () => void;
  fileRef: React.RefObject<HTMLInputElement | null>;
  onFileSelected: (file: File) => void;
  file: File | null;
  referenceFileRef: React.RefObject<HTMLInputElement | null>;
  onReferenceFileSelected: (file: File) => void;
  referenceFile: File | null;
  compareWithReference: boolean;
  onCompareWithReferenceChange: (enabled: boolean) => void;
  uploadInfo: string;
  onRunAnalysis: () => void;
}

export default function AnalyzeControls({
  style,
  canUseAutoStyle,
  sessionPlan,
  stylesByPlan,
  comingSoonStyles,
  requiredPlanByStyle,
  platform,
  onPlatformChange,
  routerPush,
  setStyle,
  setAnalysisMode,
  analyzing,
  dragging,
  onDrop,
  onDragOver,
  onDragLeave,
  fileRef,
  onFileSelected,
  file,
  referenceFileRef,
  onReferenceFileSelected,
  referenceFile,
  compareWithReference,
  onCompareWithReferenceChange,
  uploadInfo,
  onRunAnalysis,
}: AnalyzeControlsProps) {
  const isPlatformMode = platform !== null;
  const canCompare = sessionPlan === "premium" && !isPlatformMode;

  return (
    <>
      <div className="card p-5 mb-5">
        <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
          Styl muzyczny
        </div>
        <div className="flex gap-3 flex-wrap">
	          <button
	            onClick={() => {
	              if (!canUseAutoStyle) {
	                routerPush("/payment?plan=lite#compare-plans");
	                return;
	              }
	              onPlatformChange(null);
	              onCompareWithReferenceChange(false);
	              setStyle("suggest");
	              setAnalysisMode("suggest");
	            }}
            className={`btn ${!isPlatformMode && style === "suggest" ? "btn-primary" : "btn-outline"} py-2 px-4 flex items-center gap-2 transition-all ${!canUseAutoStyle ? "opacity-45 border-dashed border-[var(--border)] bg-[var(--bg-card2)]/60 text-[var(--text-muted)]" : ""}`}
            title={!canUseAutoStyle ? "Kliknij, aby odblokować w planie Lite" : undefined}
          >
            ✨ Sugeruj
            {!canUseAutoStyle && <span className="text-[10px] bg-[var(--bg-card2)] px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--text-muted)] font-semibold">🔒 LITE</span>}
          </button>
          {AVAILABLE_STYLES.map((availableStyle) => {
            const allowedStyles = stylesByPlan[sessionPlan];
            const isComingSoon = comingSoonStyles.includes(availableStyle.slug);
            const isPlanLocked = !allowedStyles.includes(availableStyle.slug);
            const requiredPlan = requiredPlanByStyle[availableStyle.slug];

            return (
              <button
                key={availableStyle.slug}
                onClick={() => {
                  if (isComingSoon) {
                    routerPush("/roadmap");
                    return;
                  }
                  if (isPlanLocked) {
                    routerPush(`/payment?plan=${requiredPlan}`);
                    return;
                  }
                  onPlatformChange(null);
                  setStyle(availableStyle.slug);
                  setAnalysisMode("manual");
                }}
                className={`btn ${!isPlatformMode && style === availableStyle.slug ? "btn-primary" : "btn-outline"} py-2 px-4 flex items-center gap-2 transition-all ${isComingSoon ? "opacity-30 grayscale saturate-0 border-dashed border-[var(--border)] text-[var(--text-muted)]" : isPlanLocked ? "opacity-45 border-dashed border-[var(--border)] bg-[var(--bg-card2)]/60 text-[var(--text-muted)]" : "border-[var(--accent)]/80 text-[var(--text-primary)] bg-[var(--accent)]/10 shadow-[0_0_0_1px_rgba(0,212,255,0.25)] hover:bg-[var(--accent)]/18"}`}
                title={isComingSoon ? "Funkcja w przygotowaniu — zobacz roadmapę" : isPlanLocked ? `Dostępne od planu ${requiredPlan?.toUpperCase() ?? "PRO"}` : undefined}
              >
                {availableStyle.emoji} {availableStyle.name}
                {isComingSoon && <span className="text-[10px] bg-[var(--bg-card)] px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--accent)] font-bold">WKRÓTCE</span>}
                {!isComingSoon && isPlanLocked && <span className="text-[10px] bg-[var(--bg-card2)] px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--text-muted)] font-semibold">🔒 {requiredPlan ? requiredPlan.toUpperCase() : "PRO"}</span>}
              </button>
            );
          })}
        </div>

	        {canCompare && (
		          <div className="mt-4 pt-4 border-t border-[var(--border)]">
	            <label className="flex items-center gap-2 cursor-pointer">
	              <input
	                type="checkbox"
	                checked={compareWithReference}
	                onChange={(event) => onCompareWithReferenceChange(event.target.checked)}
	                className="w-4 h-4 rounded accent-[var(--accent)]"
	              />
		              <span className="text-sm text-[var(--text-primary)]">
		                Porównaj z referencją
		              </span>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-widest"
                    style={{ background: "var(--accent)", color: "#000" }}
                  >
                    Premium
                  </span>
		            </label>
	            <div className="text-xs text-[var(--text-muted)] mt-1">
	              Dodaj drugi plik (referencję) — analiza DSP wykona się dla obu i pokaże różnice.
	              {style === "suggest" ? " (Po włączeniu przełączę na styl manualny)" : ""}
	            </div>
		          </div>
		        )}
      </div>

      <PlatformPanel
        platform={platform}
        sessionPlan={sessionPlan}
        onChange={onPlatformChange}
        onLockedPlatformClick={(selectedPlatform) => {
          const planByPlatform: Record<PlatformKey, "lite" | "pro" | "premium" | "free"> = {
            spotify: "free",
            apple_music: "free",
            youtube: "lite",
            podcast: "pro",
            broadcast: "premium",
          };
          const targetPlan = planByPlatform[selectedPlatform];
          if (targetPlan === "free") return;
          routerPush(`/payment?plan=${targetPlan}#compare-plans`);
        }}
      />

      {!analyzing && (
        <div
          className={`dropzone p-12 text-center mb-5 cursor-pointer ${dragging ? "active" : ""}`}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".wav,.aiff,.aif,.mp3,.flac,.ogg,.m4a"
            className="hidden"
            onClick={(event) => {
              event.currentTarget.value = "";
            }}
            onChange={(event) => event.target.files?.[0] && onFileSelected(event.target.files[0])}
          />
          {file ? (
            <div>
              <div className="text-2xl mb-2">🎵</div>
              <div className="font-semibold text-[var(--text-primary)]">{file.name}</div>
              <div className="text-sm text-[var(--text-muted)] mt-1">{(file.size / 1024 / 1024).toFixed(1)} MB</div>
            </div>
          ) : (
            <div>
              <div className="text-4xl mb-3 opacity-50">📂</div>
              <div className="font-semibold text-[var(--text-secondary)]">Przeciągnij plik tutaj lub kliknij</div>
              <div className="text-sm text-[var(--text-muted)] mt-1">{uploadInfo}</div>
            </div>
          )}
        </div>
      )}

	      {compareWithReference && canCompare && !analyzing && (
	        <div
	          className={`dropzone p-12 text-center mb-5 cursor-pointer ${dragging ? "active" : ""}`}
	          onClick={() => referenceFileRef.current?.click()}
	        >
	          <input
	            ref={referenceFileRef}
	            type="file"
	            accept=".wav,.aiff,.aif,.mp3,.flac,.ogg,.m4a"
	            className="hidden"
	            onClick={(event) => {
	              event.currentTarget.value = "";
	            }}
	            onChange={(event) => event.target.files?.[0] && onReferenceFileSelected(event.target.files[0])}
	          />
	          {referenceFile ? (
	            <div>
	              <div className="text-2xl mb-2">🎛️</div>
	              <div className="font-semibold text-[var(--text-primary)]">{referenceFile.name}</div>
	              <div className="text-sm text-[var(--text-muted)] mt-1">
	                Referencja · {(referenceFile.size / 1024 / 1024).toFixed(1)} MB
	              </div>
	            </div>
	          ) : (
	            <div>
	              <div className="text-4xl mb-3 opacity-50">📎</div>
	              <div className="font-semibold text-[var(--text-secondary)]">
	                Dodaj plik referencyjny
	              </div>
	              <div className="text-sm text-[var(--text-muted)] mt-1">{uploadInfo}</div>
	            </div>
	          )}
	        </div>
	      )}

      {file && !analyzing && (
        <div className="flex justify-center mb-6">
          <button onClick={onRunAnalysis} className="btn btn-primary w-[216px] justify-start pl-4 pr-5 py-3 text-base">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true">⚡</span>
              <span>{platform ? "Analizuj na platformę" : "Analizuj styl muzyki"}</span>
            </span>
          </button>
        </div>
      )}

    </>
  );
}
