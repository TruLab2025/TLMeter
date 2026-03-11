'use client';

import Link from "next/link";
import { useState, useEffect } from "react";
import { migrateHistoryToServer } from "@/lib/history";
import BrandLogo from "@/components/BrandLogo";

const roadmapItems = [
  {
    quarter: "Q1 2026",
    status: "✅ Ukończone",
    color: "var(--ok)",
    features: [
      { name: "Analiza LUFS (Integrated, Momentary, Short-term)", done: true },
      { name: "True Peak Detection (dBTP)", done: true },
      { name: "Profile stylów muzycznych (Rock, Grunge, Metal)", done: true },
      { name: "Podstawowe porady DAW dla Free i Lite", done: true },
      { name: "Eksport RAW JSON (Free/Lite)", done: true },
      { name: "System licencji i kodów aktywacyjnych", done: true },
      { name: "Integracja płatności Tpay+webhook aktywacji", done: true },
      { name: "Automatyczne faktury iFirma po płatności", done: true },
    ]
  },
  {
    quarter: "Q2 2026",
    status: "🚧 W trakcie",
    color: "var(--accent)",
    features: [
      { name: "Zaawansowane porady DAW (Pro/Premium)", done: false },
      { name: "6 głównych metryk miksu dla planu Pro", done: false },
      { name: "Wszystkie metryki miksu dla Premium", done: false },
      { name: "Historia ostatnich analiz (Premium)", done: false },
      { name: "Porównanie z referencją (Premium)", done: false },
      { name: "Eksport CORE JSON (Pro/Premium) z konwersji RAW → CORE", done: false },
      { name: "Tryb ciemny i jasny (toggle)", done: false },
    ]
  },
  {
    quarter: "Q3 2026",
    status: "📅 Zaplanowane",
    color: "var(--info)",
    features: [
      { name: "Analiza Punchiness (dynamika transjentów)", done: false },
      { name: "Beat Stability (stabilność rytmiczna)", done: false },
      { name: "Rozszerzone profile muzyczne (EDM, Hip-Hop, Pop, Jazz, Classical)", done: false },
      { name: "Wizualizacja spektrum 3D", done: false },
      { name: "Eksport raportu do PDF", done: false },
      { name: "Batch Analysis (analiza wielu plików)", done: false },
      { name: "Integracja z API zewnętrznych AI (OpenAI, Claude)", done: false },
    ]
  },
  {
    quarter: "Q4 2026",
    status: "💡 Pomysły",
    color: "var(--warn)",
    features: [
      { name: "Desktop App (Electron) dla offline workflow", done: false },
      { name: "Wtyczka VST3/AU do bezpośredniej analizy w DAW", done: false },
      { name: "A/B Testing tool (porównanie dwóch miksów)", done: false },
      { name: "Mastering Suggestions Engine (AI-powered)", done: false },
      { name: "Community Sharing (dzielenie się analizami)", done: false },
      { name: "Mobile App (iOS/Android)", done: false },
      { name: "Real-time Monitoring (live audio input)", done: false },
    ]
  },
  {
    quarter: "2027+",
    status: "🔮 Wizja długoterminowa",
    color: "var(--text-muted)",
    features: [
      { name: "Automatyczny mastering z ML", done: false },
      { name: "Integracja z platformami streamingowymi (Spotify, Apple Music)", done: false },
      { name: "Kolaboracja zespołowa (Team Plans)", done: false },
      { name: "API dla deweloperów", done: false },
      { name: "White-label dla studiów nagraniowych", done: false },
    ]
  },
];

