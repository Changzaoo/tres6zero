// Retrato cinematográfico: fundo desfocado/escurecido/dessaturado e a pessoa
// nítida por cima, com leve glow de contorno. composite 'replace' — o módulo é
// dono do frame: desenha o fundo tratado e recompõe a pessoa recortada.
// Degrada para vinheta + leve blur de tela cheia se não houver máscara.

import { defineFx } from '../types';
import type { FxFrameContext, FxInitEnv } from '../types';
import { extractPerson, buildOutline } from '../maskUtils';
import { createCanvas, paramNumber, rgba } from '../util';
import { clamp } from '../noise';

type Scratch = { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D };

type FocusState = {
  person: Scratch;
  outline: Scratch;
};

export const backgroundFocusFx = defineFx<FocusState>({
  id: 'background_focus',
  capabilities: { personMask: true },
  composite: 'replace',

  init(env: FxInitEnv): FocusState {
    return {
      person: createCanvas(env.width, env.height),
      outline: createCanvas(env.width, env.height),
    };
  },

  render(ctx2: FxFrameContext, state: FocusState) {
    const { ctx, sourceCanvas, width, height, intensity, params, personMask } = ctx2;
    const blur = paramNumber(params, 'blur', 10);
    const darken = paramNumber(params, 'darken', 0.35);
    const desaturate = paramNumber(params, 'desaturate', 0.5);

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    if (personMask && personMask.coverage > 0.005) {
      // 1) Fundo desfocado + escurecido + dessaturado (filtro aplicado ao source).
      ctx.save();
      ctx.filter = `blur(${Math.max(0, blur)}px) brightness(${clamp(1 - darken, 0.2, 1)}) saturate(${clamp(1 - desaturate, 0, 1)})`;
      ctx.drawImage(sourceCanvas, 0, 0, width, height);
      ctx.restore();
      ctx.filter = 'none';

      // 2) Glow de contorno sutil destacando a silhueta antes da pessoa nítida.
      buildOutline(state.outline.ctx, personMask, width, height, { r: 255, g: 248, b: 230 }, {
        thickness: Math.max(4, width * 0.01),
        blur: Math.max(4, width * 0.012),
        alpha: clamp(0.35 * intensity, 0, 0.6),
      });
      ctx.globalCompositeOperation = 'screen';
      ctx.drawImage(state.outline.canvas, 0, 0);

      // 3) Pessoa nítida por cima (recorte da máscara, sem filtros).
      extractPerson(state.person.ctx, sourceCanvas, personMask, width, height);
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(state.person.canvas, 0, 0);
    } else {
      // Fallback sem máscara: blur leve de tela cheia + vinheta.
      ctx.save();
      ctx.filter = `blur(${Math.max(2, blur * 0.4)}px) brightness(${clamp(1 - darken * 0.5, 0.4, 1)}) saturate(${clamp(1 - desaturate * 0.5, 0, 1)})`;
      ctx.drawImage(sourceCanvas, 0, 0, width, height);
      ctx.restore();
      ctx.filter = 'none';
    }

    // 4) Vinheta para fechar o quadro (retrato).
    ctx.globalCompositeOperation = 'multiply';
    const vignette = ctx.createRadialGradient(width / 2, height / 2, width * 0.3, width / 2, height / 2, width * 0.72);
    vignette.addColorStop(0, 'rgba(255,255,255,1)');
    vignette.addColorStop(1, rgba({ r: 30, g: 28, b: 26 }, clamp(0.4 + 0.3 * intensity, 0, 0.85)));
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.filter = 'none';
  },
});
