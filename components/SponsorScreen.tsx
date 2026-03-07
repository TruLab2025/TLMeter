'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export interface Sponsor {
    id: string;
    name: string;
    logo: string;
    description: string;
    cta_text: string;
    cta_url: string;
    category: string; // 'plugin', 'daw', 'hardware', 'service'
}

interface SponsorScreenProps {
    sponsor: Sponsor;
    onSkip: () => void;
    skipDelay?: number; // milliseconds before skip button appears
}

export default function SponsorScreen({ sponsor, onSkip, skipDelay = 2000 }: SponsorScreenProps) {
    const [timeLeft, setTimeLeft] = useState(5);
    const [canSkip, setCanSkip] = useState(false);

    useEffect(() => {
        if (skipDelay > 0) {
            const skipTimer = setTimeout(() => setCanSkip(true), skipDelay);
            return () => clearTimeout(skipTimer);
        }
        setCanSkip(true);
    }, [skipDelay]);

    useEffect(() => {
        if (timeLeft <= 0) {
            onSkip();
            return;
        }

        const timer = setTimeout(() => {
            setTimeLeft(t => t - 1);
        }, 1000);

        return () => clearTimeout(timer);
    }, [timeLeft, onSkip]);

    return (
        <div className="fixed inset-0 bg-gradient-to-b from-[var(--bg-surface)] to-[var(--bg)]/95 backdrop-blur-sm flex items-center justify-center p-6 z-50">
            <div className="max-w-2xl w-full animate-fade-in">
                <div className="text-center mb-8">
                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest font-bold mb-6">
                        ✨ Analiza gotowa — Partner TruLab Meter
                    </p>

                    {/* Sponsor Card */}
                    <div className="card p-10 border border-[var(--accent)]/20 glow-accent mb-8">
                        {/* Logo Area */}
                        <div className="mb-8">
                            <div className="inline-flex items-center justify-center w-24 h-24 bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] mb-4">
                                <span className="text-5xl">{sponsor.logo}</span>
                            </div>
                        </div>

                        {/* Sponsor Info */}
                        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-3">
                            {sponsor.name}
                        </h2>
                        <p className="text-[var(--text-secondary)] mb-8 leading-relaxed">
                            {sponsor.description}
                        </p>

                        {/* CTA Button */}
                        <Link
                            href={sponsor.cta_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-primary inline-flex items-center gap-2 mb-8"
                        >
                            {sponsor.cta_text}
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>

                    {/* Countdown & Skip */}
                    <div className="space-y-4">
                        <p className="text-[var(--text-muted)] text-sm">
                            Otwieranie raportu za <span className="font-bold text-[var(--accent)]">{timeLeft}…</span>
                        </p>

                        {canSkip && (
                            <button
                                onClick={onSkip}
                                className="text-xs text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors underline"
                            >
                                Pomiń i zobacz wyniki
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
