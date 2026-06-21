// Sistema de partículas leve e reutilizável (pool fixo, sem alocação por frame).
// Usado por auras (faíscas subindo), dissolução estilo Thanos, partículas
// ambientais (neve/brasas/vaga-lumes) e rastros.

import type { Rgb } from './util';
import { rgba } from './util';
import { clamp } from './noise';

export type Particle = {
  alive: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: Rgb;
  alpha: number;
  spin: number;
  rotation: number;
};

export type ParticleShape = 'circle' | 'spark' | 'square' | 'streak';

export type ParticleEmitConfig = {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  spread?: number;
  speed?: number;
  life: number;
  size: number;
  color: Rgb;
  alpha?: number;
  spin?: number;
};

export class ParticleSystem {
  private pool: Particle[];
  private cursor = 0;

  constructor(
    capacity: number,
    private rng: () => number,
  ) {
    this.pool = Array.from({ length: Math.max(1, capacity) }, () => ({
      alive: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 1,
      size: 1,
      color: { r: 255, g: 255, b: 255 },
      alpha: 1,
      spin: 0,
      rotation: 0,
    }));
  }

  emit(config: ParticleEmitConfig) {
    const p = this.pool[this.cursor];
    this.cursor = (this.cursor + 1) % this.pool.length;
    const angle = this.rng() * Math.PI * 2;
    const spread = config.spread ?? 0;
    const speed = config.speed ?? 0;
    p.alive = true;
    p.x = config.x;
    p.y = config.y;
    p.vx = (config.vx ?? 0) + Math.cos(angle) * spread + (this.rng() - 0.5) * speed;
    p.vy = (config.vy ?? 0) + Math.sin(angle) * spread - this.rng() * speed;
    p.life = 0;
    p.maxLife = config.life;
    p.size = config.size;
    p.color = config.color;
    p.alpha = config.alpha ?? 1;
    p.spin = config.spin ?? 0;
    p.rotation = this.rng() * Math.PI * 2;
  }

  /** Atualiza a física. `gravity` positivo puxa para baixo; negativo, para cima. */
  update(dt: number, gravity: number, drag = 0.0) {
    for (const p of this.pool) {
      if (!p.alive) continue;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.alive = false;
        continue;
      }
      p.vy += gravity * dt;
      if (drag > 0) {
        const k = Math.max(0, 1 - drag * dt);
        p.vx *= k;
        p.vy *= k;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.spin * dt;
    }
  }

  /** Atrai partículas vivas em direção a um alvo (rastros que "perseguem"). */
  attract(tx: number, ty: number, strength: number, dt: number) {
    for (const p of this.pool) {
      if (!p.alive) continue;
      p.vx += (tx - p.x) * strength * dt;
      p.vy += (ty - p.y) * strength * dt;
    }
  }

  draw(ctx: CanvasRenderingContext2D, shape: ParticleShape, blend: GlobalCompositeOperation = 'lighter') {
    const prevOp = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = blend;
    for (const p of this.pool) {
      if (!p.alive) continue;
      const t = p.life / p.maxLife;
      const fade = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85;
      const alpha = clamp(p.alpha * fade, 0, 1);
      if (alpha <= 0.01) continue;
      ctx.fillStyle = rgba(p.color, alpha);
      if (shape === 'circle' || shape === 'spark') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (shape === 'spark' ? 0.6 + fade * 0.8 : 1), 0, Math.PI * 2);
        ctx.fill();
      } else if (shape === 'square') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillRect(-p.size, -p.size, p.size * 2, p.size * 2);
        ctx.restore();
      } else if (shape === 'streak') {
        ctx.save();
        ctx.translate(p.x, p.y);
        const len = p.size * 3;
        const ang = Math.atan2(p.vy, p.vx);
        ctx.rotate(ang);
        ctx.fillRect(-len, -p.size * 0.4, len * 2, p.size * 0.8);
        ctx.restore();
      }
    }
    ctx.globalCompositeOperation = prevOp;
  }

  get capacity() {
    return this.pool.length;
  }
}
