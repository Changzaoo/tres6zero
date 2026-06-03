export type CuratedTemplateType = 'static' | 'animated';
export type CuratedTemplateFormat = 'svg';
export type CuratedLayerMode = 'frame' | 'sticker' | 'full-overlay' | 'corner-decoration';

type CuratedVisual =
  | 'sparkle'
  | 'confetti'
  | 'neon'
  | 'rings'
  | 'arrows'
  | 'reactions'
  | 'festive'
  | 'cards'
  | 'tech'
  | 'cubes'
  | 'floral'
  | 'minimal';

type CuratedGroup = {
  category: string;
  visual: CuratedVisual;
  tags: string[];
  names: string[];
  premium?: boolean;
  animated?: boolean;
  aspectRatio?: '9:16' | '16:9' | '1:1' | 'auto';
};

export type CuratedTemplateAsset = {
  id: string;
  name: string;
  category: string;
  tags: string[];
  type: CuratedTemplateType;
  format: CuratedTemplateFormat;
  storagePath: string;
  previewPath: string;
  thumbnailPath?: string;
  isPremium: boolean;
  aspectRatio: '9:16' | '16:9' | '1:1' | 'auto';
  layerMode: CuratedLayerMode;
  opacityDefault: number;
  safeArea?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  colors: {
    primary: string;
    secondary: string;
  };
  font: string;
  designId: string;
  layout: string;
  variantName: string;
  source: 'generated';
  isGlobal: boolean;
  isActive: boolean;
  effects: string[];
  createdAt: string;
  updatedAt: string;
  overlayUrl?: string;
  previewUrl?: string;
  frameUrl?: string;
  animationUrl?: string;
  svg?: string;
};

const NOW = '2026-06-03T00:00:00.000Z';

const CATEGORY_PATHS: Record<string, string> = {
  brilhos_estrelas: 'brilho-estrelas',
  confetes_festa: 'confetes-festa',
  neon_glow: 'neon-glow',
  circulos_animados: 'circulos',
  setas_chamadas: 'setas',
  emojis_reacoes: 'emojis',
  elementos_festivos: 'festa',
  cards_faixas: 'cards-faixas',
  tech_futurista: 'tech-futurista',
  cubos_isometricos: 'cubos-isometricos',
  flores_decorativos: 'flores-decorativos',
  minimal_premium: 'minimal-premium',
  birthday: 'aniversario',
  wedding: 'casamento',
  corporate: 'corporativo',
  party: 'balada-festa',
  gamer_neon: 'gamer-neon',
  tropical: 'tropical',
  premium: 'luxo-preto-dourado',
  booth_360: '360-booth-premium',
};

const PALETTES: Record<string, [string, string]> = {
  brilhos_estrelas: ['#f8fafc', '#facc15'],
  confetes_festa: ['#22d3ee', '#f472b6'],
  neon_glow: ['#7c3aed', '#22d3ee'],
  circulos_animados: ['#ffffff', '#38bdf8'],
  setas_chamadas: ['#f8fafc', '#a78bfa'],
  emojis_reacoes: ['#fde68a', '#fb7185'],
  elementos_festivos: ['#f59e0b', '#ec4899'],
  cards_faixas: ['#8b5cf6', '#06b6d4'],
  tech_futurista: ['#38bdf8', '#818cf8'],
  cubos_isometricos: ['#e2e8f0', '#60a5fa'],
  flores_decorativos: ['#f9a8d4', '#86efac'],
  minimal_premium: ['#ffffff', '#facc15'],
  birthday: ['#ec4899', '#facc15'],
  wedding: ['#fff7ed', '#f9a8d4'],
  corporate: ['#38bdf8', '#94a3b8'],
  party: ['#7c3aed', '#22d3ee'],
  gamer_neon: ['#22c55e', '#a855f7'],
  tropical: ['#34d399', '#fbbf24'],
  premium: ['#facc15', '#111827'],
  booth_360: ['#3b82f6', '#8b5cf6'],
};

