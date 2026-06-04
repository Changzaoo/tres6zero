import { categoryProfile } from './categoryMap';
import type { MusicCategory, MusicTrack, VideoDuration } from './types';

/**
 * SEED inicial de metadados. Os arquivos reais (fileUrl/previewUrl) ainda não
 * existem — são preenchidos quando o admin faz upload (Etapa 4/5). Serve para
 * desenvolver UI, recomendação e testes sem depender do Storage.
 *
 * Por categoria: >=3 curtas (5/15), >=3 médias (25/35), >=2 longas (45),
 * mais uma biblioteca universal de fallback no fim.
 */

const COMBINING_MARKS = new RegExp(`[${String.fromCharCode(0x300)}-${String.fromCharCode(0x36f)}]`, 'g');

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

const NOW = '2026-01-01T00:00:00.000Z';

/** Nomes profissionais por categoria (sem artistas/hits reais). */
const NAME_BANK: Record<Exclude<MusicCategory, 'universal'>, string[]> = {
  aniversario: ['Golden Birthday Glow', 'Neon Confetti Drop', 'Party Candle Pop', 'Confetti Sky Rush', 'Birthday Light Beat', 'Happy Spark Wave', 'Sweet Celebration Pulse', 'Festive Glow Up'],
  casamento: ['Elegant Wedding Bloom', 'Forever Soft Lens', 'Eternal Vows Piano', 'Golden Aisle Light', 'Tender Promise Strings', 'First Dance Glow', 'Romantic Cinema Veil', 'Pure Heart Bloom'],
  formatura: ['Graduation Victory Rise', 'Future Begins Now', 'Cap Toss Anthem', 'Bright Horizon Climb', 'Proud Moment Surge', 'Dream Forward Epic', 'Stage Light Triumph', 'New Chapter Rise'],
  corporativo: ['Corporate Motion Light', 'Clean Business Flow', 'Modern Office Pulse', 'Future Brand Drive', 'Sharp Tech Lounge', 'Confident Move Up', 'Premium Workflow', 'Bright Strategy Beat'],
  balada_neon: ['Neon Night Drive', 'Club Bass Surge', 'Midnight Pulse Drop', 'Laser Floor Heat', 'Electric Dark Wave', 'Phonk City Lights', 'Strobe Rush', 'Deep Night Energy'],
  infantil: ['Happy Little Skip', 'Magic Toy Box', 'Sunny Ukulele Smile', 'Rainbow Bounce', 'Bubble Fun Parade', 'Tiny Stars Dance', 'Candy Cloud Hop', 'Playground Giggles'],
  boteco: ['Samba do Quintal', 'Roda de Bar', 'Pagode da Esquina', 'Sertanejo do Fim de Tarde', 'Cerveja e Viola', 'Mesa de Boteco', 'Brasil Descontraído', 'Domingo no Bar'],
  pool_party: ['Tropical Splash House', 'Poolside Sunset', 'Summer Wave Drop', 'Coconut Beat Cruise', 'Beach Club Glow', 'Saltwater Groove', 'Sunny Float Vibes', 'Aqua Party Pulse'],
  tropical: ['Tropical Summer Spin', 'Palm Breeze Groove', 'Golden Sand Flow', 'Island Sunlight', 'Mango Sunset Beat', 'Warm Shore Drift', 'Coastline Glow', 'Endless Summer Pulse'],
  romantico: ['Romantic Soft Lens', 'Slow Heart Piano', 'Candlelight Whisper', 'Two Hearts Drift', 'Gentle Love Glow', 'Quiet Moment Strings', 'Warm Embrace Lofi', 'Tender Skyline'],
  luxo: ['Black Gold Entrance', 'Luxury Velvet Lounge', 'Diamond Deep House', 'Royal Glow Trap', 'Champagne Skyline', 'Exclusive Night Suite', 'Golden Empire', 'Premium Marble Flow'],
  gamer: ['Gamer Neon Rush', 'Pixel Boost Synth', 'Arcade Overdrive', 'Cyber Score Beat', 'Level Up Wave', 'Esports Adrenaline', 'Digital Storm', 'Neon Grid Run'],
  funk_festa: ['Festa Beat Brasil', 'Batida da Quebrada', 'Baile Pulse Clean', 'Groove de Favela', 'Festa na Laje', 'Ritmo da Rua', 'Funk Light Energy', 'Pancadão Limpo'],
  retro: ['Retro Synth Sunset', 'Disco Mirror Ball', 'Neon 80s Drive', 'Funky Groove Machine', 'Cassette Memories', 'Roller Disco Nights', 'VHS Glow', 'Arcade Romance'],
  natal: ['Christmas Bells Glow', 'Warm Holiday Piano', 'Magic Snow Night', 'Cozy Fireplace Jazz', 'Festive Star Light', 'Gift Morning Pop', 'Winter Wonder Bells', 'Silent Glow Night'],
  ano_novo: ['New Year Countdown', 'Midnight Fireworks', 'Fresh Start Anthem', 'Champagne Drop', 'Year Ahead Epic', 'Celebration Skyfall', 'First Light Pulse', 'Resolution Rise'],
  carnaval: ['Carnival Pulse Brasil', 'Batucada da Avenida', 'Axé Sunlight', 'Samba Street Heat', 'Bloco da Alegria', 'Percussão Brasil', 'Folia Energy', 'Tambores da Festa'],
  halloween: ['Spooky Night Cinema', 'Dark Candy Trap', 'Haunted Glow', 'Midnight Pumpkin', 'Ghost Party Fun', 'Shadow Synth', 'Creepy Carnival', 'Witching Hour Beat'],
  minimalista: ['Minimal Clean Air', 'Soft Lofi Focus', 'Quiet Piano Light', 'Calm Ambient Flow', 'White Space Beat', 'Slow Morning Haze', 'Subtle Motion', 'Gentle Minimal Pulse'],
  cinematico: ['Cinematic Trailer Impact', 'Epic Drums Rise', 'Emotional Build Up', 'Grand Horizon Score', 'Story Climax', 'Heroic Orchestra', 'Tension Surge', 'Final Scene Glow'],
  esportivo: ['Sport Energy Drive', 'Workout Power Beat', 'Adrenaline Sprint', 'Champion Mindset', 'Game Day Surge', 'Push Limit Pulse', 'Victory Sweat', 'Fast Lane Motivation'],
};

