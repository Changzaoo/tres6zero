// Eco fantasma / projeção astral.
//
// composite 'overlay': o frame base já está no ctx. Mantém um buffer rotativo
// de snapshots da PESSOA isolada (extractPerson) e desenha, por cima do frame
// atual, uma cópia ATRASADA (~delay segundos) e semitransparente, tingida e em
// blend 'screen', arrastando atrás do movimento. Sem máscara, degrada para um
// glow translúcido leve no centro do quadro.

import { defineFx } from '../types';
import type { FxFrameContext, FxInitEnv } from '../types';
import { extractPerson } from '../maskUtils';
import { createCanvas, paramNumber, paramString, resolveColor, rgba } from '../util';
import { clamp } from '../noise';

type Scratch = { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D };

// Buffer de ~1s a 30fps; suficiente para atrasos de até ~1s.
const BUFFER = 32;

type GhostEchoState = {
  // Buffer rotativo de snapshots da pessoa.
  frames: Scratch[];
  filled: boolean[];
  cursor: number;
  // Acumulador de tempo entre capturas (captura a cada frame).
  // Canvas auxiliar para tingir o eco antes de compor.
  tinted: Scratch;
};

export const ghostEchoFx = defineFx<GhostEchoState>({
  id: 'ghost_echo',
  capabilities: { personMask: true },
  composite: 'overlay',

  init(env: FxInitEnv): GhostEchoState {
    return {
      frames: Array.from({ length: BUFFER }, () => createCanvas(env.width, env.height)),
      filled: Array.from({ length: BUFFER }, () => false),
      cursor: 0,
      tinted: createCanvas(env.width, env.height),
    };
  },

  render(ctx2: FxFrameContext, state: GhostEchoState) {
    const { ctx, sourceCanvas, width, height, time, intensity, params, personMask, dt } = ctx2;
    const color = resolveColor(paramString(params, 'color', 'cyan'), { r: 56, g: 230, b: 240 });
    const delay = clamp(paramNumber(params, 'delay', 0.3), 0.05, 1);
    const alpha = clamp(paramNumber(params, 'alpha', 0.5), 0.1, 0.9);

    if (personMask && personMask.coverage > 0.005) {
      // 1) Captura a pessoa atual no buffer rotativo.
      const slot = state.frames[state.cursor];
      extractPerson(slot.ctx, sourceCanvas, personMask, width, height);
      state.filled[state.cursor] = true;
      const writeIdx = state.cursor;
      state.cursor = (state.cursor + 1) % BUFFER;

      // 2) Quantos frames para trás corresponde ao atraso pedido.
      const fps = dt > 0 ? 1 / dt : 30;
      const lagFrames = clamp(Math.round(delay * fps), 1, BUFFER - 1);
      // Slot escrito agora foi `writeIdx`; o eco é `lagFrames` antes dele.
      let echoIdx = (writeIdx - lagFrames + BUFFER * 2) % BUFFER;
      if (!state.filled[echoIdx]) {
        // Ainda não há histórico suficiente: usa o mais antigo disponível.
        echoIdx = writeIdx;
      }

      // 3) Tinge o eco com a cor escolhida (preserva o alpha da silhueta).
      const t = state.tinted;
      t.ctx.clearRect(0, 0, width, height);
      t.ctx.globalCompositeOperation = 'source-over';
      t.ctx.drawImage(state.frames[echoIdx].canvas, 0, 0);
      t.ctx.globalCompositeOperation = 'source-atop';
      t.ctx.fillStyle = rgba(color, 0.6);
      t.ctx.fillRect(0, 0, width, height);
      t.ctx.globalCompositeOperation = 'source-over';

      // 4) Compõe o eco semitransparente em blend aditivo por cima do frame.
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = clamp(alpha * intensity, 0, 0.95);
      ctx.drawImage(t.canvas, 0, 0);
    } else {
      // Fallback sem máscara: glow translúcido pulsando no centro do quadro.
      const pulse = 0.5 + 0.5 * Math.sin(time * 1.8);
      const r = Math.max(width, height) * 0.4;
      const grad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, r);
      grad.addColorStop(0, rgba(color, clamp(0.18 * alpha * intensity * (0.6 + pulse * 0.6), 0, 0.5)));
      grad.addColorStop(1, rgba(color, 0));
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 1;
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }

    // Restaura o estado do contexto.
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.filter = 'none';
  },
});
