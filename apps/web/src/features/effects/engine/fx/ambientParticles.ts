// Partículas ambientais pela tela (faíscas, neve, brasas, vaga-lumes, confete,
// pétalas, poeira).
//
// composite 'overlay': o frame base já está no ctx; só somamos as partículas
// por cima. Um ParticleSystem único é alimentado continuamente por um emissor
// cujo comportamento (cor, gravidade, movimento, brilho) muda conforme
// `params.kind`. A densidade reage levemente ao audioEnergy. Tudo determinístico
// (cor e posição derivadas do rng semeado).

import { defineFx } from '../types';
import type { FxFrameContext, FxInitEnv } from '../types';
import { ParticleSystem, type ParticleShape } from '../particles';
import { paramNumber, paramString, type Rgb } from '../util';
import { clamp, valueNoise2D } from '../noise';

type AmbientParticlesState = {
  particles: ParticleSystem;
  // Acumulador de emissão (partículas por frame fracionárias).
  emitAcc: number;
};

// Perfil de cada tipo: forma, blend, física e taxa/tamanho/vida de emissão.
type KindProfile = {
  shape: ParticleShape;
  blend: GlobalCompositeOperation;
  // Gravidade (px/s²): positivo cai, negativo sobe.
  gravity: number;
  drag: number;
  rate: number; // emissões/seg base
  size: [number, number];
  life: [number, number];
  alpha: number;
  spin: number; // amplitude de giro (0 = sem giro)
  // Cor da partícula a partir do rng (determinístico).
  color: (rng: () => number) => Rgb;
  // Posição/velocidade inicial a partir do rng e das dimensões.
  emit: (rng: () => number, width: number, height: number) => { x: number; y: number; vx: number; vy: number };
};

const CONFETTI_COLORS: Rgb[] = [
  { r: 255, g: 92, b: 120 },
  { r: 255, g: 209, b: 64 },
  { r: 64, g: 200, b: 255 },
  { r: 120, g: 230, b: 128 },
  { r: 200, g: 120, b: 255 },
];

function buildProfile(kind: string): KindProfile {
  switch (kind) {
    case 'snow':
      return {
        shape: 'circle',
        blend: 'source-over',
        gravity: 18,
        drag: 0.2,
        rate: 90,
        size: [1, 3.5],
        life: [4, 7],
        alpha: 0.85,
        spin: 0,
        color: () => ({ r: 245, g: 248, b: 255 }),
        emit: (rng, w) => ({ x: rng() * w, y: -10, vx: (rng() - 0.5) * 20, vy: 18 + rng() * 22 }),
      };
    case 'embers':
      return {
        shape: 'circle',
        blend: 'lighter',
        gravity: -22,
        drag: 0.4,
        rate: 70,
        size: [1, 3],
        life: [2, 4],
        alpha: 1,
        spin: 0,
        color: (rng) => (rng() > 0.5 ? { r: 255, g: 140, b: 40 } : { r: 255, g: 90, b: 20 }),
        emit: (rng, w, h) => ({ x: rng() * w, y: h + 10, vx: (rng() - 0.5) * 40, vy: -(20 + rng() * 50) }),
      };
    case 'fireflies':
      return {
        shape: 'circle',
        blend: 'lighter',
        gravity: 0,
        drag: 0.5,
        rate: 26,
        size: [1.5, 3.5],
        life: [3, 6],
        alpha: 1,
        spin: 0,
        color: () => ({ r: 200, g: 255, b: 120 }),
        emit: (rng, w, h) => ({ x: rng() * w, y: rng() * h, vx: (rng() - 0.5) * 16, vy: (rng() - 0.5) * 16 }),
      };
    case 'confetti':
      return {
        shape: 'square',
        blend: 'source-over',
        gravity: 60,
        drag: 0.3,
        rate: 80,
        size: [2.5, 5],
        life: [3, 5],
        alpha: 0.9,
        spin: 5,
        color: (rng) => CONFETTI_COLORS[Math.min(CONFETTI_COLORS.length - 1, Math.floor(rng() * CONFETTI_COLORS.length))],
        emit: (rng, w) => ({ x: rng() * w, y: -10, vx: (rng() - 0.5) * 60, vy: 30 + rng() * 40 }),
      };
    case 'petals':
      return {
        shape: 'square',
        blend: 'source-over',
        gravity: 14,
        drag: 0.25,
        rate: 50,
        size: [3, 6],
        life: [4, 7],
        alpha: 0.9,
        spin: 3,
        color: (rng) => (rng() > 0.5 ? { r: 255, g: 182, b: 210 } : { r: 255, g: 150, b: 190 }),
        emit: (rng, w) => ({ x: rng() * w, y: -10, vx: (rng() - 0.5) * 40, vy: 16 + rng() * 18 }),
      };
    case 'dust':
      return {
        shape: 'circle',
        blend: 'lighter',
        gravity: -4,
        drag: 0.6,
        rate: 70,
        size: [0.8, 2.2],
        life: [4, 8],
        alpha: 1,
        spin: 0,
        color: () => ({ r: 255, g: 244, b: 210 }),
        emit: (rng, w, h) => ({ x: rng() * w, y: rng() * h, vx: (rng() - 0.5) * 10, vy: -(4 + rng() * 8) }),
      };
    case 'sparks':
    default:
      return {
        shape: 'spark',
        blend: 'lighter',
        gravity: -40,
        drag: 0.8,
        rate: 80,
        size: [1, 2.8],
        life: [1.2, 2.4],
        alpha: 1,
        spin: 0,
        color: (rng) => (rng() > 0.4 ? { r: 255, g: 209, b: 64 } : { r: 255, g: 244, b: 200 }),
        emit: (rng, w, h) => ({ x: rng() * w, y: h + 10, vx: (rng() - 0.5) * 50, vy: -(60 + rng() * 120) }),
      };
  }
}

