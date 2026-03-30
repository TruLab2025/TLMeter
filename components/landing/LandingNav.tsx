"use client";

import Link from "next/link";
import { buildAnalyzerLink } from "@/lib/urls";

type LandingNavProps = {
  mobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
  onCloseMobileMenu: () => void;
  brand: React.ReactNode;
};

const navLinks = [
  { href: "#how-it-works", label: "Jak to działa?" },
  { href: "#benefits", label: "Korzyści" },
  { href: "#pricing", label: "Cennik" },
  { href: "#testimonials", label: "Opinie" },
  { href: "#faq", label: "FAQ" },
  { href: "#dictionary", label: "Baza wiedzy" },
];

export default function LandingNav({
  mobileMenuOpen,
  onToggleMobileMenu,
  onCloseMobileMenu,
  brand,
}: LandingNavProps) {
  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--border)] backdrop-blur-md bg-[rgba(9,11,15,0.85)]">
      <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
        {brand}

        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              {link.label}
            </a>
          ))}
          <Link
            href="/roadmap"
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Roadmapa
          </Link>
          <div className="w-px h-4 bg-[var(--border)]"></div>
          <Link
            href="/activate"
            className="btn btn-outline text-xs py-1.5 px-3 border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--text-primary)] transition-all"
          >
            Aktywuj kod
          </Link>
          <Link
            href={buildAnalyzerLink()}
            className="btn btn-primary text-sm py-2 px-4 shadow-[0_0_15px_rgba(0,212,255,0.3)] hover:shadow-[0_0_25px_rgba(0,212,255,0.5)]"
          >
            Analizuj →
          </Link>
        </div>

        <button
          className="md:hidden flex flex-col gap-1.5 w-6 h-6 justify-center items-center"
          onClick={onToggleMobileMenu}
          aria-label="Toggle menu"
        >
          <span
            className={`w-6 h-0.5 bg-[var(--text-primary)] transition-all ${mobileMenuOpen ? "rotate-45 translate-y-2" : ""}`}
          ></span>
          <span
            className={`w-6 h-0.5 bg-[var(--text-primary)] transition-all ${mobileMenuOpen ? "opacity-0" : ""}`}
          ></span>
          <span
            className={`w-6 h-0.5 bg-[var(--text-primary)] transition-all ${mobileMenuOpen ? "-rotate-45 -translate-y-2" : ""}`}
          ></span>
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[var(--border)] bg-[rgba(9,11,15,0.98)]">
          <div className="px-6 py-4 space-y-3">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="block text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors py-2"
                onClick={onCloseMobileMenu}
              >
                {link.label}
              </a>
            ))}
            <Link
              href="/roadmap"
              className="block text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors py-2"
              onClick={onCloseMobileMenu}
            >
              Roadmapa
            </Link>
            <div className="border-t border-[var(--border)] my-3"></div>
            <Link
              href="/activate"
              className="btn btn-outline w-full justify-center text-xs py-2 px-3"
              onClick={onCloseMobileMenu}
            >
              Aktywuj kod
            </Link>
            <Link
              href={buildAnalyzerLink()}
              className="btn btn-primary w-full justify-center text-sm py-2 px-4"
              onClick={onCloseMobileMenu}
            >
              Analizuj →
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
