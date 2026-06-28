// ============================================================================
// VIDEO USE - Sistema de Controle de Interface
// ============================================================================

import type { Point2D } from './hyperframes.types';

export type { Point2D } from './hyperframes.types';

export type ElementType = 
  | 'button'
  | 'input'
  | 'slider'
  | 'checkbox'
  | 'dropdown'
  | 'menu'
  | 'panel'
  | 'timeline'
  | 'track'
  | 'clip'
  | 'keyframe'
  | 'canvas'
  | 'overlay'
  | 'modal'
  | 'tooltip'
  | 'icon'
  | 'text';

export interface UIPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface UIElement {
  id: string;
  type: ElementType;
  label?: string;
  role?: string;
  ariaLabel?: string;
  ariaRole?: string;
  position?: UIPosition;
  visible: boolean;
  enabled: boolean;
  children?: string[];
  parent?: string;
  zIndex: number;
  attributes: Record<string, string>;
  state: Record<string, unknown>;
  semanticRole: string;
  actions: string[];
}

export interface UIState {
  focusedElement: string | null;
  activePanel: string | null;
  activeMenu: string | null;
  selectedClip: string | null;
  selectedTrack: string | null;
  selectedKeyframe: string | null;
  timelinePosition: number;
  zoomLevel: number;
  playbackState: 'playing' | 'paused' | 'stopped';
  elements: Map<string, UIElement>;
}

export type UIActionType = 
  | 'click'
  | 'dblclick'
  | 'rightclick'
  | 'drag'
  | 'drop'
  | 'hover'
  | 'scroll'
  | 'type'
  | 'keypress'
  | 'select'
  | 'deselect';

export interface UIAction {
  type: UIActionType;
  target: string;
  position?: Point2D;
  delta?: Point2D;
  key?: string;
  value?: string;
  timestamp: number;
}

export interface VideoUseCommand {
  id: string;
  action: UIActionType;
  target: string;
  parameters: Record<string, unknown>;
  priority: number;
  retryCount: number;
  maxRetries: number;
  timeout: number;
  onSuccess?: string;
  onFailure?: string;
}

export interface VideoUseResult {
  success: boolean;
  commandId: string;
  error?: string;
  result?: unknown;
  timestamp: number;
}

export interface SemanticQuery {
  id: string;
  text: string;
  entities: Array<{
    type: string;
    value: string;
    bounds?: { x: number; y: number; w: number; h: number };
  }>;
  confidence: number;
}