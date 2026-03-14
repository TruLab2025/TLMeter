import { expose } from 'comlink';

const dspWorker = {
  async analyzeAudioBuffer(audioBuffer: AudioBuffer, options: any) {
    // Tu będzie logika DSP (FFT, LUFS, itp.)
    return { meta: {}, global: {}, timeSeries: {} };
  }
};

expose(dspWorker);
