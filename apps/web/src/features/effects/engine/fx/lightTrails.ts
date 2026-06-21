// Rastros de luz seguindo o movimento da pessoa.
//
// composite 'overlay': o frame base já está no ctx. A cada frame emite
// partículas brilhantes no centroide da pessoa (ParticleSystem) que permanecem
// e desbotam, formando trilhas. Também desenha uma "fita" suave conectando o
// histórico recente do centroide. Sem máscara, o emissor segue um caminho de
// Lissajous animado pela tela.

import { defineFx } from '../types';
import type { FxFrameContext, FxInitEnv } from '../types';
import { ParticleSystem } from '../particles';
import { paramNumber, paramString, resolveColor, rgba, mixRgb, type Rgb } from '../util';
import { clamp } from '../noise';

const TRAIL_HISTORY = 24;

type LightTrailsState = {
  particles: ParticleSystem;
  // Histórico recente do ponto emissor (px) para desenhar a fita.
  history: Array<{ x: number; y: number }>;
  emitAcc: number;
};

export const lightTrailsFx = defineFx<LightTrailsState>({
  id: 'light_trails',
  capabilities: { personMask: true },
  composite: 'overlay',

  init(env: FxInitEnv): LightTrailsState {
    return {
      particles: new ParticleSystem(320, env.rng),
      history: [],
      emitAcc: 0,
    };
  },

  render(ctx2: FxFrameContext, state: LightTrailsState) {
    const { ctx, width, height, time, intensity, params, personMask, rng, dt } = ctx2;
    const color = resolveColor(paramString(params, 'color', 'cyan'), { r: 56, g: 230, b: 240 });
    const coreColor: Rgb = mixRgb(color, { r: 255, g: 255, b: 255 }, 0.6);
    const length = clamp(paramNumber(params, 'length', 1), 0.3, 2);

    // Ponto emissor: centroide da pessoa ou caminho de Lissajous (fallback).
    let ex: number;
    let ey: number;
    if (personMask && personMask.coverage > 0.005 && personMask.centroid) {
      ex = personMask.centroid.x * width;
      ey = personMask.centroid.y * height;
    } else {
      // Lissajous animado para o fallback (rastro percorre a tela).
      ex = width * (0.5 + 0.35 * Math.sin(time * 0.9));
      ey = height * (0.5 + 0.3 * Math.sin(time * 1.3 + 0.7));
    }

    // Atualiza o histórico do ponto emissor (para a fita).
    state.history.push({ x: ex, y: ey });
    if (state.history.length > TRAIL_HISTORY) state.history.shift();

    // 1) Emite partículas brilhantes no ponto emissor. A vida das partículas
    //    cresce com `length`, alongando as trilhas.
    state.emitAcc += (18 + 30 * intensity) * dt;
    while (state.emitAcc >= 1) {
      state.emitAcc -= 1;
      state.particles.emit({
        x: ex + (rng() - 0.5) * 12,
        y: ey + (rng() - 0.5) * 12,
        vx: (rng() - 0.5) * 40,
        vy: (rng() - 0.5) * 40,
        speed: 30,
        life: (0.5 + rng() * 0.6) * length * 1.6,
        size: 1.5 + rng() * 2.5,
        color: rng() > 0.4 ? color : coreColor,
        alpha: 0.95,
      });
    }
    state.particles.update(dt, 0, 0.6);

    // 2) Fita suave conectando o histórico recente do centroide.
    if (state.history.length > 2) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const baseW = Math.max(width, height) * 0.012 * length;
      // Desenha do mais antigo (fino/transparente) ao mais novo (grosso/claro).
      for (let i = 1; i < state.history.length; i += 1) {
        const t = i / (state.history.length - 1);
        const a = state.history[i - 1];
        const b = state.history[i];
        ctx.strokeStyle = rgba(color, clamp(0.35 * t * intensity, 0, 0.6));
        ctx.lineWidth = baseW * t;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      // Núcleo branco fino por cima da fita.
      ctx.strokeStyle = rgba(coreColor, clamp(0.4 * intensity, 0, 0.7));
      ctx.lineWidth = baseW * 0.35;
      ctx.beginPath();
      for (let i = 0; i < state.history.length; i += 1) {
        const p = state.history[i];
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    // 3) Partículas brilhantes em blend aditivo.
    state.particles.draw(ctx, 'spark', 'lighter');

    // Restaura o estado do contexto.
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.filter = 'none';
  },
});
