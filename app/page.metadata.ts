import type { Metadata } from "next";

const MARKETING_URL = process.env.PUBLIC_APP_URL || "https://trulab.pl";

export const metadata: Metadata = {
  title: "TruLab Meter — Audio Miks Analyzer",
  description: "Profesjonalna analiza miksu dla Rock, Grunge & Metal. Załaduj swój utwór i otrzymaj natychmiastowe wskazówki DAW.",
  metadataBase: new URL(MARKETING_URL),
  openGraph: {
    title: "TruLab Meter",
    description: "Profesjonalna analiza miksu dla ciężkiej muzyki",
    type: "website",
    url: `${MARKETING_URL}/`,
  },
  twitter: {
    card: "summary_large_image",
    title: "TruLab Meter",
    description: "Profesjonalna analiza miksu dla ciężkiej muzyki",
  },
};
