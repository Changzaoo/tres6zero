// Aura de energia estilo Dragon Ball Z ao redor da pessoa.
//
// Esta é a implementação de REFERÊNCIA do motor: copie este padrão para novos
// efeitos. Resumo: composite 'replace' (o módulo desenha o frame inteiro),
// usa a máscara da pessoa para inflar/colorir uma silhueta-halo animada, soma
// faíscas que sobem, brilho no chão e tremor de tela sincronizado com o áudio.
// Degrada para uma aura de tela cheia se a máscara não estiver disponível.

import { defineFx } from '../types';
import type { FxFrameContext, FxInitEnv } from '../types';
import { buildAuraSilhouette, personFeet } from '../maskUtils';
import { ParticleSystem } from '../particles';
import { createCanvas, paramNumber, paramString, resolveColor, rgba, type Rgb } from '../util';
import { clamp, fbm1D } from '../noise';

type Scratch = { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D };

type AuraState = {
  aura: Scratch;
  core: Scratch;
  sparks: ParticleSystem;
  streaks: ParticleSystem;
  emitAcc: number;
};

const STYLE_COLORS: Record<string, { aura: Rgb; core: Rgb }> = {
  super_saiyan: { aura: { r: 255, g: 209, b: 64 }, core: { r: 255, g: 246, b: 196 } },
  kamehameha: { aura: { r: 64, g: 168, b: 255 }, core: { r: 198, g: 240, b: 255 } },
  god: { aura: { r: 220, g: 38, b: 64 }, core: { r: 255, g: 196, b: 206 } },
  ultra: { aura: { r: 168, g: 92, b: 255 }, core: { r: 232, g: 214, b: 255 } },
};

export const auraEnergyFx = defineFx<AuraState>({
  id: 'aura_energy',
  capabilities: { personMask: true, audio: true },
  composite: 'replace',

  init(env: FxInitEnv): AuraState {
    return {
      aura: createCanvas(env.width, env.height),
      core: createCanvas(env.width, env.height),
      sparks: new ParticleSystem(220, env.rng),
      streaks: new ParticleSystem(160, env.rng),
      emitAcc: 0,
    };
  },

  render(ctx2: FxFrameContext, state: AuraState) {
    const { ctx, sourceCanvas, width, height, time, intensity, params, personMask, audioEnergy, rng, dt } = ctx2;
    const style = paramString(params, 'style', 'super_saiyan');
    const palette = STYLE_COLORS[style] || STYLE_COLORS.super_saiyan;
    const auraColor = resolveColor(paramString(params, 'color', ''), palette.aura);
    const coreColor = palette.core;
    const density = paramNumber(params, 'density', 1);
    const energy = clamp(0.55 + audioEnergy * 0.6, 0, 1.4);
    // Flicker turbulento da chama (determinístico).
    const flicker = 0.7 + fbm1D(time * 7) * 0.6;

    // 1) Tremor de tela proporcional à intensidade e à batida da música.
    const shakeAmp = 5 * intensity * (0.4 + audioEnergy);
    const shakeX = (rng() - 0.5) * shakeAmp;
    const shakeY = (rng() - 0.5) * shakeAmp;

    ctx.save();
    ctx.translate(shakeX, shakeY);

    // 2) Frame base (vídeo cru).
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.drawImage(sourceCanvas, 0, 0, width, height);

    if (personMask && personMask.coverage > 0.005) {
      // 3) Halo externo (aura inflada e desfocada) — blend aditivo.
      const auraAlpha = clamp(0.5 * intensity * flicker * energy, 0, 0.85);
      buildAuraSilhouette(state.aura.ctx, personMask, width, height, auraColor, {
        dilate: 1.05 + 0.04 * intensity + audioEnergy * 0.03,
        blur: Math.max(8, width * 0.045),
        alpha: auraAlpha,
      });
      ctx.globalCompositeOperation = 'screen';
      ctx.drawImage(state.aura.canvas, 0, 0);

      // 4) Núcleo quente (silhueta mais justa e brilhante).
      buildAuraSilhouette(state.core.ctx, personMask, width, height, coreColor, {
        dilate: 1.012 + 0.01 * intensity,
        blur: Math.max(3, width * 0.012),
        alpha: clamp(0.4 * intensity * flicker, 0, 0.7),
      });
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(state.core.canvas, 0, 0);

      // 5) Faíscas/streaks de energia subindo a partir dos pés/corpo.
      const feet = personFeet(personMask, width, height);
      const bbox = personMask.bbox;
      const spawnW = bbox ? bbox.w : width * 0.4;
      const spawnX = bbox ? bbox.x : width * 0.3;
      const spawnY = bbox ? bbox.y + bbox.h : feet.y;
      state.emitAcc += density * intensity * (10 + audioEnergy * 22) * dt;
      while (state.emitAcc >= 1) {
        state.emitAcc -= 1;
        const px = spawnX + rng() * spawnW;
        const py = spawnY - rng() * (bbox ? bbox.h * 0.4 : height * 0.15);
        state.streaks.emit({
          x: px,
          y: py,
          vy: -(120 + rng() * 220) * (0.6 + intensity),
          vx: (rng() - 0.5) * 30,
          life: 0.5 + rng() * 0.5,
          size: 1.5 + rng() * 2.5,
          color: rng() > 0.5 ? auraColor : coreColor,
          alpha: 0.9,
        });
        if (rng() > 0.5) {
          state.sparks.emit({
            x: px,
            y: py,
            vy: -(40 + rng() * 120),
            vx: (rng() - 0.5) * 90,
            life: 0.35 + rng() * 0.4,
            size: 1 + rng() * 2,
            color: coreColor,
            alpha: 1,
          });
        }
      }
      state.streaks.update(dt, -60, 0.6);
      state.sparks.update(dt, -30, 1.2);
      state.streaks.draw(ctx, 'streak', 'lighter');
      state.sparks.draw(ctx, 'spark', 'lighter');

      // 6) Brilho no chão (impacto da energia).
      const groundR = (bbox ? bbox.w : width * 0.4) * (0.8 + audioEnergy * 0.5);
      const grad = ctx.createRadialGradient(feet.x, feet.y, 0, feet.x, feet.y, groundR);
      grad.addColorStop(0, rgba(auraColor, 0.4 * intensity * energy));
      grad.addColorStop(1, rgba(auraColor, 0));
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(feet.x, feet.y, groundR, groundR * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Fallback sem máscara: pulso de cor de tela cheia.
      const grad = ctx.createRadialGradient(width / 2, height / 2, width * 0.1, width / 2, height / 2, width * 0.75);
      grad.addColorStop(0, rgba(auraColor, 0.04));
      grad.addColorStop(1, rgba(auraColor, 0.22 * intensity * flicker));
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }

    ctx.restore();

    // 7) Vinheta sutil para "fechar" o quadro.
    ctx.globalCompositeOperation = 'multiply';
    const vignette = ctx.createRadialGradient(width / 2, height / 2, width * 0.35, width / 2, height / 2, width * 0.75);
    vignette.addColorStop(0, 'rgba(255,255,255,1)');
    vignette.addColorStop(1, `rgba(120,110,90,${clamp(0.25 * intensity, 0, 0.4)})`);
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  },
});
