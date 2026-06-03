import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { GENERATED_TEMPLATE_CATALOG_SIZE, buildGeneratedTemplates, renderTemplatePng } from './generatedTemplates';

type BaseTemplate = ReturnType<typeof buildGeneratedTemplates>[number];

export const GENERATED_ANIMATED_TEMPLATE_CATALOG_SIZE = 480;

export type GeneratedAnimatedTemplate = Omit<BaseTemplate, 'id' | 'name' | 'storagePath' | 'overlayUrl'> & {
  id: string;
  name: string;
  storagePath: string;
  animationStoragePath: string;
  overlayUrl: string | undefined;
  animationUrl?: string;
};

function animatedTemplatePath(template: { id: string; category: string; aspectRatio: string }) {
  const aspect = template.aspectRatio.replace(':', 'x');
  return `animated-v1/${template.category}/${aspect}/${template.id}.webm`;
}

function animatedSize(aspectRatio: string) {
  if (aspectRatio === '16:9') return { width: 1280, height: 720 };
  return { width: 720, height: 1280 };
}

function runBinary(command: string, args: string[]) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(new Error(stderr.trim() || `COMMAND_FAILED_${code}`));
    });
  });
}

function phase(frame: number, frames: number) {
  return (Math.PI * 2 * frame) / frames;
}

function wave(frame: number, frames: number, offset = 0) {
  return Math.sin(phase(frame, frames) + offset);
}

function color(template: BaseTemplate, index: number) {
  const colors = [template.colors.primary, template.colors.secondary, '#ffffff', '#facc15', '#67e8f9', '#f472b6'];
  return colors[index % colors.length];
}

function rect(x: number, y: number, width: number, height: number, fill: string, opacity = 0.85, rotate = 0) {
  const cx = x + width / 2;
  const cy = y + height / 2;
  return `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${width.toFixed(2)}" height="${height.toFixed(2)}" rx="${Math.min(width, height) / 3}" fill="${fill}" opacity="${opacity}" transform="rotate(${rotate.toFixed(2)} ${cx.toFixed(2)} ${cy.toFixed(2)})"/>`;
}

function sparkle(x: number, y: number, size: number, fill: string, opacity = 0.88) {
  return `<path d="M${x} ${y - size} L${x + size * 0.26} ${y - size * 0.26} L${x + size} ${y} L${x + size * 0.26} ${y + size * 0.26} L${x} ${y + size} L${x - size * 0.26} ${y + size * 0.26} L${x - size} ${y} L${x - size * 0.26} ${y - size * 0.26} Z" fill="${fill}" opacity="${opacity}"/>`;
}

function confetti(template: BaseTemplate, width: number, height: number, frame: number, frames: number) {
  const topBand = height * 0.23;
  return Array.from({ length: 34 }, (_, i) => {
    const drift = wave(frame, frames, i * 0.6) * width * 0.018;
    const x = ((i * 97 + frame * 13) % Math.round(width * 0.92)) + width * 0.04 + drift;
    const y = (((i * 73 + frame * 28) % Math.round(topBand)) + height * 0.035);
    const s = Math.max(5, width * (0.007 + (i % 4) * 0.002));
    return i % 5 === 0
      ? `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${(s * 0.48).toFixed(2)}" fill="${color(template, i)}" opacity="0.8"/>`
      : rect(x, y, s * 0.52, s * 1.45, color(template, i), 0.78, frame * 18 + i * 27);
  }).join('');
}

function equalizer(template: BaseTemplate, width: number, height: number, frame: number, frames: number) {
  const bars = template.aspectRatio === '16:9' ? 42 : 24;
  const baseY = height * 0.92;
  const maxH = height * 0.075;
  return Array.from({ length: bars }, (_, i) => {
    const h = maxH * (0.24 + 0.76 * Math.abs(wave(frame, frames, i * 0.4)));
    const x = width * 0.08 + (i * width * 0.84) / bars;
    return rect(x, baseY - h / 2, Math.max(3, width / bars * 0.32), h, color(template, i), 0.46 + (i % 3) * 0.11);
  }).join('');
}

