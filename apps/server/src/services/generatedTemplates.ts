import { Buffer } from 'node:buffer';
import sharp from 'sharp';

const CATEGORIES = ['party', 'wedding', 'corporate', 'birthday', 'viral', 'premium'] as const;
const ASPECTS = ['9:16', '16:9'] as const;

type TemplateCategory = (typeof CATEGORIES)[number];
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
  | 'minimal_luxe';

type ThemePack = {
  title: string;
  badge: string;
  footer: string;
  palettes: [string, string, string][];
  layouts: LayoutKey[];
};

const EFFECTS_BY_CATEGORY: Record<TemplateCategory, string[]> = {
  party: ['party', 'neon', 'speed_ramp'],
  wedding: ['wedding_soft', 'cinematic', 'slow_motion'],
  corporate: ['corporate_sharp', 'clean', 'cinematic'],
  birthday: ['party', 'boomerang', 'neon'],
  viral: ['speed_ramp', 'glitch_flash', 'neon'],
  premium: ['luxury', 'cinematic', 'slow_motion'],
};

const THEMES: Record<TemplateCategory, ThemePack[]> = {
  birthday: [
    {
      title: 'Birthday Clip',
      badge: 'HAPPY BIRTHDAY',
      footer: 'CELEBRATION MODE',
      palettes: [['#ff3d8d', '#ffd166', '#38f6ff'], ['#7c3aed', '#ffb703', '#f9fafb']],
      layouts: ['poster_clip', 'confetti_arch', 'snap_filter'],
    },
    {
      title: 'Cake Pop',
      badge: 'MAKE A WISH',
      footer: '360 PARTY MOMENT',
      palettes: [['#f43f5e', '#fef08a', '#60a5fa'], ['#fb7185', '#22d3ee', '#fde68a']],
      layouts: ['event_badge', 'poster_clip', 'neon_corners'],
    },
    {
      title: 'Balloon Room',
      badge: 'BIRTHDAY VIBES',
      footer: 'SMILE SPIN SHARE',
      palettes: [['#ec4899', '#8b5cf6', '#facc15'], ['#0ea5e9', '#f97316', '#f8fafc']],
      layouts: ['snap_filter', 'confetti_arch', 'applay_flow'],
    },
  ],
  party: [
    {
      title: 'Neon Club',
      badge: 'PARTY NIGHT',
      footer: 'LIGHTS CAMERA SPIN',
      palettes: [['#ff2d75', '#29f4d5', '#8b5cf6'], ['#00f5ff', '#f000ff', '#f8fafc']],
      layouts: ['neon_corners', 'applay_flow', 'glitch_reel'],
    },
    {
      title: 'Disco Pulse',
      badge: 'DANCE FLOOR',
      footer: '360 EXPERIENCE',
      palettes: [['#f97316', '#22c55e', '#fef3c7'], ['#111827', '#f6c453', '#a78bfa']],
      layouts: ['confetti_arch', 'event_badge', 'chrome_frame'],
    },
    {
      title: 'Festival Glow',
      badge: 'LIVE MOMENT',
      footer: 'POST READY',
      palettes: [['#7c3aed', '#00d4ff', '#f9fafb'], ['#db2777', '#84cc16', '#fefce8']],
      layouts: ['poster_clip', 'neon_corners', 'applay_flow'],
    },
  ],
  wedding: [
    {
      title: 'Soft Wedding',
      badge: 'JUST MARRIED',
      footer: 'LOVE STORY 360',
      palettes: [['#f8fafc', '#d6b26e', '#f5d0fe'], ['#fff7ed', '#a16207', '#fb7185']],
      layouts: ['floral_crown', 'luxury_corners', 'minimal_luxe'],
    },
    {
      title: 'Garden Vows',
      badge: 'LOVE IN MOTION',
      footer: 'FOREVER MOMENT',
      palettes: [['#fef9c3', '#86efac', '#f9a8d4'], ['#f8fafc', '#94a3b8', '#f0abfc']],
      layouts: ['floral_crown', 'snap_filter', 'cinematic_band'],
    },
    {
      title: 'Golden Toast',
      badge: 'CELEBRATE LOVE',
      footer: 'ELEGANT CAPTURE',
      palettes: [['#111827', '#facc15', '#f8fafc'], ['#2f1b45', '#f5c76b', '#fde68a']],
      layouts: ['luxury_corners', 'minimal_luxe', 'event_badge'],
    },
  ],
  corporate: [
    {
      title: 'Brand Summit',
      badge: 'BRAND EVENT',
      footer: 'PROFESSIONAL CAPTURE',
      palettes: [['#0f172a', '#38bdf8', '#e2e8f0'], ['#111827', '#a3e635', '#f8fafc']],
      layouts: ['cinematic_band', 'chrome_frame', 'event_badge'],
    },
    {
      title: 'Launch Grid',
      badge: 'PRODUCT LAUNCH',
      footer: 'READY TO SHARE',
      palettes: [['#020617', '#6366f1', '#f8fafc'], ['#172554', '#22d3ee', '#fefce8']],
      layouts: ['chrome_frame', 'applay_flow', 'minimal_luxe'],
    },
    {
      title: 'Expo Clean',
      badge: 'NETWORKING',
      footer: 'SIX3 360 STUDIO',
      palettes: [['#18181b', '#fafafa', '#60a5fa'], ['#0f172a', '#f59e0b', '#f9fafb']],
      layouts: ['snap_filter', 'cinematic_band', 'chrome_frame'],
    },
  ],
  viral: [
    {
      title: 'Reels Pop',
      badge: 'VIRAL READY',
      footer: 'CUT SPIN POST',
      palettes: [['#ff0050', '#00f2ea', '#f8fafc'], ['#7c3aed', '#22d3ee', '#fef08a']],
      layouts: ['glitch_reel', 'applay_flow', 'neon_corners'],
    },
    {
      title: 'Speed Ramp',
      badge: 'FAST CUT',
      footer: 'AUTO EDIT ENERGY',
      palettes: [['#111827', '#f97316', '#e0f2fe'], ['#18181b', '#a855f7', '#22c55e']],
      layouts: ['applay_flow', 'chrome_frame', 'glitch_reel'],
    },
    {
      title: 'Creator Frame',
      badge: 'TREND MODE',
      footer: 'SHARE IN SECONDS',
      palettes: [['#0f172a', '#f43f5e', '#38bdf8'], ['#0a0a0a', '#facc15', '#ec4899']],
      layouts: ['event_badge', 'glitch_reel', 'snap_filter'],
    },
  ],
  premium: [
    {
      title: 'Luxury Frame',
      badge: 'PREMIUM NIGHT',
      footer: 'SIGNATURE EXPERIENCE',
      palettes: [['#050505', '#f6c453', '#fef3c7'], ['#160b2f', '#c084fc', '#f8fafc']],
      layouts: ['luxury_corners', 'minimal_luxe', 'cinematic_band'],
    },
    {
      title: 'Chrome Gala',
      badge: 'VIP MOMENT',
      footer: 'HIGH END CAPTURE',
      palettes: [['#030712', '#93c5fd', '#f8fafc'], ['#111111', '#d4af37', '#e5e7eb']],
      layouts: ['chrome_frame', 'luxury_corners', 'applay_flow'],
    },
    {
      title: 'Crystal Glow',
      badge: 'UNLIMITED STYLE',
      footer: 'SIX3 SIGNATURE',
      palettes: [['#1e1b4b', '#67e8f9', '#f5d0fe'], ['#09090b', '#a78bfa', '#fefce8']],
      layouts: ['minimal_luxe', 'neon_corners', 'event_badge'],
    },
  ],
};

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

