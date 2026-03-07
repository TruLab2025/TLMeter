import { analyzeSpectrumOverTime } from './spectrum.js';
import { analyzeLoudnessOverTime } from './loudness.js';
import { detectOnsetsFromBandFlux, computeOnsetStrengthFromSpectrumFrames } from './onsets.js';
import { dbfsFromLinear, rmsOfInterleavedStereo, stddevOfFrames, nextPow2, cleanObjectForJson } from './utils.js';
import { analyzeTruePeakAndClipping } from './truepeak.js';
import { loadEssentia } from '../essentia/loader.js';
import { analyzeWithEssentia } from '../essentia/analyze-essentia.js';
import { analyzeRhythmFromOnsets } from './rhythm.js';
import { analyzeSmiFromBandNormalized } from './smi.js';
import { analyzeMeydaFeatures } from './meyda.js';
import { spectralSlope, spectralEntropy, crestFactorPerBand, lowMidBuildup, lowMidOverTime } from './spectral-advanced.js';
import { transientSharpnessFromOnsets } from './transient-sharpness.js';
import { detectSectionsFromLoudness } from './sections.js';
import { analyzeHarmonicPercussive } from './hpss.js';
import { analyzeChordDensity } from './chord-density.js';
import { analyzeRhythmicStability } from './rhythmic-stability.js';
import { applyHannWindow } from './utils.js';

async function yieldMs(ms, options) {
  const steps = Math.ceil(ms / 20);
  for (let i = 0; i < steps; i++) {
    if (options?.isAborted && options.isAborted()) {
      throw new Error("Analiza została anulowana.");
    }
    await new Promise(r => setTimeout(r, 20));
  }
}

function meanOfFrames(frames, field) {
  if (!Array.isArray(frames) || frames.length === 0) return null;
  let sum = 0;
  let n = 0;
  for (const fr of frames) {
    const v = fr?.[field];
    if (typeof v !== 'number' || !Number.isFinite(v)) continue;
    sum += v;
    n++;
  }
  return n ? sum / n : null;
}

function percentileOfFrames(frames, field, p) {
  if (!Array.isArray(frames) || frames.length === 0) return null;
  const vals = [];
  for (const fr of frames) {
    const v = fr?.[field];
    if (typeof v !== 'number' || !Number.isFinite(v)) continue;
    vals.push(v);
  }
  if (vals.length === 0) return null;
  vals.sort((a, b) => a - b);
  const pp = Math.max(0, Math.min(100, p));
  const idx = (pp / 100) * (vals.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  const t = idx - lo;
  return vals[lo] + t * (vals[hi] - vals[lo]);
}

function fractionOfFramesBelow(frames, field, threshold) {
  if (!Array.isArray(frames) || frames.length === 0) return null;
  let n = 0;
  let below = 0;
  for (const fr of frames) {
    const v = fr?.[field];
    if (typeof v !== 'number' || !Number.isFinite(v)) continue;
    n++;
    if (v < threshold) below++;
  }
  return n ? (below / n) : null;
}

function closestFrameByTime(frames, tSec) {
  if (!Array.isArray(frames) || frames.length === 0) return null;
  if (typeof tSec !== 'number' || !Number.isFinite(tSec)) return null;
  let lo = 0;
  let hi = frames.length - 1;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    const t = frames[mid]?.tSec;
    if (typeof t !== 'number') return null;
    if (t < tSec) lo = mid + 1;
    else hi = mid;
  }
  const i = lo;
  const a = frames[i];
  const b = frames[i - 1];
  if (!b) return a;
  const da = Math.abs((a?.tSec ?? 0) - tSec);
  const db = Math.abs((b?.tSec ?? 0) - tSec);
  return da <= db ? a : b;
}

function defaultBands() {
  return [
    { name: 'sub_20_60', lo: 20, hi: 60 },
    { name: 'bass_60_120', lo: 60, hi: 120 },
    { name: 'lowmid_120_250', lo: 120, hi: 250 },
    { name: 'mid_250_500', lo: 250, hi: 500 },
    { name: 'uppermid_500_2000', lo: 500, hi: 2000 },
    { name: 'presence_2000_4000', lo: 2000, hi: 4000 },
    { name: 'brilliance_4000_8000', lo: 4000, hi: 8000 },
    { name: 'air_8000_20000', lo: 8000, hi: 20000 },
  ];
}

