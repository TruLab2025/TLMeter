"use client";
import React, { useState, useRef } from "react";
import SpectralBalancePro from "./SpectralBalancePro";

export default function SpectralBalanceSection() {
    const lastAudioTimeRef = useRef(0);
  const [active, setActive] = useState("original"); // 'Przed' domyślnie podświetlony
  // useState wystarczy, nie trzeba useEffect
  const [progressTop, setProgressTop] = useState(1);
  const [progressBottom, setProgressBottom] = useState(1);
  const animRef = useRef<{ top: number | null; bottom: number | null }>({ top: null, bottom: null });
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  function animateLine(which: "original" | "optimized" | "top" | "bottom") {
    let setProgress = which === "optimized" || which === "top" ? setProgressTop : setProgressBottom;
    let animKey: "top" | "bottom" = which === "optimized" || which === "top" ? "top" : "bottom";
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

  function handlePlay() {
    if (!audioRef.current) return;
    setPlaying(true);
    (audioRef.current as HTMLAudioElement).play();
    if (active === "original") animateLine("bottom");
    else animateLine("optimized");
  }

  function handleStop() {
    if (!audioRef.current) return;
    setPlaying(false);
    (audioRef.current as HTMLAudioElement).pause();
    (audioRef.current as HTMLAudioElement).currentTime = 0;
    setProgressTop(1);
    setProgressBottom(1);
  }

  function handleSwitch(which: "original" | "optimized") {
    // Zapamiętaj czas jeśli player gra
    if (audioRef.current && playing) {
      lastAudioTimeRef.current = (audioRef.current as HTMLAudioElement).currentTime;
    } else {
      lastAudioTimeRef.current = 0;
    }
    setActive(which);
    animateLine(which === "original" ? "bottom" : "optimized");
    if (audioRef.current) {
      const audio = audioRef.current as HTMLAudioElement;
      audio.src = which === "original" ? "/demo/original.mp3" : "/demo/processed.mp3";
      audio.load();
      // currentTime ustawiamy dopiero w handleLoadedMetadata
    }
  }

  function handleLoadedMetadata() {
    // Po załadowaniu nowego pliku audio, ustaw currentTime i odpal play jeśli gra
    if (audioRef.current) {
      (audioRef.current as HTMLAudioElement).currentTime = lastAudioTimeRef.current;
      if (playing) {
        (audioRef.current as HTMLAudioElement).play();
      }
    }
  }

  return (
    <section className="w-full flex flex-col items-center">
      
      {/* AUDIO ELEMENT */}
      <audio
        ref={audioRef}
        src={active === "original" ? "/demo/original.mp3" : "/demo/processed.mp3"}
        onEnded={handleStop}
        onLoadedMetadata={handleLoadedMetadata}
      />
      {/* Wykres: szeroki, premium, z podpisami częstotliwości na osi X */}

      <div className="w-full flex justify-center">
        <div style={{position:'relative', width:1100, margin:'0 auto'}}>
          <SpectralBalancePro progressTop={progressTop} progressBottom={progressBottom} />
        </div>
      </div>

      {/* Usunięto wiersz z kolorowymi napisami Bass ↓, Presence ↑, Air ↑ */}
      {/* Przyciski Play, Przed, Potem – przeniesione pod wykres */}
      <div className="flex flex-row gap-8 mt-28 mb-16 items-center justify-center">
        <button
          onClick={playing ? handleStop : handlePlay}
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
            fontWeight:500,
            borderRadius:8,
            minWidth:120,
            fontSize:14,
            boxShadow: active === "original" ? "0 0 12px #2EE6FF33" : "none",
            border: active === "original" ? "none" : "0.5px solid #2EE6FF"
          }}
        >
          Przed
        </button>
        <button
          onClick={() => handleSwitch("optimized")}
          className={`btn text-sm py-2 px-4 flex justify-center items-center ${active === "optimized" ? "bg-cyan-400 text-black" : "bg-transparent text-cyan-400"}`}
          style={{
            fontWeight:500,
            borderRadius:8,
            minWidth:120,
            fontSize:14,
            boxShadow: active === "optimized" ? "0 0 12px #2EE6FF33" : "none",
            border: active === "optimized" ? "none" : "0.5px solid #2EE6FF"
          }}
          disabled={loading}
        >
          Potem
        </button>
      </div>

      {/* Karty metryk – odsunięte od wykresu i wskaźników */}
      <div className="flex flex-row gap-8 justify-center w-full max-w-5xl mb-10 mt-0">
        {/* Karta 1 */}
        <div className="flex-1 rounded-2xl border border-[#2EE6FF]/30 bg-[#10182a]/80 backdrop-blur-md p-8 flex flex-col items-center shadow-[0_8px_32px_0_rgba(46,230,255,0.10)]" style={{minWidth:260, maxWidth:340}}>
          <span className="font-bold text-xl text-white mb-3">Energia basu</span>
          <span className="flex flex-row items-center gap-3 mb-2">
            <span className="font-extrabold text-4xl" style={{color:'#2EE6FF'}}>82%</span>
            <span className="text-3xl text-[#b3b3c6]">&gt;</span>
            <span className="font-extrabold text-4xl" style={{color:'#C93BFF'}}>66%</span>
          </span>
          <span className="flex items-center gap-2 text-base mt-2" style={{color:'#2EE6FF'}}>
            <span className="text-2xl">↓</span> Mniej basowego mulenia
          </span>
        </div>
        {/* Karta 2 */}
        <div className="flex-1 rounded-2xl border border-[#C93BFF]/30 bg-[#181828]/80 backdrop-blur-md p-8 flex flex-col items-center shadow-[0_8px_32px_0_rgba(201,59,255,0.10)]" style={{minWidth:260, maxWidth:340}}>
            <span className="font-bold text-xl text-white mb-3">Klarowność środka</span>
          <span className="flex flex-row items-center gap-3 mb-2">
            <span className="font-extrabold text-4xl" style={{color:'#2EE6FF'}}>55%</span>
            <span className="text-3xl text-[#b3b3c6]">&gt;</span>
            <span className="font-extrabold text-4xl" style={{color:'#C93BFF'}}>58%</span>
          </span>
          <span className="flex items-center gap-2 text-base mt-2" style={{color:'#C93BFF'}}>
            <span className="text-2xl">↑</span> Lepsza czytelność wokali i gitar
          </span>
        </div>
        {/* Karta 3 */}
        <div className="flex-1 rounded-2xl border border-[#A056FF]/30 bg-[#181828]/80 backdrop-blur-md p-8 flex flex-col items-center shadow-[0_8px_32px_0_rgba(160,86,255,0.10)]" style={{minWidth:260, maxWidth:340}}>
            <span className="font-bold text-xl text-white mb-3">Szerokość stereo</span>
          <span className="flex flex-row items-center gap-3 mb-2">
            <span className="font-extrabold text-4xl" style={{color:'#2EE6FF'}}>0.49</span>
            <span className="text-3xl text-[#b3b3c6]">&gt;</span>
            <span className="font-extrabold text-4xl" style={{color:'#C93BFF'}}>0.53</span>
          </span>
          <span className="flex items-center gap-2 text-base mt-2" style={{color:'#C93BFF'}}>
            <span className="text-2xl">↑</span> Szerszy obraz stereo
          </span>
        </div>
      </div>
      {/* Informacja o normalizacji LUFS nad przyciskami */}
      <div className="w-full flex justify-center mb-2">
        <span className="text-sm text-gray-400 flex items-center">
          <span className="mr-2">🔊</span>Odtwarzanie znormalizowane do –14 LUFS dla uczciwego porównania.
        </span>
      </div>
      <div className="h-7" />
      <div className="flex flex-col items-center mt-2 w-full">
        {audioError && (
          <div className="text-red-600 text-sm mt-2 text-center">{audioError}</div>
        )}
      </div>
    </section>
  );
}
