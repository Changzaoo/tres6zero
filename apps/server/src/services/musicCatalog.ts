/**
 * Catálogo de músicas geradas por categoria (substitui o antigo buildGeneratedMusic
 * + buildPublicLibraryMusic). Cada faixa tem metadados ricos e um áudio procedural
 * (loop) gerado por categoria/energia, enviado ao Supabase em originals/{categoria}/{slug}.wav.
 *
 * Espelha apps/web/src/features/music (categorias, energias, nomes) para o app
 * exibir e recomendar de forma consistente.
 */

const SAMPLE_RATE = 22050;
/** Duração do loop gerado (s). O player faz loop suave para vídeos mais longos. */
export const CATALOG_CLIP_SECONDS = 12;

type Mode = 'major' | 'minor' | 'penta' | 'dark';

const SCALES: Record<Mode, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  penta: [0, 2, 4, 7, 9],
  dark: [0, 1, 3, 5, 6, 8, 10],
};

interface CategoryAudio {
  key: string;
  label: string;
  base: number;
  mode: Mode;
  energy: number;
  bestForDurations: number[];
  tags: string[];
  mood: string[];
  styles: string[];
  names: string[];
}

const CATEGORIES: CategoryAudio[] = [
  { key: 'aniversario', label: 'Aniversário', base: 262, mode: 'major', energy: 8, bestForDurations: [15, 25, 35], tags: ['birthday', 'party', 'confetti', 'fun', 'neon'], mood: ['alegre', 'energetico'], styles: ['Pop festivo', 'Dance', 'Eletrônico alegre'], names: ['Golden Birthday Glow', 'Neon Confetti Drop', 'Party Candle Pop', 'Confetti Sky Rush', 'Birthday Light Beat', 'Happy Spark Wave', 'Sweet Celebration Pulse', 'Festive Glow Up'] },
  { key: 'casamento', label: 'Casamento', base: 196, mode: 'major', energy: 4, bestForDurations: [25, 35, 45], tags: ['wedding', 'romantic', 'piano', 'emotional', 'cinematic'], mood: ['elegante', 'emocional'], styles: ['Piano emocional', 'Cinemático suave', 'Orquestral leve'], names: ['Elegant Wedding Bloom', 'Forever Soft Lens', 'Eternal Vows Piano', 'Golden Aisle Light', 'Tender Promise Strings', 'First Dance Glow', 'Romantic Cinema Veil', 'Pure Heart Bloom'] },
  { key: 'formatura', label: 'Formatura', base: 220, mode: 'major', energy: 7, bestForDurations: [25, 35, 45], tags: ['graduation', 'epic', 'victory', 'inspirational'], mood: ['vitoria', 'conquista'], styles: ['Pop épico', 'Cinemático inspiracional', 'EDM progressivo'], names: ['Graduation Victory Rise', 'Future Begins Now', 'Cap Toss Anthem', 'Bright Horizon Climb', 'Proud Moment Surge', 'Dream Forward Epic', 'Stage Light Triumph', 'New Chapter Rise'] },
  { key: 'corporativo', label: 'Corporativo', base: 174, mode: 'major', energy: 5, bestForDurations: [15, 25, 35], tags: ['corporate', 'tech', 'modern', 'clean', 'business'], mood: ['profissional', 'moderno'], styles: ['Corporate upbeat', 'Tech house leve', 'Lounge moderno'], names: ['Corporate Motion Light', 'Clean Business Flow', 'Modern Office Pulse', 'Future Brand Drive', 'Sharp Tech Lounge', 'Confident Move Up', 'Premium Workflow', 'Bright Strategy Beat'] },
  { key: 'balada_neon', label: 'Balada / Neon', base: 146, mode: 'minor', energy: 9, bestForDurations: [5, 15, 25], tags: ['club', 'neon', 'edm', 'night', 'bass'], mood: ['forte', 'noturno'], styles: ['EDM', 'House', 'Bass music'], names: ['Neon Night Drive', 'Club Bass Surge', 'Midnight Pulse Drop', 'Laser Floor Heat', 'Electric Dark Wave', 'Phonk City Lights', 'Strobe Rush', 'Deep Night Energy'] },
  { key: 'infantil', label: 'Infantil', base: 294, mode: 'major', energy: 6, bestForDurations: [15, 25, 35], tags: ['kids', 'cute', 'playful', 'ukulele', 'magic'], mood: ['fofo', 'alegre'], styles: ['Pop infantil instrumental', 'Sons mágicos'], names: ['Happy Little Skip', 'Magic Toy Box', 'Sunny Ukulele Smile', 'Rainbow Bounce', 'Bubble Fun Parade', 'Tiny Stars Dance', 'Candy Cloud Hop', 'Playground Giggles'] },
  { key: 'boteco', label: 'Boteco / Bar', base: 196, mode: 'major', energy: 6, bestForDurations: [15, 25, 35], tags: ['bar', 'samba', 'brazil', 'social', 'pagode'], mood: ['descontraido', 'social'], styles: ['Samba leve', 'Pagode instrumental'], names: ['Samba do Quintal', 'Roda de Bar', 'Pagode da Esquina', 'Sertanejo do Fim de Tarde', 'Cerveja e Viola', 'Mesa de Boteco', 'Brasil Descontraido', 'Domingo no Bar'] },
  { key: 'pool_party', label: 'Pool Party', base: 233, mode: 'major', energy: 7, bestForDurations: [15, 25, 35], tags: ['pool', 'summer', 'tropical', 'house', 'beach'], mood: ['sol', 'energia'], styles: ['Tropical house', 'Pop verão'], names: ['Tropical Splash House', 'Poolside Sunset', 'Summer Wave Drop', 'Coconut Beat Cruise', 'Beach Club Glow', 'Saltwater Groove', 'Sunny Float Vibes', 'Aqua Party Pulse'] },
  { key: 'tropical', label: 'Tropical / Verão', base: 247, mode: 'major', energy: 7, bestForDurations: [15, 25, 35], tags: ['tropical', 'summer', 'beach', 'sun', 'house'], mood: ['sol', 'ferias'], styles: ['Tropical house', 'Afro house leve'], names: ['Tropical Summer Spin', 'Palm Breeze Groove', 'Golden Sand Flow', 'Island Sunlight', 'Mango Sunset Beat', 'Warm Shore Drift', 'Coastline Glow', 'Endless Summer Pulse'] },
  { key: 'romantico', label: 'Romântico', base: 165, mode: 'minor', energy: 3, bestForDurations: [25, 35, 45], tags: ['romantic', 'love', 'soft', 'piano', 'emotional'], mood: ['afetivo', 'suave'], styles: ['Piano emocional', 'Lo-fi romântico'], names: ['Romantic Soft Lens', 'Slow Heart Piano', 'Candlelight Whisper', 'Two Hearts Drift', 'Gentle Love Glow', 'Quiet Moment Strings', 'Warm Embrace Lofi', 'Tender Skyline'] },
  { key: 'luxo', label: 'Luxo / Black Gold', base: 138, mode: 'minor', energy: 6, bestForDurations: [15, 25, 35, 45], tags: ['luxury', 'premium', 'gold', 'elegant', 'exclusive'], mood: ['rico', 'elegante'], styles: ['Trap luxuoso limpo', 'Deep house elegante'], names: ['Black Gold Entrance', 'Luxury Velvet Lounge', 'Diamond Deep House', 'Royal Glow Trap', 'Champagne Skyline', 'Exclusive Night Suite', 'Golden Empire', 'Premium Marble Flow'] },
  { key: 'gamer', label: 'Gamer', base: 155, mode: 'minor', energy: 9, bestForDurations: [5, 15, 25], tags: ['gamer', 'synthwave', 'neon', 'digital', 'esports'], mood: ['digital', 'rapido'], styles: ['Synthwave', 'Bass eletrônico'], names: ['Gamer Neon Rush', 'Pixel Boost Synth', 'Arcade Overdrive', 'Cyber Score Beat', 'Level Up Wave', 'Esports Adrenaline', 'Digital Storm', 'Neon Grid Run'] },
  { key: 'funk_festa', label: 'Funk / Festa', base: 131, mode: 'minor', energy: 9, bestForDurations: [15, 25], tags: ['funk', 'party', 'brazil', 'dance', 'beat'], mood: ['dancante', 'festa'], styles: ['Batida funk limpa', 'Beat brasileiro festivo'], names: ['Festa Beat Brasil', 'Batida da Quebrada', 'Baile Pulse Clean', 'Groove de Favela', 'Festa na Laje', 'Ritmo da Rua', 'Funk Light Energy', 'Pancadao Limpo'] },
  { key: 'retro', label: 'Retrô / Anos 80-90', base: 174, mode: 'major', energy: 7, bestForDurations: [15, 25, 35], tags: ['retro', '80s', '90s', 'disco', 'synthwave'], mood: ['nostalgia', 'diversao'], styles: ['Synthwave', 'Disco'], names: ['Retro Synth Sunset', 'Disco Mirror Ball', 'Neon 80s Drive', 'Funky Groove Machine', 'Cassette Memories', 'Roller Disco Nights', 'VHS Glow', 'Arcade Romance'] },
  { key: 'natal', label: 'Natal', base: 262, mode: 'major', energy: 5, bestForDurations: [15, 25, 35, 45], tags: ['christmas', 'bells', 'magic', 'family', 'warm'], mood: ['familiar', 'magico'], styles: ['Bells', 'Piano natalino'], names: ['Christmas Bells Glow', 'Warm Holiday Piano', 'Magic Snow Night', 'Cozy Fireplace Jazz', 'Festive Star Light', 'Gift Morning Pop', 'Winter Wonder Bells', 'Silent Glow Night'] },
  { key: 'ano_novo', label: 'Ano Novo', base: 220, mode: 'major', energy: 9, bestForDurations: [5, 15, 25, 35], tags: ['newyear', 'fireworks', 'celebration', 'edm', 'countdown'], mood: ['explosao', 'celebracao'], styles: ['EDM celebrativo', 'Pop festa'], names: ['New Year Countdown', 'Midnight Fireworks', 'Fresh Start Anthem', 'Champagne Drop', 'Year Ahead Epic', 'Celebration Skyfall', 'First Light Pulse', 'Resolution Rise'] },
  { key: 'carnaval', label: 'Carnaval', base: 233, mode: 'major', energy: 9, bestForDurations: [15, 25, 35], tags: ['carnival', 'samba', 'brazil', 'percussion', 'street'], mood: ['brasil', 'alegria'], styles: ['Percussão brasileira', 'Samba instrumental'], names: ['Carnival Pulse Brasil', 'Batucada da Avenida', 'Axe Sunlight', 'Samba Street Heat', 'Bloco da Alegria', 'Percussao Brasil', 'Folia Energy', 'Tambores da Festa'] },
  { key: 'halloween', label: 'Halloween', base: 123, mode: 'dark', energy: 7, bestForDurations: [5, 15, 25], tags: ['halloween', 'dark', 'spooky', 'horror', 'mystery'], mood: ['misterio', 'sombrio'], styles: ['Dark cinematic', 'Synth dark'], names: ['Spooky Night Cinema', 'Dark Candy Trap', 'Haunted Glow', 'Midnight Pumpkin', 'Ghost Party Fun', 'Shadow Synth', 'Creepy Carnival', 'Witching Hour Beat'] },
  { key: 'minimalista', label: 'Minimalista', base: 196, mode: 'minor', energy: 3, bestForDurations: [15, 25, 35, 45], tags: ['minimal', 'lofi', 'ambient', 'clean', 'calm'], mood: ['clean', 'calmo'], styles: ['Lo-fi', 'Ambient'], names: ['Minimal Clean Air', 'Soft Lofi Focus', 'Quiet Piano Light', 'Calm Ambient Flow', 'White Space Beat', 'Slow Morning Haze', 'Subtle Motion', 'Gentle Minimal Pulse'] },
  { key: 'cinematico', label: 'Cinemático', base: 131, mode: 'minor', energy: 7, bestForDurations: [25, 35, 45], tags: ['cinematic', 'trailer', 'epic', 'orchestral', 'drama'], mood: ['filme', 'grandeza'], styles: ['Trailer impact', 'Epic drums'], names: ['Cinematic Trailer Impact', 'Epic Drums Rise', 'Emotional Build Up', 'Grand Horizon Score', 'Story Climax', 'Heroic Orchestra', 'Tension Surge', 'Final Scene Glow'] },
  { key: 'esportivo', label: 'Esportivo', base: 165, mode: 'minor', energy: 8, bestForDurations: [5, 15, 25], tags: ['sport', 'energy', 'motivation', 'workout', 'fast'], mood: ['energia', 'motivacao'], styles: ['Trap motivacional limpo', 'EDM energético'], names: ['Sport Energy Drive', 'Workout Power Beat', 'Adrenaline Sprint', 'Champion Mindset', 'Game Day Surge', 'Push Limit Pulse', 'Victory Sweat', 'Fast Lane Motivation'] },
];

