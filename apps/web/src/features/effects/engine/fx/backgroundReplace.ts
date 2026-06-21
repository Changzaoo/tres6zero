// Troca o fundo por um cenário PROCEDURAL (espaço, fogo, neon, pôr do sol,
// aurora, matrix) e recompõe a pessoa por cima com leve luz de borda combinando
// com a cena. composite 'replace' — o módulo desenha tudo. Sem máscara, a cena
// preenche a tela inteira (sem recortar a pessoa).

import { defineFx } from '../types';
import type { FxFrameContext, FxInitEnv } from '../types';
import { extractPerson, buildOutline } from '../maskUtils';
import { createCanvas, paramString, rgba, type Rgb } from '../util';
import { clamp, fbm1D, valueNoise2D } from '../noise';

type Scratch = { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D };

type Star = { x: number; y: number; r: number; tw: number };

type SceneState = {
  person: Scratch;
  outline: Scratch;
  stars: Star[];
};

// Cor da luz de borda por cena (combina com o cenário).
const RIM_BY_SCENE: Record<string, Rgb> = {
  space: { r: 150, g: 180, b: 255 },
  fire: { r: 255, g: 140, b: 40 },
  neon: { r: 255, g: 64, b: 220 },
  sunset: { r: 255, g: 170, b: 90 },
  aurora: { r: 120, g: 255, b: 190 },
  matrix: { r: 80, g: 255, b: 120 },
};

/** Desenha a cena procedural escolhida cobrindo todo o canvas. */
function drawScene(ctx: CanvasRenderingContext2D, scene: string, w: number, h: number, time: number, rng: () => number, stars: Star[]) {
  switch (scene) {
    case 'fire': {
      // Gradiente de chamas com ruído subindo.
      const g = ctx.createLinearGradient(0, h, 0, 0);
      g.addColorStop(0, '#ffcb45');
      g.addColorStop(0.35, '#ff6a1a');
      g.addColorStop(0.7, '#7a1208');
      g.addColorStop(1, '#1a0500');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'screen';
      const cols = 40;
      const cw = w / cols;
      for (let i = 0; i < cols; i += 1) {
        const n = fbm1D(i * 0.6 + time * 2.2);
        const flameH = h * (0.25 + n * 0.55);
        const x = i * cw;
        const grad = ctx.createLinearGradient(0, h, 0, h - flameH);
        grad.addColorStop(0, rgba({ r: 255, g: 200, b: 80 }, 0.5));
        grad.addColorStop(1, rgba({ r: 255, g: 90, b: 20 }, 0));
        ctx.fillStyle = grad;
        ctx.fillRect(x, h - flameH, cw + 1, flameH);
      }
      ctx.globalCompositeOperation = 'source-over';
      break;
    }
    case 'neon': {
      // Grade neon em perspectiva + brilho.
      ctx.fillStyle = '#0a0118';
      ctx.fillRect(0, 0, w, h);
      const horizon = h * 0.45;
      // Brilho do horizonte.
      const glow = ctx.createLinearGradient(0, horizon, 0, h);
      glow.addColorStop(0, rgba({ r: 255, g: 64, b: 220 }, 0.35));
      glow.addColorStop(1, rgba({ r: 56, g: 230, b: 240 }, 0.05));
      ctx.fillStyle = glow;
      ctx.fillRect(0, horizon, w, h - horizon);
      ctx.strokeStyle = rgba({ r: 56, g: 230, b: 240 }, 0.7);
      ctx.lineWidth = 1.5;
      // Linhas verticais convergindo para o ponto de fuga.
      const vx = w / 2;
      for (let i = -10; i <= 10; i += 1) {
        ctx.beginPath();
        ctx.moveTo(vx + i * (w * 0.06), horizon);
        ctx.lineTo(vx + i * (w * 0.18), h);
        ctx.stroke();
      }
      // Linhas horizontais animadas (rolagem).
      const scroll = (time * 0.4) % 1;
      for (let i = 0; i < 14; i += 1) {
        const t = (i + scroll) / 14;
        const y = horizon + (h - horizon) * (t * t);
        ctx.strokeStyle = rgba({ r: 255, g: 64, b: 220 }, 0.5 * (1 - t) + 0.2);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      break;
    }
    case 'sunset': {
      // Gradiente quente + sol.
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#2a1247');
      g.addColorStop(0.45, '#ff6a4d');
      g.addColorStop(0.7, '#ffb24d');
      g.addColorStop(1, '#3a1020');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      const sx = w / 2;
      const sy = h * 0.6;
      const sun = ctx.createRadialGradient(sx, sy, 0, sx, sy, w * 0.3);
      sun.addColorStop(0, rgba({ r: 255, g: 250, b: 220 }, 0.95));
      sun.addColorStop(0.4, rgba({ r: 255, g: 200, b: 120 }, 0.7));
      sun.addColorStop(1, rgba({ r: 255, g: 140, b: 80 }, 0));
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = sun;
      ctx.beginPath();
      ctx.arc(sx, sy, w * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      break;
    }
    case 'aurora': {
      // Faixas de luz onduladas sobre céu noturno estrelado.
      ctx.fillStyle = '#03040f';
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'screen';
      for (const s of stars) {
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(time * s.tw + s.x));
        ctx.fillStyle = rgba({ r: 255, g: 255, b: 255 }, 0.6 * tw);
        ctx.fillRect(s.x * w, s.y * h * 0.5, s.r, s.r);
      }
      const bands: Rgb[] = [{ r: 80, g: 255, b: 180 }, { r: 120, g: 160, b: 255 }, { r: 200, g: 120, b: 255 }];
      for (let b = 0; b < bands.length; b += 1) {
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += w / 48) {
          const phase = x * 0.006 + time * (0.5 + b * 0.2) + b * 2;
          const y = h * (0.25 + b * 0.08) + Math.sin(phase) * h * 0.08 + fbm1D(x * 0.01 + time + b) * h * 0.06;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, h * 0.2, 0, h * 0.7);
        grad.addColorStop(0, rgba(bands[b], 0.45));
        grad.addColorStop(1, rgba(bands[b], 0));
        ctx.fillStyle = grad;
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      break;
    }
    case 'matrix': {
      // Colunas de pontos verdes caindo (chuva de código estilizada).
      ctx.fillStyle = '#000600';
      ctx.fillRect(0, 0, w, h);
      const cols = Math.max(12, Math.floor(w / 18));
      const cw = w / cols;
      for (let i = 0; i < cols; i += 1) {
        const speed = 0.5 + ((i * 7919) % 100) / 100;
        const headT = ((time * speed * 0.5) + ((i * 53) % 100) / 100) % 1.3;
        const headY = headT * h;
        for (let k = 0; k < 12; k += 1) {
          const y = headY - k * 18;
          if (y < 0 || y > h) continue;
          const a = k === 0 ? 1 : clamp(1 - k / 12, 0, 0.8);
          const col: Rgb = k === 0 ? { r: 210, g: 255, b: 210 } : { r: 60, g: 230, b: 90 };
          ctx.fillStyle = rgba(col, a);
          ctx.fillRect(i * cw + cw * 0.25, y, cw * 0.5, 12);
        }
      }
      break;
    }
    case 'space':
    default: {
      // Gradiente escuro + estrelas + nebulosa de ruído.
      const g = ctx.createRadialGradient(w / 2, h * 0.4, 0, w / 2, h * 0.4, w * 0.9);
      g.addColorStop(0, '#0d1030');
      g.addColorStop(0.6, '#05060f');
      g.addColorStop(1, '#000005');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      // Nebulosa via ruído 2D, em blend aditivo.
      ctx.globalCompositeOperation = 'screen';
      const step = Math.max(24, Math.floor(w / 24));
      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const n = valueNoise2D(x * 0.01 + time * 0.05, y * 0.01);
          if (n < 0.55) continue;
          const col: Rgb = n > 0.75 ? { r: 120, g: 80, b: 220 } : { r: 40, g: 90, b: 200 };
          ctx.fillStyle = rgba(col, (n - 0.5) * 0.4);
          ctx.fillRect(x, y, step, step);
        }
      }
      // Estrelas pontuais com cintilação.
      for (const s of stars) {
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(time * s.tw + s.x * 10));
        ctx.fillStyle = rgba({ r: 255, g: 255, b: 255 }, tw);
        ctx.fillRect(s.x * w, s.y * h, s.r, s.r);
      }
      ctx.globalCompositeOperation = 'source-over';
      break;
    }
  }
}