function laserSweep(template: BaseTemplate, width: number, height: number, frame: number, frames: number) {
  const p = frame / frames;
  const y1 = height * (0.22 + 0.16 * wave(frame, frames));
  const y2 = height * (0.72 + 0.16 * wave(frame, frames, Math.PI));
  const x = width * (0.12 + p * 0.76);
  return `
    <path d="M${width * 0.02} ${y1} C${width * 0.3} ${y1 - height * 0.08}, ${width * 0.62} ${y1 + height * 0.11}, ${width * 0.98} ${y1 - height * 0.03}" fill="none" stroke="${template.colors.primary}" stroke-width="${width * 0.011}" stroke-linecap="round" opacity="0.55"/>
    <path d="M${width * 0.98} ${y2} C${width * 0.72} ${y2 + height * 0.1}, ${width * 0.33} ${y2 - height * 0.11}, ${width * 0.02} ${y2 + height * 0.02}" fill="none" stroke="${template.colors.secondary}" stroke-width="${width * 0.011}" stroke-linecap="round" opacity="0.5"/>
    ${sparkle(x, height * 0.18, width * 0.018, '#ffffff', 0.86)}
  `;
}

function petals(template: BaseTemplate, width: number, height: number, frame: number, frames: number) {
  return Array.from({ length: 20 }, (_, i) => {
    const side = i % 2 === 0 ? -1 : 1;
    const x = side < 0
      ? width * 0.08 + Math.abs(wave(frame, frames, i)) * width * 0.18
      : width * 0.92 - Math.abs(wave(frame, frames, i)) * width * 0.18;
    const y = (height * 0.08 + ((i * 89 + frame * 12) % Math.round(height * 0.78)));
    const s = width * (0.012 + (i % 4) * 0.003);
    return `<ellipse cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" rx="${(s * 0.42).toFixed(2)}" ry="${s.toFixed(2)}" fill="${color(template, i + 2)}" opacity="0.46" transform="rotate(${(frame * 8 + i * 31).toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)})"/>`;
  }).join('');
}

function corporateScan(template: BaseTemplate, width: number, height: number, frame: number, frames: number) {
  const p = (frame % frames) / frames;
  const y = height * (0.13 + p * 0.72);
  const x = width * (0.13 + (1 - p) * 0.74);
  const dots = Array.from({ length: 18 }, (_, i) => {
    const dx = i % 2 === 0 ? width * 0.08 : width * 0.92;
    const dy = height * 0.14 + ((i * 61 + frame * 9) % Math.round(height * 0.72));
    return `<circle cx="${dx.toFixed(2)}" cy="${dy.toFixed(2)}" r="${(width * 0.005 + (i % 3) * 1.5).toFixed(2)}" fill="${color(template, i)}" opacity="${0.32 + Math.abs(wave(frame, frames, i)) * 0.38}"/>`;
  }).join('');
  return `
    <path d="M${width * 0.1} ${y.toFixed(2)} H${width * 0.9}" stroke="${template.colors.secondary}" stroke-width="${Math.max(3, width * 0.004)}" opacity="0.48"/>
    <path d="M${x.toFixed(2)} ${height * 0.11} V${height * 0.89}" stroke="${template.colors.primary}" stroke-width="${Math.max(3, width * 0.0035)}" opacity="0.34"/>
    ${dots}
  `;
}

function glitch(template: BaseTemplate, width: number, height: number, frame: number, frames: number) {
  return Array.from({ length: 12 }, (_, i) => {
    const h = height * (0.007 + (i % 3) * 0.005);
    const maxW = width * (0.09 + (i % 5) * 0.025);
    const side = i % 2 === 0 ? 0 : 1;
    const x = side ? width - width * 0.08 - maxW : width * 0.08;
    const y = height * 0.12 + ((i * 83 + frame * 23) % Math.round(height * 0.76));
    const offset = wave(frame, frames, i * 0.9) * width * 0.028;
    return rect(x + offset, y, maxW, h, color(template, i), 0.46 + (i % 3) * 0.15);
  }).join('');
}

