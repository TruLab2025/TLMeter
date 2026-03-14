"use client";

import SpectralBalanceSection from "@/components/SpectralBalanceSection";

export default function AbComparisonSection() {
  return (
    <section className="max-w-6xl mx-auto px-6 pt-8 pb-24 scroll-mt-24" id="ab-compare">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-4">Porównanie miksów</h2>
        <p className="text-[var(--text-secondary)] max-w-2xl mx-auto">
          Przełączaj w czasie rzeczywistym między miksem wyprodukowanym bez analizy
          plików muzycznych i sugestii producenckich a wersją miksu po analizie TL Meter
          i wykorzystaniu sugestii naprawy procesów mikserskich w DAW. Odtwarzaj i
          porównuj, aby usłyszeć różnicę.
        </p>
      </div>

      <div className="flex flex-col items-center gap-4">
        <SpectralBalanceSection />
      </div>
    </section>
  );
}