const GROUPS: CuratedGroup[] = [
  {
    category: 'brilhos_estrelas',
    visual: 'sparkle',
    tags: ['brilho', 'estrelas', 'premium', 'festa'],
    names: ['Neon Star Burst', 'Gold Sparkle Frame', 'White Magic Stars', 'Pink Glitter Corners', 'Floating Star Dust'],
  },
  {
    category: 'confetes_festa',
    visual: 'confetti',
    tags: ['confete', 'festa', 'aniversario', 'party'],
    names: ['Falling Confetti Neon', 'Party Confetti Border', 'Golden Confetti Rain', 'Birthday Confetti Pop', 'Minimal Confetti Dots'],
  },
  {
    category: 'neon_glow',
    visual: 'neon',
    tags: ['neon', 'glow', 'balada', 'six3'],
    names: ['Purple Blue Neon Frame', 'Cyan Glow Corners', 'Neon Light Tunnel', 'Electric Party Border', 'Gradient Glow Overlay'],
  },
  {
    category: 'circulos_animados',
    visual: 'rings',
    tags: ['circulos', 'anel', 'motion', 'loading'],
    names: ['Rotating White Circle', 'Double Ring Motion', 'Neon Ring Pulse', 'Corner Circle Loader', 'Abstract Circle Frame'],
    animated: true,
  },
  {
    category: 'setas_chamadas',
    visual: 'arrows',
    tags: ['seta', 'chamada', 'cta', 'marker'],
    names: ['Swipe Arrow Neon', 'Double Down Arrows', 'Animated Side Arrow', 'Hand Drawn Arrow White', 'Look Here Marker'],
  },
  {
    category: 'emojis_reacoes',
    visual: 'reactions',
    tags: ['emoji', 'reacao', 'coracao', 'social'],
    names: ['Floating Smile Reaction', 'Clapping Reaction', 'Love Reaction Hearts', 'Wow Reaction Bubble', 'Fun Emoji Corners'],
  },
  {
    category: 'elementos_festivos',
    visual: 'festive',
    tags: ['presente', 'balao', 'ribbon', 'evento'],
    names: ['Gift Box Corner', 'Party Hat Overlay', 'Balloon Side Frame', 'Celebration Burst', 'Premium Event Ribbon'],
  },
  {
    category: 'cards_faixas',
    visual: 'cards',
    tags: ['card', 'faixa', 'glass', 'lower third'],
    names: ['Lower Third Clean Card', 'Purple Info Banner', 'Yellow Highlight Bar', 'Glassmorphism Label', 'Credit Card Style Badge'],
  },
  {
    category: 'tech_futurista',
    visual: 'tech',
    tags: ['hud', 'tech', 'circuito', 'futurista'],
    names: ['Hexagon Tech Grid', 'Digital Circuit Lines', 'Holographic HUD Frame', 'Blue Matrix Dots', 'Futuristic Corner Brackets'],
  },
  {
    category: 'cubos_isometricos',
    visual: 'cubes',
    tags: ['cubo', 'geometrico', 'isometrico', '3d'],
    names: ['White Cube Network', 'Isometric Line Blocks', 'Floating 3D Cubes', 'Geometric Booth Frame', 'Abstract Cube Overlay'],
  },
  {
    category: 'flores_decorativos',
    visual: 'floral',
    tags: ['flores', 'folhas', 'decorativo', 'casamento'],
    names: ['Minimal Flower Corners', 'Tropical Leaf Frame', 'Elegant Floral Border', 'Rustic Leaf Accent', 'Pink Flower Glow'],
  },
  {
    category: 'minimal_premium',
    visual: 'minimal',
    tags: ['minimal', 'premium', 'luxo', 'clean'],
    names: ['Apple Clean White Frame', 'Black Luxury Border', 'Transparent Glass Frame', 'Minimal Name Plate', 'SIX3 Premium Signature'],
    premium: true,
  },
  {
    category: 'birthday',
    visual: 'confetti',
    tags: ['aniversario', 'bolo', 'baloes', 'celebracao'],
    names: ['Neon Birthday Confetti', 'Golden Balloon Corners', 'Minimal Cake Footer', 'Pink Gold Birthday Stars', 'Adult Black Gold Party', 'Pool Party Blue White', 'Animated Confetti Shower', 'Chrome Balloon Style', 'Gamer Birthday Neon'],
  },
  {
    category: 'wedding',
    visual: 'floral',
    tags: ['casamento', 'romantico', 'flores', 'champagne'],
    names: ['White Flower Corners', 'Fine Gold Wedding Frame', 'Minimal Heart Lines', 'Falling Petal Frame', 'Elegant Glass Wedding', 'Champagne Soft Border', 'White Sparkle Romance', 'Premium Floral Ornament', 'Romantic Clean Frame'],
    premium: true,
  },
  {
    category: 'corporate',
    visual: 'tech',
    tags: ['corporativo', 'marca', 'logo', 'institucional'],
    names: ['Clean Logo Frame', 'Company Lower Third', 'Discrete Tech HUD', 'Premium Blue Lines', 'Brand Footer Cards', 'Minimal White Corporate', 'Reserved QR Corner', 'Institutional Frame', 'Elegant Side Band', 'Transparent Tech Grid'],
  },
  {
    category: 'party',
    visual: 'neon',
    tags: ['balada', 'festa', 'laser', 'glow'],
    names: ['Purple Blue Club Neon', 'Side Laser Lines', 'Circular Glow Party', 'Animated Neon Confetti', 'Soft Smoke Overlay', 'Equalizer Visual Frame', 'Party Light Corners', 'Cyber Party Frame', 'Soft Flash Stars'],
  },
  {
    category: 'gamer_neon',
    visual: 'tech',
    tags: ['gamer', 'neon', 'rgb', 'glitch'],
    names: ['Gamer HUD Frame', 'Neon Arrow Combo', 'Target Circle Overlay', 'Glitch Pixel Frame', 'Pixel Corner Lines', 'Energy Bar Footer', 'Cyber Grid RGB', 'RGB Border Frame', 'Futuristic Gamer Brackets'],
  },
  {
    category: 'premium',
    visual: 'minimal',
    tags: ['luxo', 'preto', 'dourado', 'premium'],
    names: ['Black Gold Luxury', 'Gold Dust Premium', 'Champagne Sparkle', 'Minimal Gold Line', 'Premium Signature Frame', 'Marble Soft Corners', 'Black Glass Frame', 'Gold Confetti Edge', 'Elegant Ribbon Border', 'Fine Ornamental Border'],
    premium: true,
  },
  {
    category: 'tropical',
    visual: 'floral',
    tags: ['tropical', 'folhas', 'pool party', 'verao'],
    names: ['Tropical Palm Side Frame', 'Fresh Leaf Corners', 'Summer Booth Border', 'Aqua Leaf Glow', 'Golden Palm Minimal'],
  },
  {
    category: 'booth_360',
    visual: 'rings',
    tags: ['360', 'booth', 'premium', 'camera'],
    names: ['360 Premium Orbit', 'Booth Camera Brackets', 'SIX3 Orbital Glow', 'Premium Spin Ring', 'Studio Booth Light Trail', '360 Luxury Corners'],
    premium: true,
    animated: true,
  },
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function looksAnimated(name: string, group: CuratedGroup, index: number) {
  if (group.animated) return true;
  return /(animated|floating|falling|rain|pulse|rotating|loader|motion|shower|laser|glow|flash|orbit|spin|trail|petal)/i.test(name)
    || index % 5 === 4;
}

function layerModeFor(visual: CuratedVisual): CuratedLayerMode {
  if (visual === 'cards') return 'full-overlay';
  if (visual === 'arrows' || visual === 'reactions' || visual === 'festive') return 'sticker';
  if (visual === 'floral' || visual === 'sparkle' || visual === 'cubes') return 'corner-decoration';
  return 'frame';
}

function storagePathFor(template: { id: string; category: string; type: CuratedTemplateType }) {
  const base = template.type === 'animated' ? 'templates/animated' : 'templates/static';
  const categoryPath = CATEGORY_PATHS[template.category] || template.category;
  return `${base}/${categoryPath}/${template.id}.svg`;
}

function previewPathFor(template: { id: string; category: string; type: CuratedTemplateType }) {
  const base = template.type === 'animated' ? 'templates/previews/animated' : 'templates/previews/static';
  const categoryPath = CATEGORY_PATHS[template.category] || template.category;
  return `${base}/${categoryPath}/${template.id}.svg`;
}

type BuildCuratedTemplatesOptions = {
  includeSvg?: boolean;
  urlForPath?: (path: string) => string;
};

export function buildCuratedTemplates(options: BuildCuratedTemplatesOptions = {}): CuratedTemplateAsset[] {
  const templates = GROUPS.flatMap((group) => group.names.map((name, index) => {
    const type: CuratedTemplateType = looksAnimated(name, group, index) ? 'animated' : 'static';
    const id = `curated-${slugify(name)}`;
    const storagePath = storagePathFor({ id, category: group.category, type });
    const previewPath = previewPathFor({ id, category: group.category, type });
    const colors = PALETTES[group.category] || ['#7c3aed', '#22d3ee'];
    const premium = Boolean(group.premium || group.category === 'premium' || group.category === 'minimal_premium' || (index % 7 === 0 && group.category !== 'confetes_festa'));
    const opacityDefault = type === 'animated' ? 0.92 : group.visual === 'cards' ? 0.86 : 0.96;
    const template: CuratedTemplateAsset = {
      id,
      name,
      category: group.category,
      tags: Array.from(new Set([...group.tags, group.visual, type])),
      type,
      format: 'svg',
      storagePath,
      previewPath,
      thumbnailPath: previewPath,
      isPremium: premium,
      aspectRatio: group.aspectRatio || '9:16',
      layerMode: layerModeFor(group.visual),
      opacityDefault,
      safeArea: { top: 10, right: 8, bottom: group.visual === 'cards' ? 18 : 10, left: 8 },
      colors: { primary: colors[0], secondary: colors[1] },
      font: 'Inter',
      designId: `curated-${group.visual}`,
      layout: group.visual,
      variantName: type === 'animated' ? 'Animado' : 'Estatico',
      source: 'generated',
      isGlobal: true,
      isActive: true,
      effects: Array.from(new Set([
        'transparent_overlay',
        type === 'animated' ? 'motion_svg' : 'static_svg',
        premium ? 'premium_templates' : 'basic_templates',
        ...group.tags.slice(0, 2),
      ])),
      createdAt: NOW,
      updatedAt: NOW,
      overlayUrl: options.urlForPath?.(storagePath),
      previewUrl: options.urlForPath?.(previewPath) || options.urlForPath?.(storagePath),
      frameUrl: options.urlForPath?.(storagePath),
    };

    if (options.includeSvg) {
      template.svg = renderCuratedTemplateSvg(template);
    }

    return template;
  }));

  return templates;
}

export function getCuratedTemplate(id: string, includeSvg = false) {
  return buildCuratedTemplates({ includeSvg }).find((template) => template.id === id) || null;
}

function aspectSize(aspectRatio: CuratedTemplateAsset['aspectRatio']) {
  if (aspectRatio === '16:9') return { width: 1920, height: 1080 };
  if (aspectRatio === '1:1') return { width: 1440, height: 1440 };
  return { width: 1080, height: 1920 };
}

function n(value: number) {
  return Number(value.toFixed(2));
}

function star(x: number, y: number, r: number, fill: string, opacity = 0.82) {
  return `<path d="M${n(x)} ${n(y - r)} L${n(x + r * 0.27)} ${n(y - r * 0.27)} L${n(x + r)} ${n(y)} L${n(x + r * 0.27)} ${n(y + r * 0.27)} L${n(x)} ${n(y + r)} L${n(x - r * 0.27)} ${n(y + r * 0.27)} L${n(x - r)} ${n(y)} L${n(x - r * 0.27)} ${n(y - r * 0.27)} Z" fill="${fill}" opacity="${opacity}"/>`;
}

function lineFrame(width: number, height: number, primary: string, secondary: string) {
  const pad = width * 0.035;
  return `
    <rect x="${n(pad)}" y="${n(pad)}" width="${n(width - pad * 2)}" height="${n(height - pad * 2)}" rx="${n(width * 0.045)}" fill="none" stroke="${primary}" stroke-width="${n(width * 0.006)}" opacity="0.42"/>
    <rect x="${n(pad * 1.55)}" y="${n(pad * 1.55)}" width="${n(width - pad * 3.1)}" height="${n(height - pad * 3.1)}" rx="${n(width * 0.032)}" fill="none" stroke="${secondary}" stroke-width="${n(width * 0.0026)}" opacity="0.34"/>
  `;
}

function cornerBrackets(width: number, height: number, color: string, opacity = 0.82) {
  const p = width * 0.06;
  const l = width * 0.15;
  const sw = width * 0.009;
  return `
    <path d="M${p} ${p + l} V${p} H${p + l}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" opacity="${opacity}"/>
    <path d="M${width - p - l} ${p} H${width - p} V${p + l}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" opacity="${opacity}"/>
    <path d="M${width - p} ${height - p - l} V${height - p} H${width - p - l}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" opacity="${opacity}"/>
    <path d="M${p + l} ${height - p} H${p} V${height - p - l}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" opacity="${opacity}"/>
  `;
}

function sparkleLayer(width: number, height: number, primary: string, secondary: string) {
  return Array.from({ length: 28 }, (_, index) => {
    const side = index % 4;
    const x = side === 0 ? width * (0.08 + (index % 7) * 0.13)
      : side === 1 ? width * 0.91
        : side === 2 ? width * (0.1 + (index % 7) * 0.12)
          : width * 0.09;
    const y = side === 0 ? height * 0.07
      : side === 1 ? height * (0.12 + (index % 8) * 0.095)
        : side === 2 ? height * 0.92
          : height * (0.14 + (index % 8) * 0.09);
    return star(x, y, width * (0.008 + (index % 3) * 0.004), index % 2 ? primary : secondary, 0.42 + (index % 4) * 0.12);
  }).join('');
}

function confettiLayer(width: number, height: number, primary: string, secondary: string) {
  const colors = [primary, secondary, '#ffffff', '#facc15', '#fb7185', '#22c55e'];
  return Array.from({ length: 48 }, (_, index) => {
    const edge = index % 5;
    const x = edge < 3 ? width * (0.05 + ((index * 37) % 90) / 100) : (edge === 3 ? width * 0.08 : width * 0.92);
    const y = edge < 3 ? height * (0.04 + ((index * 19) % 16) / 100) : height * (0.08 + ((index * 47) % 84) / 100);
    const s = width * (0.006 + (index % 4) * 0.002);
    const fill = colors[index % colors.length];
    return index % 4 === 0
      ? `<circle cx="${n(x)}" cy="${n(y)}" r="${n(s)}" fill="${fill}" opacity="0.78"/>`
      : `<rect x="${n(x)}" y="${n(y)}" width="${n(s * 0.8)}" height="${n(s * 2.1)}" rx="${n(s * 0.25)}" fill="${fill}" opacity="0.72" transform="rotate(${(index * 29) % 180} ${n(x)} ${n(y)})"/>`;
  }).join('');
}

function neonLayer(width: number, height: number, primary: string, secondary: string) {
  return `
    ${lineFrame(width, height, primary, secondary)}
    <path d="M${width * 0.08} ${height * 0.2} C${width * 0.28} ${height * 0.08}, ${width * 0.72} ${height * 0.08}, ${width * 0.92} ${height * 0.2}" fill="none" stroke="${secondary}" stroke-width="${width * 0.012}" stroke-linecap="round" opacity="0.52"/>
    <path d="M${width * 0.08} ${height * 0.8} C${width * 0.28} ${height * 0.92}, ${width * 0.72} ${height * 0.92}, ${width * 0.92} ${height * 0.8}" fill="none" stroke="${primary}" stroke-width="${width * 0.012}" stroke-linecap="round" opacity="0.5"/>
    <path d="M${width * 0.08} ${height * 0.28} V${height * 0.72}" stroke="${primary}" stroke-width="${width * 0.01}" stroke-linecap="round" opacity="0.48"/>
    <path d="M${width * 0.92} ${height * 0.28} V${height * 0.72}" stroke="${secondary}" stroke-width="${width * 0.01}" stroke-linecap="round" opacity="0.48"/>
  `;
}

function ringsLayer(width: number, height: number, primary: string, secondary: string) {
  const cx = width / 2;
  const cy = height / 2;
  return `
    ${cornerBrackets(width, height, secondary, 0.55)}
    <circle cx="${cx}" cy="${cy}" r="${width * 0.22}" fill="none" stroke="${primary}" stroke-width="${width * 0.008}" stroke-dasharray="${width * 0.08} ${width * 0.035}" opacity="0.42"/>
    <circle cx="${cx}" cy="${cy}" r="${width * 0.31}" fill="none" stroke="${secondary}" stroke-width="${width * 0.005}" stroke-dasharray="${width * 0.025} ${width * 0.055}" opacity="0.34"/>
    <circle cx="${width * 0.16}" cy="${height * 0.14}" r="${width * 0.038}" fill="none" stroke="${primary}" stroke-width="${width * 0.006}" opacity="0.5"/>
    <circle cx="${width * 0.84}" cy="${height * 0.86}" r="${width * 0.038}" fill="none" stroke="${secondary}" stroke-width="${width * 0.006}" opacity="0.5"/>
  `;
}

function arrowsLayer(width: number, height: number, primary: string, secondary: string) {
  const arrow = (x: number, y: number, flip = 1, color = primary) => `
    <path d="M${x} ${y} C${x + flip * width * 0.08} ${y - height * 0.05}, ${x + flip * width * 0.16} ${y - height * 0.02}, ${x + flip * width * 0.22} ${y}" fill="none" stroke="${color}" stroke-width="${width * 0.012}" stroke-linecap="round" opacity="0.72"/>
    <path d="M${x + flip * width * 0.2} ${y - height * 0.035} L${x + flip * width * 0.23} ${y} L${x + flip * width * 0.2} ${y + height * 0.035}" fill="none" stroke="${color}" stroke-width="${width * 0.012}" stroke-linecap="round" stroke-linejoin="round" opacity="0.72"/>
  `;
  return `
    ${arrow(width * 0.08, height * 0.25, 1, primary)}
    ${arrow(width * 0.92, height * 0.72, -1, secondary)}
    ${star(width * 0.18, height * 0.18, width * 0.018, secondary, 0.68)}
    ${star(width * 0.82, height * 0.82, width * 0.018, primary, 0.68)}
  `;
}

function reactionsLayer(width: number, height: number, primary: string, secondary: string) {
  const heart = (x: number, y: number, s: number, color: string) => `<path d="M${x} ${y + s * 0.34} C${x - s * 0.9} ${y - s * 0.28}, ${x - s * 0.34} ${y - s}, ${x} ${y - s * 0.42} C${x + s * 0.34} ${y - s}, ${x + s * 0.9} ${y - s * 0.28}, ${x} ${y + s * 0.34} Z" fill="${color}" opacity="0.64"/>`;
  return `
    ${heart(width * 0.15, height * 0.18, width * 0.04, secondary)}
    ${heart(width * 0.86, height * 0.76, width * 0.045, primary)}
    <circle cx="${width * 0.82}" cy="${height * 0.18}" r="${width * 0.044}" fill="${primary}" opacity="0.52"/>
    <circle cx="${width * 0.805}" cy="${height * 0.168}" r="${width * 0.006}" fill="#111827" opacity="0.85"/>
    <circle cx="${width * 0.835}" cy="${height * 0.168}" r="${width * 0.006}" fill="#111827" opacity="0.85"/>
    <path d="M${width * 0.8} ${height * 0.187} Q${width * 0.82} ${height * 0.205} ${width * 0.842} ${height * 0.187}" fill="none" stroke="#111827" stroke-width="${width * 0.005}" stroke-linecap="round" opacity="0.7"/>
    ${sparkleLayer(width, height, '#ffffff', secondary)}
  `;
}

function festiveLayer(width: number, height: number, primary: string, secondary: string) {
  return `
    ${confettiLayer(width, height, primary, secondary)}
    <rect x="${width * 0.08}" y="${height * 0.78}" width="${width * 0.12}" height="${width * 0.12}" rx="${width * 0.014}" fill="${primary}" opacity="0.54"/>
    <path d="M${width * 0.08} ${height * 0.82} H${width * 0.2} M${width * 0.14} ${height * 0.78} V${height * 0.9}" stroke="#ffffff" stroke-width="${width * 0.008}" opacity="0.58"/>
    <circle cx="${width * 0.88}" cy="${height * 0.17}" r="${width * 0.045}" fill="${secondary}" opacity="0.48"/>
    <path d="M${width * 0.88} ${height * 0.215} C${width * 0.86} ${height * 0.28}, ${width * 0.9} ${height * 0.31}, ${width * 0.875} ${height * 0.36}" fill="none" stroke="#ffffff" stroke-width="${width * 0.0035}" opacity="0.5"/>
  `;
}

function cardsLayer(width: number, height: number, primary: string, secondary: string) {
  return `
    <rect x="${width * 0.09}" y="${height * 0.78}" width="${width * 0.82}" height="${height * 0.095}" rx="${width * 0.03}" fill="#030712" opacity="0.32"/>
    <rect x="${width * 0.11}" y="${height * 0.79}" width="${width * 0.78}" height="${height * 0.073}" rx="${width * 0.025}" fill="${primary}" opacity="0.18"/>
    <path d="M${width * 0.13} ${height * 0.79} H${width * 0.87}" stroke="${secondary}" stroke-width="${width * 0.004}" opacity="0.42"/>
    <rect x="${width * 0.1}" y="${height * 0.08}" width="${width * 0.18}" height="${height * 0.052}" rx="${width * 0.018}" fill="#ffffff" opacity="0.12"/>
    <rect x="${width * 0.72}" y="${height * 0.87}" width="${width * 0.18}" height="${height * 0.052}" rx="${width * 0.018}" fill="#ffffff" opacity="0.1"/>
  `;
}

function techLayer(width: number, height: number, primary: string, secondary: string) {
  const hex = (x: number, y: number, r: number, color: string) => {
    const points = Array.from({ length: 6 }, (_, index) => {
      const a = Math.PI / 6 + index * Math.PI / 3;
      return `${n(x + Math.cos(a) * r)},${n(y + Math.sin(a) * r)}`;
    }).join(' ');
    return `<polygon points="${points}" fill="none" stroke="${color}" stroke-width="${width * 0.0035}" opacity="0.42"/>`;
  };
  return `
    ${cornerBrackets(width, height, primary, 0.68)}
    ${Array.from({ length: 14 }, (_, index) => hex(index % 2 ? width * 0.91 : width * 0.09, height * (0.13 + index * 0.055), width * (0.018 + (index % 3) * 0.004), index % 2 ? primary : secondary)).join('')}
    <path d="M${width * 0.12} ${height * 0.18} H${width * 0.3} V${height * 0.24} H${width * 0.42}" fill="none" stroke="${secondary}" stroke-width="${width * 0.004}" opacity="0.42"/>
    <path d="M${width * 0.88} ${height * 0.82} H${width * 0.7} V${height * 0.76} H${width * 0.58}" fill="none" stroke="${primary}" stroke-width="${width * 0.004}" opacity="0.42"/>
  `;
}

function cubesLayer(width: number, height: number, primary: string, secondary: string) {
  const cube = (x: number, y: number, s: number, color: string) => `
    <path d="M${x} ${y} L${x + s} ${y - s * 0.45} L${x + s * 2} ${y} L${x + s} ${y + s * 0.45} Z" fill="${color}" opacity="0.18" stroke="${color}" stroke-width="${width * 0.003}"/>
    <path d="M${x + s} ${y + s * 0.45} V${y + s * 1.35} L${x} ${y + s * 0.9} V${y}" fill="${color}" opacity="0.11"/>
    <path d="M${x + s} ${y + s * 0.45} V${y + s * 1.35} L${x + s * 2} ${y + s * 0.9} V${y}" fill="#ffffff" opacity="0.08"/>
  `;
  return `
    ${cube(width * 0.08, height * 0.13, width * 0.045, primary)}
    ${cube(width * 0.76, height * 0.78, width * 0.05, secondary)}
    ${cube(width * 0.1, height * 0.82, width * 0.032, '#ffffff')}
    ${cube(width * 0.82, height * 0.12, width * 0.032, primary)}
    ${lineFrame(width, height, primary, secondary)}
  `;
}

function floralLayer(width: number, height: number, primary: string, secondary: string) {
  const leaf = (x: number, y: number, s: number, rotate: number, color: string) => `<ellipse cx="${x}" cy="${y}" rx="${s * 0.42}" ry="${s}" fill="${color}" opacity="0.38" transform="rotate(${rotate} ${x} ${y})"/>`;
  const flower = (x: number, y: number, s: number, color: string) => Array.from({ length: 6 }, (_, index) => {
    const a = index * Math.PI / 3;
    return `<ellipse cx="${n(x + Math.cos(a) * s * 0.56)}" cy="${n(y + Math.sin(a) * s * 0.56)}" rx="${n(s * 0.3)}" ry="${n(s * 0.58)}" fill="${color}" opacity="0.35" transform="rotate(${index * 60} ${n(x + Math.cos(a) * s * 0.56)} ${n(y + Math.sin(a) * s * 0.56)})"/>`;
  }).join('');
  return `
    ${Array.from({ length: 10 }, (_, index) => leaf(width * (index % 2 ? 0.91 : 0.09), height * (0.12 + index * 0.075), width * (0.025 + (index % 3) * 0.005), index * 35, index % 2 ? primary : secondary)).join('')}
    ${flower(width * 0.13, height * 0.13, width * 0.045, primary)}
    ${flower(width * 0.87, height * 0.87, width * 0.045, secondary)}
    ${lineFrame(width, height, primary, '#ffffff')}
  `;
}

function minimalLayer(width: number, height: number, primary: string, secondary: string) {
  return `
    <rect x="${width * 0.045}" y="${height * 0.045}" width="${width * 0.91}" height="${height * 0.91}" rx="${width * 0.04}" fill="none" stroke="${primary}" stroke-width="${width * 0.0045}" opacity="0.58"/>
    <path d="M${width * 0.09} ${height * 0.09} H${width * 0.28} M${width * 0.72} ${height * 0.09} H${width * 0.91} M${width * 0.09} ${height * 0.91} H${width * 0.28} M${width * 0.72} ${height * 0.91} H${width * 0.91}" stroke="${secondary}" stroke-width="${width * 0.007}" stroke-linecap="round" opacity="0.48"/>
    <rect x="${width * 0.1}" y="${height * 0.81}" width="${width * 0.8}" height="${height * 0.058}" rx="${width * 0.022}" fill="#ffffff" opacity="0.07"/>
  `;
}

function visualLayer(template: CuratedTemplateAsset, width: number, height: number) {
  const { primary, secondary } = template.colors;
  switch (template.layout as CuratedVisual) {
    case 'sparkle': return `${lineFrame(width, height, primary, secondary)}${sparkleLayer(width, height, primary, secondary)}`;
    case 'confetti': return `${lineFrame(width, height, primary, secondary)}${confettiLayer(width, height, primary, secondary)}`;
    case 'neon': return neonLayer(width, height, primary, secondary);
    case 'rings': return ringsLayer(width, height, primary, secondary);
    case 'arrows': return arrowsLayer(width, height, primary, secondary);
    case 'reactions': return reactionsLayer(width, height, primary, secondary);
    case 'festive': return festiveLayer(width, height, primary, secondary);
    case 'cards': return cardsLayer(width, height, primary, secondary);
    case 'tech': return techLayer(width, height, primary, secondary);
    case 'cubes': return cubesLayer(width, height, primary, secondary);
    case 'floral': return floralLayer(width, height, primary, secondary);
    case 'minimal': return minimalLayer(width, height, primary, secondary);
    default: return lineFrame(width, height, primary, secondary);
  }
}

function animationCss(template: CuratedTemplateAsset) {
  if (template.type !== 'animated') return '';
  return '';
}

export function renderCuratedTemplateSvg(template: CuratedTemplateAsset) {
  const { width, height } = aspectSize(template.aspectRatio);
  const blur = Math.max(10, width * 0.018);
  const mainLayer = visualLayer(template, width, height);
  const animated = template.type === 'animated';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${animationCss(template)}
  <defs>
    <filter id="six3CuratedGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="${blur}" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <linearGradient id="six3CuratedGradient" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${template.colors.primary}"/>
      <stop offset="100%" stop-color="${template.colors.secondary}"/>
    </linearGradient>
  </defs>
  <g id="motion-b" filter="url(#six3CuratedGlow)">
    ${animated ? `<animateTransform attributeName="transform" type="scale" values="1;1.035;1" dur="2.8s" repeatCount="indefinite"/>` : ''}
    ${animated ? `<animate attributeName="opacity" values="0.72;1;0.72" dur="2.8s" repeatCount="indefinite"/>` : ''}
    ${mainLayer}
  </g>
  ${animated ? `<g id="motion-a" opacity="0.52" transform-origin="${width / 2} ${height / 2}">
    <animateTransform attributeName="transform" type="rotate" from="0 ${width / 2} ${height / 2}" to="360 ${width / 2} ${height / 2}" dur="8s" repeatCount="indefinite"/>
    ${sparkleLayer(width, height, template.colors.secondary, '#ffffff')}
  </g>` : ''}
</svg>`;
}
