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
const CITIZEN_DJ_BASE_URL = 'https://citizen-dj.labs.loc.gov';

const PUBLIC_LIBRARY_TRACKS = [
  {
    id: 'public-party-disco-cat',
    name: 'Disco Cat',
    category: 'party',
    theme: 'party',
    bpm: 124,
    duration: 30,
    sourcePath: '/audio/samplepacks/loc-fma/Disco-Cat_fma-169734_001_00-00-30.mp3',
  },
  {
    id: 'public-party-free-to-use',
    name: 'Free To Use 13',
    category: 'party',
    theme: 'party',
    bpm: 126,
    duration: 30,
    sourcePath: '/audio/samplepacks/loc-fma/Free-To-Use-13_fma-152622_002_00-00-32.mp3',
  },
  {
    id: 'public-birthday-christmas-lights',
    name: 'Christmas Lights',
    category: 'birthday',
    theme: 'birthday',
    bpm: 112,
    duration: 30,
    sourcePath: '/audio/samplepacks/loc-fma/Christmas-lights_fma-182248_001_00-00-00.mp3',
  },
  {
    id: 'public-wedding-dreaming',
    name: 'Dreaming Of You',
    category: 'wedding',
    theme: 'wedding',
    bpm: 78,
    duration: 30,
    sourcePath: '/audio/samplepacks/loc-fma/Dreaming-of-you_fma-145627_001_00-00-01.mp3',
  },
  {
    id: 'public-wedding-dans-le-love',
    name: 'Dans Le Love',
    category: 'wedding',
    theme: 'wedding',
    bpm: 82,
    duration: 30,
    sourcePath: '/audio/samplepacks/loc-fma/Dans-le-love_fma-158487_001_00-02-32.mp3',
  },
  {
    id: 'public-corporate-father-green',
    name: 'Father Green',
    category: 'corporate',
    theme: 'corporate',
    bpm: 98,
    duration: 30,
    sourcePath: '/audio/samplepacks/loc-fma/Father-Green_fma-175116_001_00-00-00.mp3',
  },
  {
    id: 'public-corporate-action',
    name: 'Action Decisive Move',
    category: 'corporate',
    theme: 'corporate',
    bpm: 104,
    duration: 30,
    sourcePath: '/audio/samplepacks/loc-fma/Action-Decisive-Move_fma-155584_001_00-02-30.mp3',
  },
  {
    id: 'public-ambient-no-return',
    name: 'Ambiant Point Of No Return',
    category: 'ambient',
    theme: 'ambient',
    bpm: 74,
    duration: 30,
    sourcePath: '/audio/samplepacks/loc-fma/Ambiant-Point-Of-No-Return_fma-155586_001_00-01-06.mp3',
  },
  {
    id: 'public-luxury-castle',
    name: 'Castle In The Cloud',
    category: 'premium',
    theme: 'luxury',
    bpm: 88,
    duration: 30,
    sourcePath: '/audio/samplepacks/loc-fma/Castle-in-the-cloud_fma-174212_002_00-00-30.mp3',
  },
  {
    id: 'public-viral-good-start',
    name: 'A Good Start',
    category: 'viral',
    theme: 'viral',
    bpm: 132,
    duration: 30,
    sourcePath: '/audio/samplepacks/loc-fma/A-Good-Start_fma-182157_003_00-00-18.mp3',
  },
] as const;

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

export function buildPublicLibraryMusic() {
  const now = new Date().toISOString();
  return PUBLIC_LIBRARY_TRACKS.map((track) => ({
    id: track.id,
    name: track.name,
    category: track.category,
    theme: track.theme,
    bpm: track.bpm,
    duration: track.duration,
    musicUrl: undefined as string | undefined,
    sourceUrl: `${CITIZEN_DJ_BASE_URL}${track.sourcePath}`,
    storagePath: `public-library/${track.theme}/${track.id}.mp3`,
    library: 'Citizen DJ / Library of Congress Free Music Archive sample packs',
    licenseName: 'Public sample pack from Citizen DJ',
    licenseUrl: 'https://citizen-dj.labs.loc.gov/loc-fma/use/',
    attribution: `${track.name} - Citizen DJ / Free Music Archive`,
    isGlobal: true,
    isActive: true,
    source: 'generated' as const,
    createdAt: now,
    updatedAt: now,
  }));
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
