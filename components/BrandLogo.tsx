type BrandLogoProps = {
  size?: "sm" | "md";
  className?: string;
  showTagline?: boolean;
};

export default function BrandLogo({ size = "md", className = "", showTagline = true }: BrandLogoProps) {
  const iconSize = size === "sm" ? "w-8 h-8" : "w-10 h-10";
  const titleSize = size === "sm" ? "text-sm" : "text-base";
  const taglineSize = size === "sm" ? "text-[9px]" : "text-[10px]";
  const minHeight = size === "sm" ? "min-h-[36px]" : "min-h-[40px]";

  return (
    <div className={`flex items-center gap-3 ${minHeight} ${className}`}>
      <div className={`${iconSize} rounded-xl bg-[linear-gradient(145deg,rgba(0,212,255,0.14),rgba(0,212,255,0.04))] border border-[var(--accent)]/35 flex items-center justify-center relative overflow-hidden`}>
        <svg
          viewBox="0 0 40 40"
          className="w-[88%] h-[88%] text-[var(--accent)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <rect x="1" y="1" width="38" height="38" rx="10" stroke="currentColor" strokeOpacity="0.28" />

          <path d="M7 24.5C9 24.5 9.8 17.5 12 17.5C14.2 17.5 14.8 29 17 29C19.2 29 19.7 12 22 12C24.3 12 24.7 24.5 27 24.5C29.3 24.5 30 19.5 33 19.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.85" />

          <line x1="10" y1="8" x2="10" y2="31" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.1" />
          <line x1="20" y1="8" x2="20" y2="31" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.1" />
          <line x1="30" y1="8" x2="30" y2="31" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.1" />

          <circle cx="10" cy="15" r="2.1" fill="currentColor" />
          <circle cx="20" cy="24.5" r="2.1" fill="currentColor" />
          <circle cx="30" cy="12.5" r="2.1" fill="currentColor" />
        </svg>
      </div>

      <div className="leading-tight whitespace-nowrap">
        <div className={`font-semibold text-[var(--text-primary)] ${titleSize} whitespace-nowrap`}>
          TruLab <span className="text-[var(--text-secondary)] mx-1">|</span> <span className="text-[var(--accent)]">TL Meter</span>
        </div>
        {showTagline && (
          <div className={`${taglineSize} uppercase tracking-[0.16em] text-[var(--text-muted)] font-bold whitespace-nowrap`}>
            Bez AI → tylko matma
          </div>
        )}
      </div>
    </div>
  );
}
