import { Buffer } from 'node:buffer';
import sharp from 'sharp';

const CATEGORIES = ['party', 'wedding', 'corporate', 'birthday', 'viral', 'premium'] as const;
const ASPECTS = ['9:16', '1:1', '16:9'] as const;
const EFFECTS_BY_CATEGORY: Record<string, string[]> = {
  party: ['party', 'neon', 'speed_ramp'],
  wedding: ['wedding_soft', 'cinematic', 'slow_motion'],
  corporate: ['corporate_sharp', 'clean', 'cinematic'],
  birthday: ['party', 'boomerang', 'neon'],
  viral: ['speed_ramp', 'glitch_flash', 'neon'],
  premium: ['luxury', 'cinematic', 'slow_motion'],
};

const PALETTES = [
  ['#7c3aed', '#00d4ff'],
  ['#111827', '#f6c453'],
  ['#ff2d75', '#29f4d5'],
  ['#0f172a', '#f8fafc'],
  ['#f97316', '#22c55e'],
  ['#e11d48', '#fef3c7'],
  ['#2563eb', '#a3e635'],
  ['#111111', '#a78bfa'],
];

function aspectSize(aspect: string) {
  if (aspect === '1:1') return { width: 1080, height: 1080 };
  if (aspect === '16:9') return { width: 1920, height: 1080 };
  return { width: 1080, height: 1920 };
}

function templateName(category: string, index: number) {
  const names = {
    party: 'Pulse Party',
    wedding: 'Soft Wedding',
    corporate: 'Sharp Corporate',
    birthday: 'Pop Birthday',
    viral: 'Viral Motion',
    premium: 'Luxury Frame',
  } as Record<string, string>;
  return `${names[category]} ${String(index + 1).padStart(3, '0')}`;
}

export function templateSvg(params: {
  name: string;
  category: string;
  primary: string;
  secondary: string;
  aspectRatio: string;
  index: number;
}) {
  const { width, height } = aspectSize(params.aspectRatio);
  const stroke = Math.max(10, Math.round(width * 0.018));
  const corner = Math.round(width * 0.08);
  const safe = Math.round(width * 0.07);
  const topY = Math.round(height * 0.06);
  const bottomY = Math.round(height * 0.88);
  const badgeY = Math.round(height * 0.815);
  const patternOpacity = params.index % 3 === 0 ? 0.22 : 0.14;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${params.primary}"/>
      <stop offset="1" stop-color="${params.secondary}"/>
    </linearGradient>
    <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="${Math.round(stroke * 0.7)}" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect x="${safe}" y="${safe}" width="${width - safe * 2}" height="${height - safe * 2}" rx="${corner}" fill="none" stroke="url(#g)" stroke-width="${stroke}" filter="url(#glow)" opacity="0.94"/>
  <path d="M${safe * 1.3} ${topY} C${width * 0.32} ${topY - safe}, ${width * 0.68} ${topY + safe}, ${width - safe * 1.3} ${topY}" fill="none" stroke="${params.secondary}" stroke-width="${Math.max(4, Math.round(stroke * 0.35))}" opacity="${patternOpacity}"/>
  <path d="M${safe * 1.3} ${height - topY} C${width * 0.32} ${height - topY + safe}, ${width * 0.68} ${height - topY - safe}, ${width - safe * 1.3} ${height - topY}" fill="none" stroke="${params.primary}" stroke-width="${Math.max(4, Math.round(stroke * 0.35))}" opacity="${patternOpacity}"/>
  <g font-family="Inter, Arial, sans-serif" text-anchor="middle">
    <rect x="${safe * 1.5}" y="${badgeY}" width="${width - safe * 3}" height="${Math.round(height * 0.06)}" rx="${Math.round(height * 0.03)}" fill="#000" opacity="0.26"/>
    <text x="${width / 2}" y="${badgeY + Math.round(height * 0.039)}" fill="#fff" font-size="${Math.round(width * 0.036)}" font-weight="800" letter-spacing="0">${params.name}</text>
    <text x="${width / 2}" y="${bottomY}" fill="${params.secondary}" font-size="${Math.round(width * 0.026)}" font-weight="700" letter-spacing="0">SIX3 360 EXPERIENCE</text>
  </g>
</svg>`;
}

export function generatedTemplatePath(template: { id: string; category: string }) {
  return `generated/${template.category}/${template.id}.png`;
}

export async function renderTemplatePng(svg: string) {
  return sharp(Buffer.from(svg))
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}

export function buildGeneratedTemplates(count = 360) {
  const now = new Date().toISOString();
  return Array.from({ length: count }, (_, index) => {
    const category = CATEGORIES[index % CATEGORIES.length];
    const aspectRatio = ASPECTS[index % ASPECTS.length];
    const [primary, secondary] = PALETTES[index % PALETTES.length];
    const name = templateName(category, index);
    const svg = templateSvg({ name, category, primary, secondary, aspectRatio, index });

    return {
      id: `generated-${index + 1}`,
      name,
      category,
      colors: { primary, secondary },
      font: 'Inter',
      overlayUrl: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
      storagePath: generatedTemplatePath({ id: `generated-${index + 1}`, category }),
      aspectRatio,
      effects: EFFECTS_BY_CATEGORY[category],
      isGlobal: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      svg,
    };
  });
}