function lowMidHighBands() {
  return [
    { name: 'low', lo: 20, hi: 250 },
    { name: 'mid', lo: 250, hi: 4000 },
    { name: 'high', lo: 4000, hi: 20000 },
  ];
}

const LOUDEST_ANALYSIS_WINDOW_SEC = 30;
const FAST_MIN_FRAME_MS = 64;
const FAST_MIN_HOP_MS = 46;

function createEffectiveOptions(options) {
  const base = options || {};
  const frameMsRaw = typeof base.frameMs === 'number' && Number.isFinite(base.frameMs)
    ? base.frameMs
    : FAST_MIN_FRAME_MS;
  const hopMsRaw = typeof base.hopMs === 'number' && Number.isFinite(base.hopMs)
    ? base.hopMs
    : FAST_MIN_HOP_MS;

  return {
    ...base,
    frameMs: Math.max(FAST_MIN_FRAME_MS, frameMsRaw),
    hopMs: Math.max(FAST_MIN_HOP_MS, hopMsRaw),
  };
}

function findLoudestWindowStart(left, right, sampleRate, windowSec) {
  const n = Math.min(left.length, right.length);
  const windowSamples = Math.max(1, Math.round(windowSec * sampleRate));
  if (n <= windowSamples) return 0;

  const blockSamples = Math.max(1, Math.round(sampleRate * 0.05));
  const blockCount = Math.ceil(n / blockSamples);
  const blockEnergy = new Float64Array(blockCount);

  for (let i = 0; i < n; i++) {
    const m = 0.5 * (left[i] + right[i]);
    const b = Math.floor(i / blockSamples);
    blockEnergy[b] += m * m;
  }

  const windowBlocks = Math.max(1, Math.ceil(windowSamples / blockSamples));
  let rolling = 0;
  for (let i = 0; i < windowBlocks && i < blockCount; i++) rolling += blockEnergy[i];

  let best = rolling;
  let bestStartBlock = 0;
  for (let start = 1; start + windowBlocks - 1 < blockCount; start++) {
    rolling += blockEnergy[start + windowBlocks - 1] - blockEnergy[start - 1];
    if (rolling > best) {
      best = rolling;
      bestStartBlock = start;
    }
  }

  return Math.min(bestStartBlock * blockSamples, n - windowSamples);
}

function createFocusedAudioBuffer(audioBuffer) {
  const sampleRate = audioBuffer.sampleRate;
  const channels = audioBuffer.numberOfChannels;
  const durationSec = audioBuffer.duration;
  const focusSec = LOUDEST_ANALYSIS_WINDOW_SEC;

  if (channels < 2 || focusSec <= 0 || durationSec <= focusSec) {
    return {
      buffer: audioBuffer,
      window: { enabled: false, startSec: 0, durationSec: durationSec },
    };
  }

  const left = audioBuffer.getChannelData(0);
  const right = audioBuffer.getChannelData(1);
  const n = Math.min(left.length, right.length);
  const targetSamples = Math.max(1, Math.round(focusSec * sampleRate));
  const startSample = findLoudestWindowStart(left, right, sampleRate, focusSec);
  const endSample = Math.min(n, startSample + targetSamples);

  const leftSlice = Float32Array.from(left.subarray(startSample, endSample));
  const rightSlice = Float32Array.from(right.subarray(startSample, endSample));

  const focused = {
    sampleRate,
    numberOfChannels: 2,
    length: leftSlice.length,
    duration: leftSlice.length / sampleRate,
    getChannelData(channel) {
      return channel === 0 ? leftSlice : rightSlice;
    },
  };

  return {
    buffer: focused,
    window: {
      enabled: true,
      startSec: startSample / sampleRate,
      durationSec: focused.duration,
      requestedSec: focusSec,
      sourceDurationSec: durationSec,
    },
  };
}

