"use client";

import SpectralBalancePro from "@/components/SpectralBalancePro";
import { useState, useEffect, useRef } from "react";
import SpectralBalanceSection from "@/components/SpectralBalanceSection";

function ABComparisonSection() {
  const [playing, setPlaying] = useState(false);
  const [bypass, setBypass] = useState(false);
  const [audioError, setAudioError] = useState("");
  const [loading, setLoading] = useState(false);
  const audioRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [pendingBypass, setPendingBypass] = useState(null);
  const originalUrl = "/demo/original.mp3";
  const processedUrl = "/demo/processed.mp3";

  function handlePlay() {
    setPlaying((p) => {
      const next = !p;
      if (audioRef.current) {
        setAudioError("");
        if (next && audioRef.current.readyState < 3) {
          setLoading(true);
        }
        if (next) {
          audioRef.current.play().catch((e) => {
            setAudioError("Nie można odtworzyć dźwięku. Sprawdź plik lub przeglądarkę.");
            console.error("Audio play failed:", e);
          }).finally(() => setLoading(false));
        } else {
          audioRef.current.pause();
          setLoading(false);
        }
      }
      return next;
    });
  }

  function handleBypass() {
    if (!audioRef.current) return;
    setAudioError("");
    const time = audioRef.current.currentTime;
    setCurrentTime(time);
    setPendingBypass(!bypass);
    setBypass((b) => !b);
  }

  function handleLoadedMetadata() {
    if (audioRef.current) {
      if (pendingBypass !== null) {
        audioRef.current.currentTime = currentTime;
        if (playing) {
          setLoading(true);
          audioRef.current.play().catch((e) => {
            setAudioError("Nie można odtworzyć dźwięku po przełączeniu. Sprawdź plik lub przeglądarkę.");
            console.error("Audio play failed after bypass:", e);
          }).finally(() => setLoading(false));
        } else {
          setLoading(false);
        }
        setPendingBypass(null);
      }
    }
  }

  function handleEnded() {
    setPlaying(false);
  }

  return (
    <section className="max-w-3xl mx-auto px-4 py-6" id="ab-compare">
      <h2 className="text-4xl font-bold mb-3 text-center">Porównanie miksów</h2>
      <p className="text-[var(--text-secondary)] mb-4 text-center max-w-2xl mx-auto">
        Przełączaj w czasie rzeczywistym między miksem wyprodukowanym bez analizy plików muzycznych i sugestii producenckich a wersją miksu po analizie TL Meter i wykorzystaniu sugestii naprawy procesów mikserskich w DAW. Odtwarzaj i porównuj, aby usłyszeć różnicę!
      </p>
      <div className="h-10" />
      <div className="flex flex-col items-center gap-4">
        <audio
          ref={audioRef}
          src={bypass ? processedUrl : originalUrl}
          onEnded={handleEnded}
          onLoadedMetadata={handleLoadedMetadata}
        />
        <SpectralBalanceSection />
      </div>
      <div className="flex flex-col items-center mt-2 w-full">
        {audioError && (
          <div className="text-red-600 text-sm mt-2 text-center">{audioError}</div>
        )}
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
