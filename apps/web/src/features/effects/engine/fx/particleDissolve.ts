// Dissolução estilo Thanos: a pessoa se desfaz em partículas levadas pelo vento.
// composite 'replace'. Estratégia: desenha o fundo, recompõe a pessoa com um
// apagamento progressivo de um lado (gradiente em destination-out animado) e
// emite partículas de brasa/cinza a partir da área da pessoa na direção do
// vento. O progresso pulsa (ida/volta) para o efeito funcionar em loop.
// Fallback sem máscara: varredura de partículas em tela cheia.

import { defineFx } from '../types';
import type { FxFrameContext, FxInitEnv } from '../types';
import { extractPerson, extractBackground } from '../maskUtils';
import { ParticleSystem } from '../particles';
import { createCanvas, paramNumber, paramString, type Rgb } from '../util';

type Scratch = { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D };

type DissolveState = {
  bg: Scratch;
  person: Scratch;
  dust: ParticleSystem;
  emitAcc: number;
};

// Paletas de cinzas/brasa.
const COLOR_PRESETS: Record<string, { a: Rgb; b: Rgb }> = {
  ember: { a: { r: 255, g: 140, b: 50 }, b: { r: 90, g: 60, b: 50 } },
  ash: { a: { r: 200, g: 200, b: 200 }, b: { r: 90, g: 90, b: 95 } },
  gold: { a: { r: 255, g: 209, b: 64 }, b: { r: 120, g: 90, b: 40 } },
};

export const particleDissolveFx = defineFx<DissolveState>({
  id: 'particle_dissolve',
  capabilities: { personMask: true },
  composite: 'replace',

  init(env: FxInitEnv): DissolveState {
    return {
      bg: createCanvas(env.width, env.height),
      person: createCanvas(env.width, env.height),
      dust: new ParticleSystem(900, env.rng),
      emitAcc: 0,
    };
  },

  render(ctx2: FxFrameContext, state: DissolveState) {
    const { ctx, sourceCanvas, width, height, time, intensity, params, personMask, rng, dt } = ctx2;
    const dirFrac = paramNumber(params, 'direction', 0.2); // fração de PI
    const speed = paramNumber(params, 'speed', 1);
    const palette = COLOR_PRESETS[paramString(params, 'color', 'ember')] || COLOR_PRESETS.ember;

    // Vento: ângulo a partir da fração de PI (0 = direita).
    const angle = dirFrac * Math.PI;
    const windX = Math.cos(angle);
    const windY = Math.sin(angle);

    // Progresso de dissolução pulsando (ida/volta) — triângulo 0..1.
    const cycle = (time * 0.25 * speed) % 2;
    const progress = cycle < 1 ? cycle : 2 - cycle;

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.filter = 'none';

    if (personMask && personMask.coverage > 0.005) {
      // 1) Fundo (sem a pessoa).
      extractBackground(state.bg.ctx, sourceCanvas, personMask, width, height);
      ctx.drawImage(state.bg.canvas, 0, 0);

      // 2) Pessoa com apagamento progressivo do lado do vento.
      extractPerson(state.person.ctx, sourceCanvas, personMask, width, height);
      const bbox = personMask.bbox;
      const bx = bbox ? bbox.x : width * 0.3;
      const bw = bbox ? bbox.w : width * 0.4;
      const by = bbox ? bbox.y : height * 0.15;
      const bh = bbox ? bbox.h : height * 0.7;
      // Frente de apagamento varrendo na direção do vento (gradiente suave).
      const pctx = state.person.ctx;
      pctx.globalCompositeOperation = 'destination-out';
      const fx0 = bx - bw * 0.2;
      const fx1 = bx + bw * 1.2;
      const front = fx0 + (fx1 - fx0) * progress;
      const featherX = bw * 0.45 * windX;
      const featherY = bh * 0.45 * windY;
      const grad = pctx.createLinearGradient(
        front - featherX,
        (by + bh / 2) - featherY,
        front + featherX,
        (by + bh / 2) + featherY,
      );
      grad.addColorStop(0, 'rgba(0,0,0,1)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      pctx.fillStyle = grad;
      pctx.fillRect(0, 0, width, height);
      pctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(state.person.canvas, 0, 0);

      // 3) Emite partículas na frente de dissolução, levadas pelo vento.
      const rate = 220 * intensity * (0.3 + progress * 1.4);
      state.emitAcc += rate * dt;
      while (state.emitAcc >= 1) {
        state.emitAcc -= 1;
        const py = by + rng() * bh;
        const px = front + (rng() - 0.5) * bw * 0.3;
        const mix = rng();
        const color: Rgb = {
          r: palette.a.r + (palette.b.r - palette.a.r) * mix,
          g: palette.a.g + (palette.b.g - palette.a.g) * mix,
          b: palette.a.b + (palette.b.b - palette.a.b) * mix,
        };
        const v = (60 + rng() * 140) * speed;
        state.dust.emit({
          x: px,
          y: py,
          vx: windX * v + (rng() - 0.5) * 40,
          vy: windY * v - rng() * 30,
          life: 0.8 + rng() * 1.2,
          size: 0.8 + rng() * 2.2,
          color,
          alpha: 0.9,
        });
      }
      state.dust.update(dt, -8, 0.4);
      state.dust.draw(ctx, 'circle', 'lighter');
    } else {
      // Fallback sem máscara: frame base + varredura de partículas de tela cheia.
      ctx.drawImage(sourceCanvas, 0, 0, width, height);
      const front = width * progress;
      const rate = 260 * intensity;
      state.emitAcc += rate * dt;
      while (state.emitAcc >= 1) {
        state.emitAcc -= 1;
        const py = rng() * height;
        const px = front + (rng() - 0.5) * width * 0.12;
        const v = (60 + rng() * 140) * speed;
        state.dust.emit({
          x: px,
          y: py,
          vx: windX * v + (rng() - 0.5) * 40,
          vy: windY * v - rng() * 30,
          life: 0.8 + rng() * 1,
          size: 0.8 + rng() * 2,
          color: palette.a,
          alpha: 0.8,
        });
      }
      state.dust.update(dt, -8, 0.4);
      state.dust.draw(ctx, 'circle', 'lighter');
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.filter = 'none';
  },
});
