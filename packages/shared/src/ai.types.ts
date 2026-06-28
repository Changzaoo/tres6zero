// ============================================================================
// AI - Sistema de Inteligência Artificial
// ============================================================================

export type AIModel = 
  | 'tracking'
  | 'segmentation'
  | 'depth'
  | 'pose'
  | 'face'
  | 'emotion'
  | 'object'
  | 'scene'
  | 'embedding'
  | 'llm';

export interface AIStatus {
  model: AIModel;
  loading: boolean;
  progress: number;
  ready: boolean;
  error?: string;
  lastUsed: number;
}

export interface AIIntent {
  action: string;
  target?: string;
  parameters: Record<string, unknown>;
  effectType?: string;
  maskType?: string;
  personId?: string;
  objectId?: string;
}

export interface AICommand {
  id: string;
  text: string;
  parsed: {
    intent: string;
    entities: Array<{
      type: string;
      value: string;
      start: number;
      end: number;
    }>;
    parameters: Record<string, unknown>;
  };
  confidence: number;
  actions: Array<{
    type: string;
    target: string;
    parameters: Record<string, unknown>;
  }>;
  timestamp: number;
}

export interface AIConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  attachments?: Array<{
    type: string;
    url: string;
  }>;
}

export interface AIContext {
  videoId: string;
  hyperframesId: string;
  selection: {
    clips: string[];
    tracks: string[];
    keyframes: string[];
    effects: string[];
  };
  undoStack: Array<{
    action: string;
    timestamp: number;
    data: unknown;
  }>;
  redoStack: Array<{
    action: string;
    timestamp: number;
    data: unknown;
  }>;
}

export interface AIGenerationRequest {
  effectType: string;
  parameters: Record<string, unknown>;
  targetId?: string;
  maskType?: string;
}

export interface AIGenerationResult {
  success: boolean;
  generatedEffect?: {
    shader?: string;
    parameters?: Record<string, unknown>;
    particles?: unknown[];
    animation?: unknown;
  };
  error?: string;
}