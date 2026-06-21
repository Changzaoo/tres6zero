// Rastreamento de pose (landmarks de corpo/mãos) via MediaPipe PoseLandmarker.
// Lazy e opcional — só usado por efeitos como raios/energia entre as mãos.
// Degrada para null se indisponível.

import type { PoseLandmarker as MpPoseLandmarker, PoseLandmarkerResult } from '@mediapipe/tasks-vision';
import type { PoseResult } from './types';

/** Fontes aceitas pelo MediaPipe (CanvasImageSource exclui SVGImageElement). */
type DetectionSource = HTMLCanvasElement | HTMLVideoElement | ImageBitmap;

const WASM_LOCAL = '/mediapipe/wasm';
const WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm';
const MODEL_LOCAL = '/mediapipe/pose_landmarker_lite.task';
const MODEL_CDN =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task';

async function head(url: string) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

export class PoseTracker {
  private tracker: MpPoseLandmarker | null = null;
  private timestamp = 0;
  private ready = false;
  private failed = false;

  async ensureReady(): Promise<boolean> {
    if (this.ready) return true;
    if (this.failed) return false;
    try {
      const vision = await import('@mediapipe/tasks-vision');
      const wasmPath = (await head(`${WASM_LOCAL}/vision_wasm_internal.js`)) ? WASM_LOCAL : WASM_CDN;
      const modelPath = (await head(MODEL_LOCAL)) ? MODEL_LOCAL : MODEL_CDN;
      const fileset = await vision.FilesetResolver.forVisionTasks(wasmPath);
      this.tracker = await vision.PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: modelPath, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numPoses: 2,
      });
      this.ready = true;
      return true;
    } catch (error) {
      console.warn('[PoseTracker] indisponível.', error);
      this.failed = true;
      return false;
    }
  }

  get isReady() {
    return this.ready;
  }

  detect(source: DetectionSource): PoseResult | null {
    if (!this.ready || !this.tracker) return null;
    this.timestamp += 33;
    try {
      const result: PoseLandmarkerResult = this.tracker.detectForVideo(source, this.timestamp);
      const people = (result?.landmarks ?? []).map((person) =>
        person.map((lm) => ({ x: lm.x, y: lm.y, z: lm.z ?? 0, visibility: lm.visibility ?? 1 })),
      );
      return { people };
    } catch {
      return null;
    }
  }

  dispose() {
    try {
      this.tracker?.close();
    } catch {
      // ignore
    }
    this.tracker = null;
    this.ready = false;
  }
}