// Acesso ao pool interno do ParticleSystem para aplicar balanço lateral.
type PoolHost = { pool: Array<{ alive: boolean; x: number; y: number; vx: number }> };

export const ambientParticlesFx = defineFx<AmbientParticlesState>({
  id: 'ambient_particles',
  capabilities: { audio: true },
  composite: 'overlay',

  init(env: FxInitEnv): AmbientParticlesState {
    return {
      particles: new ParticleSystem(400, env.rng),
      emitAcc: 0,
    };
  },

  render(ctx2: FxFrameContext, state: AmbientParticlesState) {
    const { ctx, width, height, time, intensity, params, audioEnergy, rng, dt } = ctx2;
    const kind = paramString(params, 'kind', 'sparks');
    const density = clamp(paramNumber(params, 'density', 1), 0.3, 2);
    const profile = buildProfile(kind);

    // 1) Emite partículas continuamente; densidade reage levemente à batida.
    const rate = profile.rate * density * intensity * (1 + audioEnergy * 0.5);
    state.emitAcc += rate * dt;
    while (state.emitAcc >= 1) {
      state.emitAcc -= 1;
      const e = profile.emit(rng, width, height);
      const size = profile.size[0] + rng() * (profile.size[1] - profile.size[0]);
      const life = profile.life[0] + rng() * (profile.life[1] - profile.life[0]);
      state.particles.emit({
        x: e.x,
        y: e.y,
        vx: e.vx,
        vy: e.vy,
        life,
        size,
        color: profile.color(rng),
        alpha: profile.alpha,
        spin: profile.spin ? (rng() - 0.5) * profile.spin : 0,
      });
    }

    // 2) Física por tipo. Para neve/pétalas/poeira/vaga-lumes adicionamos
    //    balanço lateral suave via ruído (movimento orgânico).
    state.particles.update(dt, profile.gravity, profile.drag);
    if (kind === 'snow' || kind === 'petals' || kind === 'dust' || kind === 'fireflies') {
      const swayAmp = kind === 'fireflies' ? 14 : 10;
      for (const p of (state.particles as unknown as PoolHost).pool) {
        if (!p.alive) continue;
        const n = valueNoise2D(p.x * 0.01, time * 0.6 + p.y * 0.01) - 0.5;
        p.vx += n * swayAmp * dt;
      }
    }

    // 3) Vaga-lumes piscam: leve flicker global do brilho ao desenhar.
    if (kind === 'fireflies') {
      ctx.globalAlpha = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(time * 6));
    }
    state.particles.draw(ctx, profile.shape, profile.blend);

    // Restaura o estado do contexto.
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.filter = 'none';
  },
});
