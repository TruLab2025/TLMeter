import type { Plan } from "@/lib/license";

interface AnalyzeErrorModalProps {
  error: string | null;
  isUpsellError: boolean;
  upsellPlan: Plan | null;
  onClose: () => void;
  onGoToPlan: (plan: Plan) => void;
  onReload: () => void;
}

export default function AnalyzeErrorModal({
  error,
  isUpsellError,
  upsellPlan,
  onClose,
  onGoToPlan,
  onReload,
}: AnalyzeErrorModalProps) {
  if (!error) {
    return null;
  }

  const targetPlan = upsellPlan ?? "lite";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="card w-full max-w-xl p-6 border-[var(--warn)]/40">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="text-base font-bold text-[var(--text-primary)]">⚠️ Wystąpił problem</h3>
          <button
            onClick={onClose}
            className="btn btn-outline text-xs px-2 py-1"
            aria-label="Zamknij komunikat"
          >
            ✕
          </button>
        </div>

        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{error}</p>

        <p className="text-xs text-[var(--text-muted)] mt-3">
          {isUpsellError
            ? "Ten limit wynika z aktualnego planu. Odblokuj wyższy plan, aby kontynuować bez ograniczenia."
            : "Spróbuj odświeżyć stronę lub sprawdź połączenie internetowe. Plik audio może być uszkodzony lub w nieobsługiwanym formacie."}
        </p>

        <div className="flex flex-wrap justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="btn btn-outline text-sm px-4 py-2"
          >
            Zamknij
          </button>

          {isUpsellError ? (
            <button
              onClick={() => onGoToPlan(targetPlan)}
              className="btn btn-primary text-sm px-4 py-2"
            >
              Przejdź do {targetPlan.toUpperCase()}
            </button>
          ) : (
            <button
              onClick={onReload}
              className="btn btn-primary text-sm px-4 py-2"
            >
              Odśwież stronę
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