/**
 * @param {AudioBuffer} audioBuffer
 * @param {{frameMs:number, hopMs:number, rolloffPercent:number, onProgress?:(p:any)=>void}} options
 */
export async function analyzeAudioBuffer(audioBuffer, options) {
  const effectiveOptions = createEffectiveOptions(options);
  const focused = createFocusedAudioBuffer(audioBuffer);
  const analysisBuffer = focused.buffer;
  const windowMeta = focused.window;

  if (windowMeta.enabled) {
    effectiveOptions.onProgress?.({
      stage: 'Window',
      detail: `najgłośniejsze ${windowMeta.durationSec.toFixed(1)} s (od ${windowMeta.startSec.toFixed(1)} s)`,
    });
  }

  // Optional Essentia backend (no bundler). If not installed, we transparently fall back.
  effectiveOptions.onProgress?.({ stage: 'Backend', detail: 'sprawdzam Essentia…' });
  const essentiaBundle = await loadEssentia();
  if (essentiaBundle) {
    effectiveOptions.onProgress?.({ stage: 'Backend', detail: 'Essentia' });
    // Run Essentia analysis, then also compute Meyda features and merge them
    const res = await analyzeWithEssentia(essentiaBundle, analysisBuffer, effectiveOptions);
    try {
      if (analysisBuffer.numberOfChannels >= 2) {
        const left = analysisBuffer.getChannelData(0);
        const right = analysisBuffer.getChannelData(1);
        const sampleRate = analysisBuffer.sampleRate;
        const requestedSamples = (effectiveOptions.frameMs / 1000) * sampleRate;
        const frameSize = nextPow2(Math.round(requestedSamples));
        const hopSize = Math.max(64, Math.round((effectiveOptions.hopMs / 1000) * sampleRate));
        const meyda = analyzeMeydaFeatures(left, right, sampleRate, { frameSize, hopSize });
        res.global = res.global || {};
        res.global.meyda = Object.assign({}, res.global.meyda || {}, meyda || null);
        res.timeSeries = res.timeSeries || {};
        res.timeSeries.meyda = meyda || null;
        // Fix meta reporting if it came back with non-pow2
        if (res.meta) res.meta.frameSize = frameSize;
      }
    } catch (e) {
      res.global = res.global || {};
      res.global.meyda = { error: String(e) };
    }
    res.meta = res.meta || {};
    res.meta.analysisWindow = windowMeta;
    res.meta.performance = {
      frameMs: effectiveOptions.frameMs,
      hopMs: effectiveOptions.hopMs,
      mode: 'always-fast',
    };
    return res;
  }

  const sampleRate = analysisBuffer.sampleRate;
  const channels = analysisBuffer.numberOfChannels;
  const durationSec = analysisBuffer.duration;

  if (channels < 2) throw new Error('Plik musi mieć co najmniej 2 kanały (stereo).');

  const left = analysisBuffer.getChannelData(0);
  const right = analysisBuffer.getChannelData(1);
  const monoMix = new Float32Array(left.length);
  for (let i = 0; i < left.length; i++) monoMix[i] = 0.5 * (left[i] + right[i]);

  const requestedSamples = (effectiveOptions.frameMs / 1000) * sampleRate;
  const frameSize = nextPow2(Math.round(requestedSamples));
  const hopSize = Math.max(64, Math.round((effectiveOptions.hopMs / 1000) * sampleRate));
  const fftSize = frameSize;

  effectiveOptions.onProgress?.({ stage: 'Essentia.js & Meyda', detail: `Inicjalizacja środowiska (${channels}ch @ ${sampleRate} Hz)` });
  await yieldMs(200, effectiveOptions);

  // Full-file RMS (stereo energy)
  const rmsAll = rmsOfInterleavedStereo(left, right, 0, Math.min(left.length, right.length));
  const rmsAllDbfs = dbfsFromLinear(rmsAll);

  // Spectrum metrics + band energy
  const bands = defaultBands();
  const lmh = lowMidHighBands();

  const spectrum = await analyzeSpectrumOverTime(
    left,
    right,
    sampleRate,
    frameSize,
    hopSize,
    effectiveOptions.rolloffPercent,
    [...bands, ...lmh],
    effectiveOptions.onProgress,
  );

  const centroidHzStd = stddevOfFrames(spectrum.frames, 'centroidHz');
  const spectralFluxStd = stddevOfFrames(spectrum.frames, 'spectralFlux');
  const hfcStd = stddevOfFrames(spectrum.frames, 'hfc');

  // Onsets (transients)
  effectiveOptions.onProgress?.({ stage: 'Essentia.js', detail: 'Onsets & Transients' });
  await yieldMs(100, effectiveOptions);
  if (effectiveOptions.isAborted?.()) throw new Error("Analiza została anulowana.");
  const onsets = detectOnsetsFromBandFlux(spectrum.frames);

  const onsetStrength = computeOnsetStrengthFromSpectrumFrames(
    spectrum.frames,
    onsets.onsetsSec,
    { windowSec: 0.05 },
  );

  // Rhythm / tempo estimation (lightweight, based on detected onsets)
  effectiveOptions.onProgress?.({ stage: 'Rhythm' });
  let rhythm = null;
  try {
    rhythm = analyzeRhythmFromOnsets(onsets.onsetsSec || []);
  } catch (e) {
    rhythm = { error: String(e) };
  }

  // Spectral Masking Index (proxy) using bandNormalized per-frame bands
  effectiveOptions.onProgress?.({ stage: 'SMI' });
  let smi = null;
  try {
    smi = analyzeSmiFromBandNormalized(spectrum.frames, { threshold: 0.5 });
  } catch (e) {
    smi = { error: String(e) };
  }

  // Meyda features (optional library).  Mix to mono and compute chroma.
  effectiveOptions.onProgress?.({ stage: 'Meyda', detail: 'Ekstrakcja cech widmowych' });
  await yieldMs(100, effectiveOptions);
  let meyda = null;
  try {
    // Yield before heavy Meyda
    if (effectiveOptions.isAborted?.()) throw new Error("Analiza została anulowana.");
    await new Promise(r => setTimeout(r, 0));
    meyda = await analyzeMeydaFeatures(left, right, sampleRate, { frameSize, hopSize, onProgress: effectiveOptions.onProgress });
  } catch (e) {
    meyda = { error: String(e) };
  }

  // Advanced spectral features: slope, entropy, crest per band
  effectiveOptions.onProgress?.({ stage: 'Essentia.js', detail: 'Analiza psychoakustyczna' });
  await yieldMs(100, effectiveOptions);
  let spectralAdv = null;
  try {
    // Compute mean spectral features over the 2s monoMix to avoid initial silence
    let slopeSum = 0, entropySum = 0, bandSum = 0, totalSum = 0, count = 0;
    const crestAgg = { low: 0, mid: 0, high: 0 };
    for (let i = 0; i + frameSize <= monoMix.length; i += frameSize) {
      const fftFrame = new Float32Array(fftSize);
      fftFrame.set(monoMix.subarray(i, i + frameSize), 0);
      applyHannWindow(fftFrame);
      const { re, im } = fftReal(fftFrame);
      const magnitude = magSpectrum(re, im);

      slopeSum += spectralSlope(magnitude, sampleRate);
      entropySum += spectralEntropy(magnitude);
      const c = crestFactorPerBand(magnitude, sampleRate);
      crestAgg.low += (c.low || 0);
      crestAgg.mid += (c.mid || 0);
      crestAgg.high += (c.high || 0);
      const lm = lowMidBuildup(magnitude, sampleRate);
      bandSum += lm.bandEnergy;
      totalSum += lm.totalEnergy;
      count++;
      // Yield every 50 frames to keep UI responsive
      if (count % 50 === 0) {
        if (effectiveOptions.isAborted?.()) throw new Error("Analiza została anulowana.");
        await new Promise(r => setTimeout(r, 0));
      }
    }
    if (count > 0) {
      const frac = totalSum > 0 ? bandSum / totalSum : 0;
      spectralAdv = {
        slope: slopeSum / count,
        entropy: entropySum / count,
        crestPerBand: { low: crestAgg.low / count, mid: crestAgg.mid / count, high: crestAgg.high / count },
        lowMid: { bandEnergy: bandSum / count, totalEnergy: totalSum / count, fraction: frac, percent: frac * 100 }
      };
    } else {
      spectralAdv = { slope: 0, entropy: 0, crestPerBand: { low: 0, mid: 0, high: 0 }, lowMid: { fraction: 0, percent: 0 } };
    }
  } catch (e) {
    spectralAdv = { error: String(e) };
  }

  // Harmonic-Percussive Source Separation
  effectiveOptions.onProgress?.({ stage: 'HPSS' });
  let hpss = null;
  try {
    // Yield before heavy HPSS
    if (effectiveOptions.isAborted?.()) throw new Error("Analiza została anulowana.");
    await new Promise(r => setTimeout(r, 0));
    hpss = await analyzeHarmonicPercussive(monoMix, sampleRate, { frameSize, hopSize, onProgress: effectiveOptions.onProgress });
  } catch (e) {
    hpss = { error: String(e) };
  }

  // Chord density from Meyda chroma (if available)
  effectiveOptions.onProgress?.({ stage: 'Chord Density' });
  let chordDensity = null;
  try {
    if (meyda && meyda.timeSeries && Array.isArray(meyda.timeSeries.chroma)) {
      chordDensity = analyzeChordDensity(meyda.timeSeries.chroma, hopSize / sampleRate);
    } else {
      chordDensity = { chord_changes_per_minute: 0, mean_complexity: 0, chord_changes: [] };
    }
  } catch (e) {
    chordDensity = { error: String(e) };
  }

  // Rhythmic stability from onsets
  effectiveOptions.onProgress?.({ stage: 'Rhythmic Stability' });
  let rhythmicStab = null;
  try {
    const onsetTimes = onsets.onsetsSec || [];
    const estimatedBpm = rhythm?.tempoBpm || 120;
    rhythmicStab = analyzeRhythmicStability(onsetTimes, estimatedBpm);
  } catch (e) {
    rhythmicStab = { error: String(e) };
  }

  // Loudness curve
  const loudness = await analyzeLoudnessOverTime(left, right, sampleRate, effectiveOptions.onProgress);
  const shortTermLufsStd = stddevOfFrames(loudness.frames, 'lufsShortTerm');
  const crestFactorDbMean = meanOfFrames(loudness.frames, 'crestFactorDb');
  const crestFactorDbStd = stddevOfFrames(loudness.frames, 'crestFactorDb');

  const silenceBelow60Pct = fractionOfFramesBelow(loudness.frames, 'rmsDbfs', -60);
  const rmsDbfsP10 = percentileOfFrames(loudness.frames, 'rmsDbfs', 10);
  const rmsDbfsP50 = percentileOfFrames(loudness.frames, 'rmsDbfs', 50);
  const rmsDbfsP90 = percentileOfFrames(loudness.frames, 'rmsDbfs', 90);

  // True peak + clipping (lightweight approximation)
  const truePeak = await analyzeTruePeakAndClipping(left, right, sampleRate, effectiveOptions.onProgress);
  const plr = (typeof truePeak.truePeakDbtp === 'number' && Number.isFinite(truePeak.truePeakDbtp) && typeof loudness.integratedLufs === 'number' && Number.isFinite(loudness.integratedLufs))
    ? (truePeak.truePeakDbtp - loudness.integratedLufs)
    : null;

  // Style Match: Extract 8-band spectral histogram
  // Bands: [60Hz, 120Hz, 240Hz, 480Hz, 960Hz, 1920Hz, 3840Hz, 7680Hz]
  const spectralHistogram8 = (() => {
    const bandDefs = [
      { lo: 50, hi: 85 },      // ~60Hz
      { lo: 85, hi: 170 },     // ~120Hz
      { lo: 170, hi: 340 },    // ~240Hz
      { lo: 340, hi: 680 },    // ~480Hz
      { lo: 680, hi: 1360 },   // ~960Hz
      { lo: 1360, hi: 2720 },  // ~1920Hz
      { lo: 2720, hi: 5440 },  // ~3840Hz
      { lo: 5440, hi: 10880 }, // ~7680Hz
    ];
    
    // Get 8-band distribution from spectrum frames
    const hist = new Array(8).fill(0);
    if (spectrum.frames && spectrum.frames.length > 0) {
      for (const frame of spectrum.frames) {
        if (!frame.bandEnergies) continue;
        for (let i = 0; i < bandDefs.length; i++) {
          const bandDef = bandDefs[i];
          for (const [bandName, energy] of Object.entries(frame.bandEnergies || {})) {
            // Try to map to our 8-band
            const bandMatch = spectrum.frames[0].bandNames?.[bandName];
            if (bandMatch && bandMatch.lo >= bandDef.lo && bandMatch.hi <= bandDef.hi) {
              hist[i] += energy;
            }
          }
        }
      }
    }
    
    // Normalize
    const total = hist.reduce((a, b) => a + b, 0);
    if (total > 0) {
      return hist.map(h => h / total);
    }
    return hist.length === 8 ? hist : [0.125, 0.125, 0.125, 0.125, 0.125, 0.125, 0.125, 0.125];
  })();

  // Provide convenient low/mid/high distribution aggregated (from spectrum summary)
  const dist = spectrum.summary.bandEnergyNormalized;
  const low = dist.low ?? 0;
  const mid = dist.mid ?? 0;
  const high = dist.high ?? 0;

  const tonalBandDefs = defaultBands();

  const tonalBalance = tonalBandDefs
    .filter((b) => !['low', 'mid', 'high'].includes(b.name))
    .map((b) => ({
      name: b.name,
      loHz: b.lo,
      hiHz: b.hi,
      centerHz: Math.sqrt(b.lo * b.hi),
      energyNorm: dist[b.name] ?? 0,
    }));

  const onsetBandShares = (() => {
    const shares = { low: [], mid: [], high: [] };
    for (const t of onsets.onsetsSec ?? []) {
      const fr = closestFrameByTime(spectrum.frames, t);
      const bn = fr?.bandNormalized;
      if (!bn || typeof bn !== 'object') continue;
      for (const k of ['low', 'mid', 'high']) {
        const v = bn[k];
        if (typeof v === 'number' && Number.isFinite(v)) shares[k].push(v);
      }
    }

    function meanStd(arr) {
      if (!Array.isArray(arr) || arr.length === 0) return { mean: null, std: null, count: 0 };
      let n = 0;
      let mean = 0;
      let m2 = 0;
      for (const v of arr) {
        if (typeof v !== 'number' || !Number.isFinite(v)) continue;
        n++;
        const d = v - mean;
        mean += d / n;
        const d2 = v - mean;
        m2 += d * d2;
      }
      if (n < 2) return { mean, std: null, count: n };
      return { mean, std: Math.sqrt(m2 / n), count: n };
    }

    return {
      low: meanStd(shares.low),
      mid: meanStd(shares.mid),
      high: meanStd(shares.high),
      note: 'Mean/std of low/mid/high bandNormalized at detected onsets (proxy transient spectral focus).',
    };
  })();

  // Low-mid time series (per-frame)
  let lowMidSeries = null;
  try {
    lowMidSeries = lowMidOverTime(monoMix, sampleRate, { frameSize, hopSize, fftSize });
  } catch (e) {
    lowMidSeries = { error: String(e) };
  }

  // Transient sharpness from onsets
  let transientSharp = null;
  try {
    const onsetTimes = onsets.onsetsSec ?? [];
    transientSharp = transientSharpnessFromOnsets(monoMix, sampleRate, onsetTimes, { frameSize, fftSize });
  } catch (e) {
    transientSharp = { error: String(e) };
  }

  // Section detection from loudness
  let sections = null;
  try {
    sections = detectSectionsFromLoudness(loudness.frames || [], { deltaLufs: 3.0 });
  } catch (e) {
    sections = { error: String(e) };
  }

  return cleanObjectForJson({
    meta: {
      analyzedAt: new Date().toISOString(),
      sampleRate,
      durationSec,
      channels: 2,
      frameSize,
      hopSize,
      rolloffPercent: effectiveOptions.rolloffPercent,
      analysisWindow: windowMeta,
      performance: {
        frameMs: effectiveOptions.frameMs,
        hopMs: effectiveOptions.hopMs,
        mode: 'always-fast',
      },
    },
    global: {
      rms: rmsAll,
      rmsDbfs: rmsAllDbfs,
      integratedLufs: loudness.integratedLufs,
      integratedLufsMeta: loudness.integratedLufsMeta,
      samplePeakDbfs: truePeak.samplePeakDbfs,
      truePeakDbtp: truePeak.truePeakDbtp,
      truePeakMeta: truePeak.meta,
      clipping: truePeak.clipping,
      plr,
      stereo: truePeak.stereo,
      dcOffset: truePeak.dcOffset,
      rumble: truePeak.rumble,
      silence: {
        belowRmsDbfs: -60,
        fractionBelow: silenceBelow60Pct,
        rmsDbfsP10,
        rmsDbfsP50,
        rmsDbfsP90,
      },
      shortTermLufsStd,
      lra: loudness.lra,
      lraMeta: loudness.lraMeta,
      crestFactorDbMean,
      crestFactorDbStd,
      tonalBalance,
      spectral: {
        centroidHzMean: spectrum.summary.centroidHzMean,
        centroidHzStd,
        rolloffHzMean: spectrum.summary.rolloffHzMean,
        flatnessMean: spectrum.summary.flatnessMean,
        spectralFluxMean: spectrum.summary.spectralFluxMean,
        spectralFluxStd,
        hfcMean: spectrum.summary.hfcMean,
        hfcStd,
        spectralHistogram: spectralHistogram8,  // 8-band for style matching
      },
      psycho: spectrum.summary.psycho,
      energyDistribution: {
        low,
        mid,
        high,
      },
      transients: {
        onsetStrengthMean: onsetStrength.stats.mean,
        onsetStrengthStd: onsetStrength.stats.std,
        onsetBandShares,
      },
      rhythm: rhythm?.tempoBpm ? { tempoBpm: rhythm.tempoBpm, tempoStd: rhythm.tempoStd, tempoConfidence: rhythm.tempoConfidence } : (rhythm || null),
      // expose entire meyda summary (may contain multiple mean vectors)
      meyda: meyda && typeof meyda === 'object' ? meyda : null,
      smi: smi?.stats ? { mean: smi.stats.mean, std: smi.stats.std } : (smi || null),
      spectralAdvanced: spectralAdv && !spectralAdv.error ? {
        slope: spectralAdv.slope,
        entropy: spectralAdv.entropy,
        crestPerBand: spectralAdv.crestPerBand,
        lowMid: spectralAdv.lowMid
      } : (spectralAdv || null),
      hpss: hpss && !hpss.error ? {
        harmonic_ratio: hpss.harmonic_ratio,
        percussive_ratio: hpss.percussive_ratio,
      } : (hpss || null),
      chordDensity: chordDensity || null,
      rhythmicStability: rhythmicStab || null,
      lowMidSeries: lowMidSeries,
      transientSharpness: transientSharp,
      sections: sections,
    },
    timeSeries: {
      loudnessFrames: loudness.frames,
      truePeakFrames: truePeak.frames,
      stereoFrames: truePeak.stereoFrames,
      spectralCentroid: spectrum.frames.map(f => ({ tSec: f.tSec, centroidHz: f.centroidHz })),
      spectralBandFrames: spectrum.frames.map(f => ({ tSec: f.tSec, bands: f.bandNormalized || {} })),
      lowMidSeries: lowMidSeries,
      onsetTimesSec: onsets.onsetsSec,
    },
  });
}

