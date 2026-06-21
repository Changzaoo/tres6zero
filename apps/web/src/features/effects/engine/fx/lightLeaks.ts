// Vazamentos de luz analógicos (light leaks).
//
// composite 'overlay': o frame base já está no ctx; somamos manchas suaves de
// cor que entram e saem pelas bordas, animadas por ruído, em blend 'screen'.
// Sem ML: cada "vazamento" é um gradiente radial cuja posição, raio e brilho
// são dirigidos por valueNoise2D/fbm1D (determinístico).

import { defineFx } from '../types';
import type { FxFrameContext, FxInitEnv } from '../types';
import { paramNumber, paramString, rgba, mixRgb, type Rgb } from '../util';
import { clamp, fbm1D, valueNoise2D } from '../noise';

// Quantidade de manchas de luz simultâneas.
const LEAK_COUNT = 4;

type LightLeaksState = {
  // Semente por mancha para descorrelacionar as animações de ruído.
  seeds: number[];
};

// Paletas: cada uma é um par de cores que se misturam por mancha.
const PALETTES: Record<string, Rgb[]> = {
  warm: [
    { r: 255, g: 140, b: 60 },
    { r: 255, g: 90, b: 40 },
  ],
  gold: [
    { r: 255, g: 209, b: 64 },
    { r: 255, g: 170, b: 30 },
  ],
  pink: [
    { r: 255, g: 120, b: 180 },
    { r: 255, g: 70, b: 130 },
  ],
  teal: [
    { r: 56, g: 230, b: 220 },
    { r: 40, g: 160, b: 255 },
  ],
  rainbow: [
    { r: 255, g: 80, b: 80 },
    { r: 80, g: 160, b: 255 },
    { r: 120, g: 255, b: 120 },
    { r: 255, g: 200, b: 60 },
    { r: 200, g: 100, b: 255 },
  ],
};

export const lightLeaksFx = defineFx<LightLeaksState>({
  id: 'light_leaks',
  capabilities: {},
  composite: 'overlay',

  init(env: FxInitEnv): LightLeaksState {
    return {
      seeds: Array.from({ length: LEAK_COUNT }, () => env.rng() * 1000),
    };
  },

  render(ctx2: FxFrameContext, state: LightLeaksState) {
    const { ctx, width, height, time, intensity, params } = ctx2;
    const palette = PALETTES[paramString(params, 'color', 'warm')] || PALETTES.warm;
    const userIntensity = clamp(paramNumber(params, 'intensity', 1), 0.3, 2);

    ctx.globalCompositeOperation = 'screen';

    for (let i = 0; i < LEAK_COUNT; i += 1) {
      const seed = state.seeds[i];
      // Posição da mancha animada por ruído lento; entra/sai pelas bordas.
      const nx = valueNoise2D(seed, time * 0.18);
      const ny = valueNoise2D(seed + 37.1, time * 0.15 + 5.2);
      // Mantém o centro fora/perto das bordas para o efeito "vazando".
      const edge = i % 2 === 0 ? -0.15 : 1.15;
      const x = (i < 2 ? edge : nx) * width;
      const y = ny * height;

      // Brilho pulsante (fbm) — vai a zero às vezes (vazamento "entra e sai").
      const pulse = fbm1D(time * 0.5 + seed * 0.01, 3);
      const alpha = clamp((pulse - 0.25) * 1.6, 0, 1) * 0.5 * intensity * userIntensity;
      if (alpha <= 0.01) continue;

      const radius = Math.max(width, height) * (0.35 + valueNoise2D(seed + 11.3, time * 0.1) * 0.4);

      // Cor da mancha: mistura de duas cores da paleta variando no tempo.
      const c0 = palette[i % palette.length];
      const c1 = palette[(i + 1) % palette.length];
      const color = mixRgb(c0, c1, valueNoise2D(seed + 71.7, time * 0.2));

      const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
      grad.addColorStop(0, rgba(color, alpha));
      grad.addColorStop(0.5, rgba(color, alpha * 0.4));
      grad.addColorStop(1, rgba(color, 0));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }

    // Restaura o estado do contexto.
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.filter = 'none';
  },
});
