import type { TemplateCategory } from '@/types';
import type { MusicCategory, VideoDuration } from './types';

/**
 * Bridge moldura -> música. Mapeia TODAS as TemplateCategory existentes
 * (e o 'ambient' do AppMusic) para uma MusicCategory. É assim que o sistema
 * "detecta a categoria da moldura": lê template.category e traduz aqui.
 *
 * Se uma TemplateCategory nova for adicionada e não estiver aqui, o helper
 * musicCategoryForTemplate cai em 'universal' (fallback seguro).
 */
export const TEMPLATE_TO_MUSIC_CATEGORY: Record<TemplateCategory | 'ambient', MusicCategory> = {
  party: 'funk_festa',
  wedding: 'casamento',
  corporate: 'corporativo',
  birthday: 'aniversario',
  viral: 'funk_festa',
  premium: 'luxo',
  graduation: 'formatura',
  store: 'corporativo',
  church: 'romantico',
  infantil: 'infantil',
  esportivo: 'esportivo',
  natal: 'natal',
  carnaval: 'carnaval',
  cha_revelacao: 'romantico',
  halloween: 'halloween',
  brilhos_estrelas: 'cinematico',
  confetes_festa: 'aniversario',
  neon_glow: 'balada_neon',
  circulos_animados: 'corporativo',
  setas_chamadas: 'corporativo',
  emojis_reacoes: 'funk_festa',
  elementos_festivos: 'aniversario',
  cards_faixas: 'corporativo',
  tech_futurista: 'gamer',
  cubos_isometricos: 'corporativo',
  flores_decorativos: 'romantico',
  minimal_premium: 'minimalista',
  gamer_neon: 'gamer',
  tropical: 'tropical',
  booth_360: 'balada_neon',
  fogo: 'balada_neon',
  gelo: 'cinematico',
  oceano: 'tropical',
  galaxia: 'gamer',
  ambient: 'minimalista',
};

export function musicCategoryForTemplate(category?: string | null): MusicCategory {
  if (!category) return 'universal';
  return (TEMPLATE_TO_MUSIC_CATEGORY as Record<string, MusicCategory>)[category] ?? 'universal';
}

export interface MusicCategoryProfile {
  category: MusicCategory;
  /** Nome amigável exibido ao usuário (pt-BR). */
  label: string;
  /** Estilos musicais recomendados. */
  styles: string[];
  /** Clima/energia do template. */
  mood: string[];
  /** Energia típica 1..10 (usada como default e no score). */
  energyLevel: number;
  /** Durações que combinam melhor com a categoria. */
  bestForDurations: VideoDuration[];
  /** Tags semânticas para casar com tags de template. */
  tags: string[];
}

