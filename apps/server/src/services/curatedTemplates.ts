export type CuratedTemplateType = 'static' | 'animated';
export type CuratedTemplateFormat = 'svg';
export type CuratedLayerMode = 'frame' | 'sticker' | 'full-overlay' | 'corner-decoration';

type CuratedDesignId =
  | 'aurora_ribbon'
  | 'crystal_corners'
  | 'film_perforation'
  | 'botanical_vines'
  | 'chrome_orbit'
  | 'confetti_crescent'
  | 'laser_gate'
  | 'art_deco'
  | 'tropical_palms'
  | 'neon_brackets'
  | 'bubble_border'
  | 'streamer_edges'
  | 'starfield_edge'
  | 'prism_corners'
  | 'soundwave_sides'
  | 'champagne_bubbles'
  | 'petal_drift'
  | 'pixel_glitch'
  | 'focus_marks'
  | 'marble_veins'
  | 'sunburst_corners'
  | 'frost_spark'
  | 'comet_trails'
  | 'ink_brush';

type DesignSpec = {
  id: CuratedDesignId;
  name: string;
  category: string;
  tags: string[];
  colors: [string, string];
  layerMode: CuratedLayerMode;
  opacityDefault?: number;
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
  birthday: 'aniversario',
  wedding: 'casamento',
  corporate: 'corporativo',
  party: 'balada-festa',
  gamer_neon: 'gamer-neon',
  tropical: 'tropical',
  booth_360: '360-booth',
  tech_futurista: 'tech-futurista',
  flores_decorativos: 'flores-decorativos',
  confetes_festa: 'confetes-festa',
  neon_glow: 'neon-glow',
  viral: 'viral',
  esportivo: 'esportivo',
  natal: 'natal-ano-novo',
  carnaval: 'carnaval',
  cha_revelacao: 'cha-revelacao',
  halloween: 'halloween',
  store: 'loja-inauguracao',
  church: 'igreja',
};