function luxuryGlints(template: BaseTemplate, width: number, height: number, frame: number, frames: number) {
  const p = frame / frames;
  const points = [
    [width * (0.08 + p * 0.18), height * 0.08],
    [width * (0.92 - p * 0.18), height * 0.08],
    [width * (0.1 + p * 0.22), height * 0.91],
    [width * (0.9 - p * 0.22), height * 0.91],
    [width * 0.5, height * (0.08 + p * 0.08)],
    [width * 0.5, height * (0.92 - p * 0.08)],
  ];

  const bubbles = Array.from({ length: 18 }, (_, i) => {
    const x = i % 2 === 0 ? width * 0.09 + width * 0.08 * Math.abs(wave(frame, frames, i)) : width * 0.91 - width * 0.08 * Math.abs(wave(frame, frames, i));
    const y = height * 0.2 + ((i * 79 - frame * 14 + frames * 30) % Math.round(height * 0.62));
    return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${(width * (0.004 + (i % 3) * 0.002)).toFixed(2)}" fill="${color(template, i + 3)}" opacity="0.35"/>`;
  }).join('');

  return points.map(([x, y], i) => sparkle(x, y, width * (0.012 + (i % 3) * 0.004), color(template, i + 1), 0.52 + Math.abs(wave(frame, frames, i)) * 0.36)).join('') + bubbles;
}

function birthdayMotion(template: BaseTemplate, width: number, height: number, frame: number, frames: number) {
  const bob = wave(frame, frames) * height * 0.014;
  return `
    ${confetti(template, width, height, frame, frames)}
    <circle cx="${width * 0.13}" cy="${height * 0.13 + bob}" r="${width * 0.024}" fill="${template.colors.primary}" opacity="0.62"/>
    <circle cx="${width * 0.87}" cy="${height * 0.15 - bob}" r="${width * 0.026}" fill="${template.colors.secondary}" opacity="0.62"/>
  `;
}

function orbitMotion(template: BaseTemplate, width: number, height: number, frame: number, frames: number) {
  const cx = width / 2;
  const cy = height / 2;
  const rx = template.aspectRatio === '16:9' ? width * 0.28 : width * 0.36;
  const ry = template.aspectRatio === '16:9' ? height * 0.28 : height * 0.23;
  return Array.from({ length: 10 }, (_, i) => {
    const angle = phase(frame, frames) + (Math.PI * 2 * i) / 10;
    const x = cx + Math.cos(angle) * rx;
    const y = cy + Math.sin(angle) * ry;
    return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${(width * (0.007 + (i % 3) * 0.002)).toFixed(2)}" fill="${color(template, i)}" opacity="${0.44 + Math.abs(wave(frame, frames, i)) * 0.32}"/>`;
  }).join('');
}

function hudPulse(template: BaseTemplate, width: number, height: number, frame: number, frames: number) {
  const p = (frame % frames) / frames;
  const scanY = height * (0.12 + p * 0.76);
  const scanX = width * (0.12 + (1 - p) * 0.76);
  return `
    <path d="M${width * 0.08} ${scanY.toFixed(2)} H${width * 0.92}" stroke="${template.colors.primary}" stroke-width="${Math.max(3, width * 0.005)}" opacity="0.42"/>
    <path d="M${scanX.toFixed(2)} ${height * 0.08} V${height * 0.92}" stroke="${template.colors.secondary}" stroke-width="${Math.max(3, width * 0.004)}" opacity="0.34"/>
    ${Array.from({ length: 18 }, (_, i) => sparkle(
      i % 2 ? width * 0.9 : width * 0.1,
      height * 0.15 + ((i * 71 + frame * 11) % Math.round(height * 0.7)),
      width * (0.006 + (i % 3) * 0.002),
      color(template, i),
      0.28 + Math.abs(wave(frame, frames, i)) * 0.4,
    )).join('')}
  `;
}

function ribbonSweep(template: BaseTemplate, width: number, height: number, frame: number, frames: number) {
  const p = (frame % frames) / frames;
  const x = -width * 0.22 + p * width * 1.44;
  return `
    <path d="M${x.toFixed(2)} ${height * 0.14} L${(x + width * 0.16).toFixed(2)} ${height * 0.08} L${(x + width * 0.24).toFixed(2)} ${height * 0.13} L${(x + width * 0.08).toFixed(2)} ${height * 0.2} Z" fill="${template.colors.primary}" opacity="0.46"/>
    <path d="M${(width - x).toFixed(2)} ${height * 0.86} L${(width - x - width * 0.16).toFixed(2)} ${height * 0.92} L${(width - x - width * 0.24).toFixed(2)} ${height * 0.87} L${(width - x - width * 0.08).toFixed(2)} ${height * 0.8} Z" fill="${template.colors.secondary}" opacity="0.42"/>
  `;
}

