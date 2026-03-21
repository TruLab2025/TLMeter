"use client";

import type { AnalysisProgress } from "@/lib/analyze/types";

type WorkerProgress = AnalysisProgress;

type AnalyzeWorkerMessage =
  | { type: "progress"; id: number; progress: WorkerProgress }
  | { type: "result"; id: number; result: unknown }
  | { type: "error"; id: number; error: string };

type AnalyzeRequestOptions = {
  frameMs: number;
  hopMs: number;
  rolloffPercent: number;
  forceEssentia?: boolean;
  analysisWindowSec?: number;
  truePeakFractions?: number[];
};

let workerInstance: Worker | null = null;
let nextId = 1;

const pending = new Map<
  number,
  {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
    onProgress?: (progress: WorkerProgress) => void;
    abortPoll?: number;
    abortSent?: boolean;
  }
>();

function getWorker(): Worker {
  if (workerInstance) return workerInstance;

  workerInstance = new Worker(new URL("./analyze.worker.ts", import.meta.url), {
    type: "module",
  });

  workerInstance.onmessage = (event: MessageEvent<AnalyzeWorkerMessage>) => {
    const msg = event.data;
    const entry = pending.get(msg.id);
    if (!entry) return;

    if (msg.type === "progress") {
      entry.onProgress?.(msg.progress);
      return;
    }

    if (entry.abortPoll) window.clearInterval(entry.abortPoll);
    pending.delete(msg.id);

    if (msg.type === "result") {
      entry.resolve(msg.result);
      return;
    }

    entry.reject(new Error(msg.error || "Worker error"));
  };

  workerInstance.onerror = (event) => {
    // Best-effort: fail all pending tasks on worker crash
    const err = new Error(event.message || "Worker error");
    for (const [id, entry] of pending) {
      if (entry.abortPoll) window.clearInterval(entry.abortPoll);
      entry.reject(err);
      pending.delete(id);
    }
  };

  return workerInstance;
}

export async function analyzeAudioBufferInWorker(params: {
  audioBuffer: AudioBuffer;
  options: AnalyzeRequestOptions;
  onProgress?: (progress: WorkerProgress) => void;
  isAborted?: () => boolean;
}): Promise<unknown> {
  const { audioBuffer, options, onProgress, isAborted } = params;

  const leftRaw = audioBuffer.getChannelData(0);
  const rightRaw = audioBuffer.getChannelData(1);

  // Copy before transfer (AudioBuffer memory shouldn't be detached)
  const left = new Float32Array(leftRaw.length);
  left.set(leftRaw);
  const right = new Float32Array(rightRaw.length);
  right.set(rightRaw);

  const id = nextId++;
  const worker = getWorker();

  const result = await new Promise<unknown>((resolve, reject) => {
    pending.set(id, { resolve, reject, onProgress });

    if (isAborted) {
      const poll = window.setInterval(() => {
        const entry = pending.get(id);
        if (!entry) return;
        if (entry.abortSent) return;
        if (isAborted()) {
          entry.abortSent = true;
          worker.postMessage({ type: "abort", id });
        }
      }, 120);
      const entry = pending.get(id);
      if (entry) entry.abortPoll = poll;
    }

    worker.postMessage(
      {
        type: "analyze",
        id,
        sampleRate: audioBuffer.sampleRate,
        left: left.buffer,
        right: right.buffer,
        options,
      },
      [left.buffer, right.buffer]
    );
  });

  return result;
}
