// Raios de luz volumétricos (god rays / crepuscular rays).
//
// composite 'overlay': o frame base já está no ctx; somamos feixes de luz
// radiais saindo de um ponto (padrão: canto superior), em blend 'screen'.
// Sem ML: desenhamos um leque de segmentos triangulares com gradiente, mais
// um brilho central e poeira luminosa. A largura/brilho dos feixes oscila no
// tempo por valueNoise1D (determinístico).

import { defineFx } from '../types';
import type { FxFrameContext, FxInitEnv } from '../types';
import { ParticleSystem } from '../particles';
import { paramNumber, paramString, resolveColor, rgba, type Rgb } from '../util';
import { clamp, valueNoise1D } from '../noise';

// Número de feixes no leque.
const RAY_COUNT = 14;

type GodRaysState = {
  dust: ParticleSystem;
  emitAcc: number;
};

const RAY_COLORS: Record<string, Rgb> = {
  gold: { r: 255, g: 220, b: 130 },
  white: { r: 255, g: 255, b: 245 },
  blue: { r: 150, g: 200, b: 255 },
  green: { r: 170, g: 255, b: 180 },
};

export const godRaysFx = defineFx<GodRaysState>({
  id: 'god_rays',
  capabilities: {},
  composite: 'overlay',

  init(env: FxInitEnv): GodRaysState {
    return {
      dust: new ParticleSystem(120, env.rng),
      emitAcc: 0,
    };
  },

  render(ctx2: FxFrameContext, state: GodRaysState) {
    const { ctx, width, height, time, intensity, params, rng, dt } = ctx2;
    const color = resolveColor(paramString(params, 'color', 'gold'), RAY_COLORS.gold);
    const namedColor = RAY_COLORS[paramString(params, 'color', 'gold')] || color;
    const userIntensity = clamp(paramNumber(params, 'intensity', 1), 0.3, 2);
    // angle em fração: 0=esquerda, 0.5=topo, 1=direita (sempre no topo do quadro).
    const angleFrac = clamp(paramNumber(params, 'angle', 0.25), 0, 1);

    // Ponto de origem dos raios (no alto, deslizando da esquerda à direita).
    const sx = angleFrac * width;
    const sy = -height * 0.1;

    // Direção base dos feixes (apontando para baixo, levemente inclinada).
    const baseDir = Math.PI / 2 + (angleFrac - 0.5) * 0.6;
    const span = 1.0; // abertura total do leque (rad)
    const rayLen = Math.hypot(width, height) * 1.4;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.translate(sx, sy);

    // 1) Feixes em leque: cada um é um triângulo fino com gradiente ao longo.
    for (let i = 0; i < RAY_COUNT; i += 1) {
      const t = i / (RAY_COUNT - 1);
      const ang = baseDir + (t - 0.5) * span;
      // Oscilação de brilho/largura por feixe (determinística).
      const flick = 0.4 + valueNoise1D(time * 0.8 + i * 2.13) * 0.8;
      const alpha = clamp(0.16 * intensity * userIntensity * flick, 0, 0.5);
      if (alpha <= 0.01) continue;

      const halfW = (0.012 + valueNoise1D(time * 0.5 + i) * 0.02) * rayLen;
      const dx = Math.cos(ang);
      const dy = Math.sin(ang);
      // Perpendicular para dar espessura ao feixe.
      const px = -dy;
      const py = dx;

      const ex = dx * rayLen;
      const ey = dy * rayLen;

      const grad = ctx.createLinearGradient(0, 0, ex, ey);
      grad.addColorStop(0, rgba(color, alpha));
      grad.addColorStop(0.6, rgba(color, alpha * 0.35));
      grad.addColorStop(1, rgba(color, 0));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(ex + px * halfW, ey + py * halfW);
      ctx.lineTo(ex - px * halfW, ey - py * halfW);
      ctx.closePath();
      ctx.fill();
    }

    // 2) Brilho central na origem (núcleo da fonte de luz).
    const coreR = Math.max(width, height) * 0.35;
    const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR);
    coreGrad.addColorStop(0, rgba(namedColor, clamp(0.5 * intensity * userIntensity, 0, 0.8)));
    coreGrad.addColorStop(1, rgba(namedColor, 0));
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, 0, coreR, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // 3) Poeira luminosa flutuando dentro do volume de luz.
    state.emitAcc += 20 * intensity * userIntensity * dt;
    while (state.emitAcc >= 1) {
      state.emitAcc -= 1;
      // Emite ao longo da direção dos feixes para parecer iluminada pela luz.
      const t = rng();
      const ang = baseDir + (rng() - 0.5) * span;
      const r = t * rayLen * 0.7;
      state.dust.emit({
        x: sx + Math.cos(ang) * r,
        y: sy + Math.sin(ang) * r,
        vx: (rng() - 0.5) * 12,
        vy: (rng() - 0.5) * 12 + 6,
        life: 2 + rng() * 3,
        size: 0.8 + rng() * 1.6,
        color: namedColor,
        alpha: 0.5,
      });
    }
    state.dust.update(dt, 0, 0.4);
    ctx.globalAlpha = clamp(0.7 * intensity, 0, 1);
    state.dust.draw(ctx, 'circle', 'screen');

    // Restaura o estado do contexto.
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.filter = 'none';
  },
});
