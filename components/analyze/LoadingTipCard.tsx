interface LoadingTipCardProps {
  visible: boolean;
  loadingTip: string;
}

export default function LoadingTipCard({ visible, loadingTip }: LoadingTipCardProps) {
  if (!visible) {
    return null;
  }

  return (
    <div className="card p-6 mb-5 bg-[var(--bg-card)] border-dashed border-[var(--border)] animate-fade-in flex flex-col items-center justify-center text-center min-h-[124px]">
      <div className="text-sm font-bold text-[var(--accent)] mb-2 uppercase tracking-widest">💡 Miks tip</div>
      <p className="text-sm text-[var(--text-secondary)] italic leading-relaxed">{loadingTip}</p>
    </div>
  );
}