function storyMotion(template: BaseTemplate, width: number, height: number, frame: number, frames: number) {
  return Array.from({ length: 7 }, (_, i) => {
    const x = width * (0.88 - i * 0.055);
    const y = height * (0.78 - Math.abs(wave(frame, frames, i * 0.7)) * 0.16);
    return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${(width * (0.012 + (i % 3) * 0.003)).toFixed(2)}" fill="${color(template, i)}" opacity="${0.36 + Math.abs(wave(frame, frames, i)) * 0.42}"/>`;
  }).join('');
}

function photoFlash(template: BaseTemplate, width: number, height: number, frame: number, frames: number) {
  const flash = frame % Math.max(2, Math.floor(frames / 4)) === 0 ? 0.18 : 0.04;
  return `
    <rect x="${width * 0.07}" y="${height * 0.16}" width="${width * 0.2}" height="${height * 0.16}" rx="${width * 0.014}" fill="#ffffff" opacity="${flash}"/>
    <rect x="${width * 0.73}" y="${height * 0.18}" width="${width * 0.2}" height="${height * 0.16}" rx="${width * 0.014}" fill="#ffffff" opacity="${flash * 0.8}"/>
    ${sparkle(width * 0.2, height * 0.18, width * 0.018, template.colors.primary, 0.65 + flash)}
    ${sparkle(width * 0.78, height * 0.82, width * 0.018, template.colors.secondary, 0.58 + flash)}
  `;
}

function ticketMarquee(template: BaseTemplate, width: number, height: number, frame: number, frames: number) {
  const dots = template.aspectRatio === '16:9' ? 18 : 14;
  const y = height * 0.86;
  return Array.from({ length: dots }, (_, i) => {
    const opacity = 0.24 + Math.abs(wave(frame, frames, i * 0.7)) * 0.54;
    const x = width * 0.18 + (i * width * 0.64) / (dots - 1);
    return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${(width * 0.006).toFixed(2)}" fill="${color(template, i)}" opacity="${opacity.toFixed(2)}"/>`;
  }).join('');
}

function liquidDrops(template: BaseTemplate, width: number, height: number, frame: number, frames: number) {
  return Array.from({ length: 12 }, (_, i) => {
    const x = i % 2 ? width * 0.08 : width * 0.92;
    const y = height * 0.12 + ((i * 101 + frame * 13) % Math.round(height * 0.76));
    const r = width * (0.008 + (i % 4) * 0.002);
    return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${r.toFixed(2)}" fill="${color(template, i)}" opacity="${(0.22 + Math.abs(wave(frame, frames, i)) * 0.42).toFixed(2)}"/>`;
  }).join('');
}

function stickerPop(template: BaseTemplate, width: number, height: number, frame: number, frames: number) {
  const pulse = 0.72 + Math.abs(wave(frame, frames)) * 0.34;
  return `
    ${sparkle(width * 0.14, height * 0.16, width * 0.026 * pulse, template.colors.primary, 0.74)}
    ${sparkle(width * 0.86, height * 0.82, width * 0.024 * pulse, template.colors.secondary, 0.7)}
    ${confetti(template, width, height, frame, frames)}
  `;
}

function vhsNoise(template: BaseTemplate, width: number, height: number, frame: number, frames: number) {
  const rows = Array.from({ length: 10 }, (_, i) => {
    const y = height * 0.12 + ((i * 97 + frame * 19) % Math.round(height * 0.76));
    const w = width * (0.1 + (i % 4) * 0.045);
    const x = i % 2 ? width - width * 0.08 - w : width * 0.08;
    return rect(x + wave(frame, frames, i) * width * 0.025, y, w, height * 0.006, color(template, i), 0.24 + (i % 3) * 0.12);
  }).join('');
  return `${rows}<circle cx="${width * 0.09}" cy="${height * 0.08}" r="${width * 0.012}" fill="${template.colors.primary}" opacity="${0.42 + Math.abs(wave(frame, frames)) * 0.4}"/>`;
}

