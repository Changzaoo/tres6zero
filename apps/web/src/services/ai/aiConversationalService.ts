// AI Conversational Service - Interface de IA para o Editor
import { create } from 'zustand';
import type { AIConversationMessage, AICommand, AIIntent, IntelligentEffect, AuraType } from '@six3/shared/src/types';

interface State {
  messages: AIConversationMessage[];
  isProcessing: boolean;
  currentCommand: AICommand | null;
  lastIntent: AIIntent | null;
  suggestions: string[];
}

interface Actions {
  addMessage: (msg: AIConversationMessage) => void;
  setProcessing: (p: boolean) => void;
  setCommand: (cmd: AICommand | null) => void;
  setIntent: (intent: AIIntent | null) => void;
  setSuggestions: (s: string[]) => void;
  clearMessages: () => void;
  reset: () => void;
}

const init: State = {
  messages: [],
  isProcessing: false,
  currentCommand: null,
  lastIntent: null,
  suggestions: [],
};

export const useAIChatStore = create<State & Actions>((set) => ({
  ...init,
  
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  setProcessing: (p) => set({ isProcessing: p }),
  setCommand: (cmd) => set({ currentCommand: cmd }),
  setIntent: (intent) => set({ lastIntent: intent }),
  setSuggestions: (s) => set({ suggestions: s }),
  clearMessages: () => set({ messages: [] }),
  reset: () => set(init),
}));

// Command patterns for natural language understanding
export const COMMAND_PATTERNS = {
  AURA: /\b(aura|energia|brilho)\b/i,
  EFFECT: /\b(efeito|fogo|raio|magia|luz)\b/i,
  TRANSFORM: /\b(transformar|mudar|converter)\b/i,
  ANIME: /\b(anime|mangá|dbz|dragon ball)\b/i,
  CYBERPUNK: /\b(cyberpunk|futurista|neon)\b/i,
  PERSON: /\b(pessoa|homem|mulher|rosto|cara)\b/i,
  OBJECT: /\b(objeto|coisa|item)\b/i,
  MASK: /\b(máscara|mask)\b/i,
  EXPORT: /\b(exportar|renderizar|salvar)\b/i,
  UNDO: /\b(desfazer|undo|voltar)\b/i,
  REDO: /\b(refazer|redo|refazer)\b/i,
};

// Aura type mappings
export const AURA_TYPE_MAP: Record<string, AuraType> = {
  'fogo': 'fire',
  'fire': 'fire',
  'elétrico': 'electric',
  'electric': 'electric',
  'divino': 'divine',
  'divine': 'divine',
  'angélico': 'angelic',
  'angelic': 'angelic',
  'demoníaco': 'demonic',
  'demonic': 'demonic',
  'anime': 'anime',
  'cósmico': 'cosmic',
  'cosmic': 'cosmic',
  'galáctico': 'galactic',
  'galactic': 'galactic',
  'energético': 'energy',
  'energy': 'energy',
  'neon': 'neon',
  'mágico': 'magic',
  'magic': 'magic',
  'espiritual': 'spiritual',
  'spiritual': 'spiritual',
  'dourado': 'golden',
  'golden': 'golden',
  'azul': 'blue',
  'blue': 'blue',
  'arco-íris': 'rainbow',
  'rainbow': 'rainbow',
};

// Intent types
export type IntentType = 
  | 'add_aura'
  | 'add_effect'
  | 'transform_style'
  | 'add_mask'
  | 'track_person'
  | 'search_scene'
  | 'export_video'
  | 'undo'
  | 'redo'
  | 'unknown';

// Natural language parser
export class NLUParser {
  parse(text: string): AIIntent | null {
    const lowerText = text.toLowerCase();
    
    // Aura commands
    if (COMMAND_PATTERNS.AURA.test(text)) {
      let auraType: AuraType = 'energy';
      for (const [key, value] of Object.entries(AURA_TYPE_MAP)) {
        if (lowerText.includes(key)) {
          auraType = value;
          break;
        }
      }
      return { action: 'add_aura', parameters: { auraType } };
    }
    
    // Effect commands
    if (COMMAND_PATTERNS.EFFECT.test(text)) {
      let effectType = 'particles';
      if (/fogo|fire|chamas/.test(text)) effectType = 'fire';
      if (/raio|lightning|eletric/.test(text)) effectType = 'lightning';
      if (/magi|magic|encant/.test(text)) effectType = 'magic';
      return { action: 'add_effect', parameters: { effectType } };
    }
    
    // Transform commands
    if (COMMAND_PATTERNS.TRANSFORM.test(text)) {
      let style = 'anime';
      if (COMMAND_PATTERNS.CYBERPUNK.test(text)) style = 'cyberpunk';
      return { action: 'transform_style', parameters: { style } };
    }
    
    // Mask commands
    if (COMMAND_PATTERNS.MASK.test(text)) {
      return { action: 'add_mask', parameters: {} };
    }
    
    // Search commands
    if (/procurar|buscar|mostrar|search/.test(text)) {
      return { action: 'search_scene', parameters: { query: text } };
    }
    
    // Export commands
    if (COMMAND_PATTERNS.EXPORT.test(text)) {
      return { action: 'export_video', parameters: {} };
    }
    
    // Undo/Redo
    if (COMMAND_PATTERNS.UNDO.test(text)) return { action: 'undo', parameters: {} };
    if (COMMAND_PATTERNS.REDO.test(text)) return { action: 'redo', parameters: {} };
    
    return null;
  }
}

// Quick suggestions
export const AI_SUGGESTIONS = [
  'Adicione uma aura azul nessa pessoa',
  'Transforme em estilo anime',
  'Faça parecer um trailer de cinema',
  'Adicione relâmpagos quando ela levantar o braço',
  'Coloque fogo nas mãos',
  'Crie um efeito cyberpunk',
  'Mostre cenas onde ela sorri',
  'Adicione asas de anjo',
];

export const aiConversationalService = {
  store: useAIChatStore,
  parser: NLUParser,
  patterns: COMMAND_PATTERNS,
  auraMap: AURA_TYPE_MAP,
  suggestions: AI_SUGGESTIONS,
};

export default aiConversationalService;