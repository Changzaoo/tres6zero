// Contratos do motor de efeitos criativos do SIX3°.
//
// O motor roda dentro do loop de render frame-a-frame do navegador
// (apps/web/src/services/browserVideoRenderer.ts). Cada efeito novo é um
// `FxModule`: recebe um `FxFrameContext` por frame e desenha no canvas de saída.
// Efeitos que precisam da pessoa/pose declaram isso em `capabilities`, e o
// runner só carrega os modelos de ML quando algum efeito ativo precisa.

export type FxParamValue = number | string | boolean | readonly string[];
export type FxParams = Record<string, FxParamValue>;

/** Máscara da pessoa na resolução do canvas de saída. */
export type PersonMask = {
  /** Canvas em tons de cinza: branco = pessoa, preto = fundo (com bordas suaves). */
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  /** Centroide normalizado (0..1) da pessoa, ou null se ninguém foi detectado. */
  centroid: { x: number; y: number } | null;
  /** Bounding box em pixels do canvas, ou null. */
  bbox: { x: number; y: number; w: number; h: number } | null;
  /** Fração de pixels classificados como pessoa (0..1). */
  coverage: number;
};

export type PoseLandmark = { x: number; y: number; z: number; visibility: number };
export type PoseResult = {
  /** Uma lista de landmarks por pessoa detectada. */
  people: PoseLandmark[][];
};

export type FxFrameContext = {
  /** Contexto 2D do canvas de saída (o que vira o vídeo). */
  ctx: CanvasRenderingContext2D;
  /** Frame cru atual (vídeo já recortado em "cover"), sem filtros. */
  sourceCanvas: HTMLCanvasElement;
  width: number;
  height: number;
  /** Segundos decorridos dentro do segmento de efeito atual. */
  time: number;
  /** Segundos decorridos desde o início do render. */
  globalTime: number;
  /** Delta de tempo (s) desde o frame anterior, já limitado. */
  dt: number;
  /** Contador de frames desde o início do efeito. */
  frame: number;
  /** Intensidade mestre 0..1 (vinda dos controles/preset). */
  intensity: number;
  /** Parâmetros do efeito (cor, estilo, densidade, ...). */
  params: FxParams;
  /** Máscara da pessoa, ou null se indisponível/desnecessária. */
  personMask: PersonMask | null;
  /** Pose, ou null. */
  pose: PoseResult | null;
  /** Energia instantânea do áudio 0..1 (para efeitos beat-reactive). */
  audioEnergy: number;
  /** PRNG semeado (determinístico por render). */
  rng: () => number;
};

export type FxCapabilities = {
  /** Precisa da segmentação de pessoa. */
  personMask?: boolean;
  /** Precisa dos landmarks de pose. */
  pose?: boolean;
  /** Usa a energia do áudio. */
  audio?: boolean;
};

export type FxInitEnv = {
  width: number;
  height: number;
  params: FxParams;
  rng: () => number;
};

/**
 * Um efeito do motor.
 *
 * - `composite: 'replace'` → o módulo é dono do frame: ele desenha o
 *   `sourceCanvas` (aplicando shake/grade próprios) e tudo mais.
 * - `composite: 'overlay'` → o runner já desenhou o frame base; o módulo
 *   apenas adiciona camadas por cima.
 */
export type FxModule<S = unknown> = {
  id: string;
  capabilities: FxCapabilities;
  composite: 'overlay' | 'replace';
  init(env: FxInitEnv): S;
  render(context: FxFrameContext, state: S): void;
  dispose?(state: S): void;
};

/** Helper para tipar/registrar um módulo mantendo o tipo do estado interno. */
export function defineFx<S>(module: FxModule<S>): FxModule<S> {
  return module;
}
