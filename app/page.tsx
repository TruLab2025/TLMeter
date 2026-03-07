'use client';

import Link from "next/link";
import { useState } from "react";

const howItWorks = [
  {
    step: "1",
    title: "Miksujesz w DAW",
    desc: "Pracujesz nad swoim utworem w ulubionym DAW (Ableton, Logic, Reaper, Cubase). Po skończonym etapie zgrywasz miks (bounce) do formatu WAV, AIFF lub MP3."
  },
  {
    step: "2",
    title: "Ładujesz do TL Meter",
    desc: "Wrzucasz plik do naszej aplikacji w przeglądarce. Wybierasz profil swojego brzmienia (np. Metal). Jeśli jesteś na pograniczu stylów, wybierz wykrywanie stylu. TL Meter błyskawicznie zdekoduje i zanalizuje sygnał."
  },
  {
    step: "3",
    title: "Weryfikujesz błędy",
    desc: "Dostajesz pełne skanowanie: od głośności (LUFS), przez wykrywanie 'błota' w dolnej częstotliwości, po analizę męczących wysokich rejestrów (tzw. harshness). Wszystko z instrukcjami, co z tym faktem zrobić w miksie."
  },
  {
    step: "4",
    title: "Wyciągasz wnioski",
    desc: "Wynik analizy, który otrzymasz, pokaże krok po kroku, co poprawić na ścieżkach i we wtyczkach DAW. Skopiuj plik JSON i wrzuć go do dowolnego asystenta AI, żeby jeszcze dokładniej analizować metryki Twojego miksu."
  }
];

const dictionary = [
  {
    term: "LUFS (Loudness Units relative to Full Scale)",
    desc: "Standard pomiaru głośności dopasowany do ludzkiego słyszenia. Decyduje o tym, jak mocno algorytmy serwisów streamingowych ściszą Twój utwór. Zbyt niska wartość to cichy miks, a zbyt wysoka to zgnieciona dynamika i ryzyko płaskiego brzmienia. Posiada kluczowe znaczenie przy odbiorze utworu na playliście."
  },
  {
    term: "True Peak (dBTP)",
    desc: "Absolutnie najwyższy poziom sygnału audio. Konwersja do MP3 czy odtwarzanie na słabych głośnikach potrafi podbić najgłośniejsze skoki o ułamek decybela. Jeśli True Peak przekracza -0.3 dB, nagranie zacznie trzeszczeć zniekształceniami cyfrowymi."
  },
  {
    term: "Dynamic Range / LRA",
    desc: "Loudness Range (LRA) mierzy różnicę między najcichszymi, a najgłośniejszymi fragmentami utworu. Duży LRA to miks 'oddychający' i kinowy. Mały LRA to popularna dla Metalu \"ściana dźwięku\", która daje kopa, ale łatwo potrafi zmęczyć słuchacza."
  },
  {
    term: "Low End Balance",
    desc: "Odpowiedni stosunek energii uderzeń stopy i basu do reszty zestawu nagrania. Zbyt dużo dołu dusi energię utworu i zjada cenny cichy headroom (zapas głośności), powodując mulenie i dudnienie na innych sprzętach."
  },
  {
    term: "Harshness Index",
    desc: "Psychoakustyczny indeks oznaczający kłujące wrzaski gitar i blach. Mierzy rejony 2-8 kHz, w których ludzkie ucho jest najbardziej czułe. Wysoki harshness sprawia, że słuchacz po 2 minutach przycisza muzykę, bo jest znużony."
  },
  {
    term: "Stereo Width & Korelacja",
    desc: "Ocenia jak bardzo 'szeroki' jest utwór i czy w ogóle by zniknął na głośnikach z telefonu (tzw. badanie w MONO). Korelacja L-R poniżej zera oznacza powazne kolizje i kasowanie się kanałów."
  }
];

const librariesInfo = [
  {
    name: "WebAudio API",
    desc: "Służy nam za serce środowiska dekodowania sygnału bezpośrednio w RAM-ie z plików w przeglądarce za użyciem OfflineAudioContext."
  },
  {
    name: "Custom TL DSP Engine",
    desc: "Stworzony od zera silnik w JS przez inżynierów z TruLab. Analizuje widmo metodą Transformacji Fouriera (FFT) na kawałki audio trwające 23 do 46ms, dostając w efekcie super-dokładne próbki."
  },
  {
    name: "Meyda",
    desc: "Ogólnodostępna biblioteka do ekstrakcji cech dźwięku. Używamy jej, by wyciągnąć matematyczne dowody na temat Rolloffu, Flatness i Spectral Centroid dla sekcji średnich tonów."
  },
  {
    name: "Essentia.js",
    desc: "Nadzwyczaj popularny w świecie akademickim framework zoptymalizowany pod WebAssembly. Umożliwia precyzyjną diagnozę psychoakustycznych zjawisk, z którymi walczą inżynierowie przy Masteringu."
  }
];

