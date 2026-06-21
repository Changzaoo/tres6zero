// Orquestra os efeitos do motor dentro do loop de render:
// - decide quais modelos de ML carregar (máscara/pose) com base nos efeitos usados;
// - segmenta a pessoa por frame (com throttle e reuso da última máscara);
// - mantém o estado de cada efeito e chama seu render.
//
// Mantém o `browserVideoRenderer` simples: ele só pergunta o modo de composição
// e chama `renderFrame`.

import { getFxModule, isEngineEffect } from './registry';
import { PersonSegmenter } from './PersonSegmenter';
import { PoseTracker } from './PoseTracker';
import { createRng } from './noise';
import type { FxModule, FxParams, PersonMask, PoseResult } from './types';

export type FxRenderArgs = {
  ctx: CanvasRenderingContext2D;
  sourceCanvas: HTMLCanvasElement;
  /** Fonte para segmentação (normalmente o sourceCanvas). */
  segSource: HTMLCanvasElement | HTMLVideoElement | ImageBitmap;
  segWidth: number;
  segHeight: number;
  width: number;
  height: number;
  time: number;
  globalTime: number;
  dt: number;
  intensity: number;
  params: FxParams;
  audioEnergy: number;
};

export class FxEngineRunner {
  private states = new Map<string, { module: FxModule; state: unknown }>();
  private segmenter: PersonSegmenter | null = null;
  private pose: PoseTracker | null = null;
  private needsMask = false;
  private needsPose = false;
  private lastMask: PersonMask | null = null;
  private lastPose: PoseResult | null = null;
  private maskEveryN: number;
  private maskCounter = 0;
  private rng = createRng(0x5132aa);
  private frameByEffect = new Map<string, number>();

  static usesEngine(effectIds: Array<string | undefined>): boolean {
    return effectIds.some((id) => isEngineEffect(id));
  }

  constructor(
    private readonly effectIds: string[],
    options: { maskEveryN?: number } = {},
  ) {
    this.maskEveryN = Math.max(1, options.maskEveryN ?? 1);
    for (const id of effectIds) {
      const module = getFxModule(id);
      if (module?.capabilities.personMask) this.needsMask = true;
      if (module?.capabilities.pose) this.needsPose = true;
    }
  }

  get requiresMask() {
    return this.needsMask;
  }

  get requiresPose() {
    return this.needsPose;
  }

  /** Carrega modelos (se necessário) e instancia o estado de cada efeito. */
  async prepare(width: number, height: number) {
    if (this.needsMask) {
      this.segmenter = new PersonSegmenter();
      const ok = await this.segmenter.ensureReady();
      if (!ok) this.segmenter = null;
    }
    if (this.needsPose) {
      this.pose = new PoseTracker();
      const ok = await this.pose.ensureReady();
      if (!ok) this.pose = null;
    }
    for (const id of this.effectIds) {
      const module = getFxModule(id);
      if (module && !this.states.has(id)) {
        const state = module.init({ width, height, params: {}, rng: this.rng });
        this.states.set(id, { module, state });
      }
    }
  }

  compositeMode(effectId: string): 'overlay' | 'replace' | null {
    const module = getFxModule(effectId);
    return module ? module.composite : null;
  }

  /** Renderiza um frame do efeito. Retorna false se o id não for do motor. */
  renderFrame(effectId: string, args: FxRenderArgs): boolean {
    const entry = this.states.get(effectId);
    if (!entry) return false;
    const { module, state } = entry;

    let personMask: PersonMask | null = null;
    if (module.capabilities.personMask && this.segmenter) {
      this.maskCounter += 1;
      if (this.maskCounter % this.maskEveryN === 0 || !this.lastMask) {
        const next = this.segmenter.segment(args.segSource, args.segWidth, args.segHeight, args.width, args.height);
        if (next) this.lastMask = next;
      }
      personMask = this.lastMask;
    }

    let pose: PoseResult | null = null;
    if (module.capabilities.pose && this.pose) {
      const detected = this.pose.detect(args.segSource);
      if (detected) this.lastPose = detected;
      pose = this.lastPose;
    }

    const frame = (this.frameByEffect.get(effectId) ?? 0) + 1;
    this.frameByEffect.set(effectId, frame);

    module.render(
      {
        ctx: args.ctx,
        sourceCanvas: args.sourceCanvas,
        width: args.width,
        height: args.height,
        time: args.time,
        globalTime: args.globalTime,
        dt: args.dt,
        frame,
        intensity: args.intensity,
        params: args.params,
        personMask,
        pose,
        audioEnergy: args.audioEnergy,
        rng: this.rng,
      },
      state,
    );
    return true;
  }

  dispose() {
    for (const { module, state } of this.states.values()) {
      module.dispose?.(state);
    }
    this.states.clear();
    this.segmenter?.dispose();
    this.pose?.dispose();
    this.lastMask = null;
    this.lastPose = null;
  }
}
