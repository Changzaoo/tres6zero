// Portal de energia atrás da pessoa (estilo Doctor Strange). composite 'replace'.
// Ordem: fundo (sem a pessoa) → anel giratório de energia com faíscas centrado
// no tronco → pessoa nítida por cima (o portal fica ATRÁS dela).
// Fallback sem máscara: anel de portal no centro da tela sobre o frame.

import { defineFx } from '../types';
import type { FxFrameContext, FxInitEnv } from '../types';
import { extractPerson, extractBackground } from '../maskUtils';
import { ParticleSystem } from '../particles';
import { createCanvas, paramNumber, paramString, resolveColor, rgba, type Rgb } from '../util';
import { clamp } from '../noise';

type Scratch = { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D };

type PortalState = {
  bg: Scratch;
  person: Scratch;
  sparks: ParticleSystem;
  emitAcc: number;
};

const PORTAL_COLORS: Record<string, Rgb> = {
  orange: { r: 255, g: 140, b: 30 },
  cyan: { r: 56, g: 230, b: 240 },
  purple: { r: 168, g: 92, b: 255 },
  green: { r: 64, g: 230, b: 128 },
};

/** Desenha o anel giratório de energia (arcos de faísca em volta de um aro). */
function drawPortalRing(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  color: Rgb,
  time: number,
  intensity: number,
) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // Brilho do disco do portal.
  const disc = ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius);
  disc.addColorStop(0, rgba(color, 0.18 * intensity));
  disc.addColorStop(0.7, rgba(color, 0.08 * intensity));
  disc.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  // Aro principal brilhante.
  ctx.strokeStyle = rgba(color, clamp(0.7 * intensity, 0, 1));
  ctx.lineWidth = Math.max(2, radius * 0.04);
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Arcos de faísca girando (duas camadas em sentidos opostos).
  const segs = 48;
  for (let layer = 0; layer < 2; layer += 1) {
    const dir = layer === 0 ? 1 : -1;
    const rot = time * (1.6 + layer * 0.8) * dir;
    const rr = radius * (1 + layer * 0.06);
    ctx.lineWidth = Math.max(1, radius * (0.02 - layer * 0.006));
    for (let i = 0; i < segs; i += 1) {
      const a0 = (i / segs) * Math.PI * 2 + rot;
      const flick = 0.4 + 0.6 * Math.abs(Math.sin(a0 * 5 + time * 6));
      ctx.strokeStyle = rgba(color, clamp(0.5 * intensity * flick, 0, 1));
      ctx.beginPath();
      ctx.arc(cx, cy, rr, a0, a0 + (Math.PI * 2) / segs * 0.6);
      ctx.stroke();
    }
  }

  ctx.restore();
}

export const portalFx = defineFx<PortalState>({
  id: 'portal',
  capabilities: { personMask: true },
  composite: 'replace',

  init(env: FxInitEnv): PortalState {
    return {
      bg: createCanvas(env.width, env.height),
      person: createCanvas(env.width, env.height),
      sparks: new ParticleSystem(260, env.rng),
      emitAcc: 0,
    };
  },

  render(ctx2: FxFrameContext, state: PortalState) {
    const { ctx, sourceCanvas, width, height, time, intensity, params, personMask, rng, dt } = ctx2;
    const color = resolveColor(paramString(params, 'color', 'orange'), PORTAL_COLORS.orange);
    const sizeMul = paramNumber(params, 'size', 1);

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.filter = 'none';

    if (personMask && personMask.coverage > 0.005) {
      const bbox = personMask.bbox;
      // Centro do anel no tronco (atrás da pessoa).
      const cx = bbox ? bbox.x + bbox.w / 2 : width / 2;
      const cy = bbox ? bbox.y + bbox.h * 0.4 : height * 0.45;
      const radius = (bbox ? Math.max(bbox.w, bbox.h) * 0.65 : width * 0.3) * sizeMul;

      // 1) Fundo (sem a pessoa).
      extractBackground(state.bg.ctx, sourceCanvas, personMask, width, height);
      ctx.drawImage(state.bg.canvas, 0, 0);

      // 2) Anel de energia + faíscas (atrás da pessoa).
      drawPortalRing(ctx, cx, cy, radius, color, time, intensity);
      emitRingSparks(state, cx, cy, radius, color, time, intensity, rng, dt);
      state.sparks.draw(ctx, 'spark', 'lighter');

      // 3) Pessoa nítida por cima.
      extractPerson(state.person.ctx, sourceCanvas, personMask, width, height);
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(state.person.canvas, 0, 0);
    } else {
      // Fallback sem máscara: frame base + portal no centro da tela.
      ctx.drawImage(sourceCanvas, 0, 0, width, height);
      const cx = width / 2;
      const cy = height / 2;
      const radius = width * 0.28 * sizeMul;
      drawPortalRing(ctx, cx, cy, radius, color, time, intensity);
      emitRingSparks(state, cx, cy, radius, color, time, intensity, rng, dt);
      state.sparks.draw(ctx, 'spark', 'lighter');
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.filter = 'none';
  },
});

/** Emite faíscas ao longo da borda do anel, com leve deriva tangencial. */
function emitRingSparks(
  state: PortalState,
  cx: number,
  cy: number,
  radius: number,
  color: Rgb,
  time: number,
  intensity: number,
  rng: () => number,
  dt: number,
) {
  state.emitAcc += 120 * intensity * dt;
  while (state.emitAcc >= 1) {
    state.emitAcc -= 1;
    const a = rng() * Math.PI * 2;
    const r = radius * (0.96 + rng() * 0.1);
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    // Velocidade tangente ao aro (sensação de giro) + jato radial leve.
    const tx = -Math.sin(a);
    const ty = Math.cos(a);
    const tang = (60 + rng() * 80);
    const rad = (rng() - 0.3) * 50;
    state.sparks.emit({
      x: px,
      y: py,
      vx: tx * tang + Math.cos(a) * rad,
      vy: ty * tang + Math.sin(a) * rad,
      life: 0.4 + rng() * 0.6,
      size: 1 + rng() * 2,
      color,
      alpha: 1,
    });
  }
  state.sparks.update(dt, 0, 1.2);
}
