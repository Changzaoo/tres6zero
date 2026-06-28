// ============================================================================
// EFFECTS - Sistema de Efeitos Inteligentes
// ============================================================================

import type { Point2D, Vector3D, Color, BoundingBox } from './hyperframes.types';
import type { EntityId } from './hyperframes.types';

export type { Point2D, Vector3D, Color, BoundingBox } from './hyperframes.types';
export type { EntityId } from './hyperframes.types';

export type AuraType = 
  | 'fire'
  | 'electric'
  | 'divine'
  | 'angelic'
  | 'demonic'
  | 'anime'
  | 'cosmic'
  | 'galactic'
  | 'energy'
  | 'neon'
  | 'magic'
  | 'spiritual'
  | 'golden'
  | 'blue'
  | 'rainbow'
  | 'custom';

export type EffectCategory =
  | 'aura'
  | 'particles'
  | 'light'
  | 'weather'
  | 'magic'
  | 'combat'
  | 'environment'
  | 'transformation';

export interface EffectTarget {
  type: 'person' | 'object' | 'scene' | 'camera';
  id: EntityId;
  mask?: Float32Array | Uint8Array;
  position: Point2D;
  depth: number;
  rotation: number;
  scale: number;
}

export interface EffectPhysics {
  gravity: Vector3D;
  wind: Vector3D;
  turbulence: number;
  resistance: number;
  collision: boolean;
  occlusion: boolean;
}

export interface IntelligentEffect {
  id: string;
  name: string;
  description: string;
  category: EffectCategory;
  target: EffectTarget;
  auraType?: AuraType;
  parameters: Record<string, number | string | boolean>;
  physics: EffectPhysics;
  intensity: number;
  startFrame: number;
  endFrame: number;
  enabled: boolean;
  visible: boolean;
  layer: number;
  blendMode: 'normal' | 'screen' | 'overlay' | 'add' | 'multiply' | 'lighten';
  opacity: number;
}

export interface EffectPreset {
  id: string;
  name: string;
  category: EffectCategory;
  parameters: Record<string, number | string | boolean>;
  auraType?: AuraType;
  physics: Partial<EffectPhysics>;
}

// ============================================================================
// SMART MASKS - Sistema de Máscaras Inteligentes
// ============================================================================

export type MaskType =
  | 'person'
  | 'body'
  | 'face'
  | 'hair'
  | 'beard'
  | 'eyes'
  | 'eyebrows'
  | 'mouth'
  | 'teeth'
  | 'skin'
  | 'clothes'
  | 'top'
  | 'bottom'
  | 'shoes'
  | 'hands'
  | 'fingers'
  | 'arms'
  | 'legs'
  | 'object'
  | 'scene'
  | 'sky'
  | 'trees'
  | 'water'
  | 'glass'
  | 'metal'
  | 'smoke'
  | 'particles'
  | 'custom';

export interface SmartMask {
  id: string;
  type: MaskType;
  targetId: EntityId;
  frameIndex: number;
  timestamp: number;
  mask: Float32Array | Uint8Array;
  width: number;
  height: number;
  confidence: number;
  bbox: BoundingBox;
  centroid: Point2D;
  depth?: Float32Array;
}

export interface MaskLayer {
  id: string;
  name: string;
  type: MaskType;
  masks: SmartMask[];
  blendMode: string;
  opacity: number;
  enabled: boolean;
}