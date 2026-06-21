// Glitch / VHS digital.
//
// composite 'overlay': o frame base já está no ctx, mas redesenhamos a partir
// do sourceCanvas para distorcer. Sem ML. Estilos:
//  - 'vhs'       linhas de tracking, ruído, leve descoloração
//  - 'datamosh'  blocos retangulares deslocados
//  - 'chromatic' aberração cromática crescente nas bordas
//  - 'scanlines' linhas horizontais escuras + brilho CRT
//  - 'rgb_split' separação dos canais R/G/B deslocados (blend 'lighter')
// Em todos, glitches pontuais (fatias horizontais deslocadas) usando rng+tempo.

import { defineFx } from '../types';
import type { FxFrameContext, FxInitEnv } from '../types';
import { createCanvas, paramNumber, paramString } from '../util';
import { clamp, valueNoise1D } from '../noise';

type Scratch = { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D };

type GlitchVhsState = {
  // Canvas de trabalho para montar o quadro distorcido antes de compor.
  work: Scratch;
  // Canvas para isolar um canal de cor (rgb_split / chromatic).
  channel: Scratch;
};

// Desenha o sourceCanvas filtrado por um único canal de cor no destino,
// em blend 'lighter', com deslocamento (dx,dy). Usa 'multiply' para zerar
// os outros canais e 'lighter' para somar de volta.
function drawChannel(
  channel: Scratch,
  dst: CanvasRenderingContext2D,
  source: HTMLCanvasElement,
  width: number,
  height: number,
  keep: 'r' | 'g' | 'b',
  dx: number,
  dy: number,
) {
  const c = channel.ctx;
  c.globalCompositeOperation = 'source-over';
  c.clearRect(0, 0, width, height);
  c.drawImage(source, 0, 0, width, height);
  // Mantém só o canal desejado multiplicando pelos demais a zero.
  c.globalCompositeOperation = 'multiply';
  c.fillStyle = keep === 'r' ? '#ff0000' : keep === 'g' ? '#00ff00' : '#0000ff';
  c.fillRect(0, 0, width, height);
  c.globalCompositeOperation = 'source-over';
  dst.globalCompositeOperation = 'lighter';
  dst.drawImage(channel.canvas, dx, dy, width, height);
}

