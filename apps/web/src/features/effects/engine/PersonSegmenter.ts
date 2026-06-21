// Segmentação de pessoa no navegador via MediaPipe Tasks Vision (ImageSegmenter,
// modelo selfie). Carregado SOB DEMANDA (import dinâmico) — só entra no bundle
// quando um efeito que precisa da pessoa é usado. Degrada graciosamente: se o
// modelo/WebGL não estiver disponível, `segment()` retorna null e os efeitos
// caem para uma variante sem máscara.

import type { ImageSegmenter as MpImageSegmenter, ImageSegmenterResult } from '@mediapipe/tasks-vision';
import type { PersonMask } from './types';
import { createCanvas, drawCoverImage } from './util';

/** Fontes aceitas pelo MediaPipe (CanvasImageSource exclui SVGImageElement). */
type SegmentationSource = HTMLCanvasElement | HTMLVideoElement | ImageBitmap;

const WASM_LOCAL = '/mediapipe/wasm';
const WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm';
const MODEL_LOCAL = '/mediapipe/selfie_segmenter.tflite';
const MODEL_CDN =
  'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite';

async function head(url: string) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

export class PersonSegmenter {
  private segmenter: MpImageSegmenter | null = null;
  private timestamp = 0;
  private maskCanvas: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null = null;
  private smallCanvas: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null = null;
  private ready = false;
  private failed = false;

  /** Carrega o modelo. Idempotente. Lança apenas em falha irrecuperável capturada por quem chama. */
  async ensureReady(): Promise<boolean> {
    if (this.ready) return true;
    if (this.failed) return false;
    try {
      const vision = await import('@mediapipe/tasks-vision');
      const wasmPath = (await head(`${WASM_LOCAL}/vision_wasm_internal.js`)) ? WASM_LOCAL : WASM_CDN;
      const modelPath = (await head(MODEL_LOCAL)) ? MODEL_LOCAL : MODEL_CDN;
      const fileset = await vision.FilesetResolver.forVisionTasks(wasmPath);
      this.segmenter = await vision.ImageSegmenter.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: modelPath, delegate: 'GPU' },
        runningMode: 'VIDEO',
        outputCategoryMask: false,
        outputConfidenceMasks: true,
      });
      this.ready = true;
      return true;
    } catch (error) {
      console.warn('[PersonSegmenter] indisponível, efeitos cairão para variante sem máscara.', error);
      this.failed = true;
      return false;
    }
  }

  get isReady() {
    return this.ready;
  }

  /** Segmenta um frame. Retorna a máscara na resolução de saída ou null. */
  segment(source: SegmentationSource, sourceWidth: number, sourceHeight: number, outWidth: number, outHeight: number): PersonMask | null {
    if (!this.ready || !this.segmenter || !sourceWidth || !sourceHeight) return null;

    if (!this.maskCanvas) this.maskCanvas = createCanvas(outWidth, outHeight);
    if (this.maskCanvas.canvas.width !== outWidth || this.maskCanvas.canvas.height !== outHeight) {
      this.maskCanvas.canvas.width = outWidth;
      this.maskCanvas.canvas.height = outHeight;
    }

    this.timestamp += 33;
    let result: ImageSegmenterResult | undefined;
    try {
      result = this.segmenter.segmentForVideo(source, this.timestamp);
    } catch {
      return null;
    }
    const confidence = result?.confidenceMasks?.[0];
    if (!confidence) {
      result?.close?.();
      return null;
    }

    const mw = confidence.width;
    const mh = confidence.height;
    const data = confidence.getAsFloat32Array();

    if (!this.smallCanvas) this.smallCanvas = createCanvas(mw, mh, true);
    if (this.smallCanvas.canvas.width !== mw || this.smallCanvas.canvas.height !== mh) {
      this.smallCanvas.canvas.width = mw;
      this.smallCanvas.canvas.height = mh;
    }
    const { canvas: small, ctx: smallCtx } = this.smallCanvas;
    const image = smallCtx.createImageData(mw, mh);
    const pixels = image.data;

    // Estatísticas da máscara (centroide/bbox/cobertura) calculadas no mesmo loop.
    let sumX = 0;
    let sumY = 0;
    let count = 0;
    let minX = mw;
    let minY = mh;
    let maxX = 0;
    let maxY = 0;
    for (let y = 0; y < mh; y += 1) {
      for (let x = 0; x < mw; x += 1) {
        const idx = y * mw + x;
        const prob = data[idx];
        const a = prob > 1 ? 255 : prob < 0 ? 0 : Math.round(prob * 255);
        const p = idx * 4;
        pixels[p] = 255;
        pixels[p + 1] = 255;
        pixels[p + 2] = 255;
        pixels[p + 3] = a;
        if (prob >= 0.5) {
          sumX += x;
          sumY += y;
          count += 1;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    smallCtx.putImageData(image, 0, 0);
    result.close?.();

    // Upscale com leve blur para suavizar a borda da máscara.
    const { canvas: maskCanvas, ctx: maskCtx } = this.maskCanvas;
    maskCtx.clearRect(0, 0, outWidth, outHeight);
    maskCtx.save();
    maskCtx.filter = 'blur(2px)';
    maskCtx.imageSmoothingEnabled = true;
    drawCoverImage(maskCtx, small, mw, mh, outWidth, outHeight);
    maskCtx.restore();

    const coverage = count / (mw * mh);
    const scaleX = outWidth / mw;
    const scaleY = outHeight / mh;
    const centroid = count > 0 ? { x: sumX / count / mw, y: sumY / count / mh } : null;
    const bbox = count > 0
      ? { x: minX * scaleX, y: minY * scaleY, w: (maxX - minX) * scaleX, h: (maxY - minY) * scaleY }
      : null;

    return { canvas: maskCanvas, width: outWidth, height: outHeight, centroid, bbox, coverage };
  }

  dispose() {
    try {
      this.segmenter?.close();
    } catch {
      // ignore
    }
    this.segmenter = null;
    this.ready = false;
  }
}