function laceDrift(template: BaseTemplate, width: number, height: number, frame: number, frames: number) {
  const beads = template.aspectRatio === '16:9' ? 18 : 14;
  return Array.from({ length: beads }, (_, i) => {
    const x = width * 0.12 + (i * width * 0.76) / (beads - 1);
    const y = height * 0.08 + wave(frame, frames, i * 0.45) * height * 0.012;
    const y2 = height * 0.92 - wave(frame, frames, i * 0.45) * height * 0.012;
    return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${(width * 0.006).toFixed(2)}" fill="${color(template, i)}" opacity="0.42"/>
      <circle cx="${x.toFixed(2)}" cy="${y2.toFixed(2)}" r="${(width * 0.006).toFixed(2)}" fill="${color(template, i + 2)}" opacity="0.34"/>`;
  }).join('');
}

function geometricPulse(template: BaseTemplate, width: number, height: number, frame: number, frames: number) {
  const pulse = 0.72 + Math.abs(wave(frame, frames)) * 0.28;
  const diamond = (x: number, y: number, s: number, fill: string) => `<path d="M${x} ${y - s * pulse} L${x + s * pulse} ${y} L${x} ${y + s * pulse} L${x - s * pulse} ${y} Z" fill="none" stroke="${fill}" stroke-width="${Math.max(3, width * 0.005)}" opacity="0.48"/>`;
  return [
    diamond(width * 0.12, height * 0.13, width * 0.04, template.colors.primary),
    diamond(width * 0.88, height * 0.87, width * 0.04, template.colors.secondary),
    diamond(width * 0.5, height * 0.08, width * 0.025, '#ffffff'),
    diamond(width * 0.5, height * 0.92, width * 0.025, template.colors.primary),
  ].join('');
}

function spotlightSweep(template: BaseTemplate, width: number, height: number, frame: number, frames: number) {
  const offset = wave(frame, frames) * width * 0.08;
  return `
    <path d="M${(width * 0.28 + offset).toFixed(2)} ${height * 0.08} L${width * 0.43} ${height * 0.9} L${width * 0.33} ${height * 0.9} Z" fill="${template.colors.primary}" opacity="0.16"/>
    <path d="M${(width * 0.72 - offset).toFixed(2)} ${height * 0.08} L${width * 0.57} ${height * 0.9} L${width * 0.67} ${height * 0.9} Z" fill="${template.colors.secondary}" opacity="0.16"/>
    ${equalizer(template, width, height, frame, frames)}
  `;
}

function layoutMotion(template: BaseTemplate, width: number, height: number, frame: number, frames: number) {
  if (template.layout === 'orbital_focus') return orbitMotion(template, width, height, frame, frames);
  if (template.layout === 'tech_hud' || template.layout === 'brand_slate') return hudPulse(template, width, height, frame, frames);
  if (template.layout === 'split_ribbon') return ribbonSweep(template, width, height, frame, frames);
  if (template.layout === 'social_story') return storyMotion(template, width, height, frame, frames);
  if (template.layout === 'polaroid_stack' || template.layout === 'photo_strip' || template.layout === 'magazine_cover') return photoFlash(template, width, height, frame, frames);
  if (template.layout === 'ticket_pass' || template.layout === 'event_badge') return ticketMarquee(template, width, height, frame, frames);
  if (template.layout === 'liquid_waves') return liquidDrops(template, width, height, frame, frames);
  if (template.layout === 'sticker_burst' || template.layout === 'confetti_arch') return stickerPop(template, width, height, frame, frames);
  if (template.layout === 'retro_vhs' || template.layout === 'glitch_reel') return vhsNoise(template, width, height, frame, frames);
  if (template.layout === 'romantic_lace' || template.layout === 'floral_crown') return laceDrift(template, width, height, frame, frames);
  if (template.layout === 'geometric_lux' || template.layout === 'luxury_corners' || template.layout === 'minimal_luxe') return geometricPulse(template, width, height, frame, frames);
  if (template.layout === 'spotlight_stage') return spotlightSweep(template, width, height, frame, frames);
  return '';
}

function categoryMotion(template: BaseTemplate, width: number, height: number, frame: number, frames: number) {
  const motion = layoutMotion(template, width, height, frame, frames);
  if (motion) return motion;
  if (template.category === 'birthday') return birthdayMotion(template, width, height, frame, frames);
  if (template.category === 'party') return `${laserSweep(template, width, height, frame, frames)}${equalizer(template, width, height, frame, frames)}`;
  if (template.category === 'wedding') return petals(template, width, height, frame, frames) + luxuryGlints(template, width, height, frame, frames);
  if (template.category === 'corporate') return corporateScan(template, width, height, frame, frames);
  if (template.category === 'graduation') return `${luxuryGlints(template, width, height, frame, frames)}${photoFlash(template, width, height, frame, frames)}`;
  if (template.category === 'store') return `${corporateScan(template, width, height, frame, frames)}${ticketMarquee(template, width, height, frame, frames)}`;
  if (template.category === 'church') return petals(template, width, height, frame, frames) + orbitMotion(template, width, height, frame, frames);
  if (template.category === 'viral') return `${glitch(template, width, height, frame, frames)}${equalizer(template, width, height, frame, frames)}`;
  return luxuryGlints(template, width, height, frame, frames);
}

function motionSvg(template: BaseTemplate, width: number, height: number, frame: number, frames: number) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <filter id="motionGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="${Math.max(3, width * 0.008)}" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <g filter="url(#motionGlow)">
    ${categoryMotion(template, width, height, frame, frames)}
  </g>
</svg>`;
}

type BuildGeneratedAnimatedTemplatesOptions = {
  includeSvg?: boolean;
  includeDataUrl?: boolean;
};

export function buildGeneratedAnimatedTemplates(count = GENERATED_ANIMATED_TEMPLATE_CATALOG_SIZE, offset = 0, options: BuildGeneratedAnimatedTemplatesOptions = {}): GeneratedAnimatedTemplate[] {
  const stride = count < GENERATED_TEMPLATE_CATALOG_SIZE
    ? Math.max(1, Math.floor(GENERATED_TEMPLATE_CATALOG_SIZE / count))
    : 1;
  const baseTemplates = Array.from({ length: count }, (_, batchIndex) => {
    const baseOffset = count < GENERATED_TEMPLATE_CATALOG_SIZE
      ? (offset + batchIndex * stride) % GENERATED_TEMPLATE_CATALOG_SIZE
      : offset + batchIndex;
    return buildGeneratedTemplates(1, baseOffset, options)[0];
  });
  return baseTemplates.map((template) => {
    const id = `animated-${template.id}`;
    const { svg, ...publicTemplate } = template;

    return {
      ...publicTemplate,
      id,
      name: `${template.name} Motion`,
      storagePath: template.storagePath,
      overlayUrl: template.overlayUrl,
      animationStoragePath: animatedTemplatePath({ id, category: template.category, aspectRatio: template.aspectRatio }),
      effects: Array.from(new Set(['motion_overlay', ...template.effects])),
      svg,
    };
  });
}

export async function renderAnimatedTemplateWebm(template: BaseTemplate, options: { fps?: number; frames?: number } = {}) {
  const fps = options.fps || 8;
  const frames = options.frames || 16;
  const { width, height } = animatedSize(template.aspectRatio);
  const dir = await mkdtemp(path.join(os.tmpdir(), 'six3-motion-template-'));
  const outputPath = path.join(dir, 'overlay.webm');

  try {
    const sharp = (await import('sharp')).default;
    const ffmpegModule = await import('ffmpeg-static');
    const ffmpegBinary = (ffmpegModule.default || 'ffmpeg') as string;

    const staticOverlay = await sharp(await renderTemplatePng(template.svg))
      .resize(width, height, { fit: 'fill' })
      .png({ compressionLevel: 3 })
      .toBuffer();

    await Promise.all(Array.from({ length: frames }, async (_, frame) => {
      const framePath = path.join(dir, `frame-${String(frame).padStart(3, '0')}.png`);
      const motionLayer = Buffer.from(motionSvg(template, width, height, frame, frames));
      await sharp({
        create: {
          width,
          height,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      })
        .composite([
          { input: staticOverlay, left: 0, top: 0 },
          { input: motionLayer, left: 0, top: 0 },
        ])
        .png({ compressionLevel: 1 })
        .toFile(framePath);
    }));

    await runBinary(ffmpegBinary, [
      '-y',
      '-framerate', String(fps),
      '-i', path.join(dir, 'frame-%03d.png'),
      '-c:v', 'libvpx-vp9',
      '-pix_fmt', 'yuva420p',
      '-auto-alt-ref', '0',
      '-deadline', 'good',
      '-cpu-used', '5',
      '-b:v', '0',
      '-crf', '38',
      '-an',
      outputPath,
    ]);

    return readFile(outputPath);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}