const plans = [
  {
    name: "Free",
    tagline: "Idealny do codziennej pracy",
    price: "0",
    color: "var(--text-secondary)",
    features: [
      "✅ Analiza plików MP3 i AAC",
      "✅ 4 główne metryki miksu",
      "✅ 3 profile muzyczne",
      "✅ Podstawowe porady DAW",
      "✅ Eksport RAW JSON",
      "❌ Analiza plików WAV i AIFF",
      "❌ Historia analiz",
      "**Bez limitu analiz**",
    ],
    cta: "Zacznij za darmo",
    ctaHref: "/analyze",
    highlight: false,
  },
  {
    name: "Lite",
    tagline: "Dobry do jakościowej analizy plików",
    price: "9",
    color: "#818cf8",
    features: [
      "✅ Analiza plików WAV i AIFF",
      "✅ 4 główne metryki miksu",
      "✅ 6 profili muzyki",
      "✅ Podstawowe porady DAW",
      "✅ Eksport RAW JSON",
      "❌ Brak reklam w analizach",
      "❌ Zaawansowane porady DAW",
      "**Bez limitu analiz**",
    ],
    cta: "Kup Lite",
    ctaHref: "/payment?plan=lite",
    highlight: false,
  },
  {
    name: "Pro",
    tagline: "Profesjonalne narzędzie inżyniera",
    price: "19",
    color: "var(--accent)",
    features: [
      "✅ Wszystko z Lite",
      "✅ 6 głównych metryk miksu",
      "✅ 12 profili muzyki",
      "✅ Zaawansowane porady DAW",
      "✅ Eksport CORE JSON",
      "✅ Porównanie z ostatnią analizą",
      "• 2 urządzenia",
      "**Bez limitu analiz**",
    ],
    cta: "Kup Pro",
    ctaHref: "/payment?plan=pro",
    highlight: true,
  },
  {
    name: "Premium",
    tagline: "Najlepsze dla top producenta muzyki",
    price: "29",
    color: "#f59e0b",
    features: [
      "✅ Wszystko z Pro",
      "✅ Wszystkie metryki miksu",
      "✅ Wszystkie profile",
      "✅ Historia ostatnich analiz",
      "✅ Porównanie z referencją",
      "• 3 urządzenia",
      "• Priorytetowe wsparcie",
      "**Bez limitu analiz**",
    ],
    cta: "Kup Premium",
    ctaHref: "/payment?plan=premium",
    highlight: false,
  },
];

