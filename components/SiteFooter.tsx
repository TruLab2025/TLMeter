"use client";

import Link from "next/link";

type SiteFooterProps = {
  className?: string;
};

export default function SiteFooter({ className = "" }: SiteFooterProps) {
  return (
    <footer className={`border-t border-[var(--border)] bg-[var(--bg-surface)] py-10 ${className}`.trim()}>
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 text-sm text-[var(--text-muted)] md:flex-row">
        <div className="flex flex-col items-center gap-4 text-center md:flex-row md:text-left">
          <span className="font-bold text-[var(--text-secondary)]">© 2026 TruLab</span>
          <span className="hidden md:inline">|</span>
          <span>TL Meter. Profesjonalne narzędzie DSP dla domowych producentów muzyki.</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          <Link href="/privacy" className="transition-colors hover:text-[var(--text-secondary)]">
            Polityka prywatności
          </Link>
          <Link href="/terms" className="transition-colors hover:text-[var(--text-secondary)]">
            Regulamin
          </Link>
          <a
            href="mailto:contact@trulab.pl"
            className="transition-colors hover:text-[var(--text-secondary)]"
          >
            Kontakt
          </a>
        </div>
      </div>
    </footer>
  );
}
