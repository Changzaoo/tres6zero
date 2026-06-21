// Câmera reativa à batida (beat pulse).
//
// composite 'replace': o módulo é dono do frame. Redesenha o sourceCanvas com
// um "punch" de zoom proporcional ao audioEnergy, um leve tremor (shake) e, nos
// picos de energia, um flash de cor e leve aberração cromática. Usa áudio.

import { defineFx } from '../types';
import type { FxFrameContext, FxInitEnv } from '../types';
import { createCanvas, paramNumber, paramString, resolveColor, rgba, type Rgb } from '../util';
import { clamp } from '../noise';

type Scratch = { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D };

type BeatPulseState = {
  // Canvas para isolar um canal de cor (aberração cromática nos picos).
  channel: Scratch;
  // Energia suavizada do frame anterior (detecção de pico por diferença).
  prevEnergy: number;
  // Decaimento do flash após um pico.
  flash: number;
};

const FLASH_COLORS: Record<string, Rgb> = {
  white: { r: 255, g: 255, b: 255 },
  gold: { r: 255, g: 209, b: 64 },
  cyan: { r: 56, g: 230, b: 240 },
  pink: { r: 236, g: 72, b: 153 },
};

// Desenha o sourceCanvas filtrado por um canal de cor, deslocado, em 'lighter'.
function drawChannel(
  channel: Scratch,
  dst: CanvasRenderingContext2D,
  source: HTMLCanvasElement,
  width: number,
  height: number,
  keep: 'r' | 'b',
  dx: number,
) {
  const c = channel.ctx;
  c.globalCompositeOperation = 'source-over';
  c.clearRect(0, 0, width, height);
  c.drawImage(source, 0, 0, width, height);
  c.globalCompositeOperation = 'multiply';
  c.fillStyle = keep === 'r' ? '#ff0000' : '#0000ff';
  c.fillRect(0, 0, width, height);
  c.globalCompositeOperation = 'source-over';
  dst.globalCompositeOperation = 'lighter';
  dst.drawImage(channel.canvas, dx, 0, width, height);
}

export const beatPulseFx = defineFx<BeatPulseState>({
  id: 'beat_pulse',
  capabilities: { audio: true },
  composite: 'replace',

  init(env: FxInitEnv): BeatPulseState {
    return {
      channel: createCanvas(env.width, env.height),
      prevEnergy: 0,
      flash: 0,
    };
  },

  render(ctx2: FxFrameContext, state: BeatPulseState) {
    const { ctx, sourceCanvas, width, height, intensity, params, audioEnergy, rng, dt } = ctx2;
    const flashColor = FLASH_COLORS[paramString(params, 'color', 'white')] || FLASH_COLORS.white;
    const strength = clamp(paramNumber(params, 'strength', 1), 0.3, 2);

    // Detecção de pico: subida brusca da energia em relação ao frame anterior.
    const delta = audioEnergy - state.prevEnergy;
    state.prevEnergy = audioEnergy;
    const isPeak = delta > 0.12;
    if (isPeak) state.flash = clamp(state.flash + delta * 1.5, 0, 1);
    // Decaimento exponencial do flash.
    state.flash = clamp(state.flash * Math.pow(0.02, dt), 0, 1);

    // Zoom "punch" + shake proporcionais à energia.
    const s = 1 + audioEnergy * strength * 0.12;
    const shakeAmp = audioEnergy * strength * 6;
    const shakeX = (rng() - 0.5) * shakeAmp;
    const shakeY = (rng() - 0.5) * shakeAmp;
    const cx = width / 2;
    const cy = height / 2;

    // 1) Frame base com zoom centralizado e leve tremor.
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.filter = 'none';
    ctx.save();
    ctx.translate(shakeX, shakeY);
    ctx.translate(cx, cy);
    ctx.scale(s, s);
    ctx.translate(-cx, -cy);
    ctx.drawImage(sourceCanvas, 0, 0, width, height);

    // 2) Nos picos: leve aberração cromática (R/B deslocados) sobre o zoom.
    if (state.flash > 0.02) {
      const off = state.flash * strength * 6;
      drawChannel(state.channel, ctx, sourceCanvas, width, height, 'r', -off);
      drawChannel(state.channel, ctx, sourceCanvas, width, height, 'b', off);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();

    // 3) Flash de cor de tela cheia nos picos (decai rápido).
    if (state.flash > 0.02) {
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 1;
      ctx.fillStyle = rgba(flashColor, clamp(state.flash * 0.4 * intensity, 0, 0.6));
      ctx.fillRect(0, 0, width, height);
    }

    // Restaura o estado do contexto.
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.filter = 'none';
  },
});
