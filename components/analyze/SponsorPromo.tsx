import { type Sponsor } from "@/components/SponsorScreen";

interface SponsorPromoProps {
  sponsor: Sponsor | null;
  closable?: boolean;
  onClose?: () => void;
  modal?: boolean;
}

export default function SponsorPromo({
  sponsor,
  closable = false,
  onClose,
  modal = false,
}: SponsorPromoProps) {
  if (!sponsor) {
    return null;
  }

  const content = (
    <div
      className={`relative ${modal ? "max-w-5xl w-full rounded-2xl p-6 md:p-8 shadow-2xl" : "rounded-2xl p-6 md:p-8 mb-6 shadow-xl"} animate-fade-in`}
      style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)", border: "3px solid #ffd700" }}
    >
      {closable && onClose && (
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white bg-black/30 hover:bg-black/50 transition-all p-1.5 rounded-full z-10"
          title="Zamknij"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      )}

      <div className="flex flex-col md:flex-row items-start gap-4 md:gap-6">
        <div className="text-5xl md:text-6xl shrink-0">{sponsor.logo}</div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: "#ffd700" }}>📢 Reklama</div>
          <div className="font-black text-2xl md:text-3xl mb-3" style={{ color: "#ffffff" }}>{sponsor.name}</div>
          <p className="text-sm md:text-base leading-relaxed mb-6" style={{ color: "#b0b0b0" }}>{sponsor.description}</p>
          <a
            href={sponsor.cta_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-5 md:px-6 py-2.5 md:py-3 rounded-lg font-bold text-sm md:text-base transition-all"
            style={{ background: "#ffd700", color: "#000000" }}
          >
            {sponsor.cta_text}
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </a>
        </div>
      </div>
    </div>
  );

  if (modal) {
    return (
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center backdrop-blur-sm bg-black/70 p-4 pb-20 md:pb-4 overflow-y-auto">
        {content}
      </div>
    );
  }

  return content;
}
