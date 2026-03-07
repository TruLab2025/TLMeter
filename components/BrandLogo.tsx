type BrandLogoProps = {
  size?: "sm" | "md";
  className?: string;
  showTagline?: boolean;
};

export default function BrandLogo({ size = "md", className = "", showTagline = true }: BrandLogoProps) {
  const iconSize = size === "sm" ? "w-7 h-7" : "w-9 h-9";
  const titleSize = size === "sm" ? "text-sm" : "text-base";
  const taglineSize = size === "sm" ? "text-[9px]" : "text-[10px]";

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`${iconSize} rounded-xl bg-[var(--accent)]/15 border border-[var(--accent)]/40 flex items-center justify-center relative overflow-hidden`}>
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/20 to-transparent" />
        <span className="relative z-10 text-[var(--accent)] font-black text-xs tracking-wide">TL</span>
      </div>

      <div className="leading-tight">
        <div className={`font-semibold text-[var(--text-primary)] ${titleSize}`}>
          TruLab <span className="text-[var(--text-secondary)] mx-1">|</span> <span className="text-[var(--accent)]">TL Meter</span>
        </div>
        {showTagline && (
          <div className={`${taglineSize} uppercase tracking-[0.16em] text-[var(--text-muted)] font-bold`}>
            Bez AI tylko matma
          </div>
        )}
      </div>
    </div>
  );
}
