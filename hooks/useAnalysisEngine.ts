"use client";
import { useState } from "react";
import type { AnalysisResult } from "@/lib/analyze/types";
import { analyzeAudioBuffer } from "@/lib/dsp/analyze.js";

type AnalysisOptions = Record<string, unknown>;

export function useAnalysisEngine() {
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Funkcja do uruchamiania analizy audio
  const runAnalysis = async (audioBuffer: AudioBuffer, options: AnalysisOptions = {}) => {
    setAnalyzing(true);
    setProgress(0);
    setError(null);
    setResult(null);
    try {
      // Można dodać obsługę progresu przez przekazywanie callbacka do workerów
      const res = await analyzeAudioBuffer(audioBuffer, options);
      setResult(res);
      setProgress(100);
    } catch {
      setError("Błąd podczas analizy pliku audio.");
    } finally {
      setAnalyzing(false);
    }
  };

  return { analyzing, setAnalyzing, progress, setProgress, result, setResult, error, setError, runAnalysis };
}
