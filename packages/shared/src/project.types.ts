// ============================================================================
// PROJECT - Estrutura do Projeto de Edição
// ============================================================================

import type { Point2D } from './hyperframes.types';
import type { IntelligentEffect, EffectPhysics, AuraType, EffectCategory } from './effects.types';
import type { SmartMask, MaskLayer } from './effects.types';
import type { SemanticKeyframe } from './hyperframes-tracks.types';
import type { AICommand, AIConversationMessage } from './ai.types';

export type { Point2D } from './hyperframes.types';
export type { IntelligentEffect, EffectPhysics, AuraType, EffectCategory } from './effects.types';
export type { SmartMask, MaskLayer } from './effects.types';
export type { SemanticKeyframe } from './hyperframes-tracks.types';
export type { AICommand, AIConversationMessage } from './ai.types';

// Track
export interface Track {
  id: string;
  type: 'video' | 'audio' | 'effect' | 'mask';
  name: string;
  clips: Clip[];
  muted: boolean;
  locked: boolean;
  visible: boolean;
}

// Clip
export interface Clip {
  id: string;
  trackId: string;
  startFrame: number;
  endFrame: number;
  sourceStart: number;
  sourceEnd: number;
  effects: string[];
  masks: string[];
  transforms: {
    position: Point2D;
    scale: number;
    rotation: number;
    opacity: number;
  };
  keyframes: Keyframe[];
}

// Keyframe
export interface Keyframe {
  frame: number;
  property: string;
  value: unknown;
  easing: 'linear' | 'ease' | 'easeIn' | 'easeOut' | 'easeInOut';
}

// ExportSettings
export interface ExportSettings {
  format: 'mp4' | 'webm' | 'mov';
  codec: 'h264' | 'h265' | 'vp9';
  quality: 'low' | 'medium' | 'high' | 'ultra';
  resolution: '360p' | '480p' | '720p' | '1080p' | '4k';
  fps: number;
  audio: boolean;
  includeEffects: boolean;
  includeHyperframes: boolean;
  includeCache: boolean;
}

// Project
export interface Project {
  id: string;
  name: string;
  videoId: string;
  hyperframesId: string;
  effects: IntelligentEffect[];
  masks: MaskLayer[];
  keyframes: SemanticKeyframe[];
  timeline: {
    tracks: Track[];
    duration: number;
  };
  aiCommands: AICommand[];
  conversation: AIConversationMessage[];
  createdAt: string;
  updatedAt: string;
  version: string;
  autosave: boolean;
  lastAutosave?: string;
}

// CacheEntry
export interface CacheEntry {
  key: string;
  data: unknown;
  timestamp: number;
  size: number;
  frameRange?: {
    start: number;
    end: number;
  };
}

// UndoAction
export interface UndoAction {
  id: string;
  type: string;
  description: string;
  timestamp: number;
  data: unknown;
  inverse: unknown;
}

// History
export interface History {
  undoStack: UndoAction[];
  redoStack: UndoAction[];
  maxSize: number;
}