"use client";
import { useState } from "react";

export function useFileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Funkcja do obsługi wyboru pliku i dekodowania do AudioBuffer
  const handleFileSelected = async (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const decoded = await audioCtx.decodeAudioData(arrayBuffer);
      setAudioBuffer(decoded);
    } catch (e) {
      setError("Nie udało się wczytać pliku audio.");
      setAudioBuffer(null);
    }
  };

  return { file, setFile, audioBuffer, setAudioBuffer, error, handleFileSelected };
}