export const MUSIC_CATEGORY_PROFILES: Record<MusicCategory, MusicCategoryProfile> = {
  aniversario: {
    category: 'aniversario',
    label: 'Aniversário',
    styles: ['Pop festivo', 'Funk leve', 'Dance', 'Eletrônico alegre', 'Trap party limpo'],
    mood: ['alegre', 'divertido', 'energetico', 'celebracao'],
    energyLevel: 8,
    bestForDurations: [15, 25, 35],
    tags: ['birthday', 'party', 'confetti', 'fun', 'neon'],
  },
  casamento: {
    category: 'casamento',
    label: 'Casamento',
    styles: ['Piano emocional', 'Pop romântico instrumental', 'Cinemático suave', 'Orquestral leve', 'Lo-fi romântico'],
    mood: ['elegante', 'emocional', 'luxuoso', 'afetivo'],
    energyLevel: 4,
    bestForDurations: [25, 35, 45],
    tags: ['wedding', 'romantic', 'piano', 'emotional', 'cinematic'],
  },
  formatura: {
    category: 'formatura',
    label: 'Formatura',
    styles: ['Pop épico', 'Cinemático inspiracional', 'EDM progressivo', 'Trap motivacional limpo'],
    mood: ['vitoria', 'conquista', 'celebracao', 'emocao'],
    energyLevel: 7,
    bestForDurations: [25, 35, 45],
    tags: ['graduation', 'epic', 'victory', 'inspirational'],
  },
  corporativo: {
    category: 'corporativo',
    label: 'Corporativo',
    styles: ['Corporate upbeat', 'Tech house leve', 'Lounge moderno', 'Minimal eletrônico', 'Future bass leve'],
    mood: ['profissional', 'moderno', 'confiante', 'premium'],
    energyLevel: 5,
    bestForDurations: [15, 25, 35],
    tags: ['corporate', 'tech', 'modern', 'clean', 'business'],
  },
  balada_neon: {
    category: 'balada_neon',
    label: 'Balada / Neon',
    styles: ['EDM', 'House', 'Techno leve', 'Phonk limpo', 'Bass music'],
    mood: ['forte', 'noturno', 'energetico', 'impactante'],
    energyLevel: 9,
    bestForDurations: [5, 15, 25],
    tags: ['club', 'neon', 'edm', 'night', 'bass'],
  },
  infantil: {
    category: 'infantil',
    label: 'Infantil',
    styles: ['Pop infantil instrumental', 'Ukulele alegre', 'Sons mágicos', 'Música divertida sem voz'],
    mood: ['fofo', 'colorido', 'seguro', 'alegre'],
    energyLevel: 6,
    bestForDurations: [15, 25, 35],
    tags: ['kids', 'cute', 'playful', 'ukulele', 'magic'],
  },
  boteco: {
    category: 'boteco',
    label: 'Boteco / Bar',
    styles: ['Samba leve', 'Pagode instrumental', 'Sertanejo festivo instrumental', 'Pop brasileiro sem copyright'],
    mood: ['descontraido', 'social', 'divertido'],
    energyLevel: 6,
    bestForDurations: [15, 25, 35],
    tags: ['bar', 'samba', 'brazil', 'social', 'pagode'],
  },
  pool_party: {
    category: 'pool_party',
    label: 'Pool Party',
    styles: ['Tropical house', 'Afro house leve', 'Pop verão', 'Reggaeton instrumental limpo'],
    mood: ['sol', 'praia', 'energia', 'ferias'],
    energyLevel: 7,
    bestForDurations: [15, 25, 35],
    tags: ['pool', 'summer', 'tropical', 'house', 'beach'],
  },
  tropical: {
    category: 'tropical',
    label: 'Tropical / Verão',
    styles: ['Tropical house', 'Pop verão', 'Afro house leve', 'Reggaeton instrumental limpo'],
    mood: ['sol', 'praia', 'energia', 'ferias'],
    energyLevel: 7,
    bestForDurations: [15, 25, 35],
    tags: ['tropical', 'summer', 'beach', 'sun', 'house'],
  },
  romantico: {
    category: 'romantico',
    label: 'Romântico',
    styles: ['Piano emocional', 'Lo-fi romântico', 'Pop suave instrumental', 'Cinemático suave'],
    mood: ['afetivo', 'suave', 'emocional', 'intimo'],
    energyLevel: 3,
    bestForDurations: [25, 35, 45],
    tags: ['romantic', 'love', 'soft', 'piano', 'emotional'],
  },
  luxo: {
    category: 'luxo',
    label: 'Luxo / Black Gold',
    styles: ['Trap luxuoso limpo', 'Cinemático premium', 'Deep house elegante', 'Lounge sofisticado'],
    mood: ['rico', 'premium', 'elegante', 'exclusivo'],
    energyLevel: 6,
    bestForDurations: [15, 25, 35, 45],
    tags: ['luxury', 'premium', 'gold', 'elegant', 'exclusive'],
  },
  gamer: {
    category: 'gamer',
    label: 'Gamer',
    styles: ['Synthwave', 'Chiptune moderno', 'Bass eletrônico', 'Trap gamer limpo'],
    mood: ['digital', 'rapido', 'neon', 'competitivo'],
    energyLevel: 9,
    bestForDurations: [5, 15, 25],
    tags: ['gamer', 'synthwave', 'neon', 'digital', 'esports'],
  },
  funk_festa: {
    category: 'funk_festa',
    label: 'Funk / Festa',
    styles: ['Batida funk limpa', 'Funk instrumental sem samples protegidos', 'Beat brasileiro festivo'],
    mood: ['dancante', 'popular', 'festa'],
    energyLevel: 9,
    bestForDurations: [15, 25],
    tags: ['funk', 'party', 'brazil', 'dance', 'beat'],
  },
  retro: {
    category: 'retro',
    label: 'Retrô / Anos 80-90',
    styles: ['Synthwave', 'Disco', 'Pop retrô instrumental', 'Funky groove'],
    mood: ['nostalgia', 'brilho', 'diversao'],
    energyLevel: 7,
    bestForDurations: [15, 25, 35],
    tags: ['retro', '80s', '90s', 'disco', 'synthwave'],
  },
  natal: {
    category: 'natal',
    label: 'Natal',
    styles: ['Bells', 'Jazz natalino', 'Piano natalino', 'Pop mágico'],
    mood: ['familiar', 'magico', 'quente'],
    energyLevel: 5,
    bestForDurations: [15, 25, 35, 45],
    tags: ['christmas', 'bells', 'magic', 'family', 'warm'],
  },
  ano_novo: {
    category: 'ano_novo',
    label: 'Ano Novo',
    styles: ['EDM celebrativo', 'Cinemático épico', 'Pop festa', 'Countdown impact'],
    mood: ['explosao', 'recomeco', 'celebracao'],
    energyLevel: 9,
    bestForDurations: [5, 15, 25, 35],
    tags: ['newyear', 'fireworks', 'celebration', 'edm', 'countdown'],
  },
  carnaval: {
    category: 'carnaval',
    label: 'Carnaval',
    styles: ['Percussão brasileira', 'Samba instrumental', 'Axé instrumental', 'Batucada limpa'],
    mood: ['brasil', 'rua', 'alegria', 'energia_alta'],
    energyLevel: 9,
    bestForDurations: [15, 25, 35],
    tags: ['carnival', 'samba', 'brazil', 'percussion', 'street'],
  },
  halloween: {
    category: 'halloween',
    label: 'Halloween',
    styles: ['Dark cinematic', 'Trap sombrio limpo', 'Horror fun', 'Synth dark'],
    mood: ['misterio', 'sombrio', 'divertido'],
    energyLevel: 7,
    bestForDurations: [5, 15, 25],
    tags: ['halloween', 'dark', 'spooky', 'horror', 'mystery'],
  },
  minimalista: {
    category: 'minimalista',
    label: 'Minimalista',
    styles: ['Lo-fi', 'Ambient', 'Piano leve', 'Minimal electronic'],
    mood: ['clean', 'sofisticado', 'calmo'],
    energyLevel: 3,
    bestForDurations: [15, 25, 35, 45],
    tags: ['minimal', 'lofi', 'ambient', 'clean', 'calm'],
  },
  cinematico: {
    category: 'cinematico',
    label: 'Cinemático',
    styles: ['Trailer impact', 'Orquestral curto', 'Build-up emocional', 'Epic drums'],
    mood: ['filme', 'grandeza', 'emocao'],
    energyLevel: 7,
    bestForDurations: [25, 35, 45],
    tags: ['cinematic', 'trailer', 'epic', 'orchestral', 'drama'],
  },
  esportivo: {
    category: 'esportivo',
    label: 'Esportivo',
    styles: ['Trap motivacional limpo', 'EDM energético', 'Rock eletrônico leve', 'Hybrid sport'],
    mood: ['energia', 'forca', 'motivacao', 'rapido'],
    energyLevel: 8,
    bestForDurations: [5, 15, 25],
    tags: ['sport', 'energy', 'motivation', 'workout', 'fast'],
  },
  universal: {
    category: 'universal',
    label: 'Universal',
    styles: ['Pop instrumental', 'Eletrônico leve', 'Cinemático neutro'],
    mood: ['versatil', 'equilibrado', 'agradavel'],
    energyLevel: 5,
    bestForDurations: [5, 15, 25, 35, 45],
    tags: ['universal', 'generic', 'versatile'],
  },
};

export function categoryProfile(category: MusicCategory): MusicCategoryProfile {
  return MUSIC_CATEGORY_PROFILES[category] ?? MUSIC_CATEGORY_PROFILES.universal;
}