const DESIGNS: DesignSpec[] = [
  {
    id: 'aurora_ribbon',
    name: 'Aurora Ribbon',
    category: 'party',
    tags: ['aurora', 'ribbon', 'neon', 'edge'],
    colors: ['#8b5cf6', '#22d3ee'],
    layerMode: 'frame',
  },
  {
    id: 'crystal_corners',
    name: 'Crystal Corners',
    category: 'wedding',
    tags: ['crystal', 'glass', 'corner', 'clean'],
    colors: ['#f8fafc', '#a5f3fc'],
    layerMode: 'corner-decoration',
  },
  {
    id: 'film_perforation',
    name: 'Film Perforation',
    category: 'corporate',
    tags: ['film', 'camera', 'classic', 'side'],
    colors: ['#ffffff', '#94a3b8'],
    layerMode: 'frame',
  },
  {
    id: 'botanical_vines',
    name: 'Botanical Vines',
    category: 'flores_decorativos',
    tags: ['botanical', 'leaf', 'vine', 'organic'],
    colors: ['#86efac', '#f9a8d4'],
    layerMode: 'corner-decoration',
  },
  {
    id: 'chrome_orbit',
    name: 'Chrome Orbit',
    category: 'booth_360',
    tags: ['orbit', 'chrome', '360', 'studio'],
    colors: ['#60a5fa', '#c4b5fd'],
    layerMode: 'frame',
  },
  {
    id: 'confetti_crescent',
    name: 'Confetti Crescent',
    category: 'birthday',
    tags: ['confetti', 'crescent', 'celebration'],
    colors: ['#f472b6', '#facc15'],
    layerMode: 'corner-decoration',
  },
  {
    id: 'laser_gate',
    name: 'Laser Gate',
    category: 'neon_glow',
    tags: ['laser', 'club', 'gate', 'glow'],
    colors: ['#22d3ee', '#a855f7'],
    layerMode: 'frame',
  },
  {
    id: 'art_deco',
    name: 'Art Deco Lines',
    category: 'wedding',
    tags: ['artdeco', 'gold', 'fine', 'luxury'],
    colors: ['#facc15', '#f8fafc'],
    layerMode: 'frame',
  },
  {
    id: 'tropical_palms',
    name: 'Tropical Palms',
    category: 'tropical',
    tags: ['palm', 'summer', 'leaf', 'pool'],
    colors: ['#34d399', '#fbbf24'],
    layerMode: 'corner-decoration',
  },
  {
    id: 'neon_brackets',
    name: 'Neon Brackets',
    category: 'gamer_neon',
    tags: ['brackets', 'hud', 'rgb', 'gamer'],
    colors: ['#22c55e', '#a855f7'],
    layerMode: 'frame',
  },
  {
    id: 'bubble_border',
    name: 'Bubble Border',
    category: 'cha_revelacao',
    tags: ['bubble', 'soft', 'round', 'cute'],
    colors: ['#93c5fd', '#f9a8d4'],
    layerMode: 'frame',
  },
  {
    id: 'streamer_edges',
    name: 'Streamer Edges',
    category: 'carnaval',
    tags: ['streamer', 'curve', 'festival'],
    colors: ['#fb7185', '#38bdf8'],
    layerMode: 'frame',
  },
  {
    id: 'starfield_edge',
    name: 'Starfield Edge',
    category: 'confetes_festa',
    tags: ['stars', 'night', 'spark', 'edge'],
    colors: ['#f8fafc', '#facc15'],
    layerMode: 'corner-decoration',
  },
  {
    id: 'prism_corners',
    name: 'Prism Corners',
    category: 'tech_futurista',
    tags: ['prism', 'geometry', 'angular'],
    colors: ['#38bdf8', '#818cf8'],
    layerMode: 'corner-decoration',
  },
  {
    id: 'soundwave_sides',
    name: 'Soundwave Sides',
    category: 'party',
    tags: ['soundwave', 'equalizer', 'music'],
    colors: ['#06b6d4', '#ec4899'],
    layerMode: 'frame',
  },
  {
    id: 'champagne_bubbles',
    name: 'Champagne Bubbles',
    category: 'wedding',
    tags: ['champagne', 'bubble', 'gold', 'soft'],
    colors: ['#fef3c7', '#f59e0b'],
    layerMode: 'corner-decoration',
  },
  {
    id: 'petal_drift',
    name: 'Petal Drift',
    category: 'wedding',
    tags: ['petal', 'romantic', 'soft'],
    colors: ['#fecdd3', '#ffffff'],
    layerMode: 'corner-decoration',
  },
  {
    id: 'pixel_glitch',
    name: 'Pixel Glitch',
    category: 'gamer_neon',
    tags: ['pixel', 'glitch', 'digital'],
    colors: ['#22d3ee', '#f43f5e'],
    layerMode: 'frame',
  },
  {
    id: 'focus_marks',
    name: 'Focus Marks',
    category: 'corporate',
    tags: ['focus', 'camera', 'minimal'],
    colors: ['#e2e8f0', '#38bdf8'],
    layerMode: 'frame',
  },
  {
    id: 'marble_veins',
    name: 'Marble Veins',
    category: 'corporate',
    tags: ['marble', 'elegant', 'organic'],
    colors: ['#f8fafc', '#c084fc'],
    layerMode: 'frame',
  },
  {
    id: 'sunburst_corners',
    name: 'Sunburst Corners',
    category: 'store',
    tags: ['sunburst', 'opening', 'rays'],
    colors: ['#f97316', '#facc15'],
    layerMode: 'corner-decoration',
  },
  {
    id: 'frost_spark',
    name: 'Frost Spark',
    category: 'natal',
    tags: ['frost', 'spark', 'winter'],
    colors: ['#bae6fd', '#ffffff'],
    layerMode: 'corner-decoration',
  },
  {
    id: 'comet_trails',
    name: 'Comet Trails',
    category: 'viral',
    tags: ['comet', 'trail', 'dynamic'],
    colors: ['#f472b6', '#a78bfa'],
    layerMode: 'frame',
  },
  {
    id: 'ink_brush',
    name: 'Ink Brush',
    category: 'halloween',
    tags: ['brush', 'ink', 'dramatic'],
    colors: ['#fb923c', '#f8fafc'],
    layerMode: 'frame',
  },
];

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
  return DESIGNS.flatMap((design) => (['static', 'animated'] as const).map((type) => {
    const id = `curated-${design.id}-${type}`;
    const storagePath = storagePathFor({ id, category: design.category, type });
    const previewPath = previewPathFor({ id, category: design.category, type });
    const template: CuratedTemplateAsset = {
      id,
      name: `${design.name} ${type === 'animated' ? 'Motion' : 'Still'}`,
      category: design.category,
      tags: Array.from(new Set([...design.tags, design.id, type])),
      type,
      format: 'svg',
      storagePath,
      previewPath,
      thumbnailPath: previewPath,
      isPremium: false,
      aspectRatio: design.aspectRatio || '9:16',
      layerMode: design.layerMode,
      opacityDefault: design.opacityDefault || (type === 'animated' ? 0.94 : 0.96),
      safeArea: { top: 9, right: 8, bottom: 9, left: 8 },
      colors: { primary: design.colors[0], secondary: design.colors[1] },
      font: 'Inter',
      designId: design.id,
      layout: design.id,
      variantName: type === 'animated' ? 'Animado' : 'Estático',
      source: 'generated',
      isGlobal: true,
      isActive: true,
      effects: ['transparent_overlay', type === 'animated' ? 'motion_svg' : 'static_svg', 'basic_templates', ...design.tags.slice(0, 2)],
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

function motion(enabled: boolean, body: string) {
  return enabled ? body : '';
}

function line(x1: number, y1: number, x2: number, y2: number, color: string, width: number, opacity = 0.75, extra = '') {
  const attrs = `d="M${n(x1)} ${n(y1)} L${n(x2)} ${n(y2)}" fill="none" stroke="${color}" stroke-width="${n(width)}" stroke-linecap="round" opacity="${opacity}"`;
  return extra ? `<path ${attrs}>${extra}</path>` : `<path ${attrs}/>`;
}

function star(x: number, y: number, r: number, fill: string, opacity = 0.8, animate = false) {
  return `<path d="M${n(x)} ${n(y - r)} L${n(x + r * 0.27)} ${n(y - r * 0.27)} L${n(x + r)} ${n(y)} L${n(x + r * 0.27)} ${n(y + r * 0.27)} L${n(x)} ${n(y + r)} L${n(x - r * 0.27)} ${n(y + r * 0.27)} L${n(x - r)} ${n(y)} L${n(x - r * 0.27)} ${n(y - r * 0.27)} Z" fill="${fill}" opacity="${opacity}">
    ${motion(animate, '<animate attributeName="opacity" values="0.25;1;0.25" dur="2.4s" repeatCount="indefinite"/>')}
  </path>`;
}

function roundedFrame(width: number, height: number, primary: string, secondary: string, animate = false) {
  const pad = width * 0.046;
  return `
    <rect x="${n(pad)}" y="${n(pad)}" width="${n(width - pad * 2)}" height="${n(height - pad * 2)}" rx="${n(width * 0.04)}" fill="none" stroke="${primary}" stroke-width="${n(width * 0.0046)}" opacity="0.48" stroke-dasharray="${n(width * 0.1)} ${n(width * 0.04)}">
      ${motion(animate, `<animate attributeName="stroke-dashoffset" from="0" to="${n(width * 0.28)}" dur="5.5s" repeatCount="indefinite"/>`)}
    </rect>
    <rect x="${n(pad * 1.42)}" y="${n(pad * 1.42)}" width="${n(width - pad * 2.84)}" height="${n(height - pad * 2.84)}" rx="${n(width * 0.032)}" fill="none" stroke="${secondary}" stroke-width="${n(width * 0.0026)}" opacity="0.32"/>
  `;
}

function auroraRibbon(width: number, height: number, primary: string, secondary: string, animate: boolean) {
  return `
    ${roundedFrame(width, height, primary, secondary, animate)}
    <path d="M${width * 0.02} ${height * 0.18} C${width * 0.25} ${height * 0.08}, ${width * 0.38} ${height * 0.26}, ${width * 0.58} ${height * 0.12} S${width * 0.88} ${height * 0.09}, ${width * 1.02} ${height * 0.2}" fill="none" stroke="url(#six3CuratedGradient)" stroke-width="${width * 0.025}" stroke-linecap="round" opacity="0.52">
      ${motion(animate, '<animate attributeName="opacity" values="0.28;0.78;0.28" dur="3s" repeatCount="indefinite"/>')}
    </path>
    <path d="M${width * 0.98} ${height * 0.82} C${width * 0.72} ${height * 0.94}, ${width * 0.55} ${height * 0.73}, ${width * 0.34} ${height * 0.88} S${width * 0.08} ${height * 0.94}, ${-width * 0.02} ${height * 0.8}" fill="none" stroke="${secondary}" stroke-width="${width * 0.018}" stroke-linecap="round" opacity="0.42"/>
  `;
}

function crystalCorners(width: number, height: number, primary: string, secondary: string, animate: boolean) {
  const shard = (x: number, y: number, flipX: number, flipY: number, color: string, delay: number) => `
    <polygon points="${n(x)},${n(y)} ${n(x + flipX * width * 0.14)},${n(y + flipY * height * 0.035)} ${n(x + flipX * width * 0.055)},${n(y + flipY * height * 0.15)}" fill="${color}" opacity="0.24">
      ${motion(animate, `<animate attributeName="opacity" values="0.12;0.42;0.12" dur="3.2s" begin="${delay}s" repeatCount="indefinite"/>`)}
    </polygon>
    <polygon points="${n(x + flipX * width * 0.035)},${n(y + flipY * height * 0.02)} ${n(x + flipX * width * 0.18)},${n(y + flipY * height * 0.075)} ${n(x + flipX * width * 0.08)},${n(y + flipY * height * 0.2)}" fill="none" stroke="${primary}" stroke-width="${width * 0.003}" opacity="0.44"/>
  `;
  return `
    ${shard(width * 0.06, height * 0.06, 1, 1, secondary, 0)}
    ${shard(width * 0.94, height * 0.06, -1, 1, primary, 0.3)}
    ${shard(width * 0.94, height * 0.94, -1, -1, secondary, 0.6)}
    ${shard(width * 0.06, height * 0.94, 1, -1, primary, 0.9)}
    ${roundedFrame(width, height, primary, secondary, false)}
  `;
}

function filmPerforation(width: number, height: number, primary: string, secondary: string, animate: boolean) {
  const holes = Array.from({ length: 18 }, (_, index) => {
    const y = height * (0.08 + index * 0.049);
    return `
      <rect x="${width * 0.035}" y="${y}" width="${width * 0.04}" height="${height * 0.022}" rx="${width * 0.01}" fill="${primary}" opacity="0.34"/>
      <rect x="${width * 0.925}" y="${y}" width="${width * 0.04}" height="${height * 0.022}" rx="${width * 0.01}" fill="${primary}" opacity="0.34"/>
    `;
  }).join('');
  return `
    <rect x="${width * 0.025}" y="${height * 0.035}" width="${width * 0.085}" height="${height * 0.93}" rx="${width * 0.025}" fill="#020617" opacity="0.22"/>
    <rect x="${width * 0.89}" y="${height * 0.035}" width="${width * 0.085}" height="${height * 0.93}" rx="${width * 0.025}" fill="#020617" opacity="0.22"/>
    <g>${motion(animate, '<animateTransform attributeName="transform" type="translate" values="0 0;0 18;0 0" dur="2.7s" repeatCount="indefinite"/>')}${holes}</g>
    ${line(width * 0.13, height * 0.055, width * 0.87, height * 0.055, secondary, width * 0.004, 0.45)}
    ${line(width * 0.13, height * 0.945, width * 0.87, height * 0.945, secondary, width * 0.004, 0.45)}
  `;
}

function botanicalVines(width: number, height: number, primary: string, secondary: string, animate: boolean) {
  const leaf = (x: number, y: number, s: number, rotate: number, color: string, delay: number) => `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(s * 0.38)}" ry="${n(s)}" fill="${color}" opacity="0.38" transform="rotate(${rotate} ${n(x)} ${n(y)})">
    ${motion(animate, `<animate attributeName="opacity" values="0.2;0.48;0.2" dur="3.4s" begin="${delay}s" repeatCount="indefinite"/>`)}
  </ellipse>`;
  return `
    <path d="M${width * 0.08} ${height * 0.1} C${width * 0.18} ${height * 0.25}, ${width * 0.08} ${height * 0.38}, ${width * 0.18} ${height * 0.52}" fill="none" stroke="${primary}" stroke-width="${width * 0.005}" opacity="0.45"/>
    <path d="M${width * 0.92} ${height * 0.9} C${width * 0.82} ${height * 0.75}, ${width * 0.92} ${height * 0.62}, ${width * 0.82} ${height * 0.48}" fill="none" stroke="${secondary}" stroke-width="${width * 0.005}" opacity="0.45"/>
    ${Array.from({ length: 12 }, (_, index) => leaf(width * (index < 6 ? 0.1 + (index % 2) * 0.05 : 0.9 - (index % 2) * 0.05), height * (0.12 + (index % 6) * 0.07), width * 0.026, index * 32, index % 2 ? primary : secondary, index * 0.14)).join('')}
    ${roundedFrame(width, height, primary, '#ffffff', false)}
  `;
}

function chromeOrbit(width: number, height: number, primary: string, secondary: string, animate: boolean) {
  const cx = width / 2;
  const cy = height / 2;
  return `
    ${roundedFrame(width, height, primary, secondary, false)}
    <g transform-origin="${cx} ${cy}">
      ${motion(animate, `<animateTransform attributeName="transform" type="rotate" from="0 ${cx} ${cy}" to="360 ${cx} ${cy}" dur="9s" repeatCount="indefinite"/>`)}
      <ellipse cx="${cx}" cy="${cy}" rx="${width * 0.42}" ry="${height * 0.18}" fill="none" stroke="${primary}" stroke-width="${width * 0.006}" stroke-dasharray="${width * 0.12} ${width * 0.08}" opacity="0.35"/>
      <ellipse cx="${cx}" cy="${cy}" rx="${width * 0.31}" ry="${height * 0.29}" fill="none" stroke="${secondary}" stroke-width="${width * 0.004}" stroke-dasharray="${width * 0.035} ${width * 0.09}" opacity="0.3"/>
    </g>
    <circle cx="${width * 0.14}" cy="${height * 0.14}" r="${width * 0.032}" fill="${secondary}" opacity="0.42"/>
    <circle cx="${width * 0.86}" cy="${height * 0.86}" r="${width * 0.032}" fill="${primary}" opacity="0.42"/>
  `;
}

function confettiCrescent(width: number, height: number, primary: string, secondary: string, animate: boolean) {
  const colors = [primary, secondary, '#ffffff', '#22d3ee', '#fb7185'];
  return Array.from({ length: 60 }, (_, index) => {
    const side = index % 2 ? 1 : -1;
    const angle = -1.25 + (index % 30) * 0.086;
    const x = width * (side > 0 ? 0.82 : 0.18) + Math.cos(angle) * width * 0.11 * side;
    const y = height * 0.5 + Math.sin(angle) * height * 0.39;
    const size = width * (0.006 + (index % 3) * 0.0025);
    return `<rect x="${n(x)}" y="${n(y)}" width="${n(size)}" height="${n(size * 2.2)}" rx="${n(size * 0.3)}" fill="${colors[index % colors.length]}" opacity="0.72" transform="rotate(${(index * 37) % 180} ${n(x)} ${n(y)})">
      ${motion(animate, `<animateTransform attributeName="transform" type="translate" values="0 0;0 ${n(height * 0.018)};0 0" dur="${2.2 + (index % 4) * 0.2}s" repeatCount="indefinite"/>`)}
    </rect>`;
  }).join('');
}

function laserGate(width: number, height: number, primary: string, secondary: string, animate: boolean) {
  const beams = Array.from({ length: 7 }, (_, index) => {
    const y1 = height * (0.18 + index * 0.105);
    const y2 = height * (0.82 - index * 0.075);
    return `<path d="M${width * 0.05} ${y1} L${width * 0.32} ${height * 0.5} L${width * 0.05} ${y2}" fill="none" stroke="${index % 2 ? primary : secondary}" stroke-width="${width * 0.0045}" opacity="0.32">
      ${motion(animate, `<animate attributeName="opacity" values="0.12;0.62;0.12" dur="${2 + index * 0.15}s" repeatCount="indefinite"/>`)}
    </path>`;
  }).join('');
  return `${beams}<g transform="translate(${width},0) scale(-1,1)">${beams}</g>${roundedFrame(width, height, primary, secondary, true)}`;
}

function artDeco(width: number, height: number, primary: string, secondary: string, animate: boolean) {
  const deco = (x: number, y: number, flipX: number, flipY: number) => `
    <path d="M${x} ${y + flipY * height * 0.12} V${y} H${x + flipX * width * 0.2}" fill="none" stroke="${primary}" stroke-width="${width * 0.005}" opacity="0.58"/>
    <path d="M${x} ${y + flipY * height * 0.08} L${x + flipX * width * 0.08} ${y} L${x + flipX * width * 0.16} ${y + flipY * height * 0.08}" fill="none" stroke="${secondary}" stroke-width="${width * 0.003}" opacity="0.46"/>
    <path d="M${x + flipX * width * 0.035} ${y + flipY * height * 0.12} L${x + flipX * width * 0.12} ${y + flipY * height * 0.035}" fill="none" stroke="${primary}" stroke-width="${width * 0.0028}" opacity="0.44">
      ${motion(animate, '<animate attributeName="opacity" values="0.2;0.68;0.2" dur="2.8s" repeatCount="indefinite"/>')}
    </path>
  `;
  return `
    ${deco(width * 0.075, height * 0.075, 1, 1)}
    ${deco(width * 0.925, height * 0.075, -1, 1)}
    ${deco(width * 0.925, height * 0.925, -1, -1)}
    ${deco(width * 0.075, height * 0.925, 1, -1)}
    ${roundedFrame(width, height, primary, secondary, false)}
  `;
}

function tropicalPalms(width: number, height: number, primary: string, secondary: string, animate: boolean) {
  const frond = (x: number, y: number, scale: number, rotate: number, color: string) => `<path d="M${x} ${y} C${x + width * 0.04 * scale} ${y - height * 0.08 * Math.abs(scale)}, ${x + width * 0.15 * scale} ${y - height * 0.06 * Math.abs(scale)}, ${x + width * 0.2 * scale} ${y - height * 0.18 * Math.abs(scale)}" fill="none" stroke="${color}" stroke-width="${width * 0.011 * Math.abs(scale)}" stroke-linecap="round" opacity="0.42" transform="rotate(${rotate} ${x} ${y})">
    ${motion(animate, '<animate attributeName="opacity" values="0.22;0.55;0.22" dur="3.3s" repeatCount="indefinite"/>')}
  </path>`;
  return `
    ${Array.from({ length: 8 }, (_, index) => frond(width * 0.08, height * 0.18, 1 - index * 0.045, -42 + index * 16, index % 2 ? primary : secondary)).join('')}
    ${Array.from({ length: 8 }, (_, index) => frond(width * 0.92, height * 0.82, -1 + index * 0.045, 138 + index * 16, index % 2 ? secondary : primary)).join('')}
    ${roundedFrame(width, height, primary, secondary, false)}
  `;
}

function neonBrackets(width: number, height: number, primary: string, secondary: string, animate: boolean) {
  const p = width * 0.065;
  const l = width * 0.18;
  const sw = width * 0.011;
  const dash = animate ? `<animate attributeName="stroke-dashoffset" from="0" to="${width * 0.28}" dur="2.8s" repeatCount="indefinite"/>` : '';
  return `
    <path d="M${p} ${p + l} V${p} H${p + l}" fill="none" stroke="${primary}" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${width * 0.045} ${width * 0.025}" opacity="0.72">${dash}</path>
    <path d="M${width - p - l} ${p} H${width - p} V${p + l}" fill="none" stroke="${secondary}" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${width * 0.045} ${width * 0.025}" opacity="0.72">${dash}</path>
    <path d="M${width - p} ${height - p - l} V${height - p} H${width - p - l}" fill="none" stroke="${primary}" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${width * 0.045} ${width * 0.025}" opacity="0.72">${dash}</path>
    <path d="M${p + l} ${height - p} H${p} V${height - p - l}" fill="none" stroke="${secondary}" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${width * 0.045} ${width * 0.025}" opacity="0.72">${dash}</path>
  `;
}

function bubbleBorder(width: number, height: number, primary: string, secondary: string, animate: boolean) {
  return Array.from({ length: 42 }, (_, index) => {
    const side = index % 4;
    const x = side === 0 ? width * (0.08 + (index % 11) * 0.084) : side === 1 ? width * 0.91 : side === 2 ? width * (0.08 + (index % 11) * 0.084) : width * 0.09;
    const y = side === 0
      ? height * 0.06
      : side === 2
        ? height * 0.94
        : height * (0.09 + (index % 10) * 0.083);
    const r = width * (0.011 + (index % 4) * 0.003);
    return `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="none" stroke="${index % 2 ? primary : secondary}" stroke-width="${n(width * 0.003)}" opacity="0.46">
      ${motion(animate, `<animate attributeName="r" values="${n(r * 0.82)};${n(r * 1.25)};${n(r * 0.82)}" dur="${2.6 + (index % 5) * 0.18}s" repeatCount="indefinite"/>`)}
    </circle>`;
  }).join('');
}

function streamerEdges(width: number, height: number, primary: string, secondary: string, animate: boolean) {
  const streamer = (offset: number, color: string) => `<path d="M${width * -0.02} ${height * offset} C${width * 0.2} ${height * (offset - 0.07)}, ${width * 0.34} ${height * (offset + 0.08)}, ${width * 0.5} ${height * offset} S${width * 0.82} ${height * (offset - 0.08)}, ${width * 1.02} ${height * offset}" fill="none" stroke="${color}" stroke-width="${width * 0.014}" stroke-linecap="round" opacity="0.46">
    ${motion(animate, `<animate attributeName="stroke-dashoffset" from="0" to="${width * 0.18}" dur="3.5s" repeatCount="indefinite"/>`)}
  </path>`;
  return `${streamer(0.1, primary)}${streamer(0.89, secondary)}${streamer(0.16, secondary)}${streamer(0.83, primary)}`;
}

function starfieldEdge(width: number, height: number, primary: string, secondary: string, animate: boolean) {
  return Array.from({ length: 34 }, (_, index) => {
    const side = index % 4;
    const x = side === 0 || side === 2 ? width * (0.07 + (index % 9) * 0.105) : side === 1 ? width * 0.93 : width * 0.07;
    const y = side === 0 ? height * 0.07 : side === 2 ? height * 0.93 : height * (0.1 + (index % 8) * 0.1);
    return star(x, y, width * (0.007 + (index % 4) * 0.004), index % 2 ? primary : secondary, 0.42 + (index % 4) * 0.11, animate);
  }).join('');
}

function prismCorners(width: number, height: number, primary: string, secondary: string, animate: boolean) {
  const prism = (x: number, y: number, flipX: number, flipY: number, color: string) => `
    <path d="M${x} ${y} L${x + flipX * width * 0.16} ${y + flipY * height * 0.03} L${x + flipX * width * 0.07} ${y + flipY * height * 0.16} Z" fill="${color}" opacity="0.18"/>
    <path d="M${x + flipX * width * 0.16} ${y + flipY * height * 0.03} L${x + flipX * width * 0.22} ${y + flipY * height * 0.15} L${x + flipX * width * 0.07} ${y + flipY * height * 0.16} Z" fill="${secondary}" opacity="0.13">
      ${motion(animate, '<animate attributeName="opacity" values="0.08;0.28;0.08" dur="3s" repeatCount="indefinite"/>')}
    </path>
  `;
  return `${prism(width * 0.05, height * 0.05, 1, 1, primary)}${prism(width * 0.95, height * 0.05, -1, 1, secondary)}${prism(width * 0.95, height * 0.95, -1, -1, primary)}${prism(width * 0.05, height * 0.95, 1, -1, secondary)}${roundedFrame(width, height, primary, secondary, false)}`;
}

function soundwaveSides(width: number, height: number, primary: string, secondary: string, animate: boolean) {
  return Array.from({ length: 24 }, (_, index) => {
    const side = index % 2 ? width * 0.93 : width * 0.07;
    const y = height * (0.1 + Math.floor(index / 2) * 0.07);
    const bar = width * (0.035 + (index % 6) * 0.01);
    return `<rect x="${n(side - (index % 2 ? bar : 0))}" y="${n(y)}" width="${n(bar)}" height="${n(height * 0.012)}" rx="${n(width * 0.006)}" fill="${index % 3 ? primary : secondary}" opacity="0.45">
      ${motion(animate, `<animate attributeName="width" values="${n(bar * 0.45)};${n(bar)};${n(bar * 0.45)}" dur="${1.4 + (index % 5) * 0.18}s" repeatCount="indefinite"/>`)}
    </rect>`;
  }).join('');
}

function champagneBubbles(width: number, height: number, primary: string, secondary: string, animate: boolean) {
  return Array.from({ length: 36 }, (_, index) => {
    const x = width * (0.08 + ((index * 29) % 85) / 100);
    const y = height * (0.72 + ((index * 17) % 22) / 100);
    const r = width * (0.006 + (index % 5) * 0.003);
    return `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="none" stroke="${index % 2 ? primary : secondary}" stroke-width="${n(width * 0.0025)}" opacity="0.52">
      ${motion(animate, `<animate attributeName="cy" values="${n(y)};${n(y - height * 0.12)};${n(y)}" dur="${3 + (index % 5) * 0.22}s" repeatCount="indefinite"/>`)}
    </circle>`;
  }).join('') + roundedFrame(width, height, primary, secondary, false);
}

function petalDrift(width: number, height: number, primary: string, secondary: string, animate: boolean) {
  return Array.from({ length: 26 }, (_, index) => {
    const side = index % 2 ? 0.88 : 0.12;
    const x = width * (side + (((index * 13) % 8) - 4) / 100);
    const y = height * (0.08 + (index % 13) * 0.07);
    const s = width * (0.013 + (index % 3) * 0.004);
    return `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(s * 0.55)}" ry="${n(s * 1.25)}" fill="${index % 2 ? primary : secondary}" opacity="0.35" transform="rotate(${(index * 31) % 180} ${n(x)} ${n(y)})">
      ${motion(animate, `<animate attributeName="cy" values="${n(y)};${n(y + height * 0.03)};${n(y)}" dur="${3.2 + (index % 4) * 0.2}s" repeatCount="indefinite"/>`)}
    </ellipse>`;
  }).join('');
}

function pixelGlitch(width: number, height: number, primary: string, secondary: string, animate: boolean) {
  return Array.from({ length: 42 }, (_, index) => {
    const side = index % 4;
    const x = side === 0 ? width * (0.06 + (index % 11) * 0.08) : side === 1 ? width * 0.9 : side === 2 ? width * (0.06 + (index % 11) * 0.08) : width * 0.06;
    const y = side === 0 ? height * 0.06 : side === 2 ? height * 0.91 : height * (0.08 + (index % 10) * 0.084);
    const w = width * (0.014 + (index % 4) * 0.008);
    return `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(width * 0.012)}" fill="${index % 2 ? primary : secondary}" opacity="0.46">
      ${motion(animate, `<animate attributeName="x" values="${n(x)};${n(x + width * 0.018)};${n(x)}" dur="${1.2 + (index % 5) * 0.16}s" repeatCount="indefinite"/>`)}
    </rect>`;
  }).join('');
}

function focusMarks(width: number, height: number, primary: string, secondary: string, animate: boolean) {
  const p = width * 0.09;
  const l = width * 0.12;
  const sw = width * 0.006;
  return `
    ${line(p, p, p + l, p, primary, sw, 0.65)}
    ${line(p, p, p, p + l, primary, sw, 0.65)}
    ${line(width - p, p, width - p - l, p, primary, sw, 0.65)}
    ${line(width - p, p, width - p, p + l, primary, sw, 0.65)}
    ${line(p, height - p, p + l, height - p, primary, sw, 0.65)}
    ${line(p, height - p, p, height - p - l, primary, sw, 0.65)}
    ${line(width - p, height - p, width - p - l, height - p, primary, sw, 0.65)}
    ${line(width - p, height - p, width - p, height - p - l, primary, sw, 0.65)}
    <circle cx="${width * 0.5}" cy="${height * 0.5}" r="${width * 0.017}" fill="none" stroke="${secondary}" stroke-width="${width * 0.003}" opacity="0.34">
      ${motion(animate, `<animate attributeName="r" values="${n(width * 0.012)};${n(width * 0.028)};${n(width * 0.012)}" dur="2.6s" repeatCount="indefinite"/>`)}
    </circle>
  `;
}

function marbleVeins(width: number, height: number, primary: string, secondary: string, animate: boolean) {
  return `
    ${roundedFrame(width, height, primary, secondary, false)}
    <path d="M${width * 0.08} ${height * 0.18} C${width * 0.22} ${height * 0.09}, ${width * 0.19} ${height * 0.31}, ${width * 0.33} ${height * 0.25} C${width * 0.5} ${height * 0.18}, ${width * 0.44} ${height * 0.08}, ${width * 0.6} ${height * 0.06}" fill="none" stroke="${secondary}" stroke-width="${width * 0.003}" opacity="0.34">
      ${motion(animate, '<animate attributeName="opacity" values="0.15;0.48;0.15" dur="4s" repeatCount="indefinite"/>')}
    </path>
    <path d="M${width * 0.92} ${height * 0.83} C${width * 0.76} ${height * 0.9}, ${width * 0.78} ${height * 0.7}, ${width * 0.64} ${height * 0.75} C${width * 0.5} ${height * 0.8}, ${width * 0.53} ${height * 0.93}, ${width * 0.38} ${height * 0.94}" fill="none" stroke="${primary}" stroke-width="${width * 0.003}" opacity="0.34"/>
  `;
}

function sunburstCorners(width: number, height: number, primary: string, secondary: string, animate: boolean) {
  const rays = (cx: number, cy: number, start: number, end: number) => Array.from({ length: 11 }, (_, index) => {
    const a = start + (end - start) * (index / 10);
    const x = cx + Math.cos(a) * width * 0.22;
    const y = cy + Math.sin(a) * width * 0.22;
    return line(cx, cy, x, y, index % 2 ? primary : secondary, width * 0.006, 0.38 + index * 0.015, motion(animate, '<animate attributeName="opacity" values="0.18;0.58;0.18" dur="2.9s" repeatCount="indefinite"/>'));
  }).join('');
  return `${rays(width * 0.07, height * 0.07, 0, Math.PI / 2)}${rays(width * 0.93, height * 0.93, Math.PI, Math.PI * 1.5)}${roundedFrame(width, height, primary, secondary, false)}`;
}

function frostSpark(width: number, height: number, primary: string, secondary: string, animate: boolean) {
  const snow = (x: number, y: number, r: number) => `
    ${line(x - r, y, x + r, y, primary, width * 0.0028, 0.5)}
    ${line(x, y - r, x, y + r, primary, width * 0.0028, 0.5)}
    ${line(x - r * 0.7, y - r * 0.7, x + r * 0.7, y + r * 0.7, secondary, width * 0.0022, 0.42)}
    ${line(x + r * 0.7, y - r * 0.7, x - r * 0.7, y + r * 0.7, secondary, width * 0.0022, 0.42)}
  `;
  return Array.from({ length: 20 }, (_, index) => {
    const x = index % 2 ? width * 0.88 : width * 0.12;
    const y = height * (0.08 + (index % 10) * 0.09);
    return `<g>${motion(animate, `<animateTransform attributeName="transform" type="rotate" from="0 ${x} ${y}" to="360 ${x} ${y}" dur="${5 + (index % 4)}s" repeatCount="indefinite"/>`)}${snow(x, y, width * (0.012 + (index % 3) * 0.004))}</g>`;
  }).join('') + roundedFrame(width, height, primary, secondary, false);
}

function cometTrails(width: number, height: number, primary: string, secondary: string, animate: boolean) {
  const comet = (x: number, y: number, flip: number, color: string, delay: number) => `
    <path d="M${x} ${y} C${x - flip * width * 0.12} ${y - height * 0.035}, ${x - flip * width * 0.2} ${y - height * 0.075}, ${x - flip * width * 0.3} ${y - height * 0.02}" fill="none" stroke="${color}" stroke-width="${width * 0.009}" stroke-linecap="round" opacity="0.42">
      ${motion(animate, `<animate attributeName="opacity" values="0.16;0.58;0.16" dur="2.5s" begin="${delay}s" repeatCount="indefinite"/>`)}
    </path>
    <circle cx="${x}" cy="${y}" r="${width * 0.015}" fill="${color}" opacity="0.62"/>
  `;
  return `${comet(width * 0.86, height * 0.18, 1, primary, 0)}${comet(width * 0.14, height * 0.42, -1, secondary, 0.4)}${comet(width * 0.82, height * 0.78, 1, secondary, 0.8)}${roundedFrame(width, height, primary, secondary, false)}`;
}

function inkBrush(width: number, height: number, primary: string, secondary: string, animate: boolean) {
  return `
    <path d="M${width * 0.05} ${height * 0.08} C${width * 0.18} ${height * 0.06}, ${width * 0.25} ${height * 0.12}, ${width * 0.36} ${height * 0.07}" fill="none" stroke="${primary}" stroke-width="${width * 0.026}" stroke-linecap="round" opacity="0.38">
      ${motion(animate, '<animate attributeName="opacity" values="0.2;0.48;0.2" dur="3.1s" repeatCount="indefinite"/>')}
    </path>
    <path d="M${width * 0.95} ${height * 0.92} C${width * 0.82} ${height * 0.94}, ${width * 0.75} ${height * 0.88}, ${width * 0.64} ${height * 0.93}" fill="none" stroke="${secondary}" stroke-width="${width * 0.026}" stroke-linecap="round" opacity="0.38"/>
    ${Array.from({ length: 16 }, (_, index) => star(width * (index % 2 ? 0.86 : 0.14), height * (0.12 + (index % 8) * 0.095), width * 0.006, index % 2 ? primary : secondary, 0.45, animate)).join('')}
  `;
}

function designLayer(template: CuratedTemplateAsset, width: number, height: number) {
  const { primary, secondary } = template.colors;
  const animate = template.type === 'animated';

  switch (template.designId as CuratedDesignId) {
    case 'aurora_ribbon': return auroraRibbon(width, height, primary, secondary, animate);
    case 'crystal_corners': return crystalCorners(width, height, primary, secondary, animate);
    case 'film_perforation': return filmPerforation(width, height, primary, secondary, animate);
    case 'botanical_vines': return botanicalVines(width, height, primary, secondary, animate);
    case 'chrome_orbit': return chromeOrbit(width, height, primary, secondary, animate);
    case 'confetti_crescent': return confettiCrescent(width, height, primary, secondary, animate);
    case 'laser_gate': return laserGate(width, height, primary, secondary, animate);
    case 'art_deco': return artDeco(width, height, primary, secondary, animate);
    case 'tropical_palms': return tropicalPalms(width, height, primary, secondary, animate);
    case 'neon_brackets': return neonBrackets(width, height, primary, secondary, animate);
    case 'bubble_border': return bubbleBorder(width, height, primary, secondary, animate);
    case 'streamer_edges': return streamerEdges(width, height, primary, secondary, animate);
    case 'starfield_edge': return starfieldEdge(width, height, primary, secondary, animate);
    case 'prism_corners': return prismCorners(width, height, primary, secondary, animate);
    case 'soundwave_sides': return soundwaveSides(width, height, primary, secondary, animate);
    case 'champagne_bubbles': return champagneBubbles(width, height, primary, secondary, animate);
    case 'petal_drift': return petalDrift(width, height, primary, secondary, animate);
    case 'pixel_glitch': return pixelGlitch(width, height, primary, secondary, animate);
    case 'focus_marks': return focusMarks(width, height, primary, secondary, animate);
    case 'marble_veins': return marbleVeins(width, height, primary, secondary, animate);
    case 'sunburst_corners': return sunburstCorners(width, height, primary, secondary, animate);
    case 'frost_spark': return frostSpark(width, height, primary, secondary, animate);
    case 'comet_trails': return cometTrails(width, height, primary, secondary, animate);
    case 'ink_brush': return inkBrush(width, height, primary, secondary, animate);
    default: return roundedFrame(width, height, primary, secondary, animate);
  }
}

export function renderCuratedTemplateSvg(template: CuratedTemplateAsset) {
  const { width, height } = aspectSize(template.aspectRatio);
  const blur = Math.max(8, width * 0.014);
  const layer = designLayer(template, width, height);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
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
  <g filter="url(#six3CuratedGlow)">
    ${layer}
  </g>
</svg>`;
}