const UNIVERSAL: Array<{ title: string; mood: string; energy: number; base: number; mode: Mode }> = [
  { title: 'Universal Bright Smile', mood: 'alegre', energy: 7, base: 262, mode: 'major' },
  { title: 'Universal Elegant Light', mood: 'elegante', energy: 4, base: 196, mode: 'major' },
  { title: 'Universal Party Pulse', mood: 'festa', energy: 9, base: 147, mode: 'minor' },
  { title: 'Universal Soft Heart', mood: 'romantico', energy: 3, base: 165, mode: 'minor' },
  { title: 'Universal Clean Motion', mood: 'corporativo', energy: 5, base: 174, mode: 'major' },
  { title: 'Universal Cinema Glow', mood: 'cinematico', energy: 7, base: 131, mode: 'minor' },
  { title: 'Universal Happy Kids', mood: 'infantil', energy: 6, base: 294, mode: 'major' },
  { title: 'Universal Calm Space', mood: 'minimalista', energy: 3, base: 196, mode: 'minor' },
  { title: 'Universal Neon Drive', mood: 'neon', energy: 9, base: 146, mode: 'minor' },
  { title: 'Universal Brasil Groove', mood: 'brasil', energy: 8, base: 220, mode: 'major' },
];

/** 8 perfis de duração por categoria: 3 curtas, 3 médias, 2 longas. */
const SLOTS: Array<{ bestForDurations: number[]; availableCuts: number[]; premium: boolean }> = [
  { bestForDurations: [5, 15], availableCuts: [5, 15, 25], premium: false },
  { bestForDurations: [5, 15], availableCuts: [5, 15, 25], premium: false },
  { bestForDurations: [15], availableCuts: [5, 15, 25], premium: false },
  { bestForDurations: [25, 35], availableCuts: [15, 25, 35], premium: false },
  { bestForDurations: [25, 35], availableCuts: [15, 25, 35], premium: false },
  { bestForDurations: [25, 35], availableCuts: [15, 25, 35, 45], premium: false },
  { bestForDurations: [45], availableCuts: [25, 35, 45], premium: true },
  { bestForDurations: [35, 45], availableCuts: [25, 35, 45], premium: true },
];

