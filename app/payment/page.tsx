'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Check, CreditCard, Mail, Sparkles, Shield, Zap, ArrowRight, Loader2, Info, X, Copy, CheckCheck } from 'lucide-react';
import Link from 'next/link';
import { activateCode, saveSession, type Plan } from '@/lib/license';

const PLANS_CONFIG = {
    lite: {
        id: 'lite',
        name: 'Lite',
        price: '9',
        description: 'Podstawowa analiza dla Twojego studio.',
        color: '#818cf8',
        features: [
            '✅ Analiza plików WAV i AIFF',
            '✅ 4 główne metryki miksu',
            '✅ 6 profili muzyki',
            '✅ Podstawowe porady DAW',
            '✅ Eksport RAW JSON',
            '❌ Brak reklam w analizach',
            '❌ Zaawansowane porady DAW',
            '**Bez limitu analiz**',
        ]
    },
    pro: {
        id: 'pro',
        name: 'Pro',
        price: '19',
        description: 'Kompletne narzędzie dla inżynierów miksu.',
        color: 'var(--accent)',
        features: [
            '✅ Wszystko z Lite',
            '✅ 6 głównych metryk miksu',
            '✅ 12 profili muzyki',
            '✅ Zaawansowane porady DAW',
            '✅ Eksport CORE JSON + RAW JSON',
            '✅ Porównanie z ostatnią analizą',
            '• 2 urządzenia',
            '**Bez limitu analiz**',
        ]
    },
    premium: {
        id: 'premium',
        name: 'Premium',
        price: '29',
        description: 'Najwyższa precyzja i brak limitów.',
        color: '#f59e0b',
        features: [
            '✅ Wszystko z Pro',
            '✅ Wszystkie metryki miksu',
            '✅ Wszystkie profile muzyczne',
            '✅ Historia ostatnich analiz',
            '✅ Porównanie z referencją',
            '• 3 urządzenia',
            '• Priorytetowe wsparcie',
            '**Bez limitu analiz**',
        ]
    }
};

const COMPARISON = [
    { name: 'Analiza plików WAV i AIFF', free: '❌', lite: '✅', pro: '✅', premium: '✅' },
    { name: 'Analiza plików MP3 i AAC', free: '✅', lite: '❌', pro: '❌', premium: '❌' },
    { name: 'Główne metryki miksu', free: '4', lite: '4', pro: '6', premium: 'All' },
    { name: 'Profile muzyki', free: '3', lite: '6', pro: '12', premium: 'All' },
    { name: 'Podstawowe porady DAW', free: '✅', lite: '✅', pro: '❌', premium: '❌' },
    { name: 'Zaawansowane porady DAW', free: '❌', lite: '❌', pro: '✅', premium: '✅' },
    { name: 'Eksport analizy do JSON', free: 'Raw JSON', lite: 'Raw JSON', pro: 'Core JSON', premium: 'Core JSON' },
    { name: 'Brak reklam w analizach', free: '❌', lite: '❌', pro: '✅', premium: '✅' },
    { name: 'Historia ostatnich analiz', free: '❌', lite: '❌', pro: '❌', premium: '✅' },
    { name: 'Historia ostatniej analizy', free: '❌', lite: '❌', pro: '✅', premium: '✅' },
    { name: 'Porównanie z referencją', free: '❌', lite: '❌', pro: '❌', premium: '✅' },
    { name: 'Urządzenia', free: '1', lite: '1', pro: '2', premium: '3' },
    { name: 'Priorytetowe wsparcie', free: '❌', lite: '❌', pro: '❌', premium: '✅' },
    { name: 'Bez limitu analiz', free: '✅', lite: '✅', pro: '✅', premium: '✅' },
];

function PaymentContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const planId = searchParams.get('plan') as keyof typeof PLANS_CONFIG || 'pro';
    const plan = PLANS_CONFIG[planId] || PLANS_CONFIG.pro;

    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [licenseCode, setLicenseCode] = useState('');
    const [copied, setCopied] = useState(false);
    const [activating, setActivating] = useState(false);
    const [webhookPending, setWebhookPending] = useState(false);
    const [isLocalTestMode, setIsLocalTestMode] = useState(false);

    const callbackStatus = searchParams.get('status');
    const callbackTx = searchParams.get('tx') || searchParams.get('transactionId');

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const host = window.location.hostname;
        const localhost = host === 'localhost' || host === '127.0.0.1';
        const forceEnabled = process.env.NEXT_PUBLIC_ENABLE_TEST_UNLOCK === '1';
        setIsLocalTestMode(localhost || forceEnabled);
    }, []);

    const validateEmail = (email: string) => {
        return email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    };

    const handleStartPayment = async () => {
        setEmailError('');
        if (!email) {
            setEmailError('Proszę podać adres e-mail.');
            return;
        }
        if (!validateEmail(email)) {
            setEmailError('Proszę podać poprawny adres e-mail.');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('http://localhost:3001/api/payment/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, plan: planId }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                setEmailError(data.error || 'Błąd płatności. Spróbuj ponownie.');
                return;
            }

            if (data.redirectUrl) {
                window.location.href = data.redirectUrl;
                return;
            }

            setEmailError('Brak URL przekierowania do Tpay.');
        } catch (error) {
            console.error('Payment error:', error);
            setEmailError('Błąd połączenia z API.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const checkStatus = async () => {
            if (callbackStatus !== 'success' || !callbackTx) return;

            setLoading(true);
            setWebhookPending(true);
            try {
                const response = await fetch(`http://localhost:3001/api/payment/status/${encodeURIComponent(callbackTx)}`);
                const data = await response.json();

                if (response.ok && data?.status === 'active' && data?.code) {
                    setSuccess(true);
                    setLicenseCode(data.code);
                    if (data.email) setEmail(data.email);
                    setWebhookPending(false);
                    return;
                }

                setEmailError('Płatność przyjęta. Czekamy na webhook Tpay i aktywację planu. Odśwież stronę za chwilę.');
            } catch (error) {
                console.error('Status check error:', error);
                setEmailError('Nie udało się sprawdzić statusu płatności. Spróbuj ponownie za chwilę.');
            } finally {
                setLoading(false);
            }
        };

        checkStatus();
    }, [callbackStatus, callbackTx]);

    const handleCopyCode = () => {
        navigator.clipboard.writeText(licenseCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleActivateNow = async () => {
        setActivating(true);
        try {
            await activateCode(licenseCode);
            // Wait a bit to show success
            setTimeout(() => {
                router.push('/analyze');
            }, 1000);
        } catch (err: any) {
            alert(err.message || 'Błąd aktywacji');
            setActivating(false);
        }
    };

    const handleDevUnlock = (targetPlan: Plan) => {
        saveSession({
            plan: targetPlan,
            code: `DEV-${targetPlan.toUpperCase()}`,
            deviceId: 'local-test-device',
        });
        router.push('/analyze');
    };

    if (success) {
        return (
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="card max-w-lg w-full p-8 text-center animate-fade-in glow-accent">
                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Sparkles className="text-green-500 w-10 h-10" />
                    </div>
                    <h1 className="text-3xl font-bold mb-2">Sukces! Twój plan jest gotowy.</h1>
                    <p className="text-[var(--text-secondary)] mb-8">
                        Kod licencyjny wysłaliśmy na e-mail <strong>{email}</strong>. Faktura iFirma jest generowana automatycznie po potwierdzeniu płatności.
                    </p>

                    <div className="bg-[var(--bg-surface)] border border-dashed border-[var(--accent)] p-6 rounded-xl mb-8">
                        <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest mb-2 font-bold font-mono">Twój Kod Licencyjny</p>
                        <div className="flex items-center justify-between gap-4">
                            <code className="text-2xl font-mono text-[var(--accent)] font-bold tracking-tighter block">{licenseCode}</code>
                            <button
                                onClick={handleCopyCode}
                                className="btn btn-outline p-2 shrink-0"
                                title="Kopiuj kod"
                            >
                                {copied ? (
                                    <CheckCheck className="w-5 h-5 text-green-500" />
                                ) : (
                                    <Copy className="w-5 h-5" />
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4">
                        <button
                            onClick={handleActivateNow}
                            disabled={activating}
                            className="btn btn-primary w-full justify-center py-4 text-lg shadow-[0_0_15px_rgba(0,212,255,0.3)] hover:shadow-[0_0_25px_rgba(0,212,255,0.5)] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {activating ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Aktywowanie...
                                </>
                            ) : (
                                <>
                                    Aktywuj i rozpocznij
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                        <Link href="/" className="text-[var(--text-secondary)] hover:text-white transition-colors text-sm">
                            Wróć do strony głównej
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 p-6 pt-12 pb-24">
            <div className="max-w-6xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                    {/* Left Side: Plan Info & Comparison */}
                    <div className="space-y-8 animate-fade-in">
                        <div>
                            <Link href="/#pricing" className="text-[var(--text-muted)] hover:text-[var(--accent)] flex items-center gap-2 mb-6 transition-colors text-sm font-semibold">
                                <ArrowRight className="w-4 h-4 rotate-180" />
                                Wróć do cennika
                            </Link>
                            <h1 className="text-4xl font-bold mb-3 tracking-tight">Finalizacja zamówienia {plan.name}</h1>
                            <p className="text-[var(--text-secondary)] leading-relaxed">
                                Wybrałeś plan <span className="font-bold text-white">{plan.name}</span>. To tylko ostatni krok do pełnej, cyfrowej analizy Twojego brzmienia.
                            </p>
                        </div>

                        <div className="card p-8 bg-[var(--bg-card)] border-[var(--border)] relative overflow-hidden group">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--text-muted)] font-mono">Zawartość planu {plan.name}:</h3>
                                <Zap className="text-[var(--accent)] w-5 h-5 opacity-30" />
                            </div>
                            <ul className="space-y-4">
                                {plan.features.map((f, i) => {
                                    const isLocked = f.startsWith('❌');
                                    return (
                                        <li key={i} className={`flex gap-3 text-[13px] transition-colors ${isLocked ? 'text-[var(--text-muted)]' : 'text-[var(--text-secondary)] group-hover:text-white'}`}>
                                            <span className="shrink-0">{f.startsWith('✅') ? '✅' : f.startsWith('❌') ? '❌' : f.startsWith('•') ? '•' : '•'}</span>
                                            <span className={`${f.includes('**') ? 'font-bold text-[var(--accent)] underline decoration-[var(--accent)]/30 underline-offset-4' : f.startsWith('•') ? 'text-[var(--text-muted)]' : ''} ${f.includes('JSON') ? 'break-keep' : ''}`}>
                                                {f.replace(/^[✅❌•]\s*/, '').replace(/\*\*/g, '')}
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>

                        {/* Detailed Comparison Table */}
                        <div className="card overflow-hidden bg-[var(--bg-card)] border-[var(--border)]">
                            <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-surface)]">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] font-mono">Porównanie wszystkich planów</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-[var(--border)] bg-[var(--bg-surface)]/50">
                                            <th className="p-4 text-[var(--text-muted)] font-mono uppercase tracking-tight w-64 min-w-[200px]">Funkcja</th>
                                            <th className="p-4 font-mono uppercase tracking-tight text-center text-[var(--text-muted)]">Free</th>
                                            <th className={`p-4 font-mono uppercase tracking-tight text-center ${planId === 'lite' ? 'text-[var(--accent)] bg-[var(--accent)]/5' : 'text-[var(--text-muted)]'}`}>Lite</th>
                                            <th className={`p-4 font-mono uppercase tracking-tight text-center ${planId === 'pro' ? 'text-[var(--accent)] bg-[var(--accent)]/5' : 'text-[var(--text-muted)]'}`}>Pro</th>
                                            <th className={`p-4 font-mono uppercase tracking-tight text-center ${planId === 'premium' ? 'text-[var(--accent)] bg-[var(--accent)]/5' : 'text-[var(--text-muted)]'}`}>Premium</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--border)]">
                                        {COMPARISON.map((row, i) => (
                                            <tr key={i} className="hover:bg-white/5 transition-colors border-b border-[var(--border)] last:border-0 text-sm">
                                                <td className="p-4 font-medium text-[var(--text-secondary)]">{row.name}</td>
                                                <td className="p-4 text-center text-[var(--text-muted)]">{row.free}</td>
                                                <td className={`p-4 text-center ${planId === 'lite' ? 'bg-[var(--accent)]/5 font-bold text-white' : 'text-[var(--text-muted)]'}`}>{row.lite}</td>
                                                <td className={`p-4 text-center ${planId === 'pro' ? 'bg-[var(--accent)]/5 font-bold text-white' : 'text-[var(--text-muted)]'}`}>{row.pro}</td>
                                                <td className={`p-4 text-center ${planId === 'premium' ? 'bg-[var(--accent)]/5 font-bold text-white' : 'text-[var(--text-muted)]'}`}>{row.premium}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Checkout Form */}
                    <div className="sticky top-24">
                        <div className="card p-8 glow-accent animate-fade-in delay-100 shadow-[0_0_40px_rgba(0,212,255,0.05)]">
                            <div className="flex items-center justify-between mb-8 pb-6 border-b border-[var(--border)]">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent)] mb-1 font-mono">Twój wybór:</p>
                                    <h2 className="text-3xl font-bold tracking-tight">Plan {plan.name}</h2>
                                </div>
                                <div className="text-right">
                                    <span className="text-4xl font-bold" style={{ color: plan.color }}>{plan.price}</span>
                                    <span className="text-[var(--text-secondary)] text-sm ml-1 font-mono">PLN / mc</span>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-2 font-mono">Twoje dane kontaktowe</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-5 h-5" />
                                        <input
                                            type="email"
                                            placeholder="Gdzie wysłać licencję?"
                                            value={email}
                                            onChange={(e) => {
                                                setEmail(e.target.value);
                                                if (emailError) setEmailError('');
                                            }}
                                            className={`w-full bg-[var(--bg-card)] border p-4 pl-12 rounded-xl focus:ring-1 outline-none transition-all text-white font-medium ${emailError ? 'border-[var(--bad)] focus:ring-[var(--bad)]' : 'border-[var(--border)] focus:border-[var(--accent)] focus:ring-[var(--accent)]'}`}
                                        />
                                    </div>
                                    {emailError && (
                                        <p className="text-[10px] text-[var(--bad)] mt-2 font-bold uppercase tracking-wider flex items-center gap-1">
                                            <X className="w-3 h-3" /> {emailError}
                                        </p>
                                    )}
                                    <p className="text-[10px] text-[var(--text-muted)] mt-3 flex items-center gap-2">
                                        <Info className="w-3 h-3 text-[var(--accent)] shrink-0" />
                                        Kod licencyjny zostanie wysłany na ten adres.
                                    </p>
                                </div>

                                <div className="p-5 bg-[var(--accent)]/5 border border-[var(--accent)]/20 rounded-xl space-y-3">
                                    <div className="flex items-center gap-3">
                                        <Shield className="text-[var(--accent)] w-5 h-5 shadow-[0_0_10px_var(--accent-glow)]" />
                                        <span className="text-sm font-bold text-[var(--accent)]">Bezpieczna Symulacja</span>
                                    </div>
                                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                        Zostaniesz przekierowany do bezpiecznej bramki Tpay (BLIK / bank). Po webhooku plan aktywuje się automatycznie, a faktura zostanie wystawiona w iFirma.
                                    </p>
                                </div>

                                <button
                                    disabled={loading}
                                    onClick={handleStartPayment}
                                    className="btn btn-primary w-full justify-center py-5 text-lg group shadow-[0_0_20px_rgba(0,212,255,0.3)] hover:shadow-[0_0_35px_rgba(0,212,255,0.5)] transition-all border-none"
                                >
                                    {loading ? (
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                    ) : (
                                        <>
                                            Przejdź do płatności Tpay →
                                        </>
                                    )}
                                </button>

                                {webhookPending && (
                                    <p className="text-xs text-[var(--text-muted)] text-center">
                                        Oczekiwanie na potwierdzenie płatności z Tpay (webhook)…
                                    </p>
                                )}

                                {isLocalTestMode && (
                                    <div className="p-4 bg-[var(--warn)]/10 border border-[var(--warn)]/30 rounded-xl space-y-3">
                                        <div className="text-xs font-bold uppercase tracking-wider text-[var(--warn)]">Tryb testowy (localhost)</div>
                                        <p className="text-xs text-[var(--text-secondary)]">
                                            Checkout jest pomijany. Odblokuj plan lokalnie jednym kliknięciem:
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            <button onClick={() => handleDevUnlock('lite')} className="btn btn-outline text-xs py-2 px-3">Odblokuj Lite</button>
                                            <button onClick={() => handleDevUnlock('pro')} className="btn btn-outline text-xs py-2 px-3">Odblokuj Pro</button>
                                            <button onClick={() => handleDevUnlock('premium')} className="btn btn-outline text-xs py-2 px-3">Odblokuj Premium</button>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center justify-center gap-5 pt-4 grayscale opacity-30 group-hover:grayscale-0 transition-all">
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-4" />
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-7" />
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="PayPal" className="h-4" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function PaymentPage() {
    return (
        <main className="min-h-screen grid-texture flex flex-col">
            <Nav />
            <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-[var(--accent)]" /></div>}>
                <PaymentContent />
            </Suspense>
            <Footer />
        </main>
    );
}

function Nav() {
    return (
        <nav className="sticky top-0 z-50 border-b border-[var(--border)] backdrop-blur-md bg-[rgba(9,11,15,0.85)]">
            <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center">
                        <span className="text-black font-bold text-xs">TL</span>
                    </div>
                    <span className="font-semibold text-[var(--text-primary)]">TruLab <span className="text-[var(--text-secondary)] mx-1">|</span> <span className="text-[var(--accent)]">TL Meter</span></span>
                </Link>
                <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end">
                        <span className="text-[9px] font-bold uppercase text-[var(--text-muted)] tracking-tighter">Plan</span>
                        <span className="text-xs font-black uppercase text-[var(--accent)] tracking-wider">Demo / Free</span>
                    </div>
                    <div className="w-px h-6 bg-[var(--border)] mx-1"></div>
                    <div className="hidden md:flex items-center gap-6">
                        <Link href="/activate" className="btn btn-outline text-xs py-1.5 px-3 border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--text-primary)] transition-all">Aktywuj kod</Link>
                        <Link href="/analyze" className="btn btn-primary text-sm py-2 px-4 shadow-[0_0_15px_rgba(0,212,255,0.3)] hover:shadow-[0_0_25px_rgba(0,212,255,0.5)]">
                            Analizuj →
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    );
}

function Footer() {
    return (
        <footer className="border-t border-[var(--border)] py-8 mt-12 bg-[var(--bg-surface)]">
            <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between text-sm text-[var(--text-muted)] gap-8">
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
    );
}
