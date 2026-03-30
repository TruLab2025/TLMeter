import type { Metadata } from "next";

const ANALYZER_URL = process.env.NEXT_PUBLIC_ANALYZER_URL || "https://app.trulab.pl";

export const metadata: Metadata = {
  title: "TL Meter — Analyzer",
  description: "Przeciągnij swój miks, a system TL Meter podpowie konkretne poprawki dla rocka, grunge i metalu.",
  metadataBase: new URL(ANALYZER_URL),
  openGraph: {
    title: "TL Meter — Analyzer",
    description: "Przeciągnij swój miks, a system TL Meter podpowie konkretne poprawki dla rocka, grunge i metalu.",
    url: `${ANALYZER_URL}/analyze`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TL Meter — Analyzer",
    description: "Przeciągnij swój miks, a system TL Meter podpowie konkretne poprawki dla rocka, grunge i metalu.",
  },
};