export const backgroundReplaceFx = defineFx<SceneState>({
  id: 'background_replace',
  capabilities: { personMask: true },
  composite: 'replace',

  init(env: FxInitEnv): SceneState {
    // Posições fixas de estrelas (determinísticas) para reuso entre frames.
    const stars: Star[] = Array.from({ length: 140 }, () => ({
      x: env.rng(),
      y: env.rng(),
      r: 1 + env.rng() * 2,
      tw: 1 + env.rng() * 4,
    }));
    return {
      person: createCanvas(env.width, env.height),
      outline: createCanvas(env.width, env.height),
      stars,
    };
  },

  render(ctx2: FxFrameContext, state: SceneState) {
    const { ctx, sourceCanvas, width, height, time, intensity, params, personMask, rng } = ctx2;
    const scene = paramString(params, 'scene', 'space');
    const rim = RIM_BY_SCENE[scene] || RIM_BY_SCENE.space;

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.filter = 'none';

    // 1) Cenário procedural (cobre tudo).
    ctx.save();
    drawScene(ctx, scene, width, height, time, rng, state.stars);
    ctx.restore();

    if (personMask && personMask.coverage > 0.005) {
      // 2) Luz de borda combinando com a cena (atrás da pessoa nítida).
      buildOutline(state.outline.ctx, personMask, width, height, rim, {
        thickness: Math.max(5, width * 0.012),
        blur: Math.max(5, width * 0.016),
        alpha: clamp(0.5 * intensity, 0, 0.8),
      });
      ctx.globalCompositeOperation = 'screen';
      ctx.drawImage(state.outline.canvas, 0, 0);

      // 3) Pessoa recortada por cima do cenário.
      extractPerson(state.person.ctx, sourceCanvas, personMask, width, height);
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(state.person.canvas, 0, 0);
    }
    // Sem máscara: a cena já preenche a tela (sem recorte da pessoa).

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.filter = 'none';
  },
});
