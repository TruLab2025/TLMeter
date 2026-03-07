"use client";

import { useState } from "react";
import Link from "next/link";
import { activateCode } from "@/lib/license";
import { useRouter } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";

const howItWorks = [
  {
    step: "1",
    title: "Miksujesz w DAW",
    desc: "Pracujesz nad swoim utworem w ulubionym DAW (Ableton, Logic, Reaper, Cubase). Po skończonym etapie zgrywasz miks (bounce) do formatu WAV, AIFF lub MP3."
  },
  {
    step: "2",
    title: "Ładujesz do TL Meter",
    desc: "Wrzucasz plik do naszej aplikacji w przeglądarce. Wybierasz profil swojego brzmienia (np. Metal), a TL Meter błyskawicznie dekoduje i analizuje sygnał."
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

export default function ActivatePage() {
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const router = useRouter();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!code.trim()) return;

        setLoading(true);
        setError(null);

        try {
            await activateCode(code.trim());
            setSuccess(true);
            // Wait a bit to show success message
            setTimeout(() => {
                router.push("/analyze");
            }, 1500);
        } catch (err: any) {
            setError(err.message || "Błąd aktywacji. Sprawdź kod i spróbuj ponownie.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="min-h-screen bg-[var(--bg-surface)] flex flex-col">
            {/* Header / Nav */}
            <nav className="border-b border-[var(--border)] bg-[rgba(9,11,15,0.5)] backdrop-blur-md">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/">
                        <BrandLogo size="md" />
                    </Link>
                    <Link href="/analyze" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                        Powrót do analizy
                    </Link>
                </div>
            </nav>

            <div className="flex-1 flex items-center justify-center p-6">
                <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center">

                    {/* Left: Activation Form */}
                    <div className="order-2 md:order-1">
                        <div className="card p-8 md:p-10 border-[var(--border)] shadow-2xl relative overflow-hidden">
                            {/* Decorative background */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent)] opacity-[0.03] rounded-full -mr-16 -mt-16 blur-3xl"></div>

                            <h1 className="text-3xl font-bold mb-2">Aktywuj dostęp</h1>
                            <p className="text-[var(--text-secondary)] mb-8">Wpisz otrzymany kod, aby odblokować pełną moc silnika TL Meter.</p>

                            {success ? (
                                <div className="text-center py-8 animate-fade-in">
                                    <div className="w-16 h-16 bg-[var(--ok)]/10 text-[var(--ok)] rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                    </div>
                                    <h2 className="text-xl font-bold mb-2">Dostęp odblokowany!</h2>
                                    <p className="text-[var(--text-muted)] text-sm">Przekierowujemy Cię do panelu analizy...</p>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div>
                                        <label htmlFor="code" className="block text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">
                                            Kod aktywacyjny
                                        </label>
                                        <input
                                            id="code"
                                            type="text"
                                            placeholder="XXXX-XXXX-XXXX"
                                            value={code}
                                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                                            className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl px-5 py-4 font-mono text-lg tracking-widest focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all outline-none"
                                            autoFocus
                                        />
                                        {error && (
                                            <p className="mt-3 text-xs text-[var(--bad)] font-semibold flex items-center gap-1.5">
                                                <span>⚠️</span> {error}
                                            </p>
                                        )}
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading || !code.trim()}
                                        className="btn btn-primary w-full py-4 text-base font-bold shadow-[0_0_20px_rgba(0,212,255,0.2)] hover:shadow-[0_0_30px_rgba(0,212,255,0.4)] disabled:opacity-50 disabled:shadow-none transition-all"
                                    >
                                        {loading ? "Weryfikacja..." : "Odblokuj dostęp"}
                                    </button>

                                    <div className="text-center mt-6">
                                        <p className="text-xs text-[var(--text-muted)]">
                                            Nie masz jeszcze kodu? <Link href="/#pricing" className="text-[var(--accent)] hover:underline font-semibold">Sprawdź plany cenowe</Link>
                                        </p>
                                    </div>
                                </form>
                            )}
                        </div>

                        <div className="mt-8 flex items-center justify-center gap-4 text-[var(--text-muted)] text-xs">
                            <div className="flex items-center gap-1.5">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                                <span>Bezpieczne aktywowanie</span>
                            </div>
                            <span className="opacity-20">|</span>
                            <span>Licencja wieczysta lub subskrypcyjna</span>
                        </div>
                    </div>

                    {/* Right: Benefits List */}
                    <div className="order-1 md:order-2 space-y-8">
                        <div>
                            <span className="text-[var(--accent)] text-xs font-bold uppercase tracking-[0.2em] mb-3 block">Co zyskujesz odblokowując?</span>
                            <h2 className="text-4xl font-bold leading-tight">Profesjonalna analiza <br /><span className="text-gradient">bez żadnych kompromisów.</span></h2>
                        </div>

                        <div className="space-y-6">
                            {[
                                {
                                    icon: "📊",
                                    title: "Pełny raport DSP & RAW",
                                    desc: "Dostęp do surowych danych widmowych, fali dźwiękowej oraz wszystkich 8 metryk analizy."
                                },
                                {
                                    icon: "💡",
                                    title: "Wsparcie techniczne w Twoim DAW",
                                    desc: "Konkretne porady dotyczące EQ, kompresji i saturacji dopasowane do wykrytych problemów."
                                },
                                {
                                    icon: "📁",
                                    title: "Eksport JSON dla AI",
                                    desc: "Pobieraj pełne dane, które możesz wkleić do zewnętrznych modeli AI w celu jeszcze głębszej analizy."
                                },
                                {
                                    icon: "⚡",
                                    title: "Brak dziennych limitów",
                                    desc: "Analizuj tyle utworów, ile potrzebujesz. Brak kolejek i ograniczeń wydajnościowych."
                                },
                                {
                                    icon: "💾",
                                    title: "Historia i porównywanie",
                                    desc: "Zapisuj wyniki swoich prac i porównuj jak zmieniał się Twój miks na przestrzeni czasu."
                                }
                            ].map((benefit, i) => (
                                <div key={i} className="flex gap-5 group">
                                    <div className="w-12 h-12 shrink-0 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] flex items-center justify-center text-2xl group-hover:border-[var(--accent)] group-hover:bg-[var(--accent)]/5 transition-all duration-300">
                                        {benefit.icon}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-[var(--text-primary)] mb-1">{benefit.title}</h3>
                                        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{benefit.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] border-dashed">
                            <p className="text-xs text-[var(--text-muted)] italic">
                                "TL Meter pomógł mi zidentyfikować błędy w dole pasma, których nie słyszałem w moich słuchawkach. Warto odblokować pełną wersję już dla samej precyzji RAW."
                            </p>
                            <div className="mt-2 text-right">
                                <span className="text-[10px] font-bold text-[var(--accent)]">— Marek, producent EDM</span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* How it works */}
            <section className="bg-[var(--bg-surface)] border-y border-[var(--border)]">
                <div className="max-w-6xl mx-auto px-6 py-24">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold mb-4">Jak pracować z TL Meter?</h2>
                        <p className="text-[var(--text-secondary)]">Tylko 4 kroki dzielą Cię od obiektywnej diagnostyki Twojej muzyki.</p>
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

            <footer className="py-8 text-center text-[var(--text-muted)] text-xs border-t border-[var(--border)]">
                TruLab | TL Meter © 2026. Od profesjonalnych realizatorów dla domowych producentów.
            </footer>
        </main>
    );
}
