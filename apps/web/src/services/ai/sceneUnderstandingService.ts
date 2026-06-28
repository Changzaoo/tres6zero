// Scene Understanding Service
import { create } from 'zustand';
import type { EntityId, PersonTrack, ObjectTrack, SceneEmotion, SceneLighting } from '@six3/shared/src/types';

interface State {
  isAnalyzing: boolean;
  progress: number;
  detectedPeople: Map<EntityId, PersonTrack>;
  detectedObjects: Map<EntityId, ObjectTrack>;
  emotions: SceneEmotion[];
  lighting: SceneLighting | null;
  description: string;
  tags: string[];
}

interface Actions {
  start: () => void;
  setProgress: (p: number) => void;
  addPerson: (t: PersonTrack) => void;
  addObject: (t: ObjectTrack) => void;
  setEmotions: (e: SceneEmotion[]) => void;
  setLighting: (l: SceneLighting) => void;
  setDescription: (d: string, t: string[]) => void;
  finish: () => void;
  reset: () => void;
}

const init: State = {
  isAnalyzing: false, progress: 0, detectedPeople: new Map(), detectedObjects: new Map(),
  emotions: [], lighting: null, description: '', tags: [],
};

export const useSceneUnderstandingStore = create<State & Actions>((set) => ({
  ...init,
  start: () => set({ isAnalyzing: true, progress: 0 }),
  setProgress: (p) => set({ progress: p }),
  addPerson: (t) => set((s) => { const m = new Map(s.detectedPeople); m.set(t.id, t); return { detectedPeople: m }; }),
  addObject: (t) => set((s) => { const m = new Map(s.detectedObjects); m.set(t.id, t); return { detectedObjects: m }; }),
  setEmotions: (e) => set({ emotions: e }),
  setLighting: (l) => set({ lighting: l }),
  setDescription: (d, t) => set({ description: d, tags: t }),
  finish: () => set({ isAnalyzing: false, progress: 100 }),
  reset: () => set(init),
}));

export const OBJECT_CATEGORIES = ['person', 'vehicle', 'animal', 'food', 'furniture', 'electronics', 'clothing', 'accessory', 'weapon', 'instrument', 'plant', 'building'] as const;
export type ObjectCategory = typeof OBJECT_CATEGORIES[number];

export type EmotionType = 'happy' | 'sad' | 'angry' | 'fear' | 'surprise' | 'disgust' | 'neutral';

export interface EmotionResult {
  personId: EntityId;
  emotion: EmotionType;
  confidence: number;
}

export interface LightingResult {
  dominant: string;
  temperature: number;
  intensity: number;
  indoor: boolean;
}

export const sceneUnderstandingService = { store: useSceneUnderstandingStore, OBJECT_CATEGORIES };
export default sceneUnderstandingService;