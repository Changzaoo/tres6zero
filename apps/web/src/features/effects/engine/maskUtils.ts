// Helpers de composição a partir da máscara de pessoa. As funções recebem
// canvases de "scratch" já alocados (criados no init de cada efeito) para não
// alocar memória por frame.

import type { PersonMask } from './types';
import type { Rgb } from './util';
import { rgba } from './util';

/** Desenha apenas os pixels da pessoa (source ∩ máscara) no canvas `out`. */
export function extractPerson(
  outCtx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  mask: PersonMask,
  width: number,
  height: number,
) {
  outCtx.clearRect(0, 0, width, height);
  outCtx.globalCompositeOperation = 'source-over';
  outCtx.drawImage(source, 0, 0, width, height);
  outCtx.globalCompositeOperation = 'destination-in';
  outCtx.drawImage(mask.canvas, 0, 0, width, height);
  outCtx.globalCompositeOperation = 'source-over';
}

/** Desenha apenas o fundo (source menos a pessoa) no canvas `out`. */
export function extractBackground(
  outCtx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  mask: PersonMask,
  width: number,
  height: number,
) {
  outCtx.clearRect(0, 0, width, height);
  outCtx.globalCompositeOperation = 'source-over';
  outCtx.drawImage(source, 0, 0, width, height);
  outCtx.globalCompositeOperation = 'destination-out';
  outCtx.drawImage(mask.canvas, 0, 0, width, height);
  outCtx.globalCompositeOperation = 'source-over';
}

/**
 * Constrói uma silhueta colorida e "inflada" (halo) a partir da máscara — base
 * da aura. `dilate` é o fator de escala a partir do centro; `blur` é o raio do
 * desfoque em px; o resultado fica colorido com `color`/`alpha`.
 */
export function buildAuraSilhouette(
  outCtx: CanvasRenderingContext2D,
  mask: PersonMask,
  width: number,
  height: number,
  color: Rgb,
  options: { dilate: number; blur: number; alpha: number },
) {
  outCtx.clearRect(0, 0, width, height);
  outCtx.save();
  outCtx.filter = `blur(${Math.max(0, options.blur)}px)`;
  const cx = width / 2;
  const cy = height / 2;
  outCtx.translate(cx, cy);
  outCtx.scale(options.dilate, options.dilate);
  outCtx.translate(-cx, -cy);
  outCtx.drawImage(mask.canvas, 0, 0, width, height);
  outCtx.restore();
  // Tinge a silhueta desfocada com a cor da aura.
  outCtx.globalCompositeOperation = 'source-in';
  outCtx.fillStyle = rgba(color, options.alpha);
  outCtx.fillRect(0, 0, width, height);
  outCtx.globalCompositeOperation = 'source-over';
}

/**
 * Anel de contorno (rim light): silhueta inflada menos a silhueta original,
 * resultando numa borda brilhante ao redor da pessoa.
 */
export function buildOutline(
  outCtx: CanvasRenderingContext2D,
  mask: PersonMask,
  width: number,
  height: number,
  color: Rgb,
  options: { thickness: number; blur: number; alpha: number },
) {
  outCtx.clearRect(0, 0, width, height);
  const cx = width / 2;
  const cy = height / 2;
  const scale = 1 + options.thickness / Math.max(width, height);
  outCtx.save();
  outCtx.filter = `blur(${Math.max(0, options.blur)}px)`;
  outCtx.translate(cx, cy);
  outCtx.scale(scale, scale);
  outCtx.translate(-cx, -cy);
  outCtx.drawImage(mask.canvas, 0, 0, width, height);
  outCtx.restore();
  // Remove o miolo (silhueta original) → fica só a borda.
  outCtx.globalCompositeOperation = 'destination-out';
  outCtx.drawImage(mask.canvas, 0, 0, width, height);
  // Colore o anel.
  outCtx.globalCompositeOperation = 'source-in';
  outCtx.fillStyle = rgba(color, options.alpha);
  outCtx.fillRect(0, 0, width, height);
  outCtx.globalCompositeOperation = 'source-over';
}

/** Ponto de "topo" da pessoa (cabeça) para ancorar raios/energia. */
export function personTop(mask: PersonMask, width: number, height: number) {
  if (mask.bbox) {
    return { x: mask.bbox.x + mask.bbox.w / 2, y: mask.bbox.y };
  }
  return { x: width / 2, y: height * 0.25 };
}

/** Base (pés) da pessoa para ancorar brilho no chão. */
export function personFeet(mask: PersonMask, width: number, height: number) {
  if (mask.bbox) {
    return { x: mask.bbox.x + mask.bbox.w / 2, y: mask.bbox.y + mask.bbox.h };
  }
  return { x: width / 2, y: height * 0.92 };
}
