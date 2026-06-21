// Contorno neon (rim light) pulsante ao redor da pessoa.
//
// composite 'overlay': o frame base já está no ctx; este módulo só soma o anel
// de luz. Usa `buildOutline` para extrair a borda da silhueta, varia
// espessura/blur com a intensidade e cicla/pulsa a cor com o tempo e o áudio,
// somando em blend aditivo ('screen'/'lighter'). Sem máscara, cai numa moldura
// neon sutil nas bordas do quadro.

import { defineFx } from '../types';
import type { FxFrameContext, FxInitEnv } from '../types';
import { buildOutline } from '../maskUtils';
import { createCanvas, paramNumber, paramString, resolveColor, rgba, mixRgb, type Rgb } from '../util';
import { clamp, fbm1D } from '../noise';

type Scratch = { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D };

type RimNeonState = {
  rim: Scratch;
};

// Cor secundária para o ciclo de matiz (a borda transita entre as duas).
const SHIFT_COLORS: Record<string, Rgb> = {
  cyan: { r: 168, g: 92, b: 255 },
  pink: { r: 56, g: 230, b: 240 },
  green: { r: 56, g: 230, b: 240 },
  purple: { r: 236, g: 72, b: 153 },
  gold: { r: 255, g: 122, b: 36 },
  white: { r: 56, g: 230, b: 240 },
};

export const rimNeonFx = defineFx<RimNeonState>({
  id: 'rim_neon',
  capabilities: { personMask: true, audio: true },
  composite: 'overlay',

  init(env: FxInitEnv): RimNeonState {
    return {
      rim: createCanvas(env.width, env.height),
    };
  },

  render(ctx2: FxFrameContext, state: RimNeonState) {
    const { ctx, width, height, time, intensity, params, personMask, audioEnergy } = ctx2;
    const colorName = paramString(params, 'color', 'cyan');
    const baseColor = resolveColor(colorName, { r: 56, g: 230, b: 240 });
    const shiftColor = SHIFT_COLORS[colorName.toLowerCase()] || baseColor;
    const userIntensity = paramNumber(params, 'intensity', 1);
    const strength = clamp(intensity * userIntensity, 0, 2);

    // Pulso na batida: ciclo de cor com o tempo + reforço pelo áudio.
    const beat = clamp(0.5 + audioEnergy * 0.8, 0, 1.3);
    const cycle = 0.5 + 0.5 * Math.sin(time * 2.2);
    const flicker = 0.75 + fbm1D(time * 9) * 0.5;
    const neonColor = mixRgb(baseColor, shiftColor, cycle * 0.6);

    if (personMask && personMask.coverage > 0.005) {
      // Anel de contorno: espessura e blur crescem com a intensidade e a batida.
      const base = Math.max(width, height);
      const thickness = base * (0.004 + 0.01 * strength) * (0.8 + beat * 0.5);
      const blur = Math.max(3, base * (0.006 + 0.012 * strength)) * flicker;

      // Camada externa (glow largo e suave).
      buildOutline(state.rim.ctx, personMask, width, height, neonColor, {
        thickness: thickness * 2.4,
        blur: blur * 2.2,
        alpha: clamp(0.45 * strength * beat * flicker, 0, 0.8),
      });
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 1;
      ctx.drawImage(state.rim.canvas, 0, 0);

      // Camada interna (borda nítida e quente).
      buildOutline(state.rim.ctx, personMask, width, height, neonColor, {
        thickness,
        blur: Math.max(1, blur * 0.4),
        alpha: clamp(0.85 * strength * flicker, 0, 1),
      });
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(state.rim.canvas, 0, 0);
    } else {
      // Fallback sem máscara: moldura neon sutil pulsando nas bordas do quadro.
      const margin = Math.max(width, height) * 0.04;
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, rgba(neonColor, clamp(0.4 * strength * beat * flicker, 0, 0.7)));
      grad.addColorStop(0.5, rgba(neonColor, 0));
      grad.addColorStop(1, rgba(neonColor, clamp(0.4 * strength * beat * flicker, 0, 0.7)));
      ctx.globalCompositeOperation = 'screen';
      ctx.lineWidth = margin;
      ctx.strokeStyle = grad;
      ctx.shadowColor = rgba(neonColor, 0.8);
      ctx.shadowBlur = margin * 1.5 * flicker;
      ctx.strokeRect(margin / 2, margin / 2, width - margin, height - margin);
      ctx.shadowBlur = 0;
    }

    // Restaura o estado do contexto.
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.filter = 'none';
  },
});