export const glitchVhsFx = defineFx<GlitchVhsState>({
  id: 'glitch_vhs',
  capabilities: {},
  composite: 'overlay',

  init(env: FxInitEnv): GlitchVhsState {
    return {
      work: createCanvas(env.width, env.height),
      channel: createCanvas(env.width, env.height),
    };
  },

  render(ctx2: FxFrameContext, state: GlitchVhsState) {
    const { ctx, sourceCanvas, width, height, time, intensity, params, rng } = ctx2;
    const style = paramString(params, 'style', 'vhs');
    const amt = clamp(paramNumber(params, 'intensity', 1), 0.2, 2);
    const w = state.work.ctx;

    // Monta o quadro distorcido no canvas de trabalho a partir da fonte.
    w.globalCompositeOperation = 'source-over';
    w.globalAlpha = 1;
    w.filter = 'none';
    w.clearRect(0, 0, width, height);

    if (style === 'rgb_split') {
      // Separação RGB: três cópias deslocadas, uma por canal, somadas.
      const off = (3 + 8 * amt) * (0.6 + valueNoise1D(time * 4) * 0.8);
      drawChannel(state.channel, w, sourceCanvas, width, height, 'r', -off, 0);
      drawChannel(state.channel, w, sourceCanvas, width, height, 'g', 0, 0);
      drawChannel(state.channel, w, sourceCanvas, width, height, 'b', off, 0);
      w.globalCompositeOperation = 'source-over';
    } else if (style === 'chromatic') {
      // Aberração cromática: base + R/B deslocados (mais forte nas bordas via
      // escala leve dos canais externos).
      w.globalCompositeOperation = 'source-over';
      w.drawImage(sourceCanvas, 0, 0, width, height);
      const off = (2 + 6 * amt);
      const scaleR = 1 + 0.004 * amt;
      const scaleB = 1 + 0.008 * amt;
      drawChannel(
        state.channel,
        w,
        sourceCanvas,
        width * scaleR,
        height * scaleR,
        'r',
        -off - (width * (scaleR - 1)) / 2,
        -(height * (scaleR - 1)) / 2,
      );
      drawChannel(
        state.channel,
        w,
        sourceCanvas,
        width * scaleB,
        height * scaleB,
        'b',
        off - (width * (scaleB - 1)) / 2,
        -(height * (scaleB - 1)) / 2,
      );
      w.globalCompositeOperation = 'source-over';
    } else {
      // vhs / datamosh / scanlines partem do frame cru.
      w.drawImage(sourceCanvas, 0, 0, width, height);
    }

    if (style === 'datamosh') {
      // Blocos retangulares deslocados (copia-cola de regiões da própria fonte).
      const blocks = Math.round(8 + 24 * amt);
      for (let i = 0; i < blocks; i += 1) {
        if (rng() > 0.6) continue;
        const bw = width * (0.1 + rng() * 0.3);
        const bh = height * (0.03 + rng() * 0.12);
        const sx = rng() * (width - bw);
        const sy = rng() * (height - bh);
        const dx = sx + (rng() - 0.5) * 60 * amt;
        const dy = sy + (rng() - 0.5) * 20 * amt;
        w.drawImage(sourceCanvas, sx, sy, bw, bh, dx, dy, bw, bh);
      }
    }

    // Glitches pontuais em TODOS os estilos: fatias horizontais deslocadas.
    // A quantidade pulsa com o tempo (raros, mas presentes).
    const burst = valueNoise1D(time * 3.1) > 0.7 ? 1 : 0.25;
    const slices = Math.round((2 + 10 * amt) * burst);
    for (let i = 0; i < slices; i += 1) {
      if (rng() > 0.5) continue;
      const sy = Math.floor(rng() * height);
      const sh = Math.max(2, Math.floor(2 + rng() * 14));
      const dx = (rng() - 0.5) * 80 * amt;
      w.drawImage(sourceCanvas, 0, sy, width, sh, dx, sy, width, sh);
    }

    if (style === 'vhs') {
      // Leve descoloração (tinge verde/magenta sutil) + linhas de tracking.
      w.globalCompositeOperation = 'screen';
      w.fillStyle = `rgba(40, 0, 60, ${0.06 * amt})`;
      w.fillRect(0, 0, width, height);
      w.globalCompositeOperation = 'source-over';
      // Banda de tracking que desce pela tela.
      const trackY = ((time * 90) % (height + 80)) - 40;
      const trackH = 24 + 20 * amt;
      w.fillStyle = `rgba(255,255,255,${0.05 * amt})`;
      w.fillRect(0, trackY, width, trackH);
      w.fillStyle = `rgba(0,0,0,${0.12 * amt})`;
      w.fillRect(0, trackY + trackH, width, 3);
    }

    // Compõe o resultado distorcido sobre o frame (substituindo o base).
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.filter = 'none';
    ctx.drawImage(state.work.canvas, 0, 0, width, height);

    // Sobreposições "ópticas" desenhadas direto no ctx de saída.
    if (style === 'scanlines') {
      // Linhas horizontais escuras (CRT) + brilho geral.
      ctx.globalCompositeOperation = 'multiply';
      const gap = 3;
      ctx.fillStyle = `rgba(0,0,0,${clamp(0.35 * amt, 0, 0.6)})`;
      for (let y = 0; y < height; y += gap) {
        ctx.fillRect(0, y, width, 1);
      }
      // Brilho CRT (vinheta clara central).
      ctx.globalCompositeOperation = 'screen';
      const grad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.7);
      grad.addColorStop(0, `rgba(180,220,255,${0.1 * amt})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }

    if (style === 'vhs') {
      // Ruído granulado leve (pontos brancos esparsos).
      ctx.globalCompositeOperation = 'screen';
      const dots = Math.round(width * 0.3 * amt * intensity);
      ctx.fillStyle = `rgba(255,255,255,${0.5})`;
      for (let i = 0; i < dots; i += 1) {
        const x = rng() * width;
        const y = rng() * height;
        ctx.fillRect(x, y, 1, 1);
      }
    }

    // Restaura o estado do contexto.
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.filter = 'none';
  },
});
