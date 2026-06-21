// Helpers de leitura de parâmetros e cor para os efeitos do motor.

import type { FxParams, FxParamValue } from './types';
import { clamp } from './noise';

export function paramNumber(params: FxParams, key: string, fallback: number) {
  const value = params[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function paramString(params: FxParams, key: string, fallback: string) {
  const value = params[key];
  return typeof value === 'string' && value ? value : fallback;
}

export function paramBool(params: FxParams, key: string, fallback: boolean) {
  const value = params[key];
  return typeof value === 'boolean' ? value : fallback;
}

export function firstString(value: FxParamValue | undefined): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
}

export type Rgb = { r: number; g: number; b: number };

const NAMED_COLORS: Record<string, Rgb> = {
  gold: { r: 255, g: 209, b: 64 },
  amber: { r: 255, g: 176, b: 32 },
  blue: { r: 64, g: 168, b: 255 },
  cyan: { r: 56, g: 230, b: 240 },
  red: { r: 255, g: 72, b: 72 },
  crimson: { r: 220, g: 38, b: 64 },
  purple: { r: 168, g: 92, b: 255 },
  violet: { r: 139, g: 92, b: 246 },
  pink: { r: 236, g: 72, b: 153 },
  green: { r: 64, g: 230, b: 128 },
  white: { r: 255, g: 255, b: 255 },
  orange: { r: 255, g: 122, b: 36 },
  teal: { r: 45, g: 212, b: 191 },
  ember: { r: 255, g: 120, b: 40 },
  ash: { r: 158, g: 158, b: 170 },
  warm: { r: 255, g: 170, b: 90 },
  yellow: { r: 255, g: 224, b: 64 },
};

/** Converte nome ('gold') ou hex ('#ffcc00') em RGB. */
export function resolveColor(value: string | undefined, fallback: Rgb): Rgb {
  if (!value) return fallback;
  const named = NAMED_COLORS[value.toLowerCase()];
  if (named) return named;
  const hex = value.replace('#', '').trim();
  if (/^[0-9a-fA-F]{6}$/.test(hex)) {
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
    };
  }
  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    return {
      r: parseInt(hex[0] + hex[0], 16),
      g: parseInt(hex[1] + hex[1], 16),
      b: parseInt(hex[2] + hex[2], 16),
    };
  }
  return fallback;
}

export function rgba({ r, g, b }: Rgb, alpha: number) {
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${clamp(alpha, 0, 1)})`;
}

export function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

/** Cria um canvas offscreen 2D (com `willReadFrequently` opcional). */
export function createCanvas(width: number, height: number, readFrequently = false) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext('2d', readFrequently ? { willReadFrequently: true } : undefined);
  if (!ctx) throw new Error('FX_CANVAS_CONTEXT_UNAVAILABLE');
  return { canvas, ctx };
}

/** Desenha uma fonte preenchendo o destino em "cover" (sem distorcer). */
export function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sw: number,
  sh: number,
  dw: number,
  dh: number,
) {
  if (!sw || !sh) return;
  const scale = Math.max(dw / sw, dh / sh);
  const w = sw * scale;
  const h = sh * scale;
  ctx.drawImage(source, (dw - w) / 2, (dh - h) / 2, w, h);
}
