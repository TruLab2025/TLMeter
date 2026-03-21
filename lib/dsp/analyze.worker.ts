import { analyzeAudioBuffer } from "./analyze.js";

type ProgressPayload = { stage: string; detail?: string };

type AnalyzeRequestMessage = {
  type: "analyze";
  id: number;
  sampleRate: number;
  left: ArrayBuffer;
  right: ArrayBuffer;
  options: {
    frameMs: number;
    hopMs: number;
    rolloffPercent: number;
    forceEssentia?: boolean;
    analysisWindowSec?: number;
    truePeakFractions?: number[];
  };
};

type AbortMessage = { type: "abort"; id: number };

type IncomingMessage = AnalyzeRequestMessage | AbortMessage;

type OutgoingMessage =
  | { type: "progress"; id: number; progress: ProgressPayload }
  | { type: "result"; id: number; result: unknown }
  | { type: "error"; id: number; error: string };

const abortFlags = new Map<number, boolean>();

function nowMs() {
  return (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
}

self.onmessage = async (event: MessageEvent<IncomingMessage>) => {
  const msg = event.data;

  if (msg.type === "abort") {
    abortFlags.set(msg.id, true);
    return;
  }

  abortFlags.set(msg.id, false);

  const left = new Float32Array(msg.left);
  const right = new Float32Array(msg.right);
  const n = Math.min(left.length, right.length);

  const fakeAudioBuffer = {
    sampleRate: msg.sampleRate,
    numberOfChannels: 2,
    duration: n / msg.sampleRate,
    getChannelData(channel: number) {
      return channel === 0 ? left : right;
    },
  };

  let lastProgressSentAt = 0;
  let lastProgressKey = "";
  const onProgress = (p: ProgressPayload) => {
    const key = `${p.stage}|${p.detail ?? ""}`;
    const t = nowMs();
    if (key === lastProgressKey && t - lastProgressSentAt < 80) return;
    lastProgressKey = key;
    lastProgressSentAt = t;
    const out: OutgoingMessage = { type: "progress", id: msg.id, progress: p };
    self.postMessage(out);
  };

  const isAborted = () => abortFlags.get(msg.id) === true;

  try {
    const result = await analyzeAudioBuffer(fakeAudioBuffer as any, {
      ...msg.options,
      isAborted,
      onProgress,
    } as any);
    const out: OutgoingMessage = { type: "result", id: msg.id, result };
    self.postMessage(out);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : typeof error === "string" ? error : JSON.stringify(error);
    const out: OutgoingMessage = { type: "error", id: msg.id, error: message || "Worker error" };
    self.postMessage(out);
  } finally {
    abortFlags.delete(msg.id);
  }
};
