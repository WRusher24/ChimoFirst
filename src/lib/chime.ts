"use client";

/**
 * Synthesizes a pleasant ~3-second alerting chime into a 16-bit PCM WAV and
 * serves it as an object URL — no binary audio asset required.
 * Played through a real HTML <audio> element (see ChimeProvider).
 *
 * The chime is a rising three-note motif (E5 → A5 → D6) with harmonics and
 * long decays so it carries across a factory floor without being harsh.
 */

let cachedUrl: string | null = null;

function writeString(view: DataView, offset: number, value: string) {
  for (let i = 0; i < value.length; i++) {
    view.setUint8(offset + i, value.charCodeAt(i));
  }
}

export function getChimeUrl(): string | null {
  if (typeof window === "undefined") return null;
  if (cachedUrl) return cachedUrl;

  const sampleRate = 44100;
  const durationSec = 3.0;
  const numSamples = Math.floor(sampleRate * durationSec);

  const notes = [
    // fundamental sequence with gentle overlap
    { freq: 659.25, start: 0.0, decay: 2.0, gain: 0.5 }, // E5
    { freq: 1318.51, start: 0.0, decay: 2.6, gain: 0.1 }, // octave harmonic
    { freq: 880.0, start: 0.55, decay: 1.9, gain: 0.5 }, // A5
    { freq: 1760.0, start: 0.55, decay: 2.5, gain: 0.09 },
    { freq: 1174.66, start: 1.15, decay: 1.5, gain: 0.52 }, // D6 — rings out to ~3s
    { freq: 2349.32, start: 1.15, decay: 2.2, gain: 0.08 },
  ];

  const samples = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let v = 0;
    for (const n of notes) {
      const nt = t - n.start;
      if (nt < 0) continue;
      const attack = Math.min(1, nt / 0.01);
      const env = attack * Math.exp(-n.decay * nt);
      v += n.gain * env * Math.sin(2 * Math.PI * n.freq * nt);
    }
    // global fade-in/out to avoid clicks
    const edge = Math.min(1, t / 0.01, (durationSec - t) / 0.08);
    samples[i] = Math.max(-1, Math.min(1, v * edge));
  }

  const dataSize = numSamples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < numSamples; i++) {
    view.setInt16(44 + i * 2, samples[i] * 0x7fff, true);
  }

  cachedUrl = URL.createObjectURL(
    new Blob([buffer], { type: "audio/wav" }),
  );
  return cachedUrl;
}
