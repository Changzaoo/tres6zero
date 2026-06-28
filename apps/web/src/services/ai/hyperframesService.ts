// Hyperframes Service - Representação Semântica do Vídeo
import { create } from 'zustand';
import type { EntityId, Hyperframes, PersonTrack, ObjectTrack, SceneElement } from '@six3/shared/src/types';

interface State {
  hyperframes: Hyperframes | null;
  isProcessing: boolean;
  progress: number;
  personTracks: Map<EntityId, PersonTrack>;
  objectTracks: Map<EntityId, ObjectTrack>;
  selectedPersonId: EntityId | null;
  selectedObjectId: EntityId | null;
}

interface Actions {
  setHyperframes: (h: Hyperframes | null) => void;
  setProcessing: (p: boolean) => void;
  setProgress: (p: number) => void;
  addPerson: (t: PersonTrack) => void;
  updatePerson: (id: EntityId, u: Partial<PersonTrack>) => void;
  removePerson: (id: EntityId) => void;
  selectPerson: (id: EntityId | null) => void;
  addObject: (t: ObjectTrack) => void;
  updateObject: (id: EntityId, u: Partial<ObjectTrack>) => void;
  removeObject: (id: EntityId) => void;
  selectObject: (id: EntityId | null) => void;
  reset: () => void;
}

const initial: State = {
  hyperframes: null, isProcessing: false, progress: 0,
  personTracks: new Map(), objectTracks: new Map(),
  selectedPersonId: null, selectedObjectId: null,
};

export const useHyperframesStore = create<State & Actions>((set) => ({
  ...initial,
  setHyperframes: (h) => set({ hyperframes: h }),
  setProcessing: (p) => set({ isProcessing: p }),
  setProgress: (p) => set({ progress: p }),
  addPerson: (t) => set((s) => { const m = new Map(s.personTracks); m.set(t.id, t); return { personTracks: m }; }),
  updatePerson: (id, u) => set((s) => { const t = s.personTracks.get(id); if (!t) return s; const m = new Map(s.personTracks); m.set(id, { ...t, ...u }); return { personTracks: m }; }),
  removePerson: (id) => set((s) => { const m = new Map(s.personTracks); m.delete(id); return { personTracks: m }; }),
  selectPerson: (id) => set({ selectedPersonId: id }),
  addObject: (t) => set((s) => { const m = new Map(s.objectTracks); m.set(t.id, t); return { objectTracks: m }; }),
  updateObject: (id, u) => set((s) => { const t = s.objectTracks.get(id); if (!t) return s; const m = new Map(s.objectTracks); m.set(id, { ...t, ...u }); return { objectTracks: m }; }),
  removeObject: (id) => set((s) => { const m = new Map(s.objectTracks); m.delete(id); return { objectTracks: m }; }),
  selectObject: (id) => set({ selectedObjectId: id }),
  reset: () => set(initial),
}));

export function generateEntityId(): EntityId {
  return `entity_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export const hyperframesService = { store: useHyperframesStore, generateEntityId };
export default hyperframesService;