function templateName(theme: ThemePack, aspectRatio: TemplateAspect, index: number) {
  const suffix = aspectRatio === '16:9' ? 'Landscape' : 'Portrait';
  return `${theme.title} ${suffix} ${String(index + 1).padStart(3, '0')}`;
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

function renderLayout(ctx: TemplateContext) {
  const common = [lineFrame(ctx)];

  if (ctx.layout === 'poster_clip') {
    return [...common, posterStrips(ctx), balloonCluster(ctx), confetti(ctx, ctx.aspectRatio === '16:9' ? 26 : 36, 'top'), badge(ctx)].join('');
  }

  if (ctx.layout === 'snap_filter') {
    return [...common, topRibbon(ctx), sideRails(ctx), eventDots(ctx), sparkles(ctx, 12), badge(ctx, true)].join('');
  }

  if (ctx.layout === 'applay_flow') {
    return [...common, chromeCurves(ctx), equalizer(ctx), topRibbon(ctx), sparkles(ctx, 10), badge(ctx, true)].join('');
  }

  if (ctx.layout === 'neon_corners') {
    return [...common, sideRails(ctx), sparkles(ctx, 18), confetti(ctx, 18, 'sides'), badge(ctx)].join('');
  }

  if (ctx.layout === 'floral_crown') {
    const s = ctx.aspectRatio === '16:9' ? ctx.height * 0.12 : ctx.width * 0.16;
    return [
      ...common,
      flowerCluster(ctx, ctx.margin * 0.8, ctx.margin * 0.7, s),
      flowerCluster(ctx, ctx.width - ctx.margin * 0.8, ctx.margin * 0.7, s, -1),
      flowerCluster(ctx, ctx.margin * 0.8, ctx.height - ctx.margin - s * 1.65, s * 0.8),
      rings(ctx),
      badge(ctx, true),
    ].join('');
  }

  if (ctx.layout === 'luxury_corners') {
    return [...common, luxuryOrnaments(ctx), sparkles(ctx, 8), badge(ctx, true)].join('');
  }

  if (ctx.layout === 'glitch_reel') {
    return [...common, glitchBars(ctx), equalizer(ctx), topRibbon(ctx), badge(ctx, true)].join('');
  }

  if (ctx.layout === 'cinematic_band') {
    return [...common, topRibbon(ctx), chromeCurves(ctx), corporateGrid(ctx), badge(ctx)].join('');
  }

  if (ctx.layout === 'confetti_arch') {
    return [...common, confetti(ctx, ctx.aspectRatio === '16:9' ? 42 : 58, 'top'), confetti(ctx, 18, 'bottom'), balloonCluster(ctx), cakeIcon(ctx), badge(ctx)].join('');
  }

  if (ctx.layout === 'event_badge') {
    return [...common, topRibbon(ctx), eventDots(ctx), cakeOrCategoryMark(ctx), badge(ctx)].join('');
  }

  if (ctx.layout === 'chrome_frame') {
    return [...common, chromeCurves(ctx), corporateGrid(ctx), glitchBars({ ...ctx, index: ctx.index + 7 }), badge(ctx, true)].join('');
  }

  return [...common, luxuryOrnaments(ctx), sideRails(ctx), sparkles(ctx, 12), badge(ctx, true)].join('');
}

function cakeOrCategoryMark(ctx: TemplateContext) {
  if (ctx.category === 'birthday') return cakeIcon(ctx);
  if (ctx.category === 'wedding') return rings(ctx);
  if (ctx.category === 'corporate') return corporateGrid(ctx);
  if (ctx.category === 'viral') return glitchBars(ctx);
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

  return `<?xml version="1.0" encoding="UTF-8"?>
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
}

export function generatedTemplatePath(template: { id: string; category: string; aspectRatio?: string }) {
  const aspect = (template.aspectRatio || '9:16').replace(':', 'x');
  return `generated-v2/${template.category}/${aspect}/${template.id}.png`;
}

export async function renderTemplatePng(svg: string) {
  return sharp(Buffer.from(svg))
    .png({ compressionLevel: 6, adaptiveFiltering: true })
    .toBuffer();
}

type BuildGeneratedTemplatesOptions = {
  includeSvg?: boolean;
  includeDataUrl?: boolean;
};

export function buildGeneratedTemplates(count = 720, offset = 0, options: BuildGeneratedTemplatesOptions = {}) {
  const includeSvg = options.includeSvg ?? true;
  const includeDataUrl = options.includeDataUrl ?? true;
  const now = new Date().toISOString();
  return Array.from({ length: count }, (_, batchIndex) => {
    const index = offset + batchIndex;
    const category = CATEGORIES[index % CATEGORIES.length];
    const aspectRatio = ASPECTS[Math.floor(index / CATEGORIES.length) % ASPECTS.length];
    const theme = pick(THEMES[category], Math.floor(index / (CATEGORIES.length * ASPECTS.length)));
    const [primary, secondary, accent] = pick(theme.palettes, Math.floor(index / (CATEGORIES.length * ASPECTS.length * THEMES[category].length)) + index);
    const layout = pick(theme.layouts, Math.floor(index / (CATEGORIES.length * ASPECTS.length)) + index);
    const name = templateName(theme, aspectRatio, index);
    const svg = (includeSvg || includeDataUrl) ? templateSvg({ name, category, primary, secondary, accent, aspectRatio, index, theme, layout }) : '';
    const id = `generated-${index + 1}`;

    return {
      id,
      name,
      category,
      colors: { primary, secondary },
      font: 'Inter',
      overlayUrl: includeDataUrl ? `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}` : undefined,
      storagePath: generatedTemplatePath({ id, category, aspectRatio }),
      aspectRatio,
      effects: EFFECTS_BY_CATEGORY[category],
      isGlobal: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      svg: includeSvg ? svg : '',
    };
  });
}