interface SeedSlot {
  durationOriginal: number;
  bestForDurations: VideoDuration[];
  availableCuts: VideoDuration[];
  bucket: 'short' | 'medium' | 'long';
}

const SLOTS: SeedSlot[] = [
  { durationOriginal: 30, bestForDurations: [5, 15], availableCuts: [5, 15, 25], bucket: 'short' },
  { durationOriginal: 30, bestForDurations: [5, 15], availableCuts: [5, 15, 25], bucket: 'short' },
  { durationOriginal: 30, bestForDurations: [15], availableCuts: [5, 15, 25], bucket: 'short' },
  { durationOriginal: 45, bestForDurations: [25, 35], availableCuts: [15, 25, 35], bucket: 'medium' },
  { durationOriginal: 45, bestForDurations: [25, 35], availableCuts: [15, 25, 35], bucket: 'medium' },
  { durationOriginal: 50, bestForDurations: [25, 35], availableCuts: [15, 25, 35, 45], bucket: 'medium' },
  { durationOriginal: 60, bestForDurations: [45], availableCuts: [25, 35, 45], bucket: 'long' },
  { durationOriginal: 60, bestForDurations: [35, 45], availableCuts: [25, 35, 45], bucket: 'long' },
];

function buildCategoryTracks(category: Exclude<MusicCategory, 'universal'>): MusicTrack[] {
  const profile = categoryProfile(category);
  const names = NAME_BANK[category];
  return SLOTS.map((slot, index) => {
    const title = names[index % names.length];
    const slug = slugify(title);
    const energyJitter = slot.bucket === 'short' ? 1 : slot.bucket === 'long' ? -1 : 0;
    const energyLevel = Math.min(10, Math.max(1, profile.energyLevel + energyJitter));
    const bpm = 70 + energyLevel * 7;
    return {
      id: `music_${category}_${String(index + 1).padStart(3, '0')}`,
      title,
      slug,
      category,
      subcategory: profile.styles[index % profile.styles.length],
      mood: profile.mood,
      energyLevel,
      bpm,
      durationOriginal: slot.durationOriginal,
      availableCuts: slot.availableCuts,
      bestForDurations: slot.bestForDurations,
      fileUrl: '',
      previewUrl: '',
      cuts: {},
      licenseType: 'royalty_free_or_owned',
      source: 'internal_library',
      allowedCommercialUse: true,
      attributionRequired: false,
      tags: profile.tags,
      isPremium: category === 'luxo' || slot.bucket === 'long',
      isActive: true,
      createdAt: NOW,
      updatedAt: NOW,
    } satisfies MusicTrack;
  });
}

