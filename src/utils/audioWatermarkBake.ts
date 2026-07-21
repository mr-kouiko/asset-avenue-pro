// Shared utility to bake the ASMR whisper watermark into an audio file
// using OfflineAudioContext, returning a WAV Blob.
// Used by both AudioHeroPlayer and the ProductDetail download button so
// the downloaded preview ALWAYS contains the watermark (not just live playback).

const WATERMARK_URL = "https://visustock.com/cdn/audio-watermark.mp3";

const WATERMARK_INTERVAL_SEC = 15;
const FIRST_WATERMARK_AT_SEC = 2;

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataLength = buffer.length * blockAlign;
  const bufferLength = 44 + dataLength;

  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, "RIFF");
  view.setUint32(4, bufferLength - 8, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, "data");
  view.setUint32(40, dataLength, true);

  const channels: Float32Array[] = [];
  for (let i = 0; i < numChannels; i++) channels.push(buffer.getChannelData(i));

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const s = Math.max(-1, Math.min(1, channels[ch][i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([arrayBuffer], { type: "audio/wav" });
}

/**
 * Bake the whisper watermark into the source audio. The source can be any
 * URL the browser can decodeAudioData (mp3/wav/ogg/m4a). Returns a WAV Blob.
 */
export async function bakeAudioWatermark(sourceUrl: string): Promise<Blob> {
  const AudioCtx: typeof AudioContext =
    (window as any).AudioContext || (window as any).webkitAudioContext;
  const ctx = new AudioCtx();
  try {
    const [mainRes, wmRes] = await Promise.all([
      fetch(sourceUrl),
      fetch(WATERMARK_URL),
    ]);
    if (!mainRes.ok) throw new Error(`Main audio fetch failed: ${mainRes.status}`);
    if (!wmRes.ok) throw new Error(`Watermark fetch failed: ${wmRes.status}`);

    const [mainBuf, wmBuf] = await Promise.all([
      mainRes.arrayBuffer().then((b) => ctx.decodeAudioData(b)),
      wmRes.arrayBuffer().then((b) => ctx.decodeAudioData(b)),
    ]);

    const offline = new OfflineAudioContext(
      mainBuf.numberOfChannels,
      mainBuf.length,
      mainBuf.sampleRate
    );

    // Main track ducked to 0.7 so the watermark is clearly audible
    const mainSrc = offline.createBufferSource();
    mainSrc.buffer = mainBuf;
    const mainGain = offline.createGain();
    mainGain.gain.value = 0.7;
    mainSrc.connect(mainGain).connect(offline.destination);
    mainSrc.start(0);

    // Stamp watermark every 15 seconds at full volume
    for (let t = FIRST_WATERMARK_AT_SEC; t < mainBuf.duration; t += WATERMARK_INTERVAL_SEC) {
      const wmSrc = offline.createBufferSource();
      wmSrc.buffer = wmBuf;
      const wmGain = offline.createGain();
      wmGain.gain.value = 1.0;
      wmSrc.connect(wmGain).connect(offline.destination);
      wmSrc.start(t);
    }

    const rendered = await offline.startRendering();
    return audioBufferToWav(rendered);
  } finally {
    try { await ctx.close(); } catch { /* noop */ }
  }
}