export interface CatalogTrack {
  id: string;
  title: string;
  slug: string;
  musicCategory: string;
  categoryLabel: string;
  subcategory: string;
  mood: string[];
  energyLevel: number;
  bpm: number;
  bestForDurations: number[];
  availableCuts: number[];
  tags: string[];
  isPremium: boolean;
  storagePath: string;
  // parâmetros de síntese
  base: number;
  mode: Mode;
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(new RegExp(`[${String.fromCharCode(0x300)}-${String.fromCharCode(0x36f)}]`, 'g'), '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function clampEnergy(value: number) {
  return Math.min(10, Math.max(1, value));
}

/** Constrói o catálogo completo de metadados (sem áudio). Determinístico. */
export function buildMusicCatalog(): CatalogTrack[] {
  const tracks: CatalogTrack[] = [];

  for (const cat of CATEGORIES) {
    SLOTS.forEach((slot, index) => {
      const title = cat.names[index % cat.names.length];
      const slug = slugify(title);
      const energyJitter = slot.bestForDurations.includes(5) ? 1 : slot.bestForDurations.includes(45) ? -1 : 0;
      const energyLevel = clampEnergy(cat.energy + energyJitter);
      tracks.push({
        id: `music_${cat.key}_${String(index + 1).padStart(3, '0')}`,
        title,
        slug,
        musicCategory: cat.key,
        categoryLabel: cat.label,
        subcategory: cat.styles[index % cat.styles.length],
        mood: cat.mood,
        energyLevel,
        bpm: 70 + energyLevel * 7,
        bestForDurations: slot.bestForDurations,
        availableCuts: slot.availableCuts,
        tags: cat.tags,
        isPremium: cat.key === 'luxo' || slot.premium,
        storagePath: `originals/${cat.key}/${slug}.wav`,
        base: cat.base + index * 4,
        mode: cat.mode,
      });
    });
  }

  UNIVERSAL.forEach((item, index) => {
    const slug = slugify(item.title);
    tracks.push({
      id: `music_universal_${String(index + 1).padStart(3, '0')}`,
      title: item.title,
      slug,
      musicCategory: 'universal',
      categoryLabel: 'Universal',
      subcategory: item.mood,
      mood: [item.mood, 'versatil'],
      energyLevel: clampEnergy(item.energy),
      bpm: 70 + item.energy * 7,
      bestForDurations: [5, 15, 25, 35, 45],
      availableCuts: [5, 15, 25, 35, 45],
      tags: ['universal', 'versatile', item.mood],
      isPremium: false,
      storagePath: `originals/universal/${slug}.wav`,
      base: item.base,
      mode: item.mode,
    });
  });

  return tracks;
}

/** Caminho do corte físico no Supabase. */
export function catalogCutPath(track: CatalogTrack, duration: number) {
  return `cuts/${track.musicCategory}/${track.slug}/${duration}s.mp3`;
}

/** Caminho do JSON de waveform no Supabase. */
export function catalogWaveformPath(track: CatalogTrack) {
  return `waveforms/${track.musicCategory}/${track.slug}.json`;
}

/** AppMusic público (consumido pelo app), com URL do Supabase. */
export function catalogTrackToPublic(
  track: CatalogTrack,
  musicUrl: string,
  extras?: { cuts?: Record<string, string>; waveformUrl?: string },
) {
  const now = '2026-01-01T00:00:00.000Z';
  return {
    cuts: extras?.cuts,
    waveformUrl: extras?.waveformUrl,
    id: track.id,
    name: track.title,
    category: 'ambient' as const,
    musicCategory: track.musicCategory,
    subcategory: track.subcategory,
    theme: track.subcategory || track.musicCategory,
    slug: track.slug,
    mood: track.mood,
    energyLevel: track.energyLevel,
    bpm: track.bpm,
    duration: CATALOG_CLIP_SECONDS,
    durationOriginal: CATALOG_CLIP_SECONDS,
    bestForDurations: track.bestForDurations,
    availableCuts: track.availableCuts,
    tags: track.tags,
    isPremium: track.isPremium,
    musicUrl,
    previewUrl: musicUrl,
    storagePath: track.storagePath,
    source: 'generated' as const,
    library: 'SIX3 Generated Library',
    licenseType: 'royalty_free_or_owned',
    licenseName: 'Trilha original gerada pelo SIX3',
    allowedCommercialUse: true,
    attributionRequired: false,
    isGlobal: true,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
}

/* -------------------------------------------------------------------------- */
/*  Renderização procedural do áudio (loop WAV mono).                         */
/* -------------------------------------------------------------------------- */

function writeString(view: DataView, offset: number, value: string) {
  for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
}

function semitone(root: number, steps: number) {
  return root * Math.pow(2, steps / 12);
}

function noteEnvelope(localT: number, length: number) {
  const attack = Math.min(1, localT / 0.01);
  const release = Math.min(1, (length - localT) / 0.12);
  return Math.max(0, Math.min(attack, release));
}

/** Gera um loop WAV de CATALOG_CLIP_SECONDS para a faixa. */
export function renderCatalogTrackWav(track: CatalogTrack): Buffer {
  const duration = CATALOG_CLIP_SECONDS;
  const sampleCount = SAMPLE_RATE * duration;
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

  const scale = SCALES[track.mode];
  const root = track.base;
  const third = semitone(root, track.mode === 'minor' || track.mode === 'dark' ? 3 : 4);
  const fifth = semitone(root, 7);
  const energy = track.energyLevel / 10;
  const beatLen = 60 / track.bpm;
  const stepLen = beatLen / 2; // colcheias
  const bright = track.mode === 'dark' ? 0.018 : 0.03;

  for (let i = 0; i < sampleCount; i++) {
    const t = i / SAMPLE_RATE;

    // Pad sustentado (acorde)
    let sample =
      Math.sin(2 * Math.PI * root * t) * 0.10 +
      Math.sin(2 * Math.PI * third * t) * 0.07 +
      Math.sin(2 * Math.PI * fifth * t) * 0.06;

    // Arpejo melódico (passos da escala)
    const step = Math.floor(t / stepLen);
    const localStepT = t - step * stepLen;
    const noteHz = semitone(root * 2, scale[(step * 3 + track.base) % scale.length]);
    const arpWave = track.mode === 'dark' || track.mode === 'minor'
      ? Math.sign(Math.sin(2 * Math.PI * noteHz * t)) * 0.4 // square-ish p/ neon/dark
      : Math.sin(2 * Math.PI * noteHz * t);
    sample += arpWave * (bright + energy * 0.04) * noteEnvelope(localStepT, stepLen);

    // Kick por batida (proporcional à energia)
    const beatT = t % beatLen;
    if (beatT < 0.05) {
      const kEnv = Math.sin((beatT / 0.05) * Math.PI);
      const kHz = 90 - beatT * 600;
      sample += Math.sin(2 * Math.PI * Math.max(40, kHz) * t) * 0.22 * (0.4 + energy) * kEnv;
    }

    // Hi-hat curto no contratempo p/ alta energia
    if (energy > 0.55) {
      const offT = (t + beatLen / 2) % beatLen;
      if (offT < 0.02) {
        sample += (Math.random() * 2 - 1) * 0.05 * energy;
      }
    }

    // Fade nas pontas do loop p/ emendar suave
    const edge = Math.min(1, t / 0.2, (duration - t) / 0.2);
    sample = Math.max(-1, Math.min(1, sample * edge));
    view.setInt16(44 + i * 2, sample * 32767, true);
  }

  return buffer;
}
