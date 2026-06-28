// ============================================================================
// HYPERFRAMES - Parte 2: Tracks e Cena
// ============================================================================

import type { 
  BoundingBox, Point2D, Vector3D, SegmentationMask,
  PoseSkeleton, FacialLandmark, FaceExpression, HandPose,
  CameraMotion, Color
} from './hyperframes.types';

export type { 
  BoundingBox, Point2D, Vector3D, Quaternion, Color,
  CameraIntrinsics, CameraExtrinsics, CameraMotion,
  SegmentationMask, FacialLandmark, FaceExpression,
  BodyLandmark, PoseSkeleton, HandLandmark, HandPose
} from './hyperframes.types';

// Re-export EntityId
export type { EntityId } from './hyperframes.types';
import type { EntityId } from './hyperframes.types';

// PersonTrack - Rastreamento de pessoa
export interface PersonTrack {
  id: EntityId;
  age?: string;
  gender?: string;
  clothing: {
    top: string;
    bottom: string;
    shoes: string;
    accessories: string[];
  };
  hair: string;
  embeddings: Float32Array;
  bbox: BoundingBox;
  segmentation: SegmentationMask;
  pose: PoseSkeleton;
  face: {
    landmarks: FacialLandmark[];
    expression: FaceExpression;
    embedding: Float32Array;
  };
  hands: HandPose[];
  depth: Float32Array | null;
  motion: {
    velocity: Vector3D;
    direction: Vector3D;
    speed: number;
    trajectory: Point2D[];
  };
  depthZ: number;
  foregroundScore: number;
  appearances: Array<{
    startFrame: number;
    endFrame: number;
    occluded: boolean;
    occlusionRatio: number;
  }>;
}

// ObjectTrack - Rastreamento de objeto
export interface ObjectTrack {
  id: EntityId;
  category: string;
  subcategory: string;
  brand?: string;
  color: string;
  bbox: BoundingBox;
  segmentation: SegmentationMask;
  depth: Float32Array | null;
  motion: {
    velocity: Vector3D;
    direction: Vector3D;
    speed: number;
    trajectory: Point2D[];
  };
  depthZ: number;
  heldBy?: EntityId;
  heldWith?: 'left_hand' | 'right_hand' | 'both_hands';
  interactions: Array<{
    personId: EntityId;
    type: string;
    startFrame: number;
    endFrame: number;
  }>;
}

// SceneElement - Elemento do cenário
export interface SceneElement {
  id: EntityId;
  category: string;
  subcategory: string;
  bbox: BoundingBox;
  depth: Float32Array | null;
  depthZ: number;
  motion: {
    velocity: Vector3D;
    direction: Vector3D;
    speed: number;
  };
  properties: Record<string, unknown>;
}

// SceneEmotion - Emoções da cena
export interface SceneEmotion {
  dominant: string;
  confidence: number;
  transitions: Array<{
    timestamp: number;
    emotion: string;
    confidence: number;
  }>;
  personEmotions: Array<{
    personId: EntityId;
    emotion: string;
    confidence: number;
  }>;
}

// SceneNarrative - Narrativa da cena
export interface SceneNarrative {
  description: string;
  category: string;
  tags: string[];
  actions: Array<{
    personId?: EntityId;
    action: string;
    startFrame: number;
    endFrame: number;
  }>;
  speech: Array<{
    personId?: EntityId;
    text: string;
    startFrame: number;
    endFrame: number;
    language: string;
    confidence: number;
  }>;
  activities: string[];
}

// SceneLighting - Iluminação da cena
export interface SceneLighting {
  dominant: string;
  temperature: number;
  intensity: number;
  direction: Vector3D;
  shadows: number;
  highlights: number;
  colorCast: Color;
  indoor: boolean;
  timeOfDay?: 'dawn' | 'morning' | 'noon' | 'afternoon' | 'dusk' | 'night';
  weather?: 'sunny' | 'cloudy' | 'rainy' | 'foggy' | 'snowy';
}