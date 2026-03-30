"use client";
"use client";
import { useState } from "react";

type AudioContextConstructor = typeof AudioContext;
type WindowWithAudioContext = Window & {
  webkitAudioContext?: AudioContextConstructor;
};

export function useFileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelected = async (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const AudioCtxCtor =
        (window.AudioContext as AudioContextConstructor | undefined) ||
        (window as WindowWithAudioContext).webkitAudioContext;

      if (!AudioCtxCtor) {
        throw new Error("Web Audio API is not supported in this browser");
      }

      const audioCtx = new AudioCtxCtor();
      const decoded = await audioCtx.decodeAudioData(arrayBuffer);
      setAudioBuffer(decoded);
    } catch (error) {
      setError("Nie udało się wczytać pliku audio.");
      setAudioBuffer(null);
      console.warn("useFileUpload error:", error);
    }
  };

  return { file, setFile, audioBuffer, setAudioBuffer, error, handleFileSelected };
}