export default function RoadmapPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [stats, setStats] = useState({ total: 0, today: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  // Migrate old LocalStorage history to server database (one-time)
  useEffect(() => {
    const migrate = async () => {
      try {
        const count = await migrateHistoryToServer();
        if (count > 0) {
          console.log(`✅ Zmigrowano ${count} analiz - przeładowuję statystyki...`);
          // Re-fetch stats after migration
          const res = await fetch('http://localhost:3000/api/stats');
          if (res.ok) {
            const data = await res.json();
            setStats({ total: data?.total || 0, today: data?.today || 0 });
          }
        }
      } catch (err) {
        console.warn('Migration skipped (API unavailable):', err);
      }
    };
    migrate();
  }, []);

  // Fetch statystyk o analizach
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('http://localhost:3000/api/stats');
        if (res.ok) {
          const data = await res.json();
          setStats({
            total: data?.total || 0,
            today: data?.today || 0
          });
        } else {
          setStats({ total: 0, today: 0 });
        }
      } catch (error) {
        console.warn('Roadmap stats unavailable:', error);
        setStats({ total: 0, today: 0 });
      } finally {
        setStatsLoading(false);
      }
    };
    
    fetchStats();
  }, []);

  // Licznik postępu
  const allFeatures = roadmapItems.flatMap(item => item.features);
  const doneFeatures = allFeatures.filter(f => f.done).length;
  const totalFeatures = allFeatures.length;
  const progress = Math.round((doneFeatures / totalFeatures) * 100);

  return (
    <main className="min-h-screen grid-texture">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-[var(--border)] backdrop-blur-md bg-[rgba(9,11,15,0.85)]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/">
            <BrandLogo size="md" />
          </Link>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/#how-it-works" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Jak to działa?</Link>
            <Link href="/#benefits" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Korzyści</Link>
            <Link href="/#pricing" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Cennik</Link>
            <Link href="/#testimonials" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Opinie</Link>
            <Link href="/#faq" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">FAQ</Link>
            <Link href="/#dictionary" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Baza wiedzy</Link>
            <div className="w-px h-4 bg-[var(--border)]"></div>
            <Link href="/activate" className="btn btn-outline text-xs py-1.5 px-3 border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--text-primary)] transition-all">Aktywuj kod</Link>
            <Link href="/analyze" className="btn btn-primary text-sm py-2 px-4 shadow-[0_0_15px_rgba(0,212,255,0.3)] hover:shadow-[0_0_25px_rgba(0,212,255,0.5)]">
              Analizuj →
            </Link>
          </div>

          {/* Mobile Hamburger */}
          <button 
            className="md:hidden flex flex-col gap-1.5 w-6 h-6 justify-center items-center"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <span className={`w-6 h-0.5 bg-[var(--text-primary)] transition-all ${mobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
            <span className={`w-6 h-0.5 bg-[var(--text-primary)] transition-all ${mobileMenuOpen ? 'opacity-0' : ''}`}></span>
            <span className={`w-6 h-0.5 bg-[var(--text-primary)] transition-all ${mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[var(--border)] bg-[rgba(9,11,15,0.98)]">
            <div className="px-6 py-4 space-y-3">
              <Link href="/#how-it-works" className="block text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>Jak to działa?</Link>
              <Link href="/#benefits" className="block text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>Korzyści</Link>
              <Link href="/#pricing" className="block text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>Cennik</Link>
              <Link href="/#testimonials" className="block text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>Opinie</Link>
              <Link href="/#faq" className="block text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>FAQ</Link>
              <Link href="/#dictionary" className="block text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>Baza wiedzy</Link>
              <div className="border-t border-[var(--border)] my-3"></div>
              <Link href="/activate" className="btn btn-outline w-full justify-center text-xs py-2 px-3" onClick={() => setMobileMenuOpen(false)}>Aktywuj kod</Link>
              <Link href="/analyze" className="btn btn-primary w-full justify-center text-sm py-2 px-4" onClick={() => setMobileMenuOpen(false)}>
                Analizuj →
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--border-glow)] bg-[var(--bg-card)] text-xs text-[var(--accent)] mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse"></span>
          Roadmapa rozwoju produktu
        </div>
        <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
          Dokąd zmierza<br />
          <span className="text-[var(--accent)] glow-text">TL Meter?</span>
        </h1>
        <p className="text-lg text-[var(--text-secondary)] max-w-3xl mx-auto leading-relaxed mb-8">
          Transparentnie pokazujemy, co już zbudowaliśmy, nad czym aktualnie pracujemy i co planujemy w przyszłości. Twoja opinia ma znaczenie — jeśli masz pomysł na funkcję, <Link href="mailto:contact@trulab.pl" className="text-[var(--accent)] hover:underline">napisz do nas</Link>.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/analyze" className="btn btn-primary text-sm py-2 px-6">
            Wypróbuj teraz
          </Link>
          <Link href="/#pricing" className="btn btn-outline text-sm py-2 px-6">
            Zobacz plany
          </Link>
        </div>
      </section>

      {/* Progress Counter */}
      <section className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Development Progress */}
          <div className="card p-8 border-[var(--accent)]/20">
            <div className="text-sm text-[var(--text-muted)] uppercase tracking-wider font-bold mb-4">📊 Postęp rozwoju aplikacji</div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-3xl font-bold">
                  <span className="text-[var(--accent)]">{doneFeatures}</span>
                  <span className="text-[var(--text-muted)]">/{totalFeatures}</span>
                </div>
                <div className="text-xs text-[var(--text-muted)] mt-2">funkcji zrobione</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-[var(--accent)]">{progress}%</div>
                <div className="text-xs text-[var(--text-muted)] mt-1">zaawansowania</div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-[var(--bg-surface)] rounded-full h-2 overflow-hidden border border-[var(--border)]">
              <div 
                className="h-full bg-gradient-to-r from-[var(--accent)] to-[#00ffff] transition-all duration-700"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          {/* User Analytics */}
          <div className="card p-8 border-[var(--accent)]/20 glow-accent">
            <div className="text-sm text-[var(--text-muted)] uppercase tracking-wider font-bold mb-4">🔍 Statystyki analiz użytkowników</div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">
                  <span className="text-[var(--accent)]">{statsLoading ? '...' : stats.total.toLocaleString()}</span>
                </div>
                <div className="text-xs text-[var(--text-muted)] mt-2">analiz wykonane</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-[#22c55e]">{statsLoading ? '...' : stats.today}</div>
                <div className="text-xs text-[var(--text-muted)] mt-1">dzisiaj</div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-8 text-xs text-[var(--text-secondary)]">
          ✨ Statystyki aktualizują się w czasie rzeczywistym
        </div>
      </section>

      {/* Timeline */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="space-y-12">
          {roadmapItems.map((item, idx) => (
            <div key={item.quarter} className="relative">
              {/* Timeline line */}
              {idx < roadmapItems.length - 1 && (
                <div className="absolute left-6 top-20 w-0.5 h-full bg-gradient-to-b from-[var(--border-glow)] to-transparent"></div>
              )}
              
              {/* Quarter Card */}
              <div className="flex gap-6 items-start">
                {/* Timeline dot */}
                <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center border-2 border-[var(--border)] bg-[var(--bg-card)] relative z-10" style={{ borderColor: item.color }}>
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                </div>

                {/* Content */}
                <div className="flex-1 card p-8">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold mb-2">{item.quarter}</h2>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold" style={{ color: item.color }}>{item.status}</span>
                      </div>
                    </div>
                  </div>

                  <ul className="space-y-3">
                    {item.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-[var(--text-secondary)]">
                        <span className="shrink-0 mt-0.5">
                          {feature.done ? (
                            <span className="text-[var(--ok)]">✅</span>
                          ) : (
                            <span className="text-[var(--text-muted)]">⏳</span>
                          )}
                        </span>
                        <span className={feature.done ? "text-[var(--text-muted)] line-through" : "text-[var(--text-primary)]"}>
                          {feature.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <div className="card p-12 text-center border-[var(--accent)] glow-accent">
          <h2 className="text-3xl font-bold mb-4">Masz pomysł na funkcję?</h2>
          <p className="text-[var(--text-secondary)] mb-8 max-w-2xl mx-auto">
            TL Meter rozwijamy w oparciu o feedback od producentów muzycznych. Jeśli brakuje Ci konkretnej funkcji lub masz sugestię, jak możemy ulepszyć narzędzie — daj nam znać!
          </p>
          <div className="flex items-center justify-center gap-4">
            <a href="mailto:contact@trulab.pl" className="btn btn-primary text-sm py-3 px-8">
              📧 Napisz do nas
            </a>
            <Link href="/" className="btn btn-outline text-sm py-3 px-8">
              ← Powrót na stronę główną
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-8">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between text-sm text-[var(--text-muted)] gap-6">
          <p>© 2026 TruLab | TL Meter. Profesjonalne narzędzie DSP dla domowych producentów muzyki.</p>
          <div className="flex gap-8">
            <Link href="/privacy" className="hover:text-[var(--text-primary)] transition-colors">Polityka prywatności</Link>
            <Link href="/terms" className="hover:text-[var(--text-primary)] transition-colors">Regulamin</Link>
            <a href="mailto:contact@trulab.pl" className="hover:text-[var(--text-primary)] transition-colors">Kontakt</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
