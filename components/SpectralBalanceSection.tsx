"use client";
import React, { useEffect, useRef, useState } from "react";
import SpectralBalancePro from "./SpectralBalancePro";

const AUDIO_SOURCES = {
  original: "/demo/original.mp3",
  optimized: "/demo/processed.mp3",
} as const;

type AudioVariant = keyof typeof AUDIO_SOURCES;

export default function SpectralBalanceSection() {
  const [active, setActive] = useState<AudioVariant>("original");
  const [playing, setPlaying] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [progressTop, setProgressTop] = useState(1);
  const [progressBottom, setProgressBottom] = useState(1);

  const audioContextRef = useRef<AudioContext | null>(null);
  const originalBufferRef = useRef<AudioBuffer | null>(null);
  const optimizedBufferRef = useRef<AudioBuffer | null>(null);
  const originalGainRef = useRef<GainNode | null>(null);
  const optimizedGainRef = useRef<GainNode | null>(null);
  const originalSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const optimizedSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const startTimeRef = useRef(0);
  const offsetRef = useRef(0);
  const endedTimeoutRef = useRef<number | null>(null);
  const animRef = useRef<{ top: number | null; bottom: number | null }>({
    top: null,
    bottom: null,
  });

  function clearEndedTimeout() {
    if (endedTimeoutRef.current !== null) {
      window.clearTimeout(endedTimeoutRef.current);
      endedTimeoutRef.current = null;
    }
  }

  function stopSources() {
    for (const ref of [originalSourceRef, optimizedSourceRef]) {
      if (ref.current) {
        try {
          ref.current.stop();
        } catch {
          // Source may already be stopped.
        }
        ref.current.disconnect();
        ref.current = null;
      }
    }
    clearEndedTimeout();
  }

  useEffect(() => {
    return () => {
      for (const ref of [originalSourceRef, optimizedSourceRef]) {
        if (ref.current) {
          try {
            ref.current.stop();
          } catch {
            // Source may already be stopped.
          }
          ref.current.disconnect();
          ref.current = null;
        }
      }

      if (endedTimeoutRef.current !== null) {
        window.clearTimeout(endedTimeoutRef.current);
        endedTimeoutRef.current = null;
      }

      if (audioContextRef.current) {
        void audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  async function ensureAudioReady() {
    if (!audioContextRef.current) {
      const AudioContextCtor = window.AudioContext || (window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      }).webkitAudioContext;

      if (!AudioContextCtor) {
        throw new Error("Web Audio API is not supported in this browser.");
      }

      const context = new AudioContextCtor();
      const originalGain = context.createGain();
      const optimizedGain = context.createGain();

      originalGain.connect(context.destination);
      optimizedGain.connect(context.destination);

      audioContextRef.current = context;
      originalGainRef.current = originalGain;
      optimizedGainRef.current = optimizedGain;
    }

    const context = audioContextRef.current;
    if (!context) throw new Error("Audio context is unavailable.");

    if (context.state === "suspended") {
      await context.resume();
    }

    if (!originalBufferRef.current || !optimizedBufferRef.current) {
      const [originalResponse, optimizedResponse] = await Promise.all([
        fetch(AUDIO_SOURCES.original),
        fetch(AUDIO_SOURCES.optimized),
      ]);

      if (!originalResponse.ok || !optimizedResponse.ok) {
        throw new Error("Demo audio files could not be loaded.");
      }

      const [originalBytes, optimizedBytes] = await Promise.all([
        originalResponse.arrayBuffer(),
        optimizedResponse.arrayBuffer(),
      ]);

      const [originalBuffer, optimizedBuffer] = await Promise.all([
        context.decodeAudioData(originalBytes.slice(0)),
        context.decodeAudioData(optimizedBytes.slice(0)),
      ]);

      originalBufferRef.current = originalBuffer;
      optimizedBufferRef.current = optimizedBuffer;
    }
  }

  function animateLine(which: "original" | "optimized" | "top" | "bottom") {
    const setProgress =
      which === "optimized" || which === "top" ? setProgressTop : setProgressBottom;
    const animKey: "top" | "bottom" =
      which === "optimized" || which === "top" ? "top" : "bottom";

    if (animRef.current[animKey]) cancelAnimationFrame(animRef.current[animKey]!);

    let prog = 0;
    let last = performance.now();

    function animate(now: number) {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      prog = Math.min(prog + dt * 0.7, 1);
      setProgress(prog);
      if (prog < 1) animRef.current[animKey] = requestAnimationFrame(animate);
    }

    setProgress(0);
    animRef.current[animKey] = requestAnimationFrame(animate);
  }

  function syncActiveGain(which: AudioVariant) {
    const context = audioContextRef.current;
    const originalGain = originalGainRef.current;
    const optimizedGain = optimizedGainRef.current;
    if (!context || !originalGain || !optimizedGain) return;

    const now = context.currentTime;
    const fade = 0.015;
    const originalTarget = which === "original" ? 1 : 0;
    const optimizedTarget = which === "optimized" ? 1 : 0;

    originalGain.gain.cancelScheduledValues(now);
    optimizedGain.gain.cancelScheduledValues(now);
    originalGain.gain.setValueAtTime(originalGain.gain.value, now);
    optimizedGain.gain.setValueAtTime(optimizedGain.gain.value, now);
    originalGain.gain.linearRampToValueAtTime(originalTarget, now + fade);
    optimizedGain.gain.linearRampToValueAtTime(optimizedTarget, now + fade);
  }

  function scheduleEnd(buffer: AudioBuffer, offset: number) {
    clearEndedTimeout();
    const remainingMs = Math.max((buffer.duration - offset) * 1000, 0);
    endedTimeoutRef.current = window.setTimeout(() => {
      setPlaying(false);
      offsetRef.current = 0;
      setProgressTop(1);
      setProgressBottom(1);
      stopSources();
    }, remainingMs);
  }

  function createAndStartSources(offset: number) {
    const context = audioContextRef.current;
    const originalBuffer = originalBufferRef.current;
    const optimizedBuffer = optimizedBufferRef.current;
    const originalGain = originalGainRef.current;
    const optimizedGain = optimizedGainRef.current;

    if (!context || !originalBuffer || !optimizedBuffer || !originalGain || !optimizedGain) {
      throw new Error("Audio is not ready yet.");
    }

    stopSources();

    const originalSource = context.createBufferSource();
    const optimizedSource = context.createBufferSource();
    originalSource.buffer = originalBuffer;
    optimizedSource.buffer = optimizedBuffer;
    originalSource.connect(originalGain);
    optimizedSource.connect(optimizedGain);
    originalSource.start(0, offset);
    optimizedSource.start(0, offset);

    originalSourceRef.current = originalSource;
    optimizedSourceRef.current = optimizedSource;
    startTimeRef.current = context.currentTime - offset;
    syncActiveGain(active);
    scheduleEnd(originalBuffer, offset);
  }

  async function handlePlay() {
    try {
      setAudioError(null);
      await ensureAudioReady();
      createAndStartSources(offsetRef.current);
      setPlaying(true);
      animateLine(active === "original" ? "bottom" : "optimized");
    } catch (error) {
      setPlaying(false);
      setAudioError(
        error instanceof Error
          ? error.message
          : "Nie można odtworzyć dźwięku. Sprawdź plik lub przeglądarkę."
      );
    }
  }

  function handleStop() {
    const context = audioContextRef.current;
    if (context && playing) {
      offsetRef.current = Math.max(context.currentTime - startTimeRef.current, 0);
    } else {
      offsetRef.current = 0;
    }

    stopSources();
    setPlaying(false);
    offsetRef.current = 0;
    setProgressTop(1);
    setProgressBottom(1);
  }

  function handleSwitch(which: AudioVariant) {
    if (which === active) return;

    setAudioError(null);
    setActive(which);
    animateLine(which === "original" ? "bottom" : "optimized");

    if (!playing) return;
    syncActiveGain(which);
  }

  return (
    <section className="w-full flex flex-col items-center">
      <div className="w-full overflow-hidden">
        <div className="mx-auto w-full max-w-[1100px] px-1 sm:px-0">
          <SpectralBalancePro progressTop={progressTop} progressBottom={progressBottom} />
        </div>
      </div>

      <div className="flex flex-wrap gap-4 sm:gap-6 mt-12 md:mt-28 mb-12 md:mb-16 items-center justify-center">
        <button
          onClick={playing ? handleStop : () => void handlePlay()}
          className="w-12 h-12 flex items-center justify-center rounded-full border-2 border-cyan-400 bg-cyan-400 text-black shadow-md focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
          aria-label={playing ? "Pauza" : "Odtwórz"}
        >
          {playing ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="black" viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="black" viewBox="0 0 24 24"><path d="M7 5v14l11-7L7 5z"/></svg>
          )}
        </button>
        <button
          onClick={() => handleSwitch("original")}
          className={`btn text-sm py-2 px-4 flex justify-center items-center ${active === "original" ? "bg-cyan-400 text-black" : "bg-transparent text-cyan-400"}`}
          style={{
            fontWeight: 500,
            borderRadius: 8,
            minWidth: 120,
            fontSize: 14,
            boxShadow: active === "original" ? "0 0 12px #2EE6FF33" : "none",
            border: active === "original" ? "none" : "0.5px solid #2EE6FF",
          }}
        >
          Przed
        </button>
        <button
          onClick={() => handleSwitch("optimized")}
          className={`btn text-sm py-2 px-4 flex justify-center items-center ${active === "optimized" ? "bg-cyan-400 text-black" : "bg-transparent text-cyan-400"}`}
          style={{
            fontWeight: 500,
            borderRadius: 8,
            minWidth: 120,
            fontSize: 14,
            boxShadow: active === "optimized" ? "0 0 12px #2EE6FF33" : "none",
            border: active === "optimized" ? "none" : "0.5px solid #2EE6FF",
          }}
        >
          Potem
        </button>
      </div>

      <div className="mx-auto mb-10 mt-0 flex w-full max-w-5xl flex-col gap-4 px-4 md:flex-row md:gap-8 md:px-0">
        <div className="flex w-full flex-col items-center rounded-2xl border border-[#2EE6FF]/30 bg-[#10182a]/80 p-5 shadow-[0_8px_32px_0_rgba(46,230,255,0.10)] backdrop-blur-md md:flex-1 md:p-8">
          <span className="font-bold text-xl text-white mb-3">Energia basu</span>
          <span className="flex flex-row items-center gap-3 mb-2">
            <span className="font-extrabold text-4xl" style={{ color: "#2EE6FF" }}>82%</span>
            <span className="text-3xl text-[#b3b3c6]">&gt;</span>
            <span className="font-extrabold text-4xl" style={{ color: "#C93BFF" }}>66%</span>
          </span>
          <span className="flex items-center gap-2 text-base mt-2" style={{ color: "#2EE6FF" }}>
            <span className="text-2xl">↓</span> Mniej basowego mulenia
          </span>
        </div>
        <div className="flex w-full flex-col items-center rounded-2xl border border-[#C93BFF]/30 bg-[#181828]/80 p-5 shadow-[0_8px_32px_0_rgba(201,59,255,0.10)] backdrop-blur-md md:flex-1 md:p-8">
          <span className="font-bold text-xl text-white mb-3">Klarowność środka</span>
          <span className="flex flex-row items-center gap-3 mb-2">
            <span className="font-extrabold text-4xl" style={{ color: "#2EE6FF" }}>55%</span>
            <span className="text-3xl text-[#b3b3c6]">&gt;</span>
            <span className="font-extrabold text-4xl" style={{ color: "#C93BFF" }}>58%</span>
          </span>
          <span className="flex items-center gap-2 text-base mt-2" style={{ color: "#C93BFF" }}>
            <span className="text-2xl">↑</span> Lepsza czytelność wokali i gitar
          </span>
        </div>
        <div className="flex w-full flex-col items-center rounded-2xl border border-[#A056FF]/30 bg-[#181828]/80 p-5 shadow-[0_8px_32px_0_rgba(160,86,255,0.10)] backdrop-blur-md md:flex-1 md:p-8">
          <span className="font-bold text-xl text-white mb-3">Szerokość stereo</span>
          <span className="flex flex-row items-center gap-3 mb-2">
            <span className="font-extrabold text-4xl" style={{ color: "#2EE6FF" }}>0.49</span>
            <span className="text-3xl text-[#b3b3c6]">&gt;</span>
            <span className="font-extrabold text-4xl" style={{ color: "#C93BFF" }}>0.53</span>
          </span>
          <span className="flex items-center gap-2 text-base mt-2" style={{ color: "#C93BFF" }}>
            <span className="text-2xl">↑</span> Szerszy obraz stereo
          </span>
        </div>
      </div>

      <div className="w-full flex justify-center mb-2">
        <span className="text-sm text-gray-400 flex items-center">
          <span className="mr-2">🔊</span>Odtwarzanie znormalizowane do –14 LUFS dla uczciwego porównania.
        </span>
      </div>
      <div className="h-7" />
      <div className="flex flex-col items-center mt-2 w-full">
        {audioError && <div className="text-red-600 text-sm mt-2 text-center">{audioError}</div>}
      </div>
    </section>
  );
}
