// ============================================================================
// HYPERFRAMES - Representação Semântica do Vídeo
// ============================================================================

export type EntityId = string;

export interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface Color {
  r: number;
  g: number;
  b: number;
  a?: number;
}

// Câmera
export interface CameraIntrinsics {
  focalLengthX: number;
  focalLengthY: number;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}

export interface CameraExtrinsics {
  position: Vector3D;
  rotation: Quaternion;
  fov: number;
  aspectRatio: number;
}

export interface CameraMotion {
  intrinsics: CameraIntrinsics;
  extrinsics: CameraExtrinsics;
  trajectory: Array<{
    timestamp: number;
    position: Vector3D;
    rotation: Quaternion;
  }>;
}

// Máscara
export interface SegmentationMask {
  frameIndex: number;
  timestamp: number;
  width: number;
  height: number;
  mask: Float32Array | Uint8Array;
  confidence: number;
}

// Landmarks faciais
export interface FacialLandmark {
  index: number;
  name: string;
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface FaceExpression {
  smile: number;
  anger: number;
  sadness: number;
  fear: number;
  surprise: number;
  disgust: number;
  neutral: number;
  eyeBlinkLeft: number;
  eyeBlinkRight: number;
  lookDirection: Point2D;
  mouthOpen: number;
}

// Landmarks corporais
export interface BodyLandmark {
  index: number;
  name: string;
  x: number;
  y: number;
  z: number;
  visibility: number;
  confidence: number;
}

export interface PoseSkeleton {
  landmarks: BodyLandmark[];
  scores: {
    face: number;
    torso: number;
    legs: number;
    arms: number;
    overall: number;
  };
  angles: Record<string, number>;
}

// Mão
export interface HandLandmark {
  index: number;
  name: string;
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface HandPose {
  landmarks: HandLandmark[];
  handedness: 'left' | 'right' | 'unknown';
  confidence: number;
  gesture: string;
}