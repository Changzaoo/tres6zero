// AI Orchestrator Store - Coordena todos os serviços de IA
import { create } from 'zustand';
import { useHyperframesStore } from './hyperframesService';
import { useSceneUnderstandingStore } from './sceneUnderstandingService';
import { useAIChatStore, NLUParser } from './aiConversationalService';
import { useSemanticSearchStore } from './semanticSearchService';
import { createEffect } from './intelligentEffectsEngine';
import type { IntelligentEffect, EffectTarget, AuraType, AIIntent } from '@six3/shared/src/types';

interface AIState { isInitialized: boolean; activeEffects: IntelligentEffect[]; }

interface AIActions {
  initialize: () => Promise<void>;
  processVideo: (videoId: string, videoEl: HTMLVideoElement) => Promise<void>;
  addEffect: (e: IntelligentEffect) => void;
  removeEffect: (id: string) => void;
  executeIntent: (intent: AIIntent) => Promise<void>;
  searchSemantic: (query: string) => void;
  reset: () => void;
}

const init: AIState = { isInitialized: false, activeEffects: [] };

export const useAIOrchestrator = create<AIState & AIActions>((set, get) => ({
  ...init,
  initialize: async () => { if (get().isInitialized) return; console.log('[AI] Initializing...'); set({ isInitialized: true }); },
  
  processVideo: async (videoId, videoEl) => {
    const hfs = useHyperframesStore.getState();
    hfs.initHyperframes(videoId, { width: videoEl.videoWidth, height: videoEl.videoHeight, fps: 30, totalFrames: Math.floor(videoEl.duration * 30), duration: videoEl.duration, codec: 'h264' });
    useSceneUnderstandingStore.getState().start();
    for (let p = 0; p <= 100; p += 20) { hfs.updateProgress(p); await new Promise(r => setTimeout(r, 300)); }
    useSceneUnderstandingStore.getState().finish();
    hfs.finishProcessing();
  },

  addEffect: (e) => set((s) => ({ activeEffects: [...s.activeEffects, e] })),
  removeEffect: (id) => set((s) => ({ activeEffects: s.activeEffects.filter(e => e.id !== id) })),

  executeIntent: async (intent) => {
    const chat = useAIChatStore.getState();
    switch (intent.action) {
      case 'add_aura': {
        const auraType = (intent.parameters.auraType as AuraType) || 'energy';
        const effect = createEffect({ id: `e${Date.now()}`, name: `Aura ${auraType}`, category: 'aura', target: { type: 'person', id: '', position: { x: 0.5, y: 0.5 }, depth: 0, rotation: 0, scale: 1 }, auraType });
        get().addEffect(effect);
        chat.addMessage({ id: `m${Date.now()}`, role: 'assistant', content: `Adicionando aura ${auraType}!`, timestamp: Date.now() });
        break;
      }
      case 'add_effect': {
        const effect = createEffect({ id: `e${Date.now()}`, name: 'Efeito', category: 'particles', target: { type: 'person', id: '', position: { x: 0.5, y: 0.5 }, depth: 0, rotation: 0, scale: 1 } });
        get().addEffect(effect);
        chat.addMessage({ id: `m${Date.now()}`, role: 'assistant', content: `Efeito adicionado!`, timestamp: Date.now() });
        break;
      }
      case 'transform_style': chat.addMessage({ id: `m${Date.now()}`, role: 'assistant', content: `Transformando para estilo ${intent.parameters.style}!`, timestamp: Date.now() }); break;
      case 'search_scene': chat.addMessage({ id: `m${Date.now()}`, role: 'assistant', content: `Buscando: ${intent.parameters.query}`, timestamp: Date.now() }); break;
      default: chat.addMessage({ id: `m${Date.now()}`, role: 'assistant', content: 'Comando não reconhecido.', timestamp: Date.now() });
    }
  },

  searchSemantic: (query) => {
    const hf = useHyperframesStore.getState().hyperframes;
    useSemanticSearchStore.getState().search(query, { keyframes: hf?.keyframes || [], people: hf?.timeline.people || [], objects: hf?.timeline.objects || [], narrative: hf?.narrative || null, duration: hf?.metadata.duration || 0, fps: hf?.metadata.fps || 30 });
  },

  reset: () => { useHyperframesStore.getState().reset(); useSceneUnderstandingStore.getState().reset(); useAIChatStore.getState().reset(); useSemanticSearchStore.getState().reset(); set(init); },
}));

export function useAICommandParser() {
  const parser = new NLUParser();
  return (text: string) => parser.parse(text);
}

export const aiOrchestrator = { store: useAIOrchestrator, useCommandParser: useAICommandParser };
export default aiOrchestrator;