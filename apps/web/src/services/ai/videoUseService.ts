// VideoUse Service - Sistema de Controle de Interface
import { create } from 'zustand';
import type { UIElement, UIAction, UIActionType, ElementType } from '@six3/shared/src/types';

interface State {
  elements: Map<string, UIElement>;
  focusedElement: string | null;
  activePanel: string | null;
  isListening: boolean;
  actionHistory: UIAction[];
}

interface Actions {
  registerElement: (el: UIElement) => void;
  unregisterElement: (id: string) => void;
  updateElement: (id: string, updates: Partial<UIElement>) => void;
  setFocused: (id: string | null) => void;
  setActivePanel: (id: string | null) => void;
  recordAction: (action: UIAction) => void;
  startListening: () => void;
  stopListening: () => void;
  findElement: (semanticRole: string) => UIElement | undefined;
  findElements: (semanticRole: string) => UIElement[];
  reset: () => void;
}

const init: State = {
  elements: new Map(),
  focusedElement: null,
  activePanel: null,
  isListening: false,
  actionHistory: [],
};

export const useVideoUseStore = create<State & Actions>((set, get) => ({
  ...init,
  
  registerElement: (el) => set((s) => { const m = new Map(s.elements); m.set(el.id, el); return { elements: m }; }),
  unregisterElement: (id) => set((s) => { const m = new Map(s.elements); m.delete(id); return { elements: m }; }),
  updateElement: (id, updates) => set((s) => {
    const el = s.elements.get(id);
    if (!el) return s;
    const m = new Map(s.elements);
    m.set(id, { ...el, ...updates });
    return { elements: m };
  }),
  setFocused: (id) => set({ focusedElement: id }),
  setActivePanel: (id) => set({ activePanel: id }),
  recordAction: (action) => set((s) => ({ actionHistory: [...s.actionHistory, action] })),
  startListening: () => set({ isListening: true }),
  stopListening: () => set({ isListening: false }),
  
  findElement: (semanticRole) => {
    for (const el of get().elements.values()) {
      if (el.semanticRole === semanticRole) return el;
    }
    return undefined;
  },
  
  findElements: (semanticRole) => {
    const result: UIElement[] = [];
    for (const el of get().elements.values()) {
      if (el.semanticRole === semanticRole) result.push(el);
    }
    return result;
  },
  
  reset: () => set(init),
}));

// Actions that VideoUse can perform
export const VIDEOUSE_ACTIONS = {
  CLICK: 'click' as UIActionType,
  DBLCLICK: 'dblclick' as UIActionType,
  DRAG: 'drag' as UIActionType,
  DROP: 'drop' as UIActionType,
  SCROLL: 'scroll' as UIActionType,
  TYPE: 'type' as UIActionType,
  SELECT: 'select' as UIActionType,
} as const;

// Semantic roles for editor elements
export const SEMANTIC_ROLES = {
  TIMELINE: 'timeline',
  PLAYHEAD: 'playhead',
  CLIP: 'clip',
  TRACK: 'track',
  EFFECT_PANEL: 'effect_panel',
  EFFECT_LIST: 'effect_list',
  EFFECT_ITEM: 'effect_item',
  PREVIEW: 'preview',
  EXPORT_BUTTON: 'export_button',
  SAVE_BUTTON: 'save_button',
  UNDO_BUTTON: 'undo_button',
  REDO_BUTTON: 'redo_button',
  PLAY_BUTTON: 'play_button',
  PAUSE_BUTTON: 'pause_button',
  MASK_PANEL: 'mask_panel',
  AI_CHAT: 'ai_chat',
  AI_INPUT: 'ai_input',
} as const;

// Element type mappings
export const ELEMENT_TYPES: Record<ElementType, string[]> = {
  button: ['export', 'save', 'undo', 'redo', 'play', 'pause', 'add'],
  slider: ['intensity', 'opacity', 'zoom', 'speed'],
  timeline: ['main', 'effects', 'audio'],
  track: ['video', 'audio', 'effect', 'mask'],
  clip: ['video', 'image', 'effect', 'transition'],
  panel: ['properties', 'effects', 'masks', 'history'],
};

// Create UI Element helper
export function createUIElement(
  id: string,
  type: ElementType,
  semanticRole: string,
  options: Partial<UIElement> = {}
): UIElement {
  return {
    id,
    type,
    semanticRole,
    visible: true,
    enabled: true,
    zIndex: 0,
    attributes: {},
    state: {},
    actions: [],
    ...options,
  };
}

export const videoUseService = {
  store: useVideoUseStore,
  actions: VIDEOUSE_ACTIONS,
  roles: SEMANTIC_ROLES,
  types: ELEMENT_TYPES,
  createElement: createUIElement,
};

export default videoUseService;