const faq = [
  {
    q: "Dlaczego mam używać TL Meter, a nie pluginu VST?",
    a: "TL Meter nie obciąża procesora Twojego DAW ani nie spowalnia miksu. Skupiasz się na muzyce, eksportujesz ślad i diagnozujesz go pod względem problemów, patrząc całościowo i nie domyślając się z wykresików w pluginach wielozadaniowych.",
  },
  {
    q: "Co to jest DSP i na czym polega ta analiza?",
    a: "DSP to Digital Signal Processing — cyfrowe przetwarzanie sygnału audio. TL Meter wykorzystuje algorytmy DSP do rozkładania Twojego miksu na częstotliwości (FFT - Fast Fourier Transform), mierzenia głośności według standardu EBU R128, wykrywania szczytów True Peak i analizy balansu spektralnego. Wszystko odbywa się w czasie rzeczywistym w przeglądarce, bez potrzeby instalacji oprogramowania czy wysyłania plików na serwer.",
  },
  {
    q: "Czy moje pliki audio są wysyłane na serwer?",
    a: "Nie. Analiza działa w 100% w Twojej przeglądarce (WebAudio API). Plik nigdy nie opuszcza Twojego komputera, a TruLab nie ma do niego dostępu.",
  },
  {
    q: "Jakie formaty są obsługiwane?",
    a: "WAV i AIFF dają najlepsze wyniki (audio bez strat o najlepszej jakości skanowania). MP3 i AAC również działają, ale wiedz ucinają pasmo i powodują piki w True Peak.",
  },
  {
    q: "Jak działa system kodów aktywacyjnych?",
    a: "Po zakupie otrzymujesz email z unikalnym kodem. Wklejasz go w aplikacji — kod zostaje powiązany z odciskiem palca logiki Twojego sprzętu i przeglądarki. Pożegnaj się z nudnymi logowaniami i hasłami.",
  },
  {
    q: "Dla kogo jest przeznaczony TL Meter?",
    a: "Dla amatorów i domowych producentów, którzy realizują swoje wymarzone utwory bez wsparcia inżynierów. Stworzyliśmy go, bo szukaliśmy sprawnego narzędzia w przeglądarce, aby poprawić jakość i nie musieć domyślać się usterek ze skomplikowanych wykresów po odpaleniu 10 rożnych wtyczek.",
  },
  {
    q: "Czy mogę używać TL Meter na więcej niż jednym komputerze?",
    a: "Tak, zależnie od kupionego na stałe planu: Lite pozwala zapamiętać przeglądarkę na 1 urządzeniu z jednoczesną pracą, Pro dotyczy 2 urządzeń (np Mac i iPhone), Premium pozwala na 3.",
  },
];

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <main className="min-h-screen grid-texture">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-[var(--border)] backdrop-blur-md bg-[rgba(9,11,15,0.85)]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center">
              <span className="text-black font-bold text-xs">TL</span>
            </div>
            <span className="font-semibold text-[var(--text-primary)]">TruLab <span className="text-[var(--text-secondary)] mx-1">|</span> <span className="text-[var(--accent)]">TL Meter</span></span>
          </div>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-6">
            <a href="#how-it-works" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Jak to działa?</a>
            <a href="#benefits" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Korzyści</a>
            <a href="#pricing" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Cennik</a>
            <Link href="/roadmap" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Roadmap</Link>
            <a href="#testimonials" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Opinie</a>
            <a href="#faq" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">FAQ</a>
            <a href="#dictionary" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Baza wiedzy</a>
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
              <a href="#how-it-works" className="block text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>Jak to działa?</a>
              <a href="#benefits" className="block text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>Korzyści</a>
              <a href="#pricing" className="block text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>Cennik</a>
              <Link href="/roadmap" className="block text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>Roadmap</Link>
              <a href="#testimonials" className="block text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>Opinie</a>
              <a href="#faq" className="block text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
              <a href="#dictionary" className="block text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>Baza wiedzy</a>
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
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--border-glow)] bg-[var(--bg-card)] text-xs text-[var(--accent)] mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse"></span>
          Analiza działa lokalnie i chroni Twoją twórczość
        </div>
        <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
          Sprawdź czy Twój miks<br />
          <span className="text-[var(--accent)] glow-text">brzmi jak z płyty</span>
        </h1>
        <p className="text-xl text-[var(--text-secondary)] max-w-2xl mx-auto mb-10 leading-relaxed">
          Obiektywna, cyfrowa analiza Twojej muzyki z domowego studia.<br />
          Koniec zgadywania na oko, czy bas dudni, a gitary kłują po uszach.<br />
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

      {/* Mock screen view */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
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
      </section>

      {/* Jak to działa */}
      <section id="how-it-works" className="bg-[var(--bg-surface)] border-y border-[var(--border)] scroll-mt-24">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Jak używać aplikacji?</h2>
            <p className="text-[var(--text-secondary)]">Tylko 4 kroki dzielą Cię od obiektywnej diagnostyki Twojej muzyki tworzonej w domowym studiu.</p>
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
        <div className="max-w-6xl mx-auto px-6 py-20 relative z-10">
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
              icon: "📊"
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

      {/* Pricing */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-20 scroll-mt-24">
        <h2 className="text-3xl font-bold text-center mb-4">Cennik TL Meter</h2>
        <p className="text-center text-[var(--text-secondary)] mb-12">Wybierz plan idealny do Twoich potrzeb. Proste zasady, pełna kontrola nad parametrami miksu.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan) => (
            <div key={plan.name} className={`card p-6 flex flex-col relative ${plan.highlight ? "border-[var(--accent)] shadow-[0_4px_20px_rgba(0,212,255,0.15)] glow-accent" : ""}`}>
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
                    <span className={`${f.includes('**') ? 'font-bold text-[var(--accent)] underline decoration-[var(--accent)]/30 underline-offset-4' : f.startsWith('•') ? 'text-[var(--text-muted)]' : ''} ${f.includes('JSON') ? 'break-keep' : ''}`}>
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
      <section id="roadmap" className="max-w-5xl mx-auto px-6 py-20 scroll-mt-24">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--border-glow)] bg-[var(--bg-card)] text-xs text-[var(--accent)] mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse"></span>
            Roadmapa rozwoju
          </div>
          <h2 className="text-3xl font-bold mb-4">Co dalej z TL Meter?</h2>
          <p className="text-[var(--text-secondary)] max-w-2xl mx-auto">
            Rozwijamy narzędzie w oparciu o feedback od producentów. Zobacz, co już zrobiliśmy i co planujemy w najbliższych miesiącach.
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
      <section id="faq" className="max-w-4xl mx-auto px-6 pb-20 pt-10 scroll-mt-24">
        <h2 className="text-3xl font-bold text-center mb-12">Najczęściej zadawane pytania</h2>
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

      {/* Polecają nas */}
      <section id="testimonials" className="bg-[var(--bg-card2)] border-y border-[var(--border)] py-16 overflow-hidden">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-center mb-10">Co mówią nasi użytkownicy</h2>
          <div className="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-2 hide-scrollbar" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
            {[
              { name: "Mateusz", role: "Gitarzysta Producent", img: "12", text: "W 5 minut naprawiłem dudniący bas w swoim miksie. Genialne narzędzie dla każdego, kto nie ma budżetu na mastering." },
              { name: "Piotr Kowalski", role: "Hobbysta, Beatmaker", img: "60", text: "Zawsze bałem się, że brzmię za cicho w aucie i wyrzucam pieniądze w błoto, to rozwiązanie mnie wyręczyło z lęku." },
              { name: "Lena Witkowska", role: "Wokalistka", img: "41", text: "Nareszcie wiem dlaczego moje blachy kłuły po uszach. Uratowało to kilka piosenek z epki zespołu." },
              { name: "Arkadiusz S.", role: "Garażowy Producent", img: "11", text: "Mega pomocne daw tipy. Jako początkujący nie mam idealnego słuchu, a ten skaner obiektywnie podpowiada EQ." },
              { name: "Danny", role: "Basista rockowy", img: "52", text: "Rewolucja w wypuszczaniu demówek. Kiedyś się wstydziłem wrzucać szkice na grupę, teraz filtruję je tu wcześniej." },
              { name: "Julia K.", role: "Indie Pop Artist", img: "47", text: "Przestałam korzystać z subskrypcji drogich pluginów izotope, bo TL Meter pokazuje mi palcem co zepsułam." },
            ].map((t) => (
              <div key={t.name} className="w-[280px] md:w-[320px] snap-center card p-6 bg-[var(--bg-surface)] shrink-0 flex flex-col justify-between h-auto">
                <div>
                  <div className="flex text-[var(--accent)] mb-3 text-sm">★★★★★</div>
                  <p className="text-sm text-[var(--text-secondary)] italic mb-6 leading-relaxed">"{t.text}"</p>
                </div>
                <div className="flex items-center gap-4 border-t border-[var(--border)] pt-4 mt-auto">
                  <img src={`https://i.pravatar.cc/150?img=${t.img}`} alt={t.name} className="w-10 h-10 rounded-full border border-[var(--border)] object-cover bg-[var(--bg-card)]" />
                  <div>
                    <div className="font-bold text-sm text-[var(--text-primary)]">{t.name}</div>
                    <div className="text-xs text-[var(--text-muted)]">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-2 mt-4">
            <div className="w-4 h-2 rounded-full bg-[var(--accent)] transition-all"></div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-2 h-2 rounded-full bg-[var(--border)] hover:bg-[var(--text-muted)] transition-all cursor-pointer"></div>
            ))}
          </div>
        </div>
      </section>

      {/* Edukacja / Słowniczek */}
      <section id="dictionary" className="max-w-6xl mx-auto px-6 py-24 mt-12 scroll-mt-24">
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
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
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
      <footer className="border-t border-[var(--border)] py-8 mt-12 bg-[var(--bg-surface)]">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between text-sm text-[var(--text-muted)] gap-6">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <span className="font-bold text-[var(--text-secondary)]">© 2026 TruLab</span>
            <span className="hidden md:inline">|</span>
            <span>TL Meter. Od profesjonalnych producentów dla domowych realizatorów.</span>
          </div>
          <div className="flex gap-8">
            <Link href="/" className="hover:text-[var(--text-secondary)] transition-colors">Kontakt</Link>
            <Link href="/activate" className="hover:text-[var(--text-secondary)] transition-colors">Aktywuj kod</Link>
            <Link href="/terms" className="hover:text-[var(--text-secondary)] transition-colors">Regulamin</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
