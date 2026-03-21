"use client";

import Link from "next/link";

export default function HeroSection() {
  return (
    <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--border-glow)] bg-[var(--bg-card)] text-xs text-[var(--accent)] mb-8">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse"></span>
        Analiza działa lokalnie i chroni Twoją twórczość
      </div>
      <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
        Sprawdź czy Twój miks
        <br />
        <span className="text-[var(--accent)] glow-text">brzmi jak z płyty</span>
      </h1>
      <p className="text-xl text-[var(--text-secondary)] max-w-2xl md:max-w-3xl mx-auto mb-10 leading-relaxed">
        Obiektywna, cyfrowa analiza Twojej muzyki z domowego studia.
        <br className="md:hidden" />{" "}
        Sprawdź czy Twój miks trzyma standardy rynkowe zanim wyślesz go do masteringu albo na platformy streamingowe.
        <br className="md:hidden" />{" "}
        Koniec zgadywania na oko, czy bas dudni, a gitary kłują po uszach.
        <br className="md:hidden" />{" "}
        Uzyskaj gotowe podpowiedzi poprawy brzmienia z dedykacją dla muzyki gitarowej.
      </p>
      <div className="flex items-center justify-center gap-4 flex-wrap">
        <Link href="/analyze" className="btn btn-primary text-base px-8 py-3">
          Analizuj miks za darmo
        </Link>
        <a href="#how-it-works" className="btn btn-outline text-base px-8 py-3">
          Zobacz jak to działa
        </a>
      </div>
      <div className="mt-8 flex items-center justify-center gap-6 text-xs text-[var(--text-muted)] flex-wrap">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--ok)]"></span>
          <span>W 100% obiektywne wyniki</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--ok)]"></span>
          <span>Błyskawiczna analiza (~30s)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--ok)]"></span>
          <span>Bezpieczeństwo plików</span>
        </div>
      </div>
    </section>
  );
}
