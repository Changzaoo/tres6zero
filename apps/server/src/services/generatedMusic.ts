const THEMES = [
  { id: 'party', name: 'Party Pulse', category: 'party', base: 220, bpm: 124 },
  { id: 'luxury', name: 'Luxury Glow', category: 'premium', base: 165, bpm: 92 },
  { id: 'wedding', name: 'Wedding Air', category: 'wedding', base: 262, bpm: 76 },
  { id: 'corporate', name: 'Corporate Clean', category: 'corporate', base: 196, bpm: 100 },
  { id: 'viral', name: 'Viral Motion', category: 'viral', base: 247, bpm: 132 },
  { id: 'birthday', name: 'Birthday Pop', category: 'birthday', base: 294, bpm: 118 },
] as const;

const SAMPLE_RATE = 22050;
const DURATION_SECONDS = 6;

function writeString(view: DataView, offset: number, value: string) {
  for (let i = 0; i < value.length; i++) {
    view.setUint8(offset + i, value.charCodeAt(i));
  }
}

function envelope(t: number, duration: number) {
  const attack = Math.min(1, t / 0.12);
  const release = Math.min(1, (duration - t) / 0.35);
  return Math.max(0, Math.min(attack, release));
}

function beat(t: number, bpm: number) {
  const beatLen = 60 / bpm;
  const phase = t % beatLen;
  return phase < 0.045 ? Math.sin((phase / 0.045) * Math.PI) * 0.35 : 0;
}

export function buildGeneratedMusic(count = 72) {
  const now = new Date().toISOString();
  return Array.from({ length: count }, (_, index) => {
    const theme = THEMES[index % THEMES.length];
    const variant = Math.floor(index / THEMES.length) + 1;
    const id = `generated-music-${String(index + 1).padStart(3, '0')}`;
    return {
      id,
      name: `${theme.name} ${String(variant).padStart(2, '0')}`,
      category: theme.category,
      theme: theme.id,
      bpm: theme.bpm + (variant % 4) * 2,
      duration: DURATION_SECONDS,
      storagePath: `generated/${theme.category}/${id}.wav`,
      isGlobal: true,
      isActive: true,
      source: 'generated' as const,
      createdAt: now,
      updatedAt: now,
      baseFrequency: theme.base + variant * 3,
    };
  });
}

export function renderMusicWav(params: { baseFrequency: number; bpm: number }) {
  const sampleCount = SAMPLE_RATE * DURATION_SECONDS;
  const dataSize = sampleCount * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < sampleCount; i++) {
    const t = i / SAMPLE_RATE;
    const base = params.baseFrequency;
    const chord =
      Math.sin(2 * Math.PI * base * t) * 0.26 +
      Math.sin(2 * Math.PI * base * 1.5 * t) * 0.16 +
      Math.sin(2 * Math.PI * base * 2 * t) * 0.10;
    const pulse = beat(t, params.bpm);
    const value = Math.max(-1, Math.min(1, (chord + pulse) * envelope(t, DURATION_SECONDS)));
    view.setInt16(44 + i * 2, value * 32767, true);
  }

  return buffer;
}
