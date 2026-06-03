import { Buffer } from 'node:buffer';

const LEGACY_CATEGORIES = [
  'party', 'wedding', 'corporate', 'birthday', 'viral', 'premium',
  'infantil', 'esportivo', 'natal', 'carnaval', 'cha_revelacao', 'halloween',
] as const;
const CATEGORIES = [...LEGACY_CATEGORIES, 'graduation', 'store', 'church'] as const;
const ASPECTS = ['9:16', '16:9'] as const;

type TemplateCategory = (typeof CATEGORIES)[number];
type LegacyTemplateCategory = (typeof LEGACY_CATEGORIES)[number];
type TemplateAspect = (typeof ASPECTS)[number];
type LayoutKey =
  | 'poster_clip'
  | 'snap_filter'
  | 'applay_flow'
  | 'neon_corners'
  | 'floral_crown'
  | 'luxury_corners'
  | 'glitch_reel'
  | 'cinematic_band'
  | 'confetti_arch'
  | 'event_badge'
  | 'chrome_frame'
  | 'minimal_luxe'
  | 'polaroid_stack'
  | 'ticket_pass'
  | 'social_story'
  | 'tech_hud'
  | 'orbital_focus'
  | 'split_ribbon'
  | 'magazine_cover'
  | 'photo_strip'
  | 'spotlight_stage'
  | 'liquid_waves'
  | 'sticker_burst'
  | 'retro_vhs'
  | 'minimal_editorial'
  | 'brand_slate'
  | 'romantic_lace'
  | 'geometric_lux';

type ThemePack = {
  title: string;
  badge: string;
  footer: string;
  palettes: [string, string, string][];
  layouts: LayoutKey[];
};

const COLOR_VARIANTS = [
  { key: 'signature', label: 'Signature' },
  { key: 'electric', label: 'Electric' },
  { key: 'soft', label: 'Soft' },
  { key: 'contrast', label: 'Contrast' },
] as const;

const LAYOUT_LABELS: Record<LayoutKey, string> = {
  poster_clip: 'Clip Poster',
  snap_filter: 'Snap Lens',
  applay_flow: 'Applay Flow',
  neon_corners: 'Neon Corners',
  floral_crown: 'Floral Crown',
  luxury_corners: 'Luxury Corners',
  glitch_reel: 'Glitch Reel',
  cinematic_band: 'Cinematic Band',
  confetti_arch: 'Confetti Arch',
  event_badge: 'Event Badge',
  chrome_frame: 'Chrome Frame',
  minimal_luxe: 'Minimal Luxe',
  polaroid_stack: 'Polaroid Stack',
  ticket_pass: 'Ticket Pass',
  social_story: 'Social Story',
  tech_hud: 'Tech HUD',
  orbital_focus: 'Orbital Focus',
  split_ribbon: 'Split Ribbon',
  magazine_cover: 'Magazine Cover',
  photo_strip: 'Photo Strip',
  spotlight_stage: 'Spotlight Stage',
  liquid_waves: 'Liquid Waves',
  sticker_burst: 'Sticker Burst',
  retro_vhs: 'Retro VHS',
  minimal_editorial: 'Minimal Editorial',
  brand_slate: 'Brand Slate',
  romantic_lace: 'Romantic Lace',
  geometric_lux: 'Geometric Luxe',
};

const EFFECTS_BY_CATEGORY: Record<TemplateCategory, string[]> = {
  party: ['party', 'neon', 'speed_ramp'],
  wedding: ['wedding_soft', 'cinematic', 'slow_motion'],
  corporate: ['corporate_sharp', 'clean', 'cinematic'],
  birthday: ['party', 'boomerang', 'neon'],
  viral: ['speed_ramp', 'glitch_flash', 'neon'],
  premium: ['luxury', 'cinematic', 'slow_motion'],
  graduation: ['luxury', 'cinematic', 'party'],
  store: ['corporate_sharp', 'clean', 'neon'],
  church: ['wedding_soft', 'cinematic', 'clean'],
  infantil: ['party', 'boomerang', 'neon'],
  esportivo: ['speed_ramp', 'corporate_sharp', 'neon'],
  natal: ['cinematic', 'wedding_soft', 'luxury'],
  carnaval: ['party', 'neon', 'boomerang'],
  cha_revelacao: ['wedding_soft', 'slow_motion', 'cinematic'],
  halloween: ['glitch_flash', 'neon', 'party'],
};

const THEMES: Record<LegacyTemplateCategory, ThemePack[]> = {
  birthday: [
    {
      title: 'Birthday Clip',
      badge: 'HAPPY BIRTHDAY',
      footer: 'CELEBRATION MODE',
      palettes: [['#ff3d8d', '#ffd166', '#38f6ff'], ['#7c3aed', '#ffb703', '#f9fafb']],
      layouts: ['poster_clip', 'confetti_arch', 'sticker_burst', 'polaroid_stack', 'magazine_cover'],
    },
    {
      title: 'Cake Pop',
      badge: 'MAKE A WISH',
      footer: '360 PARTY MOMENT',
      palettes: [['#f43f5e', '#fef08a', '#60a5fa'], ['#fb7185', '#22d3ee', '#fde68a']],
      layouts: ['event_badge', 'ticket_pass', 'photo_strip', 'sticker_burst', 'split_ribbon'],
    },
    {
      title: 'Balloon Room',
      badge: 'BIRTHDAY VIBES',
      footer: 'SMILE SPIN SHARE',
      palettes: [['#ec4899', '#8b5cf6', '#facc15'], ['#0ea5e9', '#f97316', '#f8fafc']],
      layouts: ['snap_filter', 'liquid_waves', 'social_story', 'confetti_arch', 'spotlight_stage'],
    },
  ],
  party: [
    {
      title: 'Neon Club',
      badge: 'PARTY NIGHT',
      footer: 'LIGHTS CAMERA SPIN',
      palettes: [['#ff2d75', '#29f4d5', '#8b5cf6'], ['#00f5ff', '#f000ff', '#f8fafc']],
      layouts: ['neon_corners', 'applay_flow', 'spotlight_stage', 'orbital_focus', 'retro_vhs'],
    },
    {
      title: 'Disco Pulse',
      badge: 'DANCE FLOOR',
      footer: '360 EXPERIENCE',
      palettes: [['#f97316', '#22c55e', '#fef3c7'], ['#111827', '#f6c453', '#a78bfa']],
      layouts: ['confetti_arch', 'event_badge', 'ticket_pass', 'photo_strip', 'liquid_waves'],
    },
    {
      title: 'Festival Glow',
      badge: 'LIVE MOMENT',
      footer: 'POST READY',
      palettes: [['#7c3aed', '#00d4ff', '#f9fafb'], ['#db2777', '#84cc16', '#fefce8']],
      layouts: ['poster_clip', 'neon_corners', 'split_ribbon', 'social_story', 'magazine_cover'],
    },
  ],
  wedding: [
    {
      title: 'Soft Wedding',
      badge: 'JUST MARRIED',
      footer: 'LOVE STORY 360',
      palettes: [['#f8fafc', '#d6b26e', '#f5d0fe'], ['#fff7ed', '#a16207', '#fb7185']],
      layouts: ['floral_crown', 'romantic_lace', 'minimal_luxe', 'polaroid_stack', 'minimal_editorial'],
    },
    {
      title: 'Garden Vows',
      badge: 'LOVE IN MOTION',
      footer: 'FOREVER MOMENT',
      palettes: [['#fef9c3', '#86efac', '#f9a8d4'], ['#f8fafc', '#94a3b8', '#f0abfc']],
      layouts: ['floral_crown', 'snap_filter', 'liquid_waves', 'romantic_lace', 'photo_strip'],
    },
    {
      title: 'Golden Toast',
      badge: 'CELEBRATE LOVE',
      footer: 'ELEGANT CAPTURE',
      palettes: [['#111827', '#facc15', '#f8fafc'], ['#2f1b45', '#f5c76b', '#fde68a']],
      layouts: ['luxury_corners', 'minimal_luxe', 'event_badge', 'geometric_lux', 'ticket_pass'],
    },
  ],
  corporate: [
    {
      title: 'Brand Summit',
      badge: 'BRAND EVENT',
      footer: 'PROFESSIONAL CAPTURE',
      palettes: [['#0f172a', '#38bdf8', '#e2e8f0'], ['#111827', '#a3e635', '#f8fafc']],
      layouts: ['cinematic_band', 'chrome_frame', 'event_badge', 'tech_hud', 'brand_slate'],
    },
    {
      title: 'Launch Grid',
      badge: 'PRODUCT LAUNCH',
      footer: 'READY TO SHARE',
      palettes: [['#020617', '#6366f1', '#f8fafc'], ['#172554', '#22d3ee', '#fefce8']],
      layouts: ['chrome_frame', 'applay_flow', 'minimal_luxe', 'orbital_focus', 'split_ribbon'],
    },
    {
      title: 'Expo Clean',
      badge: 'NETWORKING',
      footer: 'SIX3 360 STUDIO',
      palettes: [['#18181b', '#fafafa', '#60a5fa'], ['#0f172a', '#f59e0b', '#f9fafb']],
      layouts: ['snap_filter', 'cinematic_band', 'chrome_frame', 'tech_hud', 'minimal_editorial'],
    },
  ],
  viral: [
    {
      title: 'Reels Pop',
      badge: 'VIRAL READY',
      footer: 'CUT SPIN POST',
      palettes: [['#ff0050', '#00f2ea', '#f8fafc'], ['#7c3aed', '#22d3ee', '#fef08a']],
      layouts: ['glitch_reel', 'applay_flow', 'neon_corners', 'social_story', 'retro_vhs'],
    },
    {
      title: 'Speed Ramp',
      badge: 'FAST CUT',
      footer: 'AUTO EDIT ENERGY',
      palettes: [['#111827', '#f97316', '#e0f2fe'], ['#18181b', '#a855f7', '#22c55e']],
      layouts: ['applay_flow', 'chrome_frame', 'glitch_reel', 'split_ribbon', 'spotlight_stage'],
    },
    {
      title: 'Creator Frame',
      badge: 'TREND MODE',
      footer: 'SHARE IN SECONDS',
      palettes: [['#0f172a', '#f43f5e', '#38bdf8'], ['#0a0a0a', '#facc15', '#ec4899']],
      layouts: ['event_badge', 'glitch_reel', 'snap_filter', 'magazine_cover', 'orbital_focus'],
    },
  ],
  premium: [
    {
      title: 'Luxury Frame',
      badge: 'PREMIUM NIGHT',
      footer: 'SIGNATURE EXPERIENCE',
      palettes: [['#050505', '#f6c453', '#fef3c7'], ['#160b2f', '#c084fc', '#f8fafc']],
      layouts: ['luxury_corners', 'minimal_luxe', 'cinematic_band', 'geometric_lux', 'minimal_editorial'],
    },
    {
      title: 'Chrome Gala',
      badge: 'VIP MOMENT',
      footer: 'HIGH END CAPTURE',
      palettes: [['#030712', '#93c5fd', '#f8fafc'], ['#111111', '#d4af37', '#e5e7eb']],
      layouts: ['chrome_frame', 'luxury_corners', 'applay_flow', 'orbital_focus', 'brand_slate'],
    },
    {
      title: 'Crystal Glow',
      badge: 'UNLIMITED STYLE',
      footer: 'SIX3 SIGNATURE',
      palettes: [['#1e1b4b', '#67e8f9', '#f5d0fe'], ['#09090b', '#a78bfa', '#fefce8']],
      layouts: ['minimal_luxe', 'neon_corners', 'event_badge', 'geometric_lux', 'liquid_waves'],
    },
  ],
  infantil: [
    {
      title: 'Candy Land',
      badge: 'FESTA KIDS',
      footer: 'MOMENTO MAGICO',
      palettes: [['#f472b6', '#facc15', '#86efac'], ['#818cf8', '#fb923c', '#fde68a']],
      layouts: ['poster_clip', 'confetti_arch', 'sticker_burst', 'liquid_waves', 'snap_filter'],
    },
    {
      title: 'Little Star',
      badge: 'HAPPY BIRTHDAY',
      footer: 'BRILHE MUITO',
      palettes: [['#60a5fa', '#f9a8d4', '#fde68a'], ['#a78bfa', '#34d399', '#fef9c3']],
      layouts: ['sticker_burst', 'orbital_focus', 'polaroid_stack', 'social_story', 'liquid_waves'],
    },
    {
      title: 'Rainbow Fun',
      badge: 'CELEBRACAO',
      footer: 'SMILE AND SPIN',
      palettes: [['#f43f5e', '#22d3ee', '#facc15'], ['#84cc16', '#f97316', '#818cf8']],
      layouts: ['confetti_arch', 'snap_filter', 'magazine_cover', 'ticket_pass', 'sticker_burst'],
    },
  ],
  esportivo: [
    {
      title: 'Arena Night',
      badge: 'GAME DAY',
      footer: 'BORN TO WIN',
      palettes: [['#1e40af', '#fbbf24', '#f8fafc'], ['#991b1b', '#fbbf24', '#f8fafc']],
      layouts: ['spotlight_stage', 'chrome_frame', 'brand_slate', 'ticket_pass', 'cinematic_band'],
    },
    {
      title: 'Champion Cup',
      badge: 'CAMPEONATO',
      footer: 'VITORIA TOTAL',
      palettes: [['#065f46', '#fbbf24', '#f8fafc'], ['#111827', '#ef4444', '#fbbf24']],
      layouts: ['event_badge', 'tech_hud', 'split_ribbon', 'magazine_cover', 'photo_strip'],
    },
    {
      title: 'Energy Rush',
      badge: 'SUPERA LIMITES',
      footer: 'MOVE FASTER NOW',
      palettes: [['#b45309', '#0ea5e9', '#f8fafc'], ['#7c3aed', '#22c55e', '#fef9c3']],
      layouts: ['applay_flow', 'glitch_reel', 'neon_corners', 'orbital_focus', 'sticker_burst'],
    },
  ],
  natal: [
    {
      title: 'Winter Glow',
      badge: 'FELIZ NATAL',
      footer: 'NOITE DE LUZ',
      palettes: [['#b91c1c', '#fbbf24', '#f8fafc'], ['#1e3a5f', '#c0a060', '#f8fafc']],
      layouts: ['floral_crown', 'luxury_corners', 'minimal_luxe', 'romantic_lace', 'geometric_lux'],
    },
    {
      title: 'Festive Gold',
      badge: 'HAPPY NEW YEAR',
      footer: 'CELEBRE CADA MOMENTO',
      palettes: [['#050505', '#d4af37', '#fef3c7'], ['#1a0a2e', '#f6c453', '#f8fafc']],
      layouts: ['luxury_corners', 'geometric_lux', 'minimal_luxe', 'magazine_cover', 'brand_slate'],
    },
    {
      title: 'Silver Eve',
      badge: 'ANO NOVO',
      footer: 'CONTAGEM REGRESSIVA',
      palettes: [['#0f172a', '#94a3b8', '#f8fafc'], ['#0c1a35', '#67e8f9', '#fbbf24']],
      layouts: ['orbital_focus', 'split_ribbon', 'snap_filter', 'sticker_burst', 'spotlight_stage'],
    },
  ],
  carnaval: [
    {
      title: 'Tropical Boom',
      badge: 'CARNAVAL',
      footer: 'ALEGRIA PURA',
      palettes: [['#f97316', '#8b5cf6', '#22d3ee'], ['#f43f5e', '#84cc16', '#fbbf24']],
      layouts: ['confetti_arch', 'sticker_burst', 'poster_clip', 'neon_corners', 'social_story'],
    },
    {
      title: 'Street Party',
      badge: 'FOLIA TOTAL',
      footer: 'BLOCO NA VEIA',
      palettes: [['#16a34a', '#fbbf24', '#1e40af'], ['#dc2626', '#fbbf24', '#1e40af']],
      layouts: ['snap_filter', 'liquid_waves', 'applay_flow', 'split_ribbon', 'magazine_cover'],
    },
    {
      title: 'Samba Night',
      badge: 'FESTA BRASIL',
      footer: 'PURA ENERGIA',
      palettes: [['#b91c1c', '#16a34a', '#fbbf24'], ['#7c3aed', '#f97316', '#fef9c3']],
      layouts: ['glitch_reel', 'ticket_pass', 'event_badge', 'polaroid_stack', 'retro_vhs'],
    },
  ],
  cha_revelacao: [
    {
      title: 'Sweet Reveal',
      badge: 'CHA REVELACAO',
      footer: 'AMOR QUE CHEGA',
      palettes: [['#fbcfe8', '#93c5fd', '#fef9c3'], ['#f9a8d4', '#bfdbfe', '#fde68a']],
      layouts: ['floral_crown', 'romantic_lace', 'liquid_waves', 'orbital_focus', 'minimal_luxe'],
    },
    {
      title: 'Baby Clouds',
      badge: 'BABY SHOWER',
      footer: 'NOVA VIDA',
      palettes: [['#e0f2fe', '#fce7f3', '#fefce8'], ['#ddd6fe', '#fae8ff', '#fef9c3']],
      layouts: ['liquid_waves', 'snap_filter', 'social_story', 'minimal_editorial', 'orbital_focus'],
    },
    {
      title: 'Dream Bundle',
      badge: 'MENINO OU MENINA',
      footer: 'DOCE ESPERA',
      palettes: [['#f8fafc', '#f472b6', '#60a5fa'], ['#fff7ed', '#e879f9', '#38bdf8']],
      layouts: ['romantic_lace', 'polaroid_stack', 'ticket_pass', 'photo_strip', 'geometric_lux'],
    },
  ],
  halloween: [
    {
      title: 'Dark Night',
      badge: 'HALLOWEEN',
      footer: 'HAUNTED MOMENT',
      palettes: [['#1c0030', '#f97316', '#a855f7'], ['#0c0015', '#fb923c', '#8b5cf6']],
      layouts: ['glitch_reel', 'retro_vhs', 'neon_corners', 'orbital_focus', 'chrome_frame'],
    },
    {
      title: 'Haunted Glow',
      badge: 'DARK PARTY',
      footer: 'TRICK OR TREAT',
      palettes: [['#050505', '#f97316', '#86efac'], ['#111827', '#f59e0b', '#a3e635']],
      layouts: ['neon_corners', 'applay_flow', 'glitch_reel', 'spotlight_stage', 'magazine_cover'],
    },
    {
      title: 'Neon Spook',
      badge: 'FESTA FANTASIA',
      footer: 'NOITE ASSOMBRADA',
      palettes: [['#3b0764', '#22d3ee', '#fb923c'], ['#1c1917', '#a855f7', '#f97316']],
      layouts: ['orbital_focus', 'sticker_burst', 'ticket_pass', 'social_story', 'tech_hud'],
    },
  ],
};

