"use client";

import SpectralBalancePro from "@/components/SpectralBalancePro";
import SpectralBalanceSection from "@/components/SpectralBalanceSection";

function ABComparisonSection() {
  return (
    <section className="max-w-3xl mx-auto px-4 py-6" id="ab-compare">
      <h2 className="text-4xl font-bold mb-3 text-center">Porównanie miksów</h2>
      <p className="text-[var(--text-secondary)] mb-4 text-center max-w-2xl mx-auto">
        Porównaj miks sprzed i po rekomendacjach TL Meter — podgląd bez odtwarzania, żeby zachować prostotę demo.
      </p>
      <div className="h-10" />
      <div className="flex flex-col items-center gap-4">
        <SpectralBalanceSection />
      </div>
    </section>
  );
}

export default function TestSpectralPage() {
  return (
    <>
      <SpectralBalancePro />
      <div className="mt-16">
        <ABComparisonSection />
      </div>
    </>
  );
}
