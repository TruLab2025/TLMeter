"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import BrandLogo from "@/components/BrandLogo";
import AbComparisonSection from "@/components/landing/AbComparisonSection";
import HeroSection from "@/components/landing/HeroSection";
import LandingNav from "@/components/landing/LandingNav";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import SiteFooter from "@/components/SiteFooter";
import { dictionary, faq, howItWorks, librariesInfo, plans, testimonials } from "@/lib/landing/content";

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [analysisCount, setAnalysisCount] = useState<number | null>(null);
  const formattedAnalysisCount = (analysisCount ?? 0).toLocaleString("pl-PL");

  useEffect(() => {
    fetch("/api/analyses/count")
      .then(res => res.json())
      .then(data => setAnalysisCount(data.count))
      .catch(() => setAnalysisCount(null));
  }, []);

  return (
    <main className="min-h-screen grid-texture">
      <LandingNav
        mobileMenuOpen={mobileMenuOpen}
        onToggleMobileMenu={() => setMobileMenuOpen((open) => !open)}
        onCloseMobileMenu={() => setMobileMenuOpen(false)}
        brand={<BrandLogo size="md" />}
      />

      <HeroSection />


      {/* Mock screen view + Counter perfectly centered */}
      <section className="max-w-5xl mx-auto px-6 pt-2 pb-16">
        <div className="flex flex-col items-stretch justify-center gap-0">
          {/* Mock analysis card */}
          <div className="card p-8 bg-[var(--bg-card)] border-[var(--border)] relative overflow-hidden glow-accent shadow-[0_0_50px_rgba(0,212,255,0.1)]">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-3 h-3 rounded-full bg-[var(--bad)]"></div>
              <div className="w-3 h-3 rounded-full bg-[var(--warn)]"></div>
              <div className="w-3 h-3 rounded-full bg-[var(--ok)]"></div>
              <span className="ml-3 text-xs text-[var(--text-muted)] font-mono">Przykładowy zrzut analizy Twojego miksu</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: "Loudness", value: "-26.4 LUFS", status: "bad", detail: "True Peak: -5.9 dBTP | LRA: 1.2 LU", score: 20, rec: "Loudness: Tu leży największy problem Twojego miksu. Drastycznie odbiega od normy profilu Rock." },
                { label: "Low End Balance", value: "36% low", status: "warn", detail: "Mid: 8% | High: 2%", score: 65, rec: "Parametr jest blisko ideału, ale wymaga drobnej korekty (ok. 1-2dB) dla lepszej klarowności." },
                { label: "Midrange Density", value: "44% mid", status: "ok", detail: "Flatness: 0.88 | HFC: 0.02", score: 96, rec: "Środek pasma jest nasycony i selektywny. Instrumenty mają swoje miejsce w miksie." },
                { label: "Harshness", value: "2% high", status: "ok", detail: "HFC: 0.01", score: 98, rec: "Idealnie! Pasmo wysokich częstotliwości i sybilanty są pod pełną kontrolą." },
              ].map((m) => (
                <div key={m.label} className="card p-6 border-[var(--border)] relative overflow-hidden bg-[var(--bg-surface)]">
                  <div className="flex justify-between items-start mb-4">
                    <div className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">{m.label}</div>
                    <div className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded border border-[var(--border)]`} style={{ color: `var(--${m.status})` }}>
                      {m.status === "ok" ? "Idealnie" : m.status === "warn" ? "Ostrzeżenie" : "Problem"}
                    </div>
                  </div>
                  <div className="text-3xl font-mono font-bold mb-4" style={{ color: `var(--${m.status})` }}>
                    {m.value}
                  </div>
                  <div className="meter-track h-1.5 w-full overflow-hidden mb-3">
                    <div
                      className="meter-fill h-full"
                      style={{ width: `${m.score}%`, backgroundColor: `var(--${m.status})` }}
                    ></div>
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] font-mono mb-4">{m.detail}</div>
                  <div className="mt-auto pt-3 border-t border-[var(--border)] text-[10px] leading-relaxed">
                    <span className="font-bold text-[var(--accent)]">Rekomendacja:</span> <span className="text-[var(--text-secondary)]">{m.rec}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Counter perfectly centered between card and next section */}
          <div className="mt-16 flex justify-center">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="inline-flex items-center justify-center rounded-full border border-[var(--border-glow)] bg-[rgba(7,15,27,0.92)] px-5 py-2 shadow-[0_0_28px_rgba(0,212,255,0.12)]">
                <span className="text-xl font-black tabular-nums tracking-tight text-[var(--accent)] glow-text sm:text-2xl">
                  {formattedAnalysisCount}
                </span>
              </div>
              <div className="text-xs font-medium text-[var(--text-secondary)] sm:text-sm">
                Tyle analiz wykonali już użytkownicy <span className="font-semibold text-[var(--text-primary)]">TL Meter</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Jak to działa */}
      <section id="how-it-works" className="bg-[var(--bg-surface)] border-y border-[var(--border)] scroll-mt-24">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Jak używać aplikacji?</h2>
            <p className="text-[var(--text-secondary)] max-w-2xl mx-auto">
              Tylko 4 kroki dzielą Cię od obiektywnej diagnostyki Twojej muzyki tworzonej
              w domowym studiu.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {howItWorks.map((hw) => (
              <div key={hw.step} className="relative">
                <div className="text-6xl font-black text-[var(--bg-card)] absolute -top-8 -left-4 z-0 pointer-events-none">{hw.step}</div>
                <div className="relative z-10 pt-2">
                  <h3 className="text-xl font-bold text-[var(--accent)] mb-3">{hw.title}</h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{hw.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cechy i Funkcjonalnosc */}
      <section className="bg-[var(--bg-surface)] border-y border-[var(--border)] overflow-hidden relative">
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-5 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at center, var(--accent), transparent)" }}></div>
        <div className="max-w-6xl mx-auto px-6 py-24 relative z-10">
          <div className="flex flex-col md:flex-row gap-12 items-center">
            <div className="md:w-1/3">
              <h2 className="text-3xl font-bold mb-4">Co siedzi pod maską naszego silnika do analizy?</h2>
              <p className="text-sm text-[var(--text-secondary)] mb-6 leading-relaxed">
                Nie jesteśmy black-boxem obiecującym cuda bez oparcia w dowodach matematycznych. TL Meter to potężny skaner widmowy zbudowany na popularnych open-sourcowych standardach oraz autorskim silniku do analizy miksu.
              </p>
            </div>
            <div className="md:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-6">
              {librariesInfo.map((lib) => (
                <div key={lib.name} className="card p-5 border-l-4 border-l-[var(--accent)]">
                  <h4 className="font-mono text-[var(--accent)] font-semibold mb-2 text-sm">{lib.name}</h4>
                  <p className="text-xs text-[var(--text-muted)] line-clamp-5">{lib.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Problem → Rozwiązanie */}
      <section id="benefits" className="max-w-6xl mx-auto px-6 py-24 scroll-mt-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Problem → Rozwiązanie</h2>
          <p className="text-[var(--text-secondary)]">Poznaj rzeczywiste problemy producentów i jak TL Meter je rozwiązuje.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              problem: "😰 Nie słyszę błędów w swoich słuchawkach",
              solution: "TL Meter mierzy to matematycznie - nie polegasz na subiektywnym słuchu. Widać na wykresie gdzie jest problem.",
              icon: "👂"
            },
            {
              problem: "🎸 Gitary kłują po uszach, ale nie wiem które pasmo",
              solution: "Harshness Index wskaże dokładnie 2-8 kHz — sektor gdzie ucho jest najczulsze. Przytnąć 3-4 dB w EQ.",
              icon: "⚡"
            },
            {
              problem: "🔊 Bas dudni, ale nie mam pewności czy to normalne",
              solution: "Low End Balance pokaże czy energia basu zjada headroom. Wiesz wtedy czy pracować nad subem, czy masteringiem.",
              icon: "🎵"
            },
            {
              problem: "🚀 Wrzucam na Spotify/YouTube i miksuje cicho",
              solution: "LUFS to standard streamingu. TL Meter wskaże dokładnie ile do-reach. Nigdy więcej niespodzianek.",
              icon: "📱"
            },
            {
              problem: "🎼 Stereo mi się wali w MONO, trzeba poprawiać?",
              solution: "Korelacja L-R mierzy L-R phasing. Wiesz od razu czy problem w panning czy w layeringu instrumentów.",
              icon: "🎧"
            },
            {
              problem: "🤖 Nie wiem co wpisać do ChatGPT o swoim miksie",
              solution: "Eksportuj JSON z pełnymi metrykami. Wklej do AI — dostaniesz konkretne rekomendacje edytorskie.",
              icon: "✨"
            }
          ].map((item, i) => (
            <div key={i} className="card p-6 border-l-4 border-l-[var(--accent)] hover:border-l-[#33ddff] transition-colors group">
              <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">{item.icon}</div>
              <h3 className="font-bold text-[var(--text-primary)] mb-2">{item.problem}</h3>
              <div className="h-0.5 w-8 bg-gradient-to-r from-[var(--accent)] to-transparent mb-3"></div>
              <p className="text-sm text-[var(--text-secondary)]">{item.solution}</p>
            </div>
          ))}
        </div>
      </section>


      {/* Porównanie A/B pod sekcją Problem → Rozwiązanie */}
      <div>
        <AbComparisonSection />
      </div>


      {/* Pricing */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 pt-6 pb-24 scroll-mt-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Cennik TL Meter</h2>
          <p className="text-[var(--text-secondary)] max-w-2xl mx-auto">
            Wybierz plan idealny do Twoich potrzeb. Proste zasady i pełna kontrola nad
            parametrami miksu.
          </p>
        </div>
        <div className="flex justify-center mb-8">
          <Link href="/payment?plan=pro#compare-plans" className="btn btn-outline px-5 py-2 text-sm">
            Porównaj plany
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.name}
              id={`plan-${plan.name.toLowerCase()}`}
              className={`card p-6 flex flex-col relative scroll-mt-28 ${plan.highlight ? "border-[var(--accent)] shadow-[0_4px_20px_rgba(0,212,255,0.15)] glow-accent" : ""}`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold text-black bg-[var(--accent)] px-2 py-0.5 rounded uppercase tracking-widest whitespace-nowrap z-10">Idealne do home-studio</div>
              )}
              <div className="text-sm font-black text-[var(--text-primary)] mb-0.5 uppercase tracking-wide">{plan.name}</div>
              <div className="text-xs text-[var(--text-muted)] mb-3">{plan.tagline}</div>
              <div className="flex items-baseline gap-1 mb-4 pb-4 border-b border-[var(--border)]">
                <span className="text-4xl font-bold" style={{ color: plan.color }}>{plan.price}</span>
                {plan.price !== "0" && <span className="text-[var(--text-muted)] text-sm">PLN / miesiąc</span>}
                {plan.price === "0" && <span className="text-[var(--text-muted)] text-sm">zawsze za darmo</span>}
              </div>
              <ul className="space-y-3 flex-1 mb-6">
                {plan.features.map((f, i) => (
                  <li key={i} className="text-[13px] text-[var(--text-secondary)] flex items-start gap-2 leading-tight">
                    <span className="shrink-0">{f.startsWith('✅') ? '✅' : f.startsWith('❌') ? '❌' : f.startsWith('•') ? '•' : '•'}</span>
                    <span className={`${f.includes('**') ? 'font-bold text-[var(--accent)] underline decoration-[var(--accent)]/30 underline-offset-4' : f.startsWith('•') ? 'text-[var(--text-muted)]' : ''} ${f.includes('JSON') ? 'break-keep' : ''} ${f.includes('+') ? 'whitespace-nowrap' : ''}`}>
                      {f.replace(/^[✅❌•]\s*/, '').replace(/\*\*/g, '')}
                    </span>
                  </li>
                ))}
              </ul>
              <Link href={plan.ctaHref} className={`btn w-full justify-center ${plan.highlight ? "btn-primary hover:bg-[#33ddff]" : "btn-outline"}`}>
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Roadmap Teaser */}
      <section id="roadmap" className="max-w-5xl mx-auto px-6 py-24 scroll-mt-24">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--border-glow)] bg-[var(--bg-card)] text-xs text-[var(--accent)] mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse"></span>
            Roadmapa rozwoju
          </div>
          <h2 className="text-3xl font-bold mb-4">Zobacz, jak rozwijamy aplikację</h2>
          <p className="text-[var(--text-secondary)] max-w-2xl mx-auto">
            Budujemy TL Meter krok po kroku razem z producentami. Sprawdź, co już dowieźliśmy i nad czym pracujemy teraz.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-10">
          <div className="card p-6 border-l-4 border-l-[var(--ok)]">
            <div className="text-2xl mb-3">✅</div>
            <h3 className="text-lg font-bold mb-2">Q1 2026 — Gotowe</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-3">Analiza LUFS, True Peak, profile stylów muzycznych, system licencji</p>
          </div>
          <div className="card p-6 border-l-4 border-l-[var(--accent)] glow-accent">
            <div className="text-2xl mb-3">🚧</div>
            <h3 className="text-lg font-bold mb-2">Q2 2026 — W trakcie</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-3">Zaawansowane porady DAW, historia analiz, porównanie z referencją, tryb ciemny/jasny</p>
          </div>
          <div className="card p-6 border-l-4 border-l-[var(--info)]">
            <div className="text-2xl mb-3">📅</div>
            <h3 className="text-lg font-bold mb-2">Q3 2026 — Zaplanowane</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-3">Punchiness, Beat Stability, nowe profile (EDM, Hip-Hop), batch analysis, eksport PDF</p>
          </div>
        </div>

        <div className="text-center">
          <Link href="/roadmap" className="btn btn-primary text-sm py-3 px-8 inline-flex items-center gap-2">
            Zobacz pełną roadmapę →
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-4xl mx-auto px-6 pt-8 pb-24 scroll-mt-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Najczęściej zadawane pytania</h2>
          <p className="text-[var(--text-secondary)] max-w-2xl mx-auto">
            Krótko i konkretnie o działaniu aplikacji, planach i analizie audio.
          </p>
        </div>
        <div className="space-y-4">
          {faq.map((item) => (
            <details key={item.q} className="group card p-6 border-[var(--border)] bg-transparent hover:bg-[var(--bg-card)] transition-colors cursor-pointer">
              <summary className="font-semibold text-[var(--text-primary)] list-none flex justify-between items-center">
                {item.q}
                <span className="transition group-open:rotate-180">
                  <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                </span>
              </summary>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed mt-4">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <TestimonialsSection items={testimonials} />

      {/* Edukacja / Słowniczek */}
      <section id="dictionary" className="max-w-6xl mx-auto px-6 py-24 scroll-mt-24">
        <div className="mb-16">
          <h2 className="text-3xl font-bold mb-4">Baza wiedzy</h2>
          <p className="text-[var(--text-secondary)] max-w-2xl">
            Nie musisz być inżynierem akustyki żeby zrozumieć miks i mastering.
            Wyjaśniamy co i dlaczego oznaczają konkretne parametry Twojej aplikacji i dlaczego ich przestrzeganie decyduje w odbiorze hitów.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {dictionary.map((item) => (
            <div key={item.term} className="card p-6 flex flex-col hover:border-[var(--accent-dim)] transition-colors">
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-3 border-b border-[var(--border)] pb-3">
                {item.term}
              </h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed flex-1">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Call to action */}
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-24 text-center">
        <div className="card p-12 glow-accent relative overflow-hidden text-center justify-center flex flex-col items-center">
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-card)] to-transparent opacity-80 z-0"></div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 z-10">Kontroluj jakość swoich miksów</h2>
          <p className="text-[var(--text-secondary)] mb-8 z-10 max-w-xl">Uchroń domowy budżet przed setkami płatnych wtyczek analizujących i opłacaniem re-masterów. Sprawdzaj błędy za darmo już dziś i uzyskaj darmowe porady jak je szybko poprawić.</p>
          <Link href="/analyze" className="btn btn-primary text-lg px-10 py-5 z-10 shadow-[0_5px_30px_rgba(0,212,255,0.4)] hover:shadow-[0_5px_40px_rgba(0,212,255,0.6)]">
            Analizuj miks za darmo
          </Link>
        </div>
      </section>

      {/* Footer */}
      <SiteFooter />
    </main>
  );
}
