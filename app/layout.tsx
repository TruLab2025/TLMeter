import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TruLab Meter — Audio Miks Analyzer",
  description: "Profesjonalna analiza miksu dla Rock, Grunge & Metal. Załaduj swój utwór i otrzymaj natychmiastowe wskazówki DAW.",
  keywords: ["miks analyzer", "audio analysis", "LUFS", "mastering", "rock", "metal", "grunge"],
  openGraph: {
    title: "TruLab Meter",
    description: "Profesjonalna analiza miksu dla ciężkiej muzyki",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