/** Biblioteca universal de fallback (uma faixa por "clima" pedido). */
const UNIVERSAL_NAMES: Array<{ title: string; mood: string; energy: number }> = [
  { title: 'Universal Bright Smile', mood: 'alegre', energy: 7 },
  { title: 'Universal Elegant Light', mood: 'elegante', energy: 4 },
  { title: 'Universal Party Pulse', mood: 'festa', energy: 9 },
  { title: 'Universal Soft Heart', mood: 'romantico', energy: 3 },
  { title: 'Universal Clean Motion', mood: 'corporativo', energy: 5 },
  { title: 'Universal Cinema Glow', mood: 'cinematico', energy: 7 },
  { title: 'Universal Happy Kids', mood: 'infantil', energy: 6 },
  { title: 'Universal Calm Space', mood: 'minimalista', energy: 3 },
  { title: 'Universal Neon Drive', mood: 'neon', energy: 9 },
  { title: 'Universal Brasil Groove', mood: 'brasil', energy: 8 },
];

function buildUniversalTracks(): MusicTrack[] {
  return UNIVERSAL_NAMES.map((item, index) => {
    const slug = slugify(item.title);
    return {
      id: `music_universal_${String(index + 1).padStart(3, '0')}`,
      title: item.title,
      slug,
      category: 'universal',
      subcategory: item.mood,
      mood: [item.mood, 'versatil'],
      energyLevel: item.energy,
      bpm: 70 + item.energy * 7,
      durationOriginal: 60,
      availableCuts: [5, 15, 25, 35, 45],
      bestForDurations: [5, 15, 25, 35, 45],
      fileUrl: '',
      previewUrl: '',
      cuts: {},
      licenseType: 'royalty_free_or_owned',
      source: 'internal_library',
      allowedCommercialUse: true,
      attributionRequired: false,
      tags: ['universal', 'versatile', item.mood],
      isPremium: false,
      isActive: true,
      createdAt: NOW,
      updatedAt: NOW,
    } satisfies MusicTrack;
  });
}

let cachedSeed: MusicTrack[] | null = null;

/** Catálogo seed completo (memoizado). */
export function buildMusicSeed(): MusicTrack[] {
  if (cachedSeed) return cachedSeed;
  const categories = Object.keys(NAME_BANK) as Array<Exclude<MusicCategory, 'universal'>>;
  const tracks = categories.flatMap(buildCategoryTracks);
  cachedSeed = [...tracks, ...buildUniversalTracks()];
  return cachedSeed;
}

export const MUSIC_SEED: MusicTrack[] = buildMusicSeed();
