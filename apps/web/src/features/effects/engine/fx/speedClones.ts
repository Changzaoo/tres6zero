// Clones de velocidade (afterimage estilo Flash/Naruto).
//
// composite 'replace': o módulo desenha o frame inteiro. Mantém um buffer
// rotativo de canvases com a PESSOA isolada, capturada a cada poucos frames.
// A cada render desenha o fundo (sourceCanvas), depois os clones do mais antigo
// ao mais novo com alpha crescente e leve deslocamento na direção do movimento
// (estimada pelo centroide), e por fim o frame atual por cima. Sem máscara,
// degrada para um ghost leve do frame anterior.

import { defineFx } from '../types';
import type { FxFrameContext, FxInitEnv } from '../types';
import { extractPerson } from '../maskUtils';
import { createCanvas, paramNumber, paramString, resolveColor, rgba, type Rgb } from '../util';
import { clamp } from '../noise';

type Scratch = { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D };

const MAX_CLONES = 6;

type SpeedClonesState = {
  // Buffer rotativo de clones da pessoa.
  clones: Scratch[];
  // Há conteúdo válido neste slot do buffer?
  filled: boolean[];
  // Centroide (px) registrado para cada clone.
  centroids: Array<{ x: number; y: number }>;
  cursor: number;
  frameAcc: number;
  // Centroide do último frame, para estimar a direção do movimento.
  lastCentroid: { x: number; y: number } | null;
  // Canvas auxiliar para o fallback (frame anterior).
  prev: Scratch;
  hasPrev: boolean;
};

export const speedClonesFx = defineFx<SpeedClonesState>({
  id: 'speed_clones',
  capabilities: { personMask: true },
  composite: 'replace',

  init(env: FxInitEnv): SpeedClonesState {
    return {
      clones: Array.from({ length: MAX_CLONES }, () => createCanvas(env.width, env.height)),
      filled: Array.from({ length: MAX_CLONES }, () => false),
      centroids: Array.from({ length: MAX_CLONES }, () => ({ x: env.width / 2, y: env.height / 2 })),
      cursor: 0,
      frameAcc: 0,
      lastCentroid: null,
      prev: createCanvas(env.width, env.height),
      hasPrev: false,
    };
  },

  render(ctx2: FxFrameContext, state: SpeedClonesState) {
    const { ctx, sourceCanvas, width, height, intensity, params, personMask } = ctx2;
    const cloneCount = Math.round(clamp(paramNumber(params, 'clones', 4), 2, MAX_CLONES));
    const spacing = Math.round(clamp(paramNumber(params, 'spacing', 3), 1, 6));
    const tint = paramString(params, 'tint', '');
    const tintColor: Rgb | null = tint ? resolveColor(tint, { r: 255, g: 255, b: 255 }) : null;

    // 1) Frame base (vídeo cru / fundo).
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.drawImage(sourceCanvas, 0, 0, width, height);

    if (personMask && personMask.coverage > 0.005) {
      // Centroide atual em px (para captura e direção).
      const cx = personMask.centroid ? personMask.centroid.x * width : width / 2;
      const cy = personMask.centroid ? personMask.centroid.y * height : height / 2;

      // 2) Captura a pessoa no buffer a cada `spacing` frames.
      state.frameAcc += 1;
      if (state.frameAcc >= spacing) {
        state.frameAcc = 0;
        const slot = state.clones[state.cursor];
        extractPerson(slot.ctx, sourceCanvas, personMask, width, height);
        // Aplica tint opcional sobre o clone.
        if (tintColor) {
          slot.ctx.globalCompositeOperation = 'source-atop';
          slot.ctx.fillStyle = rgba(tintColor, 0.35);
          slot.ctx.fillRect(0, 0, width, height);
          slot.ctx.globalCompositeOperation = 'source-over';
        }
        state.filled[state.cursor] = true;
        state.centroids[state.cursor] = { x: cx, y: cy };
        state.cursor = (state.cursor + 1) % MAX_CLONES;
      }

      // 3) Direção do movimento estimada pelo deslocamento do centroide.
      let dirX = 0;
      let dirY = 0;
      if (state.lastCentroid) {
        dirX = cx - state.lastCentroid.x;
        dirY = cy - state.lastCentroid.y;
      }
      state.lastCentroid = { x: cx, y: cy };
      const speed = Math.hypot(dirX, dirY);
      const nx = speed > 0.01 ? dirX / speed : -1;
      const ny = speed > 0.01 ? dirY / speed : 0;
      // Deslocamento por clone: oposto ao movimento (rastro fica para trás).
      const lag = (8 + clamp(speed, 0, 60) * 0.8) * intensity;

      // 4) Desenha os clones do mais antigo (menor alpha) ao mais novo.
      // Percorre o buffer em ordem cronológica a partir do cursor.
      const drawn: number[] = [];
      for (let i = 0; i < MAX_CLONES; i += 1) {
        const idx = (state.cursor + i) % MAX_CLONES;
        if (state.filled[idx]) drawn.push(idx);
      }
      const take = drawn.slice(Math.max(0, drawn.length - cloneCount));
      const n = take.length;
      ctx.globalCompositeOperation = 'source-over';
      for (let i = 0; i < n; i += 1) {
        const idx = take[i];
        // i=0 é o mais antigo → alpha baixo; o mais novo → alpha alto.
        const t = n > 1 ? i / (n - 1) : 1;
        const alpha = clamp(0.12 + t * 0.4, 0, 0.6) * clamp(intensity, 0.2, 1.5);
        // Mais antigo = mais para trás (maior deslocamento na direção -mov).
        const back = (n - i) * lag;
        ctx.globalAlpha = alpha;
        ctx.drawImage(state.clones[idx].canvas, nx * back, ny * back);
      }

      // 5) Frame atual (pessoa nítida) por cima.
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(sourceCanvas, 0, 0, width, height);
    } else {
      // Fallback sem máscara: ghost leve do frame anterior por baixo do atual.
      if (state.hasPrev) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = clamp(0.35 * intensity, 0, 0.5);
        ctx.drawImage(state.prev.canvas, -6 * intensity, 0);
        ctx.globalAlpha = 1;
        ctx.drawImage(sourceCanvas, 0, 0, width, height);
      }
      // Atualiza o snapshot do frame anterior.
      state.prev.ctx.clearRect(0, 0, width, height);
      state.prev.ctx.drawImage(sourceCanvas, 0, 0, width, height);
      state.hasPrev = true;
    }

    // Restaura o estado do contexto.
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.filter = 'none';
  },
});
