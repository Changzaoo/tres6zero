// Congela o tempo do cenário (background freeze).
//
// composite 'replace': o módulo desenha o frame inteiro. Captura UMA vez o
// fundo (extractBackground) no primeiro frame em que houver pessoa
// (coverage > 0) e o guarda no State. A cada frame desenha o fundo congelado
// (com leve dessaturação opcional) e a PESSOA atual (extractPerson) por cima —
// o cenário fica estático e só a pessoa se move. Enquanto não capturou o fundo,
// mostra o frame normal (fallback).

import { defineFx } from '../types';
import type { FxFrameContext, FxInitEnv } from '../types';
import { extractBackground, extractPerson } from '../maskUtils';
import { createCanvas, paramNumber } from '../util';
import { clamp } from '../noise';

type Scratch = { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D };

type FreezeBackgroundState = {
  // Fundo congelado (capturado uma única vez).
  frozen: Scratch;
  captured: boolean;
  // Canvas da pessoa atual.
  person: Scratch;
};

export const freezeBackgroundFx = defineFx<FreezeBackgroundState>({
  id: 'freeze_background',
  capabilities: { personMask: true },
  composite: 'replace',

  init(env: FxInitEnv): FreezeBackgroundState {
    return {
      frozen: createCanvas(env.width, env.height),
      captured: false,
      person: createCanvas(env.width, env.height),
    };
  },

  render(ctx2: FxFrameContext, state: FreezeBackgroundState) {
    const { ctx, sourceCanvas, width, height, params, personMask } = ctx2;
    const desaturate = clamp(paramNumber(params, 'desaturate', 0.2), 0, 1);

    // 1) Captura o fundo UMA vez, no primeiro frame com pessoa detectada.
    if (!state.captured && personMask && personMask.coverage > 0) {
      extractBackground(state.frozen.ctx, sourceCanvas, personMask, width, height);
      state.captured = true;
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    if (state.captured) {
      // 2) Fundo congelado, com leve dessaturação opcional.
      ctx.filter = desaturate > 0 ? `saturate(${clamp(1 - desaturate, 0, 1)})` : 'none';
      ctx.drawImage(state.frozen.canvas, 0, 0, width, height);
      ctx.filter = 'none';

      // 3) Pessoa atual por cima (se houver máscara neste frame).
      if (personMask && personMask.coverage > 0.005) {
        extractPerson(state.person.ctx, sourceCanvas, personMask, width, height);
        ctx.drawImage(state.person.canvas, 0, 0, width, height);
      }
    } else {
      // Fallback: ainda não capturou o fundo → frame normal.
      ctx.drawImage(sourceCanvas, 0, 0, width, height);
    }

    // Restaura o estado do contexto.
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.filter = 'none';
  },
});