const TEMPLATE_IDEA_GROUPS: Partial<Record<TemplateCategory, string[]>> = {
  birthday: [
    'Confete neon com nome e idade',
    'Baloes dourados transparentes',
    'Bolo minimalista no rodape',
    'Moldura Happy Birthday premium',
    'Estrelas e glitter rosa dourado',
    'Tema boteco elegante',
    'Tema infantil colorido clean',
    'Festa de 15 anos com brilho',
    'Aniversario adulto preto e dourado',
    'Pool party azul e branco',
    'Chuva de confetes animados',
    'Fita de cinema meu aniversario',
    'Moldura tropical',
    'Baloes cromados 3D',
    'Tema gamer neon',
    'Tema funk festa sem marcas',
    'Tema anos 80 e 90',
    'Minimal branco com tipografia grande',
    'Moldura com espaco para logo do buffet',
    'Tema luxo com particulas douradas',
  ],
  wedding: [
    'Branco floral elegante',
    'Dourado com iniciais dos noivos',
    'Moldura Save the Moment',
    'Rose gold romantico',
    'Flores aquareladas',
    'Minimal com data no rodape',
    'Classico preto e branco',
    'Luxo dourado com particulas',
    'Jardim boho',
    'Praia casamento tropical',
    'Coracao line art',
    'Moldura com assinatura dos noivos',
    'Chuva de petalas',
    'Recem casados clean',
    'Moldura igreja sofisticada',
    'Festa de casamento neon elegante',
    'Champagne e brilhos',
    'Alianca em traco fino',
    'Moldura para hashtag do casamento',
    'After party dos noivos',
  ],
  corporate: [
    'Moldura com logo da empresa',
    'Lower third com nome do evento',
    'Linha tecnologica azul',
    'Ativacao de marca clean',
    'Lancamento de produto',
    'Convencao anual',
    'Palestra premium',
    'Feirao exposicao',
    'Fundo transparente com grid',
    'Moldura LinkedIn style',
    'Template para patrocinadores',
    'QR de campanha no final',
    'Obrigado por participar',
    'Black corporate',
    'Branco minimal institucional',
    'Tech neon moderado',
    'Premiacao corporativa',
    'Networking event',
    'Template com slogan',
    'Metrica lead capture visual',
  ],
  graduation: [
    'Capelo dourado',
    'Formandos 2026',
    'Curso mais turma',
    'Preto dourado classico',
    'Neon festa de formatura',
    'Glamour com brilho',
    'Moldura com brasao ficticio',
    'Diploma minimal',
    'Chuva de estrelas',
    'Baile de gala',
    'Medicina sem simbolos protegidos',
    'Direito elegante',
    'Engenharia tech',
    'Administracao corporate',
    'Pedagogia leve colorida',
    'Missao cumprida',
    'Turma mais hashtag',
    'After formatura',
    'Tapete vermelho',
    'Moldura para foto video da turma',
  ],
  party: [
    'Neon roxo azul',
    'Laser light',
    'Equalizador animado',
    'Flash strobe moderado',
    'Glitch party',
    'Glow frame',
    'DJ night',
    'After party',
    'Neon tropical',
    'Festa open bar sem marca',
    'Confete metalico',
    'Balada premium black',
    'Beat drops visual',
    'Tonight only',
    'Holographic frame',
    'Smoke fog overlay',
    'LED tunnel',
    'Festa universitaria',
    'Dark club',
    'Sunset party',
  ],
  store: [
    'Grande inauguracao',
    'Moldura com logo da loja',
    'Cupom no rodape',
    'Visite nosso perfil',
    'Vitrine premium',
    'Confete comercial',
    'Lancamento de colecao',
    'Black Friday local',
    'Loja de roupas clean',
    'Barbearia premium',
    'Salao de beleza glam',
    'Academia fitness',
    'Restaurante bar',
    'Cafeteria elegante',
    'Pet shop divertido',
    'Clinica estetica',
    'Stand de shopping',
    'Cliente VIP',
    'Sorteio campanha',
    'Moldura com QR promocional',
  ],
  church: [
    'Encontro de jovens',
    'Conferencia crista clean',
    'Louvor e adoracao',
    'Retiro espiritual',
    'Congresso de mulheres',
    'Congresso de homens',
    'Batismo',
    'Culto especial',
    'Aniversario da igreja',
    'Natal cristao',
    'Pascoa crista',
    'Moldura com versiculo curto autorizado',
    'Minimal branco dourado',
    'Ceu luz suave',
    'Familia na fe',
    'Juventude neon moderado',
    'Evento beneficente',
    'Conferencia de lideranca',
    'Bem vindo',
    'Template com logo da igreja',
  ],
  premium: [
    'Black gold',
    'Champagne particles',
    'Marble white',
    'Diamond shine',
    'Velvet red',
    'Minimal luxury',
    'Gold frame thin',
    'Royal blue',
    'Platinum silver',
    'Luxury gala',
    'VIP night',
    'Red carpet',
    'High fashion',
    'Elegant serif',
    'Black glass',
    'Crystal glow',
    'Golden dust',
    'Premium corporate',
    'Luxury wedding',
    'Signature event',
  ],
  infantil: [
    'Baloes suaves pastel',
    'Arco iris colorido clean',
    'Bichinho fofo generico',
    'Brinquedo minimalista',
    'Festa clean infantil',
    'Astronauta kids',
    'Unicornio sem marca',
    'Dinossauro fofo',
    'Aventura espacial',
    'Fundo candy colorido',
    'Circo clean moderno',
    'Jardim encantado',
    'Bolhas animadas',
    'Estrelas infantis',
    'Aniversario kids premium',
    'Baby blue minimal',
    'Baby pink suave',
    'Safari clean kids',
    'Fazendinha moderna',
    'Super heroi generico',
  ],
  esportivo: [
    'Futebol generico clean',
    'Corrida atletismo',
    'Academia fitness neon',
    'Bike ciclismo',
    'Campeonato trophy',
    'Medalha dourada',
    'Energia fitness motivacional',
    'Scoreboard placar',
    'Torcida celebrate',
    'Trophy night premium',
    'Quadra esportiva',
    'Campo verde arena',
    'Arena iluminada',
    'Esportes radicais',
    'Surf wave',
    'Skate street',
    'Cross training grid',
    'Time vencedor gold',
    'Challenge day neon',
    'Sports neon energy',
  ],
  natal: [
    'Neve suave elegante',
    'Dourado festivo natalino',
    'Feliz Natal clean',
    'Happy New Year premium',
    'Fogos de artificio',
    'Contagem regressiva neon',
    'Arvore natalina minimal',
    'Luzes natalinas douradas',
    'Champagne new year',
    'Vermelho e dourado luxo',
    'Prata e azul moderno',
    'Familia reunida',
    'Confraternizacao empresa',
    'Empresa fim de ano',
    'Reveillon praia',
    'Fogos animados neon',
    'Glitter festivo premium',
    'Estrela natalina dourada',
    'Luxo de ano novo',
    'Welcome 2026 minimal',
  ],
  carnaval: [
    'Confete tropical colorido',
    'Fitas coloridas festa',
    'Samba clean moderno',
    'Bloquinho sem marca',
    'Neon brasilidade vibrante',
    'Festa de rua alegre',
    'Tropical glam premium',
    'Mascara decorativa generica',
    'Carnaval premium luxo',
    'Verao brasileiro energia',
    'Sunset brasileiro tropical',
    'Energia colorida vibrante',
    'Ritmo visual animado',
    'Purpurina brilhante',
    'Abada generico colorido',
    'Micareta neon',
    'Festa tropical premium',
    'Brasil neon colorido',
    'Alegria visual festa',
    'Serpentina animada',
  ],
  cha_revelacao: [
    'Azul e rosa pastel suave',
    'Nuvens suaves bebe',
    'Ursinho generico fofo',
    'Baby shower elegante',
    'Reveal moment premium',
    'Menino ou menina',
    'Baloes pastel suaves',
    'Chuva de coracoes',
    'Estrelinhas bebe',
    'Minimal baby clean',
    'Family love suave',
    'Doce espera elegante',
    'Cha revelacao premium luxo',
    'Nome do bebe minimal',
    'Mamae e papai',
    'Carrinho minimalista',
    'Sapatinhos line art',
    'Confete rosa azul animado',
    'Ceu de bebe pastel',
    'Algodao doce suave',
  ],
  halloween: [
    'Halloween neon escuro',
    'Aboboras genericas neon',
    'Dark party premium',
    'Fog horror leve',
    'Bruxa minimalista',
    'Morcegos voando',
    'Lua cheia dramatica',
    'Caveira decorativa chic',
    'Festa fantasia elegante',
    'Suspense elegante dark',
    'Roxo e laranja neon',
    'Horror clean moderno',
    'Gothic party premium',
    'Spider web dark',
    'Haunted frame escuro',
    'Dark luxury premium',
    'Monster party generico',
    'Glitch horror digital',
    'Sombras animadas misterio',
    'Neon spooky dark',
  ],
};

type TemplateIdea = {
  category: TemplateCategory;
  title: string;
  ideaIndex: number;
};

const TEMPLATE_IDEAS: TemplateIdea[] = Object.entries(TEMPLATE_IDEA_GROUPS).flatMap(([category, titles]) =>
  (titles || []).map((title, ideaIndex) => ({
    category: category as TemplateCategory,
    title,
    ideaIndex,
  }))
);

const LEGACY_GENERATED_TEMPLATE_COUNT = 1440;
const IDEA_COLOR_VARIANTS = [COLOR_VARIANTS[0], COLOR_VARIANTS[3]] as const;
export const GENERATED_TEMPLATE_CATALOG_SIZE = LEGACY_GENERATED_TEMPLATE_COUNT + TEMPLATE_IDEAS.length * ASPECTS.length * IDEA_COLOR_VARIANTS.length;

function aspectSize(aspect: TemplateAspect) {
  if (aspect === '16:9') return { width: 1920, height: 1080 };
  return { width: 1080, height: 1920 };
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function removeTemplateText(svg: string) {
  return svg.replace(/<text\b[^>]*>[\s\S]*?<\/text>/gi, '');
}

function pick<T>(items: readonly T[], index: number) {
  return items[((index % items.length) + items.length) % items.length];
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function fontSize(width: number, aspect: TemplateAspect, scale: number) {
  return Math.round(width * scale * (aspect === '16:9' ? 0.62 : 1));
}

function rotation(index: number, min = -18, max = 18) {
  const span = max - min;
  return min + ((index * 37) % span);
}

function componentFromHex(hex: string, start: number) {
  return Number.parseInt(hex.slice(start, start + 2), 16);
}

function toHex(value: number) {
  return Math.round(Math.max(0, Math.min(255, value))).toString(16).padStart(2, '0');
}

function blendHex(hex: string, target: string, amount: number) {
  const cleanHex = hex.replace('#', '');
  const cleanTarget = target.replace('#', '');
  if (cleanHex.length !== 6 || cleanTarget.length !== 6) return hex;

  const r = componentFromHex(cleanHex, 0) + (componentFromHex(cleanTarget, 0) - componentFromHex(cleanHex, 0)) * amount;
  const g = componentFromHex(cleanHex, 2) + (componentFromHex(cleanTarget, 2) - componentFromHex(cleanHex, 2)) * amount;
  const b = componentFromHex(cleanHex, 4) + (componentFromHex(cleanTarget, 4) - componentFromHex(cleanHex, 4)) * amount;
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function paletteVariant(base: [string, string, string], variantIndex: number): [string, string, string] {
  const [primary, secondary, accent] = base;

  if (variantIndex === 1) {
    return [secondary, primary, blendHex(accent, '#ffffff', 0.2)];
  }

  if (variantIndex === 2) {
    return [blendHex(primary, '#ffffff', 0.34), blendHex(secondary, '#ffffff', 0.28), blendHex(accent, '#ffffff', 0.18)];
  }

  if (variantIndex === 3) {
    return [blendHex(primary, '#020617', 0.34), accent, blendHex(secondary, '#ffffff', 0.12)];
  }

  return base;
}

function templateName(theme: ThemePack, aspectRatio: TemplateAspect, index: number, layout: LayoutKey, variantLabel: string) {
  const suffix = aspectRatio === '16:9' ? 'Landscape' : 'Portrait';
  return `${theme.title} ${LAYOUT_LABELS[layout]} ${suffix} ${variantLabel} ${String(index + 1).padStart(3, '0')}`;
}

function defaultBadge(category: TemplateCategory) {
  const labels: Record<TemplateCategory, string> = {
    birthday: 'HAPPY BIRTHDAY',
    wedding: 'SAVE THE MOMENT',
    corporate: 'BRAND EVENT',
    graduation: 'FORMANDOS',
    party: 'PARTY NIGHT',
    store: 'GRANDE ABERTURA',
    church: 'BEM-VINDO',
    premium: 'VIP MOMENT',
    viral: 'VIRAL READY',
    infantil: 'FESTA KIDS',
    esportivo: 'GAME DAY',
    natal: 'FELIZ NATAL',
    carnaval: 'CARNAVAL',
    cha_revelacao: 'BABY SHOWER',
    halloween: 'HALLOWEEN',
  };
  return labels[category];
}

function ideaFooter(title: string) {
  const normalized = title.toUpperCase().replace(/\s+/g, ' ').trim();
  return normalized.length > 28 ? `${normalized.slice(0, 25)}...` : normalized;
}

function ideaLayout(category: TemplateCategory, title: string, index: number): LayoutKey {
  const text = title.toLowerCase();

  if (/neon|laser|led|gamer|glitch|holographic|tech/.test(text)) return pick(['neon_corners', 'glitch_reel', 'applay_flow', 'tech_hud'], index);
  if (/floral|flores|petalas|jardim|boho|aquarel/.test(text)) return pick(['floral_crown', 'romantic_lace', 'liquid_waves'], index);
  if (/logo|marca|slogan|patrocin|empresa|linkedin|grid|lead|metrica|qr/.test(text)) return pick(['brand_slate', 'tech_hud', 'cinematic_band', 'event_badge'], index);
  if (/luxo|luxury|premium|gold|dourad|champagne|diamond|platinum|velvet|royal|red carpet|gala|vip|black/.test(text)) return pick(['luxury_corners', 'minimal_luxe', 'geometric_lux', 'chrome_frame'], index);
  if (/baloes|confete|glitter|estrelas|chuva|festa|party|tropical|pool/.test(text)) return pick(['confetti_arch', 'sticker_burst', 'poster_clip', 'social_story'], index);
  if (/fita|cinema|anos 80|anos 90|tapete|ticket|after/.test(text)) return pick(['ticket_pass', 'retro_vhs', 'photo_strip', 'magazine_cover'], index);
  if (/minimal|clean|branco|data|rodape|tipografia/.test(text)) return pick(['minimal_editorial', 'minimal_luxe', 'split_ribbon'], index);
  if (/capelo|diploma|formandos|turma|curso|brasao/.test(text)) return pick(['event_badge', 'ticket_pass', 'brand_slate', 'photo_strip'], index);
  if (/loja|cupom|vitrine|perfil|cliente|sorteio|inauguracao|colecao/.test(text)) return pick(['split_ribbon', 'event_badge', 'brand_slate', 'magazine_cover'], index);
  if (/igreja|crista|louvor|adoracao|batismo|culto|retiro|ceu|familia|versiculo/.test(text)) return pick(['romantic_lace', 'minimal_luxe', 'floral_crown', 'orbital_focus'], index);

  const byCategory: Record<TemplateCategory, LayoutKey[]> = {
    birthday: ['confetti_arch', 'poster_clip', 'sticker_burst', 'magazine_cover'],
    wedding: ['floral_crown', 'romantic_lace', 'minimal_luxe', 'luxury_corners'],
    corporate: ['tech_hud', 'brand_slate', 'cinematic_band', 'chrome_frame'],
    graduation: ['event_badge', 'ticket_pass', 'photo_strip', 'geometric_lux'],
    party: ['neon_corners', 'spotlight_stage', 'glitch_reel', 'applay_flow'],
    store: ['split_ribbon', 'brand_slate', 'event_badge', 'social_story'],
    church: ['minimal_luxe', 'romantic_lace', 'orbital_focus', 'floral_crown'],
    premium: ['luxury_corners', 'minimal_luxe', 'geometric_lux', 'chrome_frame'],
    viral: ['glitch_reel', 'applay_flow', 'social_story', 'retro_vhs'],
    infantil: ['confetti_arch', 'sticker_burst', 'liquid_waves', 'social_story'],
    esportivo: ['spotlight_stage', 'chrome_frame', 'brand_slate', 'tech_hud'],
    natal: ['luxury_corners', 'floral_crown', 'minimal_luxe', 'geometric_lux'],
    carnaval: ['confetti_arch', 'neon_corners', 'sticker_burst', 'applay_flow'],
    cha_revelacao: ['romantic_lace', 'floral_crown', 'liquid_waves', 'orbital_focus'],
    halloween: ['glitch_reel', 'retro_vhs', 'neon_corners', 'orbital_focus'],
  };

  return pick(byCategory[category], index);
}

function ideaPalettes(category: TemplateCategory, title: string): [string, string, string][] {
  const text = title.toLowerCase();

  if (/black|preto|gold|dourad/.test(text)) return [['#050505', '#d4af37', '#fff7d6'], ['#111827', '#facc15', '#f8fafc']];
  if (/neon|laser|led|gamer|glitch/.test(text)) return [['#7c3aed', '#00d4ff', '#ff2d75'], ['#111827', '#8b5cf6', '#22d3ee']];
  if (/rose|romant|floral|flores|petalas|casamento|wedding/.test(text)) return [['#fff7ed', '#d6b26e', '#f5d0fe'], ['#f8fafc', '#fb7185', '#fef3c7']];
  if (/pool|praia|tropical|sunset|ceu/.test(text)) return [['#0ea5e9', '#f8fafc', '#facc15'], ['#22d3ee', '#2563eb', '#fff7ed']];
  if (/tech|corporate|empresa|linkedin|grid|engenharia/.test(text)) return [['#0f172a', '#38bdf8', '#e2e8f0'], ['#020617', '#6366f1', '#f8fafc']];
  if (/igreja|crista|louvor|batismo|culto|familia|fe/.test(text)) return [['#f8fafc', '#d6b26e', '#93c5fd'], ['#fff7ed', '#facc15', '#e0f2fe']];
  if (/loja|cupom|vitrine|barbearia|salao|academia|cafeteria|pet/.test(text)) return [['#111827', '#38bdf8', '#f8fafc'], ['#f97316', '#111827', '#fef3c7']];

  const defaults: Record<TemplateCategory, [string, string, string][]> = {
    birthday: [['#ff3d8d', '#ffd166', '#38f6ff'], ['#7c3aed', '#ffb703', '#f9fafb']],
    wedding: [['#f8fafc', '#d6b26e', '#f5d0fe'], ['#fff7ed', '#a16207', '#fb7185']],
    corporate: [['#0f172a', '#38bdf8', '#e2e8f0'], ['#111827', '#a3e635', '#f8fafc']],
    graduation: [['#111827', '#d4af37', '#f8fafc'], ['#7c3aed', '#facc15', '#fef3c7']],
    party: [['#ff2d75', '#29f4d5', '#8b5cf6'], ['#00f5ff', '#f000ff', '#f8fafc']],
    store: [['#f97316', '#111827', '#fef3c7'], ['#22c55e', '#0f172a', '#f8fafc']],
    church: [['#f8fafc', '#d6b26e', '#93c5fd'], ['#1e3a8a', '#facc15', '#f8fafc']],
    premium: [['#050505', '#f6c453', '#fef3c7'], ['#160b2f', '#c084fc', '#f8fafc']],
    viral: [['#ff0050', '#00f2ea', '#f8fafc'], ['#7c3aed', '#22d3ee', '#fef08a']],
    infantil: [['#f472b6', '#facc15', '#86efac'], ['#818cf8', '#fb923c', '#fde68a']],
    esportivo: [['#1e40af', '#fbbf24', '#f8fafc'], ['#991b1b', '#fbbf24', '#f8fafc']],
    natal: [['#b91c1c', '#fbbf24', '#f8fafc'], ['#050505', '#d4af37', '#fef3c7']],
    carnaval: [['#f97316', '#8b5cf6', '#22d3ee'], ['#f43f5e', '#84cc16', '#fbbf24']],
    cha_revelacao: [['#fbcfe8', '#93c5fd', '#fef9c3'], ['#f8fafc', '#f472b6', '#60a5fa']],
    halloween: [['#1c0030', '#f97316', '#a855f7'], ['#050505', '#f97316', '#86efac']],
  };

  return defaults[category];
}

function ideaTheme(idea: TemplateIdea): ThemePack {
  const layout = ideaLayout(idea.category, idea.title, idea.ideaIndex);
  return {
    title: idea.title,
    badge: defaultBadge(idea.category),
    footer: ideaFooter(idea.title),
    palettes: ideaPalettes(idea.category, idea.title),
    layouts: [layout],
  };
}

type TemplateContext = {
  width: number;
  height: number;
  aspectRatio: TemplateAspect;
  category: TemplateCategory;
  theme: ThemePack;
  layout: LayoutKey;
  primary: string;
  secondary: string;
  accent: string;
  index: number;
  margin: number;
  stroke: number;
  bandHeight: number;
};

function lineFrame(ctx: TemplateContext) {
  const { width, height, margin, stroke } = ctx;
  const c = Math.round(Math.min(width, height) * 0.115);
  const sw = Math.max(5, Math.round(stroke * 0.72));
  const m = margin;
  const x2 = width - m;
  const y2 = height - m;
  const paths = [
    `M${m + c} ${m} H${m} V${m + c}`,
    `M${x2 - c} ${m} H${x2} V${m + c}`,
    `M${m} ${y2 - c} V${y2} H${m + c}`,
    `M${x2} ${y2 - c} V${y2} H${x2 - c}`,
  ];

  return `
  <g filter="url(#softGlow)" opacity="0.96">
    ${paths.map((d) => `<path d="${d}" fill="none" stroke="url(#strokeGradient)" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}
  </g>`;
}

function badge(ctx: TemplateContext, compact = false) {
  const { width, height, margin, bandHeight, theme, aspectRatio, primary, secondary } = ctx;
  const isLandscape = aspectRatio === '16:9';
  const badgeWidth = isLandscape ? Math.round(width * 0.36) : Math.round(width * 0.68);
  const badgeHeight = compact ? Math.round(bandHeight * 0.46) : Math.round(bandHeight * 0.58);
  const x = Math.round((width - badgeWidth) / 2);
  const y = Math.round(height - margin - badgeHeight - (compact ? bandHeight * 0.12 : bandHeight * 0.2));
  const titleSize = fontSize(width, aspectRatio, compact ? 0.027 : 0.033);
  const footerSize = fontSize(width, aspectRatio, 0.015);

  return `
  <g filter="url(#shadow)">
    <rect x="${x}" y="${y}" width="${badgeWidth}" height="${badgeHeight}" rx="${Math.round(badgeHeight / 2)}" fill="#050505" opacity="0.58"/>
    <rect x="${x + strokeUnit(ctx)}" y="${y + strokeUnit(ctx)}" width="${badgeWidth - strokeUnit(ctx) * 2}" height="${badgeHeight - strokeUnit(ctx) * 2}" rx="${Math.round(badgeHeight / 2)}" fill="none" stroke="url(#strokeGradient)" stroke-width="${Math.max(2, Math.round(ctx.stroke * 0.22))}" opacity="0.82"/>
    <text x="${width / 2}" y="${y + badgeHeight * 0.57}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="${titleSize}" font-weight="900" fill="#ffffff" letter-spacing="0">${escapeXml(theme.badge)}</text>
    <text x="${width / 2}" y="${y + badgeHeight + footerSize * 1.45}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="${footerSize}" font-weight="800" fill="${secondary}" opacity="0.92" letter-spacing="0">${escapeXml(theme.footer)}</text>
    <circle cx="${x + badgeHeight * 0.58}" cy="${y + badgeHeight / 2}" r="${badgeHeight * 0.16}" fill="${primary}" opacity="0.95"/>
    <circle cx="${x + badgeWidth - badgeHeight * 0.58}" cy="${y + badgeHeight / 2}" r="${badgeHeight * 0.16}" fill="${secondary}" opacity="0.95"/>
  </g>`;
}

function strokeUnit(ctx: TemplateContext) {
  return Math.max(2, Math.round(ctx.stroke * 0.18));
}

function topRibbon(ctx: TemplateContext) {
  const { width, height, margin, bandHeight, aspectRatio, primary, secondary, accent } = ctx;
  const h = Math.round(bandHeight * (aspectRatio === '16:9' ? 0.7 : 0.78));
  const y = margin * 0.78;
  const skew = aspectRatio === '16:9' ? width * 0.055 : width * 0.095;
  const label = aspectRatio === '16:9' ? 'SIX3 360' : 'SIX3°';

  return `
  <g filter="url(#shadow)">
    <path d="M${margin + skew} ${y} H${width - margin - skew} L${width - margin} ${y + h * 0.48} L${width - margin - skew} ${y + h} H${margin + skew} L${margin} ${y + h * 0.48} Z" fill="#050505" opacity="0.5"/>
    <path d="M${margin + skew * 1.35} ${y + h * 0.12} H${width - margin - skew * 1.35}" stroke="url(#strokeGradient)" stroke-width="${Math.max(3, ctx.stroke * 0.32)}" stroke-linecap="round" opacity="0.92"/>
    <text x="${width / 2}" y="${y + h * 0.66}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="${fontSize(width, aspectRatio, 0.022)}" font-weight="900" fill="${accent}" letter-spacing="0">${label}</text>
    <path d="M${margin + skew * 1.35} ${y + h * 0.86} H${width - margin - skew * 1.35}" stroke="${secondary}" stroke-width="${Math.max(2, ctx.stroke * 0.18)}" stroke-linecap="round" opacity="0.62"/>
  </g>`;
}

function confetti(ctx: TemplateContext, count: number, region: 'top' | 'bottom' | 'sides' = 'top') {
  const { width, height, margin, primary, secondary, accent, index } = ctx;
  const colors = [primary, secondary, accent, '#ffffff'];
  const items = Array.from({ length: count }, (_, i) => {
    const color = colors[(index + i) % colors.length];
    const size = Math.max(8, Math.round(Math.min(width, height) * (0.007 + (i % 4) * 0.002)));
    const side = i % 2 === 0 ? 1 : -1;
    let x = margin + ((i * 83 + index * 17) % Math.round(width - margin * 2));
    let y = margin + ((i * 47 + index * 23) % Math.round(height * 0.16));

    if (region === 'bottom') y = height - margin - ((i * 49 + index * 19) % Math.round(height * 0.17));
    if (region === 'sides') {
      x = side > 0 ? margin * 0.85 + ((i * 13) % Math.round(width * 0.1)) : width - margin * 0.85 - ((i * 13) % Math.round(width * 0.1));
      y = margin + ((i * 97 + index * 11) % Math.round(height - margin * 2));
    }

    if (i % 5 === 0) {
      return `<circle cx="${round(x)}" cy="${round(y)}" r="${size * 0.42}" fill="${color}" opacity="0.86"/>`;
    }

    return `<rect x="${round(x)}" y="${round(y)}" width="${size * 0.54}" height="${size * 1.3}" rx="${size * 0.18}" fill="${color}" opacity="0.82" transform="rotate(${rotation(index + i)} ${round(x)} ${round(y)})"/>`;
  });

  return `<g>${items.join('')}</g>`;
}

function sparkles(ctx: TemplateContext, count: number) {
  const { width, height, margin, primary, secondary, accent, index } = ctx;
  const colors = [accent, secondary, primary, '#ffffff'];

  return `<g>${Array.from({ length: count }, (_, i) => {
    const side = i % 2 === 0 ? 1 : -1;
    const x = side > 0
      ? margin + ((i * 43 + index * 11) % Math.round(width * 0.2))
      : width - margin - ((i * 43 + index * 11) % Math.round(width * 0.2));
    const y = margin + ((i * 89 + index * 29) % Math.round(height - margin * 2));
    const r = Math.max(9, Math.round(Math.min(width, height) * (0.012 + (i % 3) * 0.004)));
    const color = colors[(i + index) % colors.length];

    return `<path d="M${x} ${y - r} L${x + r * 0.28} ${y - r * 0.28} L${x + r} ${y} L${x + r * 0.28} ${y + r * 0.28} L${x} ${y + r} L${x - r * 0.28} ${y + r * 0.28} L${x - r} ${y} L${x - r * 0.28} ${y - r * 0.28} Z" fill="${color}" opacity="${0.58 + (i % 3) * 0.1}"/>`;
  }).join('')}</g>`;
}

function balloonCluster(ctx: TemplateContext) {
  const { width, height, margin, primary, secondary, accent, aspectRatio, index } = ctx;
  const scale = aspectRatio === '16:9' ? height * 0.09 : width * 0.13;
  const yBase = aspectRatio === '16:9' ? margin + scale * 1.2 : margin + scale * 1.45;
  const clusters = [
    { x: margin + scale * 0.75, y: yBase, color: primary },
    { x: margin + scale * 1.55, y: yBase + scale * 0.28, color: secondary },
    { x: width - margin - scale * 0.75, y: yBase, color: secondary },
    { x: width - margin - scale * 1.55, y: yBase + scale * 0.24, color: accent },
  ];

  return `<g>
    ${clusters.map((b, i) => `
      <ellipse cx="${round(b.x)}" cy="${round(b.y)}" rx="${round(scale * 0.42)}" ry="${round(scale * 0.56)}" fill="${b.color}" opacity="${0.78 + (i % 2) * 0.12}" filter="url(#softGlow)"/>
      <path d="M${round(b.x)} ${round(b.y + scale * 0.56)} C${round(b.x + (i % 2 ? -1 : 1) * scale * 0.18)} ${round(b.y + scale * 0.95)}, ${round(b.x + (i % 2 ? 1 : -1) * scale * 0.12)} ${round(b.y + scale * 1.28)}, ${round(b.x)} ${round(b.y + scale * 1.62)}" fill="none" stroke="${accent}" stroke-width="${Math.max(2, ctx.stroke * 0.08)}" opacity="0.32"/>
    `).join('')}
    <circle cx="${margin + scale * 0.55 + (index % 4) * 10}" cy="${height - margin - scale * 0.55}" r="${scale * 0.16}" fill="${accent}" opacity="0.76"/>
    <circle cx="${width - margin - scale * 0.55}" cy="${height - margin - scale * 0.72}" r="${scale * 0.12}" fill="${primary}" opacity="0.72"/>
  </g>`;
}

function cakeIcon(ctx: TemplateContext) {
  const { width, height, margin, primary, secondary, accent, aspectRatio } = ctx;
  const s = aspectRatio === '16:9' ? height * 0.1 : width * 0.14;
  const x = width - margin - s * 1.35;
  const y = height - margin - s * 1.65;

  return `<g filter="url(#shadow)" opacity="0.92">
    <rect x="${x}" y="${y + s * 0.55}" width="${s * 1.2}" height="${s * 0.58}" rx="${s * 0.12}" fill="${primary}"/>
    <path d="M${x} ${y + s * 0.72} C${x + s * 0.22} ${y + s * 0.48}, ${x + s * 0.4} ${y + s * 0.9}, ${x + s * 0.62} ${y + s * 0.68} C${x + s * 0.84} ${y + s * 0.44}, ${x + s} ${y + s * 0.88}, ${x + s * 1.2} ${y + s * 0.62} V${y + s * 0.86} H${x} Z" fill="${secondary}" opacity="0.95"/>
    <rect x="${x + s * 0.52}" y="${y + s * 0.2}" width="${s * 0.12}" height="${s * 0.35}" rx="${s * 0.06}" fill="#ffffff"/>
    <path d="M${x + s * 0.58} ${y + s * 0.16} C${x + s * 0.47} ${y + s * 0.02}, ${x + s * 0.69} ${y + s * 0.02}, ${x + s * 0.58} ${y + s * 0.16}" fill="${accent}"/>
  </g>`;
}

function graduationMark(ctx: TemplateContext) {
  const { width, height, margin, primary, secondary, accent, aspectRatio } = ctx;
  const s = aspectRatio === '16:9' ? height * 0.13 : width * 0.17;
  const x = margin + s * 0.65;
  const y = margin + s * 0.7;

  return `<g filter="url(#shadow)" opacity="0.92">
    <path d="M${x} ${y} L${x + s * 1.25} ${y - s * 0.42} L${x + s * 2.5} ${y} L${x + s * 1.25} ${y + s * 0.42} Z" fill="${primary}" opacity="0.9"/>
    <path d="M${x + s * 0.7} ${y + s * 0.28} C${x + s * 0.95} ${y + s * 0.62}, ${x + s * 1.55} ${y + s * 0.62}, ${x + s * 1.8} ${y + s * 0.28} V${y + s * 0.82} C${x + s * 1.38} ${y + s * 1.05}, ${x + s * 1.12} ${y + s * 1.05}, ${x + s * 0.7} ${y + s * 0.82} Z" fill="${secondary}" opacity="0.9"/>
    <path d="M${x + s * 1.25} ${y} V${y + s * 1.2}" stroke="${accent}" stroke-width="${Math.max(3, ctx.stroke * 0.14)}" stroke-linecap="round"/>
    <circle cx="${x + s * 1.25}" cy="${y + s * 1.32}" r="${s * 0.12}" fill="${accent}"/>
    <rect x="${width - margin - s * 1.2}" y="${height - margin - s * 0.9}" width="${s * 1.1}" height="${s * 0.72}" rx="${s * 0.08}" fill="#ffffff" opacity="0.14" stroke="${secondary}" stroke-width="${Math.max(3, ctx.stroke * 0.12)}"/>
    <path d="M${width - margin - s * 1.03} ${height - margin - s * 0.54} H${width - margin - s * 0.28}" stroke="${accent}" stroke-width="${Math.max(2, ctx.stroke * 0.08)}" opacity="0.72"/>
  </g>`;
}

function storeMark(ctx: TemplateContext) {
  const { width, height, margin, primary, secondary, accent, aspectRatio } = ctx;
  const s = aspectRatio === '16:9' ? height * 0.12 : width * 0.16;
  const x = width - margin - s * 2.35;
  const y = margin + s * 0.75;

  return `<g filter="url(#shadow)" opacity="0.9">
    <path d="M${x} ${y + s * 0.52} H${x + s * 2.1} L${x + s * 1.82} ${y} H${x + s * 0.28} Z" fill="#050505" opacity="0.48" stroke="${secondary}" stroke-width="${Math.max(3, ctx.stroke * 0.12)}"/>
    ${Array.from({ length: 5 }, (_, i) => {
      const sx = x + (i * s * 2.1) / 5;
      const fill = i % 2 ? secondary : primary;
      return `<path d="M${sx} ${y + s * 0.52} H${sx + s * 0.42} V${y + s * 0.72} C${sx + s * 0.36} ${y + s * 0.92}, ${sx + s * 0.06} ${y + s * 0.92}, ${sx} ${y + s * 0.72} Z" fill="${fill}" opacity="0.8"/>`;
    }).join('')}
    <rect x="${x + s * 0.22}" y="${y + s * 0.86}" width="${s * 1.66}" height="${s * 0.88}" rx="${s * 0.1}" fill="#ffffff" opacity="0.1" stroke="${accent}" stroke-width="${Math.max(3, ctx.stroke * 0.1)}"/>
    <path d="M${margin} ${height - margin - s * 0.55} H${margin + s * 1.34}" stroke="${primary}" stroke-width="${Math.max(4, ctx.stroke * 0.2)}" stroke-linecap="round"/>
    <rect x="${margin}" y="${height - margin - s * 0.92}" width="${s * 1.44}" height="${s * 0.52}" rx="${s * 0.1}" fill="#050505" opacity="0.42" stroke="${secondary}" stroke-width="${Math.max(2, ctx.stroke * 0.08)}"/>
    <text x="${margin + s * 0.72}" y="${height - margin - s * 0.58}" text-anchor="middle" font-size="${fontSize(width, aspectRatio, 0.016)}" font-weight="900" fill="${accent}">VIP</text>
  </g>`;
}

function churchMark(ctx: TemplateContext) {
  const { width, height, margin, primary, secondary, accent, aspectRatio } = ctx;
  const s = aspectRatio === '16:9' ? height * 0.12 : width * 0.16;
  const cx = width - margin - s * 1.1;
  const cy = margin + s * 1.1;

  return `<g filter="url(#softGlow)" opacity="0.88">
    <path d="M${cx} ${cy - s * 0.72} V${cy + s * 0.72}" stroke="${secondary}" stroke-width="${Math.max(4, ctx.stroke * 0.2)}" stroke-linecap="round"/>
    <path d="M${cx - s * 0.42} ${cy - s * 0.24} H${cx + s * 0.42}" stroke="${secondary}" stroke-width="${Math.max(4, ctx.stroke * 0.2)}" stroke-linecap="round"/>
    <path d="M${cx - s * 0.9} ${cy + s * 0.72} C${cx - s * 0.58} ${cy + s * 0.22}, ${cx + s * 0.58} ${cy + s * 0.22}, ${cx + s * 0.9} ${cy + s * 0.72}" fill="none" stroke="${primary}" stroke-width="${Math.max(3, ctx.stroke * 0.15)}" stroke-linecap="round"/>
    <path d="M${margin} ${height - margin - s * 0.48} C${width * 0.28} ${height - margin - s * 1.08}, ${width * 0.72} ${height - margin + s * 0.12}, ${width - margin} ${height - margin - s * 0.48}" fill="none" stroke="${accent}" stroke-width="${Math.max(3, ctx.stroke * 0.13)}" stroke-linecap="round" opacity="0.6"/>
    ${Array.from({ length: 8 }, (_, i) => {
      const x = margin + (i * (width - margin * 2)) / 7;
      const y = margin + Math.sin(i * 1.2) * s * 0.18;
      return `<circle cx="${round(x)}" cy="${round(y)}" r="${round(s * 0.055)}" fill="${i % 2 ? secondary : accent}" opacity="0.5"/>`;
    }).join('')}
  </g>`;
}

function flowerCluster(ctx: TemplateContext, x: number, y: number, scale: number, flip = 1) {
  const { primary, secondary, accent } = ctx;
  const flower = (fx: number, fy: number, r: number, color: string) => `
    <g transform="translate(${round(fx)} ${round(fy)})">
      ${Array.from({ length: 6 }, (_, i) => `<ellipse cx="${Math.cos((Math.PI * 2 * i) / 6) * r * 0.72}" cy="${Math.sin((Math.PI * 2 * i) / 6) * r * 0.72}" rx="${r * 0.42}" ry="${r * 0.68}" fill="${color}" opacity="0.82" transform="rotate(${i * 60})"/>`).join('')}
      <circle cx="0" cy="0" r="${r * 0.34}" fill="${accent}" opacity="0.95"/>
    </g>`;

  return `<g filter="url(#shadow)" opacity="0.92" transform="scale(${flip} 1) translate(${flip < 0 ? -x * 2 : 0} 0)">
    <path d="M${x} ${y + scale * 1.2} C${x + scale * 0.8} ${y + scale * 0.35}, ${x + scale * 1.9} ${y + scale * 0.28}, ${x + scale * 2.55} ${y}" fill="none" stroke="${secondary}" stroke-width="${Math.max(3, ctx.stroke * 0.2)}" stroke-linecap="round" opacity="0.72"/>
    <path d="M${x + scale * 0.35} ${y + scale * 0.95} C${x + scale * 0.62} ${y + scale * 0.62}, ${x + scale * 0.92} ${y + scale * 0.62}, ${x + scale * 1.12} ${y + scale * 0.9}" fill="none" stroke="${primary}" stroke-width="${Math.max(2, ctx.stroke * 0.14)}" stroke-linecap="round" opacity="0.72"/>
    ${flower(x + scale * 0.22, y + scale * 1.18, scale * 0.28, primary)}
    ${flower(x + scale * 1.08, y + scale * 0.58, scale * 0.22, secondary)}
    ${flower(x + scale * 2.02, y + scale * 0.22, scale * 0.18, '#ffffff')}
    <ellipse cx="${x + scale * 1.52}" cy="${y + scale * 0.55}" rx="${scale * 0.32}" ry="${scale * 0.12}" fill="${secondary}" opacity="0.65" transform="rotate(-32 ${x + scale * 1.52} ${y + scale * 0.55})"/>
  </g>`;
}

function rings(ctx: TemplateContext) {
  const { width, height, margin, secondary, accent, aspectRatio } = ctx;
  const r = aspectRatio === '16:9' ? height * 0.045 : width * 0.055;
  const x = width - margin - r * 2.4;
  const y = margin + r * 2.2;

  return `<g filter="url(#softGlow)" opacity="0.86">
    <circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${secondary}" stroke-width="${Math.max(5, ctx.stroke * 0.35)}"/>
    <circle cx="${x + r * 0.92}" cy="${y + r * 0.18}" r="${r}" fill="none" stroke="${accent}" stroke-width="${Math.max(5, ctx.stroke * 0.35)}"/>
    <path d="M${x + r * 0.42} ${y - r * 1.18} L${x + r * 0.74} ${y - r * 1.58} L${x + r * 1.06} ${y - r * 1.18} Z" fill="${accent}"/>
  </g>`;
}

function equalizer(ctx: TemplateContext) {
  const { width, height, margin, bandHeight, primary, secondary, accent, aspectRatio, index } = ctx;
  const bars = aspectRatio === '16:9' ? 46 : 28;
  const maxH = bandHeight * 0.55;
  const y = height - margin - maxH * 0.55;
  const w = (width - margin * 2) / bars;

  return `<g opacity="0.88">${Array.from({ length: bars }, (_, i) => {
    const h = maxH * (0.28 + (((i * 17 + index * 11) % 100) / 100) * 0.72);
    const color = i % 3 === 0 ? primary : i % 3 === 1 ? secondary : accent;
    return `<rect x="${round(margin + i * w)}" y="${round(y - h / 2)}" width="${Math.max(3, w * 0.42)}" height="${round(h)}" rx="${Math.max(2, w * 0.18)}" fill="${color}" opacity="${0.36 + (i % 4) * 0.13}"/>`;
  }).join('')}</g>`;
}

function glitchBars(ctx: TemplateContext) {
  const { width, height, margin, primary, secondary, accent, aspectRatio, index } = ctx;
  const rows = aspectRatio === '16:9' ? 9 : 12;
  const sideW = aspectRatio === '16:9' ? width * 0.12 : width * 0.18;
  const colors = [primary, secondary, accent, '#ffffff'];

  return `<g filter="url(#softGlow)">${Array.from({ length: rows }, (_, i) => {
    const h = Math.max(8, Math.round(height * (0.008 + (i % 3) * 0.006)));
    const y = margin + ((i * 137 + index * 29) % Math.round(height - margin * 2));
    const leftW = sideW * (0.45 + ((i * 13) % 55) / 100);
    const rightW = sideW * (0.45 + ((i * 19) % 55) / 100);
    const color = colors[(i + index) % colors.length];

    return `
      <rect x="${margin}" y="${y}" width="${round(leftW)}" height="${h}" rx="${h / 2}" fill="${color}" opacity="${0.48 + (i % 4) * 0.1}"/>
      <rect x="${round(width - margin - rightW)}" y="${round(y + h * 1.75)}" width="${round(rightW)}" height="${h}" rx="${h / 2}" fill="${colors[(i + index + 1) % colors.length]}" opacity="${0.42 + (i % 4) * 0.1}"/>
    `;
  }).join('')}</g>`;
}

function chromeCurves(ctx: TemplateContext) {
  const { width, height, margin, primary, secondary, accent, aspectRatio } = ctx;
  const sw = Math.max(6, Math.round(ctx.stroke * (aspectRatio === '16:9' ? 0.5 : 0.62)));
  const top = margin + ctx.bandHeight * 0.25;
  const bottom = height - margin - ctx.bandHeight * 0.25;

  return `<g fill="none" filter="url(#softGlow)" opacity="0.82">
    <path d="M${margin} ${top} C${width * 0.18} ${top + ctx.bandHeight * 0.45}, ${width * 0.31} ${margin}, ${width * 0.47} ${top + ctx.bandHeight * 0.12}" stroke="${primary}" stroke-width="${sw}" stroke-linecap="round"/>
    <path d="M${width - margin} ${bottom} C${width * 0.82} ${bottom - ctx.bandHeight * 0.45}, ${width * 0.69} ${height - margin}, ${width * 0.53} ${bottom - ctx.bandHeight * 0.12}" stroke="${secondary}" stroke-width="${sw}" stroke-linecap="round"/>
    <path d="M${width - margin * 1.25} ${top + ctx.bandHeight * 0.18} C${width * 0.78} ${top - ctx.bandHeight * 0.18}, ${width * 0.62} ${top + ctx.bandHeight * 0.42}, ${width * 0.48} ${top}" stroke="${accent}" stroke-width="${Math.max(3, sw * 0.42)}" stroke-linecap="round" opacity="0.72"/>
  </g>`;
}

function luxuryOrnaments(ctx: TemplateContext) {
  const { width, height, margin, secondary, accent, aspectRatio } = ctx;
  const s = aspectRatio === '16:9' ? height * 0.07 : width * 0.09;
  const diamond = (x: number, y: number, r: number) => `<path d="M${x} ${y - r} L${x + r} ${y} L${x} ${y + r} L${x - r} ${y} Z" fill="none" stroke="${secondary}" stroke-width="${Math.max(3, ctx.stroke * 0.2)}" opacity="0.82"/>`;

  return `<g filter="url(#shadow)" opacity="0.92">
    ${diamond(width / 2, margin + s * 0.7, s * 0.28)}
    ${diamond(width / 2, height - margin - s * 0.7, s * 0.28)}
    <path d="M${margin + s * 0.1} ${margin + s * 1.4} C${margin + s * 0.9} ${margin + s * 0.35}, ${margin + s * 1.7} ${margin + s * 1.78}, ${margin + s * 2.4} ${margin + s * 0.82}" fill="none" stroke="${accent}" stroke-width="${Math.max(3, ctx.stroke * 0.18)}" stroke-linecap="round"/>
    <path d="M${width - margin - s * 0.1} ${margin + s * 1.4} C${width - margin - s * 0.9} ${margin + s * 0.35}, ${width - margin - s * 1.7} ${margin + s * 1.78}, ${width - margin - s * 2.4} ${margin + s * 0.82}" fill="none" stroke="${accent}" stroke-width="${Math.max(3, ctx.stroke * 0.18)}" stroke-linecap="round"/>
    <circle cx="${margin + s * 0.5}" cy="${height - margin - s * 0.5}" r="${s * 0.2}" fill="${secondary}" opacity="0.72"/>
    <circle cx="${width - margin - s * 0.5}" cy="${height - margin - s * 0.5}" r="${s * 0.2}" fill="${secondary}" opacity="0.72"/>
  </g>`;
}

function corporateGrid(ctx: TemplateContext) {
  const { width, height, margin, primary, secondary, aspectRatio } = ctx;
  const rows = aspectRatio === '16:9' ? 4 : 7;
  const cols = aspectRatio === '16:9' ? 9 : 5;
  const gridW = aspectRatio === '16:9' ? width * 0.18 : width * 0.2;
  const gridH = aspectRatio === '16:9' ? height * 0.16 : height * 0.18;
  const startX = width - margin - gridW;
  const startY = margin + ctx.bandHeight * 0.15;

  return `<g opacity="0.62">
    ${Array.from({ length: rows + 1 }, (_, i) => `<path d="M${startX} ${startY + (gridH / rows) * i} H${startX + gridW}" stroke="${secondary}" stroke-width="2" opacity="0.45"/>`).join('')}
    ${Array.from({ length: cols + 1 }, (_, i) => `<path d="M${startX + (gridW / cols) * i} ${startY} V${startY + gridH}" stroke="${primary}" stroke-width="2" opacity="0.36"/>`).join('')}
  </g>`;
}

function sideRails(ctx: TemplateContext) {
  const { width, height, margin, primary, secondary, aspectRatio } = ctx;
  const rail = aspectRatio === '16:9' ? height * 0.065 : width * 0.08;
  const opacity = 0.66;

  return `<g filter="url(#shadow)" opacity="${opacity}">
    <path d="M${margin * 0.55} ${height * 0.24} C${margin + rail * 0.75} ${height * 0.38}, ${margin + rail * 0.75} ${height * 0.62}, ${margin * 0.55} ${height * 0.76}" fill="none" stroke="${primary}" stroke-width="${rail * 0.22}" stroke-linecap="round"/>
    <path d="M${width - margin * 0.55} ${height * 0.24} C${width - margin - rail * 0.75} ${height * 0.38}, ${width - margin - rail * 0.75} ${height * 0.62}, ${width - margin * 0.55} ${height * 0.76}" fill="none" stroke="${secondary}" stroke-width="${rail * 0.22}" stroke-linecap="round"/>
  </g>`;
}

function eventDots(ctx: TemplateContext) {
  const { width, height, margin, primary, secondary, accent, aspectRatio, index } = ctx;
  const dots = aspectRatio === '16:9' ? 20 : 24;
  const colors = [primary, secondary, accent];

  return `<g>${Array.from({ length: dots }, (_, i) => {
    const side = i % 2 === 0 ? margin + ((i * 31) % Math.round(width * 0.18)) : width - margin - ((i * 31) % Math.round(width * 0.18));
    const y = margin + ((i * 71 + index * 17) % Math.round(height - margin * 2));
    const r = Math.max(4, Math.round(Math.min(width, height) * (0.006 + (i % 4) * 0.003)));
    return `<circle cx="${side}" cy="${y}" r="${r}" fill="${colors[(i + index) % colors.length]}" opacity="${0.35 + (i % 4) * 0.12}"/>`;
  }).join('')}</g>`;
}

function posterStrips(ctx: TemplateContext) {
  const { width, height, margin, primary, secondary, accent, aspectRatio } = ctx;
  const stripH = aspectRatio === '16:9' ? height * 0.075 : height * 0.052;
  const yTop = margin * 0.72;
  const yBottom = height - margin - stripH * 1.15;

  return `<g filter="url(#shadow)">
    <rect x="${margin * 0.72}" y="${yTop}" width="${width * 0.32}" height="${stripH}" rx="${stripH * 0.24}" fill="${primary}" opacity="0.88" transform="rotate(-4 ${margin * 0.72} ${yTop})"/>
    <rect x="${width - margin * 0.72 - width * 0.32}" y="${yTop + stripH * 0.16}" width="${width * 0.32}" height="${stripH}" rx="${stripH * 0.24}" fill="${secondary}" opacity="0.88" transform="rotate(4 ${width - margin * 0.72} ${yTop})"/>
    <rect x="${margin * 0.88}" y="${yBottom}" width="${width - margin * 1.76}" height="${stripH * 1.1}" rx="${stripH * 0.32}" fill="#050505" opacity="0.5"/>
    <path d="M${margin * 1.12} ${yBottom + stripH * 0.55} H${width - margin * 1.12}" stroke="${accent}" stroke-width="${Math.max(3, ctx.stroke * 0.22)}" stroke-linecap="round" opacity="0.78"/>
  </g>`;
}

function polaroidStack(ctx: TemplateContext) {
  const { width, height, margin, primary, secondary, accent, aspectRatio, theme } = ctx;
  const cardW = aspectRatio === '16:9' ? width * 0.17 : width * 0.24;
  const cardH = cardW * 1.22;
  const caption = fontSize(width, aspectRatio, 0.014);
  const cards = [
    { x: margin * 0.62, y: height * 0.18, r: -9, color: primary },
    { x: width - margin * 0.62 - cardW, y: height * 0.2, r: 8, color: secondary },
    { x: aspectRatio === '16:9' ? width - margin * 1.05 - cardW : margin * 0.88, y: height - margin - cardH * 1.1, r: aspectRatio === '16:9' ? -5 : 7, color: accent },
  ];

  return `<g filter="url(#shadow)">
    ${cards.map((card, i) => `
      <g transform="rotate(${card.r} ${card.x + cardW / 2} ${card.y + cardH / 2})">
        <rect x="${round(card.x)}" y="${round(card.y)}" width="${round(cardW)}" height="${round(cardH)}" rx="${round(cardW * 0.08)}" fill="#ffffff" opacity="${i === 2 ? 0.82 : 0.9}"/>
        <rect x="${round(card.x + cardW * 0.08)}" y="${round(card.y + cardW * 0.08)}" width="${round(cardW * 0.84)}" height="${round(cardW * 0.78)}" rx="${round(cardW * 0.045)}" fill="none" stroke="${card.color}" stroke-width="${Math.max(4, ctx.stroke * 0.24)}" opacity="0.88"/>
        <path d="M${round(card.x + cardW * 0.14)} ${round(card.y + cardH * 0.8)} H${round(card.x + cardW * 0.86)}" stroke="${card.color}" stroke-width="${Math.max(3, ctx.stroke * 0.14)}" stroke-linecap="round" opacity="0.72"/>
      </g>
    `).join('')}
    <text x="${width / 2}" y="${margin + caption * 1.2}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="${caption}" font-weight="900" fill="${accent}" letter-spacing="0">${escapeXml(theme.footer)}</text>
  </g>`;
}

function ticketPass(ctx: TemplateContext) {
  const { width, height, margin, primary, secondary, accent, aspectRatio, theme } = ctx;
  const ticketW = aspectRatio === '16:9' ? width * 0.4 : width * 0.72;
  const ticketH = aspectRatio === '16:9' ? height * 0.13 : height * 0.075;
  const x = (width - ticketW) / 2;
  const y = height - margin - ticketH * 1.45;
  const holes = Array.from({ length: aspectRatio === '16:9' ? 8 : 6 }, (_, i) => {
    const hx = x + ticketW * 0.12 + (ticketW * 0.76 * i) / ((aspectRatio === '16:9' ? 8 : 6) - 1);
    return `<circle cx="${round(hx)}" cy="${round(y + ticketH * 0.22)}" r="${round(ticketH * 0.045)}" fill="${accent}" opacity="0.78"/>`;
  }).join('');

  return `<g filter="url(#shadow)">
    <path d="M${x + ticketH * 0.28} ${y} H${x + ticketW - ticketH * 0.28} Q${x + ticketW} ${y} ${x + ticketW} ${y + ticketH * 0.28} V${y + ticketH * 0.72} Q${x + ticketW} ${y + ticketH} ${x + ticketW - ticketH * 0.28} ${y + ticketH} H${x + ticketH * 0.28} Q${x} ${y + ticketH} ${x} ${y + ticketH * 0.72} V${y + ticketH * 0.28} Q${x} ${y} ${x + ticketH * 0.28} ${y} Z" fill="#050505" opacity="0.58"/>
    <path d="M${x + ticketH * 0.4} ${y + ticketH * 0.5} H${x + ticketW - ticketH * 0.4}" stroke="url(#strokeGradient)" stroke-width="${Math.max(4, ctx.stroke * 0.26)}" stroke-linecap="round" opacity="0.86"/>
    ${holes}
    <text x="${width / 2}" y="${y + ticketH * 0.67}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="${fontSize(width, aspectRatio, 0.025)}" font-weight="900" fill="#ffffff" letter-spacing="0">${escapeXml(theme.badge)}</text>
    <path d="M${margin} ${margin + ticketH * 0.4} H${margin + ticketW * 0.22}" stroke="${primary}" stroke-width="${Math.max(4, ctx.stroke * 0.22)}" stroke-linecap="round" opacity="0.72"/>
    <path d="M${width - margin - ticketW * 0.22} ${margin + ticketH * 0.4} H${width - margin}" stroke="${secondary}" stroke-width="${Math.max(4, ctx.stroke * 0.22)}" stroke-linecap="round" opacity="0.72"/>
  </g>`;
}

function socialStory(ctx: TemplateContext) {
  const { width, height, margin, primary, secondary, accent, aspectRatio, theme, index } = ctx;
  const bubbleW = aspectRatio === '16:9' ? width * 0.34 : width * 0.62;
  const bubbleH = aspectRatio === '16:9' ? height * 0.09 : height * 0.055;
  const x = margin;
  const y = height - margin - bubbleH * 1.65;
  const reactions = Array.from({ length: 5 }, (_, i) => {
    const r = bubbleH * (0.22 + (i % 2) * 0.04);
    const cx = width - margin - bubbleH * 0.5 - i * bubbleH * 0.75;
    const cy = y + bubbleH * 0.45 + waveLike(index + i) * bubbleH * 0.18;
    return `<circle cx="${round(cx)}" cy="${round(cy)}" r="${round(r)}" fill="${[primary, secondary, accent, '#ffffff', primary][i]}" opacity="${0.62 + i * 0.06}"/>`;
  }).join('');

  return `<g filter="url(#shadow)">
    <rect x="${round(x)}" y="${round(y)}" width="${round(bubbleW)}" height="${round(bubbleH)}" rx="${round(bubbleH / 2)}" fill="#050505" opacity="0.62"/>
    <circle cx="${round(x + bubbleH * 0.55)}" cy="${round(y + bubbleH * 0.5)}" r="${round(bubbleH * 0.25)}" fill="${primary}" opacity="0.94"/>
    <text x="${round(x + bubbleH * 1.05)}" y="${round(y + bubbleH * 0.6)}" font-family="Inter, Arial, sans-serif" font-size="${fontSize(width, aspectRatio, 0.017)}" font-weight="900" fill="#ffffff" letter-spacing="0">${escapeXml(theme.footer)}</text>
    ${reactions}
    <path d="M${margin} ${margin + bubbleH * 0.65} H${margin + bubbleW * 0.62}" stroke="${accent}" stroke-width="${Math.max(3, ctx.stroke * 0.16)}" stroke-linecap="round" opacity="0.7"/>
    <path d="M${width - margin - bubbleW * 0.36} ${margin + bubbleH * 1.15} H${width - margin}" stroke="${secondary}" stroke-width="${Math.max(3, ctx.stroke * 0.16)}" stroke-linecap="round" opacity="0.56"/>
  </g>`;
}

function waveLike(index: number) {
  return Math.sin(index * 1.618);
}

function techHud(ctx: TemplateContext) {
  const { width, height, margin, primary, secondary, accent, aspectRatio, index } = ctx;
  const reticle = (x: number, y: number, r: number, color: string) => `
    <circle cx="${round(x)}" cy="${round(y)}" r="${round(r)}" fill="none" stroke="${color}" stroke-width="${Math.max(3, ctx.stroke * 0.14)}" opacity="0.76"/>
    <path d="M${round(x - r * 1.45)} ${round(y)} H${round(x - r * 0.55)} M${round(x + r * 0.55)} ${round(y)} H${round(x + r * 1.45)} M${round(x)} ${round(y - r * 1.45)} V${round(y - r * 0.55)} M${round(x)} ${round(y + r * 0.55)} V${round(y + r * 1.45)}" stroke="${color}" stroke-width="${Math.max(2, ctx.stroke * 0.08)}" stroke-linecap="round" opacity="0.58"/>
  `;
  const ticks = Array.from({ length: aspectRatio === '16:9' ? 16 : 14 }, (_, i) => {
    const x = margin + (i * (width - margin * 2)) / ((aspectRatio === '16:9' ? 16 : 14) - 1);
    const y = i % 2 ? margin * 0.82 : height - margin * 0.82;
    return `<path d="M${round(x)} ${round(y)} V${round(y + (i % 2 ? 1 : -1) * margin * 0.42)}" stroke="${i % 3 ? secondary : primary}" stroke-width="${Math.max(2, ctx.stroke * 0.08)}" opacity="0.5"/>`;
  }).join('');

  return `<g filter="url(#softGlow)">
    ${reticle(margin * 1.65, margin * 1.65, Math.min(width, height) * 0.045, primary)}
    ${reticle(width - margin * 1.65, height - margin * 1.65, Math.min(width, height) * 0.045, secondary)}
    ${ticks}
    <path d="M${margin} ${height * 0.5} H${margin + width * 0.12} M${width - margin - width * 0.12} ${height * 0.5} H${width - margin}" stroke="${accent}" stroke-width="${Math.max(3, ctx.stroke * 0.12)}" opacity="0.48"/>
    <text x="${width - margin}" y="${margin + fontSize(width, aspectRatio, 0.016)}" text-anchor="end" font-family="Inter, Arial, sans-serif" font-size="${fontSize(width, aspectRatio, 0.014)}" font-weight="900" fill="${accent}" letter-spacing="0">REC ${String((index % 97) + 3).padStart(2, '0')}</text>
  </g>`;
}

function orbitalFocus(ctx: TemplateContext) {
  const { width, height, margin, primary, secondary, accent, aspectRatio, index } = ctx;
  const cx = width / 2;
  const cy = height / 2;
  const rx = aspectRatio === '16:9' ? width * 0.29 : width * 0.39;
  const ry = aspectRatio === '16:9' ? height * 0.28 : height * 0.24;
  const dots = Array.from({ length: 8 }, (_, i) => {
    const angle = (Math.PI * 2 * i) / 8 + index * 0.19;
    const x = cx + Math.cos(angle) * rx;
    const y = cy + Math.sin(angle) * ry;
    return `<circle cx="${round(x)}" cy="${round(y)}" r="${round(Math.min(width, height) * (0.008 + (i % 3) * 0.003))}" fill="${[primary, secondary, accent][i % 3]}" opacity="0.78"/>`;
  }).join('');

  return `<g filter="url(#softGlow)">
    <ellipse cx="${cx}" cy="${cy}" rx="${round(rx)}" ry="${round(ry)}" fill="none" stroke="${primary}" stroke-width="${Math.max(4, ctx.stroke * 0.18)}" opacity="0.36" transform="rotate(-12 ${cx} ${cy})"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${round(rx * 0.86)}" ry="${round(ry * 1.08)}" fill="none" stroke="${secondary}" stroke-width="${Math.max(4, ctx.stroke * 0.18)}" opacity="0.32" transform="rotate(18 ${cx} ${cy})"/>
    ${dots}
    <path d="M${margin} ${margin} C${width * 0.22} ${height * 0.08}, ${width * 0.28} ${height * 0.16}, ${width * 0.36} ${height * 0.1}" fill="none" stroke="${accent}" stroke-width="${Math.max(3, ctx.stroke * 0.14)}" stroke-linecap="round" opacity="0.72"/>
    <path d="M${width - margin} ${height - margin} C${width * 0.78} ${height * 0.92}, ${width * 0.72} ${height * 0.84}, ${width * 0.64} ${height * 0.9}" fill="none" stroke="${accent}" stroke-width="${Math.max(3, ctx.stroke * 0.14)}" stroke-linecap="round" opacity="0.72"/>
  </g>`;
}

function splitRibbon(ctx: TemplateContext) {
  const { width, height, margin, primary, secondary, accent, aspectRatio } = ctx;
  const band = aspectRatio === '16:9' ? height * 0.085 : width * 0.115;
  const labelSize = fontSize(width, aspectRatio, 0.019);

  return `<g filter="url(#shadow)">
    <path d="M${-band} ${margin + band * 0.8} L${width * 0.42} ${margin - band * 0.65} L${width * 0.48} ${margin + band * 0.02} L${band * 0.35} ${margin + band * 1.6} Z" fill="${primary}" opacity="0.82"/>
    <path d="M${width + band} ${height - margin - band * 0.8} L${width * 0.58} ${height - margin + band * 0.65} L${width * 0.52} ${height - margin - band * 0.02} L${width - band * 0.35} ${height - margin - band * 1.6} Z" fill="${secondary}" opacity="0.82"/>
    <path d="M${margin} ${height * 0.5} H${margin + band * 1.8}" stroke="${accent}" stroke-width="${Math.max(4, ctx.stroke * 0.2)}" stroke-linecap="round" opacity="0.74"/>
    <path d="M${width - margin - band * 1.8} ${height * 0.5} H${width - margin}" stroke="${accent}" stroke-width="${Math.max(4, ctx.stroke * 0.2)}" stroke-linecap="round" opacity="0.74"/>
    <text x="${width / 2}" y="${margin + band * 0.75}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="${labelSize}" font-weight="900" fill="#ffffff" opacity="0.9" letter-spacing="0">SIX3</text>
  </g>`;
}

function magazineCover(ctx: TemplateContext) {
  const { width, height, margin, primary, secondary, accent, aspectRatio, theme } = ctx;
  const titleSize = fontSize(width, aspectRatio, aspectRatio === '16:9' ? 0.04 : 0.055);
  const sideSize = fontSize(width, aspectRatio, 0.017);
  const topY = margin + titleSize * 0.95;

  return `<g filter="url(#shadow)">
    <text x="${margin}" y="${topY}" font-family="Inter, Arial, sans-serif" font-size="${titleSize}" font-weight="950" fill="#ffffff" opacity="0.94" letter-spacing="0">${escapeXml(theme.badge)}</text>
    <path d="M${margin} ${topY + titleSize * 0.34} H${Math.min(width - margin, margin + width * 0.48)}" stroke="${primary}" stroke-width="${Math.max(5, ctx.stroke * 0.24)}" stroke-linecap="round"/>
    <g transform="translate(${width - margin * 0.78} ${height * 0.5}) rotate(90)">
      <text text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="${sideSize}" font-weight="900" fill="${secondary}" opacity="0.88" letter-spacing="0">${escapeXml(theme.footer)}</text>
    </g>
    <rect x="${margin}" y="${height - margin - titleSize * 1.35}" width="${width * 0.24}" height="${titleSize * 0.32}" rx="${titleSize * 0.16}" fill="${accent}" opacity="0.82"/>
    <rect x="${margin}" y="${height - margin - titleSize * 0.78}" width="${width * 0.38}" height="${titleSize * 0.22}" rx="${titleSize * 0.11}" fill="#ffffff" opacity="0.72"/>
  </g>`;
}

function photoStrip(ctx: TemplateContext) {
  const { width, height, margin, primary, secondary, accent, aspectRatio } = ctx;
  const stripW = aspectRatio === '16:9' ? width * 0.095 : width * 0.16;
  const frameH = aspectRatio === '16:9' ? height * 0.17 : height * 0.12;
  const x = margin * 0.62;
  const y = margin * 1.1;
  const gap = frameH * 0.18;
  const frames = Array.from({ length: 4 }, (_, i) => {
    const fy = y + i * (frameH + gap);
    return `<rect x="${round(x + stripW * 0.12)}" y="${round(fy)}" width="${round(stripW * 0.76)}" height="${round(frameH)}" rx="${round(stripW * 0.06)}" fill="none" stroke="${[primary, secondary, accent, '#ffffff'][i]}" stroke-width="${Math.max(4, ctx.stroke * 0.18)}" opacity="0.76"/>`;
  }).join('');
  const holes = Array.from({ length: 10 }, (_, i) => {
    const fy = y + (i * (frameH * 4 + gap * 3)) / 9;
    return `<rect x="${round(x + stripW * 0.03)}" y="${round(fy)}" width="${round(stripW * 0.05)}" height="${round(stripW * 0.08)}" rx="${round(stripW * 0.02)}" fill="#ffffff" opacity="0.52"/>
      <rect x="${round(x + stripW * 0.92)}" y="${round(fy)}" width="${round(stripW * 0.05)}" height="${round(stripW * 0.08)}" rx="${round(stripW * 0.02)}" fill="#ffffff" opacity="0.52"/>`;
  }).join('');

  return `<g filter="url(#shadow)">
    <rect x="${round(x)}" y="${round(y - gap * 0.6)}" width="${round(stripW)}" height="${round(frameH * 4 + gap * 3 + gap * 1.2)}" rx="${round(stripW * 0.16)}" fill="#050505" opacity="0.5"/>
    ${frames}
    ${holes}
    <path d="M${width - margin - stripW * 1.4} ${margin} V${margin + frameH}" stroke="${secondary}" stroke-width="${Math.max(4, ctx.stroke * 0.18)}" stroke-linecap="round" opacity="0.58"/>
    <circle cx="${width - margin - stripW * 1.4}" cy="${margin + frameH * 1.24}" r="${stripW * 0.16}" fill="${accent}" opacity="0.8"/>
  </g>`;
}

function spotlightStage(ctx: TemplateContext) {
  const { width, height, margin, primary, secondary, accent, aspectRatio } = ctx;
  const floorY = height - margin - (aspectRatio === '16:9' ? height * 0.075 : height * 0.055);
  const beamTop = margin * 0.72;
  const beams = [
    `<path d="M${width * 0.18} ${beamTop} L${width * 0.38} ${floorY} L${width * 0.28} ${floorY} Z" fill="${primary}" opacity="0.16"/>`,
    `<path d="M${width * 0.82} ${beamTop} L${width * 0.62} ${floorY} L${width * 0.72} ${floorY} Z" fill="${secondary}" opacity="0.16"/>`,
    `<path d="M${width * 0.5} ${beamTop * 0.85} L${width * 0.57} ${floorY} L${width * 0.43} ${floorY} Z" fill="${accent}" opacity="0.13"/>`,
  ].join('');

  return `<g filter="url(#softGlow)">
    ${beams}
    <path d="M${margin} ${floorY} H${width - margin}" stroke="url(#strokeGradient)" stroke-width="${Math.max(6, ctx.stroke * 0.3)}" stroke-linecap="round" opacity="0.74"/>
    ${Array.from({ length: 8 }, (_, i) => `<circle cx="${round(margin + (i * (width - margin * 2)) / 7)}" cy="${round(floorY)}" r="${round(Math.min(width, height) * 0.012)}" fill="${[primary, secondary, accent][i % 3]}" opacity="0.78"/>`).join('')}
  </g>`;
}

function liquidWaves(ctx: TemplateContext) {
  const { width, height, margin, primary, secondary, accent, aspectRatio } = ctx;
  const amp = aspectRatio === '16:9' ? height * 0.055 : width * 0.08;
  const top = margin + amp * 0.65;
  const bottom = height - margin - amp * 0.65;

  return `<g fill="none" filter="url(#softGlow)">
    <path d="M${margin} ${top} C${width * 0.22} ${top - amp}, ${width * 0.38} ${top + amp}, ${width * 0.5} ${top} S${width * 0.78} ${top - amp}, ${width - margin} ${top}" stroke="${primary}" stroke-width="${Math.max(6, ctx.stroke * 0.28)}" stroke-linecap="round" opacity="0.7"/>
    <path d="M${margin} ${bottom} C${width * 0.22} ${bottom + amp}, ${width * 0.38} ${bottom - amp}, ${width * 0.5} ${bottom} S${width * 0.78} ${bottom + amp}, ${width - margin} ${bottom}" stroke="${secondary}" stroke-width="${Math.max(6, ctx.stroke * 0.28)}" stroke-linecap="round" opacity="0.68"/>
    <circle cx="${margin + amp * 0.45}" cy="${height * 0.5}" r="${amp * 0.24}" fill="${accent}" opacity="0.72"/>
    <circle cx="${width - margin - amp * 0.45}" cy="${height * 0.5}" r="${amp * 0.18}" fill="${primary}" opacity="0.64"/>
  </g>`;
}

function stickerBurst(ctx: TemplateContext) {
  const { width, height, margin, primary, secondary, accent, aspectRatio, theme } = ctx;
  const burst = (x: number, y: number, r: number, color: string) => {
    const points = Array.from({ length: 18 }, (_, i) => {
      const angle = (Math.PI * 2 * i) / 18;
      const radius = r * (i % 2 ? 0.58 : 1);
      return `${round(x + Math.cos(angle) * radius)},${round(y + Math.sin(angle) * radius)}`;
    }).join(' ');
    return `<polygon points="${points}" fill="${color}" opacity="0.72"/>`;
  };
  const labelW = aspectRatio === '16:9' ? width * 0.22 : width * 0.34;
  const labelH = aspectRatio === '16:9' ? height * 0.075 : height * 0.052;

  return `<g filter="url(#shadow)">
    ${burst(margin + labelW * 0.24, margin + labelH * 0.8, labelH * 0.82, primary)}
    ${burst(width - margin - labelW * 0.18, height - margin - labelH * 0.7, labelH * 0.72, secondary)}
    ${sparkles(ctx, 16)}
    <rect x="${round((width - labelW) / 2)}" y="${round(height - margin - labelH * 1.6)}" width="${round(labelW)}" height="${round(labelH)}" rx="${round(labelH * 0.24)}" fill="${accent}" opacity="0.86"/>
    <text x="${width / 2}" y="${round(height - margin - labelH * 1.04)}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="${fontSize(width, aspectRatio, 0.018)}" font-weight="950" fill="#050505" letter-spacing="0">${escapeXml(theme.badge)}</text>
  </g>`;
}

function retroVhs(ctx: TemplateContext) {
  const { width, height, margin, primary, secondary, accent, aspectRatio, index } = ctx;
  const rows = aspectRatio === '16:9' ? 9 : 13;
  const scan = Array.from({ length: rows }, (_, i) => {
    const y = margin + (i * (height - margin * 2)) / (rows - 1);
    return `<path d="M${margin} ${round(y)} H${width - margin}" stroke="${i % 2 ? primary : secondary}" stroke-width="${Math.max(2, ctx.stroke * 0.08)}" opacity="${0.16 + (i % 3) * 0.05}"/>`;
  }).join('');

  return `<g filter="url(#softGlow)">
    ${scan}
    <text x="${margin}" y="${margin + fontSize(width, aspectRatio, 0.02)}" font-family="Inter, Arial, sans-serif" font-size="${fontSize(width, aspectRatio, 0.02)}" font-weight="950" fill="${accent}" letter-spacing="0">REC</text>
    <circle cx="${margin + fontSize(width, aspectRatio, 0.062)}" cy="${margin + fontSize(width, aspectRatio, 0.014)}" r="${Math.min(width, height) * 0.012}" fill="${primary}" opacity="0.9"/>
    <text x="${width - margin}" y="${height - margin}" text-anchor="end" font-family="Inter, Arial, sans-serif" font-size="${fontSize(width, aspectRatio, 0.018)}" font-weight="900" fill="#ffffff" opacity="0.78" letter-spacing="0">00:${String((index * 7) % 60).padStart(2, '0')}:SIX3</text>
    ${glitchBars({ ...ctx, index: index + 13 })}
  </g>`;
}

function minimalEditorial(ctx: TemplateContext) {
  const { width, height, margin, primary, secondary, accent, aspectRatio, theme } = ctx;
  const small = fontSize(width, aspectRatio, 0.015);
  const title = fontSize(width, aspectRatio, aspectRatio === '16:9' ? 0.034 : 0.044);

  return `<g filter="url(#shadow)">
    <path d="M${margin} ${margin} H${width - margin}" stroke="${primary}" stroke-width="${Math.max(3, ctx.stroke * 0.14)}" opacity="0.74"/>
    <path d="M${margin} ${height - margin} H${width - margin}" stroke="${secondary}" stroke-width="${Math.max(3, ctx.stroke * 0.14)}" opacity="0.74"/>
    <text x="${margin}" y="${margin + title * 1.15}" font-family="Inter, Arial, sans-serif" font-size="${title}" font-weight="950" fill="#ffffff" opacity="0.92" letter-spacing="0">${escapeXml(theme.title)}</text>
    <text x="${margin}" y="${margin + title * 1.65}" font-family="Inter, Arial, sans-serif" font-size="${small}" font-weight="900" fill="${accent}" opacity="0.86" letter-spacing="0">${escapeXml(theme.footer)}</text>
    <circle cx="${width - margin - title * 0.35}" cy="${margin + title * 0.7}" r="${title * 0.28}" fill="${accent}" opacity="0.78"/>
  </g>`;
}

function brandSlate(ctx: TemplateContext) {
  const { width, height, margin, primary, secondary, accent, aspectRatio, theme } = ctx;
  const panelW = aspectRatio === '16:9' ? width * 0.25 : width * 0.42;
  const panelH = aspectRatio === '16:9' ? height * 0.16 : height * 0.095;
  const x = width - margin - panelW;
  const y = margin;

  return `<g filter="url(#shadow)">
    <rect x="${round(x)}" y="${round(y)}" width="${round(panelW)}" height="${round(panelH)}" rx="${round(panelH * 0.18)}" fill="#050505" opacity="0.58"/>
    <path d="M${round(x + panelW * 0.1)} ${round(y + panelH * 0.32)} H${round(x + panelW * 0.9)}" stroke="${primary}" stroke-width="${Math.max(4, ctx.stroke * 0.18)}" stroke-linecap="round"/>
    <text x="${round(x + panelW * 0.1)}" y="${round(y + panelH * 0.7)}" font-family="Inter, Arial, sans-serif" font-size="${fontSize(width, aspectRatio, 0.017)}" font-weight="900" fill="#ffffff" letter-spacing="0">${escapeXml(theme.badge)}</text>
    ${corporateGrid(ctx)}
    <path d="M${margin} ${height - margin - panelH * 0.36} H${margin + panelW * 0.7}" stroke="${secondary}" stroke-width="${Math.max(4, ctx.stroke * 0.18)}" stroke-linecap="round" opacity="0.7"/>
    <rect x="${margin}" y="${height - margin - panelH * 0.18}" width="${panelW * 0.44}" height="${Math.max(7, ctx.stroke * 0.28)}" rx="${Math.max(3, ctx.stroke * 0.14)}" fill="${accent}" opacity="0.78"/>
  </g>`;
}

function romanticLace(ctx: TemplateContext) {
  const { width, height, margin, primary, secondary, accent, aspectRatio } = ctx;
  const beads = aspectRatio === '16:9' ? 22 : 18;
  const r = Math.min(width, height) * 0.012;
  const top = Array.from({ length: beads }, (_, i) => {
    const x = margin + (i * (width - margin * 2)) / (beads - 1);
    const y = margin + Math.sin(i * 0.8) * r * 1.2;
    return `<circle cx="${round(x)}" cy="${round(y)}" r="${round(r * (i % 2 ? 0.74 : 1))}" fill="${i % 3 ? secondary : primary}" opacity="0.66"/>`;
  }).join('');
  const bottom = Array.from({ length: beads }, (_, i) => {
    const x = margin + (i * (width - margin * 2)) / (beads - 1);
    const y = height - margin + Math.sin(i * 0.8) * r * 1.2;
    return `<circle cx="${round(x)}" cy="${round(y)}" r="${round(r * (i % 2 ? 0.74 : 1))}" fill="${i % 3 ? primary : accent}" opacity="0.56"/>`;
  }).join('');

  return `<g filter="url(#shadow)">
    ${top}
    ${bottom}
    <path d="M${margin} ${margin + r * 2.6} C${width * 0.28} ${margin + r * 7}, ${width * 0.72} ${margin - r * 3}, ${width - margin} ${margin + r * 2.6}" fill="none" stroke="${secondary}" stroke-width="${Math.max(3, ctx.stroke * 0.12)}" stroke-linecap="round" opacity="0.54"/>
    <path d="M${margin} ${height - margin - r * 2.6} C${width * 0.28} ${height - margin - r * 7}, ${width * 0.72} ${height - margin + r * 3}, ${width - margin} ${height - margin - r * 2.6}" fill="none" stroke="${accent}" stroke-width="${Math.max(3, ctx.stroke * 0.12)}" stroke-linecap="round" opacity="0.54"/>
  </g>`;
}

function geometricLux(ctx: TemplateContext) {
  const { width, height, margin, primary, secondary, accent, aspectRatio } = ctx;
  const size = aspectRatio === '16:9' ? height * 0.07 : width * 0.09;
  const diamond = (x: number, y: number, s: number, color: string, fill = false) => `<path d="M${round(x)} ${round(y - s)} L${round(x + s)} ${round(y)} L${round(x)} ${round(y + s)} L${round(x - s)} ${round(y)} Z" fill="${fill ? color : 'none'}" stroke="${color}" stroke-width="${Math.max(3, ctx.stroke * 0.16)}" opacity="${fill ? 0.24 : 0.74}"/>`;
  const leftX = margin + size;
  const rightX = width - margin - size;

  return `<g filter="url(#softGlow)">
    ${diamond(leftX, margin + size, size * 0.65, primary)}
    ${diamond(leftX, margin + size, size * 1.1, accent, true)}
    ${diamond(rightX, height - margin - size, size * 0.65, secondary)}
    ${diamond(rightX, height - margin - size, size * 1.1, primary, true)}
    ${diamond(width / 2, margin + size * 0.8, size * 0.38, accent)}
    ${diamond(width / 2, height - margin - size * 0.8, size * 0.38, secondary)}
    <path d="M${margin + size * 2.1} ${margin + size} H${margin + size * 4.4}" stroke="${accent}" stroke-width="${Math.max(3, ctx.stroke * 0.14)}" stroke-linecap="round" opacity="0.7"/>
    <path d="M${width - margin - size * 4.4} ${height - margin - size} H${width - margin - size * 2.1}" stroke="${primary}" stroke-width="${Math.max(3, ctx.stroke * 0.14)}" stroke-linecap="round" opacity="0.7"/>
  </g>`;
}

function edgeTrace(ctx: TemplateContext) {
  const { width, height, margin, primary, secondary, accent } = ctx;
  const inset = Math.max(14, ctx.stroke * 0.72);

  return `<g fill="none" filter="url(#softGlow)">
    <rect x="${round(margin - inset * 0.36)}" y="${round(margin - inset * 0.36)}" width="${round(width - (margin - inset * 0.36) * 2)}" height="${round(height - (margin - inset * 0.36) * 2)}" rx="${round(inset * 0.9)}" stroke="${primary}" stroke-width="${Math.max(2, ctx.stroke * 0.09)}" opacity="0.32"/>
    <rect x="${round(margin + inset * 0.72)}" y="${round(margin + inset * 0.72)}" width="${round(width - (margin + inset * 0.72) * 2)}" height="${round(height - (margin + inset * 0.72) * 2)}" rx="${round(inset * 0.55)}" stroke="${secondary}" stroke-width="${Math.max(2, ctx.stroke * 0.07)}" opacity="0.18"/>
    <path d="M${margin} ${margin + inset * 2.2} V${margin} H${margin + inset * 2.2}" stroke="${accent}" stroke-width="${Math.max(3, ctx.stroke * 0.13)}" stroke-linecap="round" opacity="0.78"/>
    <path d="M${width - margin - inset * 2.2} ${height - margin} H${width - margin} V${height - margin - inset * 2.2}" stroke="${accent}" stroke-width="${Math.max(3, ctx.stroke * 0.13)}" stroke-linecap="round" opacity="0.7"/>
  </g>`;
}

function cornerFans(ctx: TemplateContext) {
  const { width, height, margin, primary, secondary, accent, aspectRatio } = ctx;
  const r = aspectRatio === '16:9' ? height * 0.105 : width * 0.14;
  const sw = Math.max(4, ctx.stroke * 0.14);
  const fan = (x: number, y: number, sx: number, sy: number, colorA: string, colorB: string) => `
    <g transform="translate(${round(x)} ${round(y)}) scale(${sx} ${sy})" filter="url(#softGlow)">
      <path d="M0 ${r * 0.9} C${r * 0.34} ${r * 0.42}, ${r * 0.42} ${r * 0.34}, ${r * 0.9} 0" fill="none" stroke="${colorA}" stroke-width="${sw}" stroke-linecap="round" opacity="0.82"/>
      <path d="M0 ${r * 0.56} C${r * 0.22} ${r * 0.28}, ${r * 0.28} ${r * 0.22}, ${r * 0.56} 0" fill="none" stroke="${colorB}" stroke-width="${Math.max(3, sw * 0.58)}" stroke-linecap="round" opacity="0.72"/>
      ${Array.from({ length: 5 }, (_, i) => {
        const a = (i + 1) / 6;
        return `<path d="M${r * a} 0 C${r * a * 0.82} ${r * 0.28}, ${r * 0.28} ${r * a * 0.82}, 0 ${r * a}" fill="none" stroke="${i % 2 ? accent : colorA}" stroke-width="${Math.max(2, sw * 0.28)}" opacity="${0.34 + i * 0.07}"/>`;
      }).join('')}
    </g>`;

  return [
    fan(margin, margin, 1, 1, primary, secondary),
    fan(width - margin, margin, -1, 1, secondary, accent),
    fan(margin, height - margin, 1, -1, accent, primary),
    fan(width - margin, height - margin, -1, -1, primary, secondary),
  ].join('');
}

function edgeRibbons(ctx: TemplateContext) {
  const { width, height, margin, primary, secondary, accent, aspectRatio } = ctx;
  const band = aspectRatio === '16:9' ? height * 0.07 : width * 0.105;
  const topY = margin * 0.72;
  const bottomY = height - margin * 0.72;

  return `<g filter="url(#shadow)">
    <path d="M${-band} ${topY + band * 0.65} L${width * 0.24} ${topY - band * 0.28} L${width * 0.36} ${topY + band * 0.08} L${band * 0.32} ${topY + band * 1.16} Z" fill="${primary}" opacity="0.78"/>
    <path d="M${width + band} ${bottomY - band * 0.65} L${width * 0.76} ${bottomY + band * 0.28} L${width * 0.64} ${bottomY - band * 0.08} L${width - band * 0.32} ${bottomY - band * 1.16} Z" fill="${secondary}" opacity="0.78"/>
    <path d="M${margin} ${topY + band * 1.12} H${margin + band * 2.4}" stroke="${accent}" stroke-width="${Math.max(4, ctx.stroke * 0.16)}" stroke-linecap="round" opacity="0.72"/>
    <path d="M${width - margin - band * 2.4} ${bottomY - band * 1.12} H${width - margin}" stroke="${accent}" stroke-width="${Math.max(4, ctx.stroke * 0.16)}" stroke-linecap="round" opacity="0.68"/>
  </g>`;
}

function perimeterDots(ctx: TemplateContext, density = 18) {
  const { width, height, margin, primary, secondary, accent, index } = ctx;
  const colors = [primary, secondary, accent, '#ffffff'];
  const horizontal = Array.from({ length: density }, (_, i) => {
    const x = margin + (i * (width - margin * 2)) / Math.max(1, density - 1);
    const r = Math.max(4, Math.min(width, height) * (0.005 + (i % 3) * 0.0018));
    return `<circle cx="${round(x)}" cy="${round(margin * 0.78)}" r="${round(r)}" fill="${colors[(i + index) % colors.length]}" opacity="${0.4 + (i % 4) * 0.08}"/>
      <circle cx="${round(x)}" cy="${round(height - margin * 0.78)}" r="${round(r * 0.82)}" fill="${colors[(i + index + 2) % colors.length]}" opacity="${0.34 + (i % 4) * 0.07}"/>`;
  }).join('');
  const vertical = Array.from({ length: Math.max(8, Math.round(density * 0.72)) }, (_, i) => {
    const y = margin + (i * (height - margin * 2)) / Math.max(1, Math.round(density * 0.72) - 1);
    const r = Math.max(4, Math.min(width, height) * (0.004 + (i % 3) * 0.0015));
    return `<circle cx="${round(margin * 0.78)}" cy="${round(y)}" r="${round(r)}" fill="${colors[(i + index + 1) % colors.length]}" opacity="${0.3 + (i % 4) * 0.08}"/>
      <circle cx="${round(width - margin * 0.78)}" cy="${round(y)}" r="${round(r * 0.9)}" fill="${colors[(i + index + 3) % colors.length]}" opacity="${0.32 + (i % 4) * 0.07}"/>`;
  }).join('');

  return `<g filter="url(#softGlow)">${horizontal}${vertical}</g>`;
}

function glassShards(ctx: TemplateContext) {
  const { width, height, margin, primary, secondary, accent, index } = ctx;
  const colors = [primary, secondary, accent, '#ffffff'];
  const shard = (x: number, y: number, s: number, color: string, flip = 1) => `<path d="M${round(x)} ${round(y)} L${round(x + s * 1.42 * flip)} ${round(y + s * 0.28)} L${round(x + s * 0.36 * flip)} ${round(y + s * 1.72)} Z" fill="${color}" opacity="0.2" stroke="${color}" stroke-width="${Math.max(2, ctx.stroke * 0.06)}" stroke-opacity="0.42"/>`;
  const items = Array.from({ length: 16 }, (_, i) => {
    const side = i % 2 === 0 ? 1 : -1;
    const x = side > 0
      ? margin * 0.52 + ((i * 37 + index) % Math.round(width * 0.12))
      : width - margin * 0.52 - ((i * 37 + index) % Math.round(width * 0.12));
    const y = margin + ((i * 131 + index * 17) % Math.round(height - margin * 2));
    const s = Math.min(width, height) * (0.026 + (i % 4) * 0.006);
    return shard(x, y, s, colors[(i + index) % colors.length], side);
  }).join('');

  return `<g filter="url(#shadow)">${items}</g>`;
}

function filmEdge(ctx: TemplateContext) {
  const { width, height, margin, primary, secondary, accent, aspectRatio } = ctx;
  const stripW = aspectRatio === '16:9' ? width * 0.055 : width * 0.105;
  const holes = Math.max(8, aspectRatio === '16:9' ? 7 : 12);
  const holeH = (height - margin * 2) / (holes * 1.8);
  const left = Array.from({ length: holes }, (_, i) => {
    const y = margin + (i * (height - margin * 2)) / holes + holeH * 0.22;
    return `<rect x="${round(margin * 0.42)}" y="${round(y)}" width="${round(stripW * 0.28)}" height="${round(holeH)}" rx="${round(holeH * 0.22)}" fill="#ffffff" opacity="0.42"/>
      <rect x="${round(width - margin * 0.42 - stripW * 0.28)}" y="${round(y)}" width="${round(stripW * 0.28)}" height="${round(holeH)}" rx="${round(holeH * 0.22)}" fill="#ffffff" opacity="0.36"/>`;
  }).join('');

  return `<g filter="url(#shadow)">
    <path d="M${margin * 0.32} ${margin} V${height - margin}" stroke="${primary}" stroke-width="${Math.max(5, ctx.stroke * 0.22)}" stroke-linecap="round" opacity="0.58"/>
    <path d="M${width - margin * 0.32} ${margin} V${height - margin}" stroke="${secondary}" stroke-width="${Math.max(5, ctx.stroke * 0.22)}" stroke-linecap="round" opacity="0.58"/>
    ${left}
    <path d="M${margin + stripW * 0.8} ${margin * 0.68} H${width - margin - stripW * 0.8}" stroke="${accent}" stroke-width="${Math.max(3, ctx.stroke * 0.1)}" opacity="0.48"/>
    <path d="M${margin + stripW * 0.8} ${height - margin * 0.68} H${width - margin - stripW * 0.8}" stroke="${accent}" stroke-width="${Math.max(3, ctx.stroke * 0.1)}" opacity="0.42"/>
  </g>`;
}

function hudFrame(ctx: TemplateContext) {
  const { width, height, margin, primary, secondary, accent, index } = ctx;
  const tickCount = ctx.aspectRatio === '16:9' ? 22 : 18;
  const ticks = Array.from({ length: tickCount }, (_, i) => {
    const x = margin + (i * (width - margin * 2)) / Math.max(1, tickCount - 1);
    const topLen = margin * (0.18 + (i % 3) * 0.09);
    return `<path d="M${round(x)} ${round(margin * 0.72)} V${round(margin * 0.72 + topLen)}" stroke="${i % 2 ? primary : secondary}" stroke-width="${Math.max(2, ctx.stroke * 0.06)}" opacity="${0.38 + (i % 4) * 0.07}"/>
      <path d="M${round(x)} ${round(height - margin * 0.72)} V${round(height - margin * 0.72 - topLen)}" stroke="${i % 2 ? secondary : accent}" stroke-width="${Math.max(2, ctx.stroke * 0.06)}" opacity="${0.34 + (i % 4) * 0.06}"/>`;
  }).join('');
  const reticle = (x: number, y: number, r: number, color: string) => `<g fill="none" stroke="${color}" stroke-width="${Math.max(2, ctx.stroke * 0.08)}" opacity="0.62">
    <circle cx="${round(x)}" cy="${round(y)}" r="${round(r)}"/>
    <path d="M${round(x - r * 1.45)} ${round(y)} H${round(x - r * 0.58)} M${round(x + r * 0.58)} ${round(y)} H${round(x + r * 1.45)} M${round(x)} ${round(y - r * 1.45)} V${round(y - r * 0.58)} M${round(x)} ${round(y + r * 0.58)} V${round(y + r * 1.45)}"/>
  </g>`;

  return `<g filter="url(#softGlow)">
    ${ticks}
    ${reticle(margin * 1.55, margin * 1.55, Math.min(width, height) * 0.035, primary)}
    ${reticle(width - margin * 1.55, height - margin * 1.55, Math.min(width, height) * 0.035, secondary)}
    <path d="M${margin * 0.86} ${height * 0.5} H${margin * 1.78} M${width - margin * 1.78} ${height * 0.5} H${width - margin * 0.86}" stroke="${accent}" stroke-width="${Math.max(3, ctx.stroke * 0.1)}" opacity="${0.42 + (index % 3) * 0.08}"/>
  </g>`;
}

function floralEdge(ctx: TemplateContext) {
  const s = ctx.aspectRatio === '16:9' ? ctx.height * 0.1 : ctx.width * 0.135;
  return [
    flowerCluster(ctx, ctx.margin * 0.78, ctx.margin * 0.62, s),
    flowerCluster(ctx, ctx.width - ctx.margin * 0.78, ctx.margin * 0.62, s, -1),
    flowerCluster(ctx, ctx.margin * 0.78, ctx.height - ctx.margin - s * 1.58, s * 0.76),
    flowerCluster(ctx, ctx.width - ctx.margin * 0.78, ctx.height - ctx.margin - s * 1.58, s * 0.76, -1),
    romanticLace(ctx),
  ].join('');
}

function waveFrame(ctx: TemplateContext) {
  return [
    liquidWaves(ctx),
    perimeterDots(ctx, ctx.aspectRatio === '16:9' ? 24 : 18),
    sparkles(ctx, 10),
  ].join('');
}

function premiumFrame(ctx: TemplateContext) {
  return [
    luxuryOrnaments(ctx),
    geometricLux(ctx),
    cornerFans(ctx),
    perimeterDots(ctx, ctx.aspectRatio === '16:9' ? 18 : 14),
  ].join('');
}

function storeAccent(ctx: TemplateContext) {
  const { width, height, margin, primary, secondary, accent, aspectRatio } = ctx;
  const s = aspectRatio === '16:9' ? height * 0.1 : width * 0.14;
  const awning = (x: number, y: number, flip = 1) => `<g transform="translate(${round(x)} ${round(y)}) scale(${flip} 1)" filter="url(#shadow)">
    <path d="M0 ${s * 0.46} H${s * 1.84} L${s * 1.58} 0 H${s * 0.26} Z" fill="#050505" opacity="0.42" stroke="${secondary}" stroke-width="${Math.max(2, ctx.stroke * 0.08)}"/>
    ${Array.from({ length: 5 }, (_, i) => {
      const sx = (i * s * 1.84) / 5;
      return `<path d="M${sx} ${s * 0.46} H${sx + s * 0.37} V${s * 0.66} C${sx + s * 0.3} ${s * 0.84}, ${sx + s * 0.07} ${s * 0.84}, ${sx} ${s * 0.66} Z" fill="${i % 2 ? secondary : primary}" opacity="0.82"/>`;
    }).join('')}
    <rect x="${s * 0.24}" y="${s * 0.82}" width="${s * 1.36}" height="${s * 0.58}" rx="${s * 0.1}" fill="none" stroke="${accent}" stroke-width="${Math.max(3, ctx.stroke * 0.1)}" opacity="0.68"/>
  </g>`;

  return `${awning(width - margin - s * 1.84, margin + s * 0.25)}${awning(margin + s * 1.84, height - margin - s * 1.76, -1)}`;
}

function categoryAccent(ctx: TemplateContext) {
  if (ctx.category === 'birthday') return cakeIcon(ctx);
  if (ctx.category === 'wedding') return rings(ctx);
  if (ctx.category === 'corporate') return hudFrame(ctx);
  if (ctx.category === 'graduation') return graduationMark(ctx);
  if (ctx.category === 'store') return storeAccent(ctx);
  if (ctx.category === 'church') return churchMark(ctx);
  if (ctx.category === 'viral') return glitchBars(ctx);
  if (ctx.category === 'infantil') return balloonCluster(ctx);
  if (ctx.category === 'esportivo') return hudFrame(ctx);
  if (ctx.category === 'natal') return premiumFrame(ctx);
  if (ctx.category === 'carnaval') return confetti(ctx, 42, 'top') + confetti(ctx, 18, 'sides');
  if (ctx.category === 'cha_revelacao') return rings(ctx) + balloonCluster(ctx);
  if (ctx.category === 'halloween') return glitchBars(ctx) + glassShards(ctx);
  return sparkles(ctx, 12);
}

function renderLayout(ctx: TemplateContext) {
  const common = [edgeTrace(ctx), lineFrame(ctx)];

  if (ctx.layout === 'poster_clip') {
    return [...common, filmEdge(ctx), cornerFans(ctx), confetti(ctx, ctx.aspectRatio === '16:9' ? 30 : 42, 'top'), categoryAccent(ctx)].join('');
  }

  if (ctx.layout === 'snap_filter') {
    return [...common, sideRails(ctx), perimeterDots(ctx, 18), sparkles(ctx, 18), categoryAccent(ctx)].join('');
  }

  if (ctx.layout === 'applay_flow') {
    return [...common, chromeCurves(ctx), equalizer(ctx), glassShards(ctx), sparkles(ctx, 12)].join('');
  }

  if (ctx.layout === 'neon_corners') {
    return [...common, sideRails(ctx), cornerFans(ctx), sparkles(ctx, 22), confetti(ctx, 24, 'sides')].join('');
  }

  if (ctx.layout === 'floral_crown') {
    return [...common, floralEdge(ctx), rings(ctx), sparkles(ctx, 8)].join('');
  }

  if (ctx.layout === 'luxury_corners') {
    return [...common, premiumFrame(ctx), sparkles(ctx, 10)].join('');
  }

  if (ctx.layout === 'glitch_reel') {
    return [...common, glitchBars(ctx), equalizer(ctx), hudFrame(ctx), glassShards(ctx)].join('');
  }

  if (ctx.layout === 'cinematic_band') {
    return [...common, filmEdge(ctx), chromeCurves(ctx), corporateGrid(ctx), perimeterDots(ctx, 14)].join('');
  }

  if (ctx.layout === 'confetti_arch') {
    return [...common, confetti(ctx, ctx.aspectRatio === '16:9' ? 48 : 66, 'top'), confetti(ctx, 24, 'bottom'), balloonCluster(ctx), categoryAccent(ctx)].join('');
  }

  if (ctx.layout === 'event_badge') {
    return [...common, eventDots(ctx), perimeterDots(ctx, 20), categoryAccent(ctx), sparkles(ctx, 10)].join('');
  }

  if (ctx.layout === 'chrome_frame') {
    return [...common, chromeCurves(ctx), glassShards(ctx), corporateGrid(ctx), glitchBars({ ...ctx, index: ctx.index + 7 })].join('');
  }

  if (ctx.layout === 'polaroid_stack') {
    return [...common, filmEdge(ctx), glassShards(ctx), sparkles(ctx, 12), categoryAccent(ctx)].join('');
  }

  if (ctx.layout === 'ticket_pass') {
    return [...common, filmEdge(ctx), perimeterDots(ctx, 24), eventDots(ctx), edgeRibbons(ctx)].join('');
  }

  if (ctx.layout === 'social_story') {
    return [...common, sideRails(ctx), perimeterDots(ctx, 22), confetti(ctx, 12, 'sides'), sparkles(ctx, 16)].join('');
  }

  if (ctx.layout === 'tech_hud') {
    return [...common, hudFrame(ctx), corporateGrid(ctx), glassShards(ctx)].join('');
  }

  if (ctx.layout === 'orbital_focus') {
    return [...common, orbitalFocus(ctx), cornerFans(ctx), sparkles(ctx, 12)].join('');
  }

  if (ctx.layout === 'split_ribbon') {
    return [...common, edgeRibbons(ctx), eventDots(ctx), perimeterDots(ctx, 16)].join('');
  }

  if (ctx.layout === 'magazine_cover') {
    return [...common, filmEdge(ctx), edgeRibbons(ctx), categoryAccent(ctx), sparkles(ctx, 8)].join('');
  }

  if (ctx.layout === 'photo_strip') {
    return [...common, filmEdge(ctx), perimeterDots(ctx, 12), sparkles(ctx, 10), categoryAccent(ctx)].join('');
  }

  if (ctx.layout === 'spotlight_stage') {
    return [...common, spotlightStage(ctx), equalizer(ctx), cornerFans(ctx)].join('');
  }

  if (ctx.layout === 'liquid_waves') {
    return [...common, waveFrame(ctx), eventDots(ctx)].join('');
  }

  if (ctx.layout === 'sticker_burst') {
    return [...common, cornerFans(ctx), confetti(ctx, 22, 'sides'), sparkles(ctx, 20), categoryAccent(ctx)].join('');
  }

  if (ctx.layout === 'retro_vhs') {
    return [...common, filmEdge(ctx), glitchBars(ctx), hudFrame(ctx)].join('');
  }

  if (ctx.layout === 'minimal_editorial') {
    return [...common, edgeRibbons(ctx), perimeterDots(ctx, 12), sparkles(ctx, 8)].join('');
  }

  if (ctx.layout === 'brand_slate') {
    return [...common, hudFrame(ctx), corporateGrid(ctx), glassShards(ctx), edgeRibbons(ctx)].join('');
  }

  if (ctx.layout === 'romantic_lace') {
    return [...common, floralEdge(ctx), rings(ctx), romanticLace(ctx)].join('');
  }

  if (ctx.layout === 'geometric_lux') {
    return [...common, premiumFrame(ctx), glassShards(ctx)].join('');
  }

  return [...common, premiumFrame(ctx), sideRails(ctx), sparkles(ctx, 14)].join('');
}

function cakeOrCategoryMark(ctx: TemplateContext) {
  if (ctx.category === 'birthday') return cakeIcon(ctx);
  if (ctx.category === 'wedding') return rings(ctx);
  if (ctx.category === 'corporate') return corporateGrid(ctx);
  if (ctx.category === 'graduation') return graduationMark(ctx);
  if (ctx.category === 'store') return storeMark(ctx);
  if (ctx.category === 'church') return churchMark(ctx);
  if (ctx.category === 'viral') return glitchBars(ctx);
  if (ctx.category === 'infantil') return balloonCluster(ctx);
  if (ctx.category === 'esportivo') return corporateGrid(ctx);
  if (ctx.category === 'natal') return luxuryOrnaments(ctx);
  if (ctx.category === 'carnaval') return confetti(ctx, 28, 'top');
  if (ctx.category === 'cha_revelacao') return rings(ctx);
  if (ctx.category === 'halloween') return glitchBars(ctx);
  return sparkles(ctx, 10);
}

export function templateSvg(params: {
  name: string;
  category: TemplateCategory;
  primary: string;
  secondary: string;
  accent: string;
  aspectRatio: TemplateAspect;
  index: number;
  theme: ThemePack;
  layout: LayoutKey;
}) {
  const { width, height } = aspectSize(params.aspectRatio);
  const isLandscape = params.aspectRatio === '16:9';
  const margin = Math.round(Math.min(width, height) * (isLandscape ? 0.055 : 0.062));
  const stroke = Math.max(10, Math.round(Math.min(width, height) * (isLandscape ? 0.019 : 0.021)));
  const bandHeight = Math.round(height * (isLandscape ? 0.16 : 0.1));
  const ctx: TemplateContext = {
    width,
    height,
    aspectRatio: params.aspectRatio,
    category: params.category,
    theme: params.theme,
    layout: params.layout,
    primary: params.primary,
    secondary: params.secondary,
    accent: params.accent,
    index: params.index,
    margin,
    stroke,
    bandHeight,
  };

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="strokeGradient" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${params.primary}"/>
      <stop offset="0.48" stop-color="${params.accent}"/>
      <stop offset="1" stop-color="${params.secondary}"/>
    </linearGradient>
    <linearGradient id="glassGradient" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.52"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0.08"/>
    </linearGradient>
    <filter id="softGlow" x="-35%" y="-35%" width="170%" height="170%">
      <feGaussianBlur stdDeviation="${Math.max(6, Math.round(stroke * 0.55))}" result="blur"/>
      <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 .6 0" result="glow"/>
      <feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="shadow" x="-25%" y="-25%" width="150%" height="150%">
      <feDropShadow dx="0" dy="${Math.max(3, stroke * 0.2)}" stdDeviation="${Math.max(4, stroke * 0.26)}" flood-color="#000000" flood-opacity="0.46"/>
    </filter>
  </defs>
  <g font-family="Inter, Arial, sans-serif">
    ${renderLayout(ctx)}
  </g>
</svg>`;

  return removeTemplateText(svg);
}

export function generatedTemplatePath(template: { id: string; category: string; aspectRatio?: string }) {
  const aspect = (template.aspectRatio || '9:16').replace(':', 'x');
  return `generated-v2/${template.category}/${aspect}/${template.id}.png`;
}

export async function renderTemplatePng(svg: string) {
  const sharp = (await import('sharp')).default;
  return sharp(Buffer.from(removeTemplateText(svg)))
    .png({ compressionLevel: 6, adaptiveFiltering: true })
    .toBuffer();
}

type BuildGeneratedTemplatesOptions = {
  includeSvg?: boolean;
  includeDataUrl?: boolean;
};

function buildTemplateRecord(params: {
  id: string;
  designId: string;
  name: string;
  category: TemplateCategory;
  primary: string;
  secondary: string;
  accent: string;
  aspectRatio: TemplateAspect;
  index: number;
  theme: ThemePack;
  layout: LayoutKey;
  variantKey: string;
  variantName: string;
  includeSvg: boolean;
  includeDataUrl: boolean;
  now: string;
}) {
  const svg = (params.includeSvg || params.includeDataUrl)
    ? templateSvg({
      name: params.name,
      category: params.category,
      primary: params.primary,
      secondary: params.secondary,
      accent: params.accent,
      aspectRatio: params.aspectRatio,
      index: params.index,
      theme: params.theme,
      layout: params.layout,
    })
    : '';

  return {
    id: params.id,
    designId: params.designId,
    name: params.name,
    category: params.category,
    colors: { primary: params.primary, secondary: params.secondary },
    font: 'Inter',
    layout: params.layout,
    variantKey: params.variantKey,
    variantName: params.variantName,
    overlayUrl: params.includeDataUrl ? `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}` : undefined,
    storagePath: generatedTemplatePath({ id: params.id, category: params.category, aspectRatio: params.aspectRatio }),
    aspectRatio: params.aspectRatio,
    effects: EFFECTS_BY_CATEGORY[params.category],
    isGlobal: true,
    isActive: true,
    createdAt: params.now,
    updatedAt: params.now,
    svg: params.includeSvg ? svg : '',
  };
}

function buildLegacyGeneratedTemplate(index: number, options: Required<BuildGeneratedTemplatesOptions>, now: string) {
  const colorVariantIndex = index % COLOR_VARIANTS.length;
  const colorVariant = COLOR_VARIANTS[colorVariantIndex];
  const familyIndex = Math.floor(index / COLOR_VARIANTS.length);
  const category = LEGACY_CATEGORIES[familyIndex % LEGACY_CATEGORIES.length];
  const aspectRatio = ASPECTS[Math.floor(familyIndex / LEGACY_CATEGORIES.length) % ASPECTS.length];
  const categoryFamilyIndex = Math.floor(familyIndex / (LEGACY_CATEGORIES.length * ASPECTS.length));
  const themes = THEMES[category];
  const themeIndex = categoryFamilyIndex % themes.length;
  const theme = themes[themeIndex];
  const layoutIndex = Math.floor(categoryFamilyIndex / themes.length) % theme.layouts.length;
  const layout = theme.layouts[layoutIndex];
  const designCycle = Math.floor(categoryFamilyIndex / (themes.length * theme.layouts.length));
  const designNumber = designCycle * themes.length * theme.layouts.length + themeIndex * theme.layouts.length + layoutIndex;
  const basePalette = pick(theme.palettes, designCycle + themeIndex + layoutIndex);
  const [primary, secondary, accent] = paletteVariant(basePalette, colorVariantIndex);
  const name = templateName(theme, aspectRatio, designNumber, layout, colorVariant.label);
  const id = `generated-${index + 1}`;
  const designId = `${category}-${aspectRatio.replace(':', 'x')}-${themeIndex + 1}-${layout}-${designCycle + 1}`;

  return buildTemplateRecord({
    id,
    designId,
    name,
    category,
    primary,
    secondary,
    accent,
    aspectRatio,
    index,
    theme,
    layout,
    variantKey: colorVariant.key,
    variantName: colorVariant.label,
    includeSvg: options.includeSvg,
    includeDataUrl: options.includeDataUrl,
    now,
  });
}

function buildIdeaGeneratedTemplate(index: number, options: Required<BuildGeneratedTemplatesOptions>, now: string) {
  const ideaIndex = index - LEGACY_GENERATED_TEMPLATE_COUNT;
  const colorVariantOffset = ideaIndex % IDEA_COLOR_VARIANTS.length;
  const colorVariant = IDEA_COLOR_VARIANTS[colorVariantOffset];
  const colorVariantIndex = colorVariant.key === 'contrast' ? 3 : 0;
  const familyIndex = Math.floor(ideaIndex / IDEA_COLOR_VARIANTS.length);
  const aspectRatio = ASPECTS[familyIndex % ASPECTS.length];
  const ideaFamilyIndex = Math.floor(familyIndex / ASPECTS.length);
  const idea = TEMPLATE_IDEAS[ideaFamilyIndex % TEMPLATE_IDEAS.length];
  const designCycle = Math.floor(ideaFamilyIndex / TEMPLATE_IDEAS.length);
  const theme = ideaTheme(idea);
  const layout = theme.layouts[0];
  const basePalette = pick(theme.palettes, designCycle + idea.ideaIndex);
  const [primary, secondary, accent] = paletteVariant(basePalette, colorVariantIndex);
  const name = templateName(theme, aspectRatio, idea.ideaIndex + designCycle * TEMPLATE_IDEAS.length, layout, colorVariant.label);
  const id = `idea-${index + 1}`;
  const designId = `idea-${idea.category}-${aspectRatio.replace(':', 'x')}-${idea.ideaIndex + 1}-${layout}-${colorVariant.key}`;

  return buildTemplateRecord({
    id,
    designId,
    name,
    category: idea.category,
    primary,
    secondary,
    accent,
    aspectRatio,
    index,
    theme,
    layout,
    variantKey: colorVariant.key,
    variantName: colorVariant.label,
    includeSvg: options.includeSvg,
    includeDataUrl: options.includeDataUrl,
    now,
  });
}

export function buildGeneratedTemplates(count = GENERATED_TEMPLATE_CATALOG_SIZE, offset = 0, options: BuildGeneratedTemplatesOptions = {}) {
  const includeSvg = options.includeSvg ?? true;
  const includeDataUrl = options.includeDataUrl ?? true;
  const resolvedOptions = { includeSvg, includeDataUrl };
  const now = new Date().toISOString();

  return Array.from({ length: count }, (_, batchIndex) => {
    const index = offset + batchIndex;
    return index < LEGACY_GENERATED_TEMPLATE_COUNT
      ? buildLegacyGeneratedTemplate(index, resolvedOptions, now)
      : buildIdeaGeneratedTemplate(index, resolvedOptions, now);
  });
}
