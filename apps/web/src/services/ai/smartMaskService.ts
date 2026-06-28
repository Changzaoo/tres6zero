
// Smart Mask Service - Sistema de Máscaras Inteligentes
import { create } from 'zustand';
import type { SmartMask, MaskLayer, MaskType, BoundingBox, Point2D, EntityId } from '@six3/shared/src/types';

interface State { masks: Map<string, SmartMask>; layers: Map<string, MaskLayer>; activeMaskId: string | null; activeLayerId: string | null; }
interface Actions { addMask: (m: SmartMask) => void; updateMask: (id: string, u: Partial<SmartMask>) => void; removeMask: (id: string) => void; setActiveMask: (id: string | null) => void; addLayer: (l: MaskLayer) => void; updateLayer: (id: string, u: Partial<MaskLayer>) => void; removeLayer: (id: string) => void; setActiveLayer: (id: string | null) => void; clearAll: () => void; }

const init: State = { masks: new Map(), layers: new Map(), activeMaskId: null, activeLayerId: null };
export const useSmartMaskStore = create<State & Actions>((set) => ({
  ...init,
  addMask: (m) => set((s) => { const nm = new Map(s.masks); nm.set(m.id, m); return { masks: nm }; }),
  updateMask: (id, u) => set((s) => { const m = s.masks.get(id); if (!m) return s; const nm = new Map(s.masks); nm.set(id, { ...m, ...u }); return { masks: nm }; }),
  removeMask: (id) => set((s) => { const nm = new Map(s.masks); nm.delete(id); return { masks: nm }; }),
  setActiveMask: (id) => set({ activeMaskId: id }),
  addLayer: (l) => set((s) => { const nl = new Map(s.layers); nl.set(l.id, l); return { layers: nl }; }),
  updateLayer: (id, u) => set((s) => { const l = s.layers.get(id); if (!l) return s; const nl = new Map(s.layers); nl.set(id, { ...l, ...u }); return { layers: nl }; }),
  removeLayer: (id) => set((s) => { const nl = new Map(s.layers); nl.delete(id); return { layers: nl }; }),
  setActiveLayer: (id) => set({ activeLayerId: id }),
  clearAll: () => set(init),
}));

export const MASK_TYPES: Record<MaskType, { name: string; description: string; icon: string }> = {
  person: { name: 'Pessoa', description: 'Corpo inteiro', icon: '👤' }, body: { name: 'Corpo', description: 'Corpo sem cabeça', icon: '🧍' },
  face: { name: 'Rosto', description: 'Face e cabeça', icon: '😊' }, hair: { name: 'Cabelo', description: 'Cabelo e barba', icon: '💇' },
  beard: { name: 'Barba', description: 'Barba e bigode', icon: '🧔' }, eyes: { name: 'Olhos', description: 'Olhos', icon: '👁️' },
  eyebrows: { name: 'Sobrancelhas', description: 'Sobrancelhas', icon: '眉' }, mouth: { name: 'Boca', description: 'Boca e dentes', icon: '👄' },
  teeth: { name: 'Dentes', description: 'Dentes', icon: '🦷' }, skin: { name: 'Pele', description: 'Pele exposta', icon: '🤚' },
  clothes: { name: 'Roupas', description: 'Todas as roupas', icon: '👕' }, top: { name: 'Camisa', description: 'Parte de cima', icon: '👚' },
  bottom: { name: 'Calça', description: 'Parte de baixo', icon: '👖' }, shoes: { name: 'Sapatos', description: 'Sapatos', icon: '👟' },
  hands: { name: 'Mãos', description: 'Mãos e pulsos', icon: '✋' }, fingers: { name: 'Dedos', description: 'Dedos', icon: '🖐️' },
  arms: { name: 'Braços', description: 'Braços', icon: '💪' }, legs: { name: 'Pernas', description: 'Pernas', icon: '🦵' },
  object: { name: 'Objeto', description: 'Objeto', icon: '📦' }, scene: { name: 'Cena', description: 'Fundo', icon: '🏞️' },
  sky: { name: 'Céu', description: 'Céu', icon: '☁️' }, trees: { name: 'Árvores', description: 'Vegetação', icon: '🌳' },
  water: { name: 'Água', description: 'Água', icon: '💧' }, glass: { name: 'Vidro', description: 'Vidro', icon: '🪟' },
  metal: { name: 'Metal', description: 'Metal', icon: '⚙️' }, smoke: { name: 'Fumaça', description: 'Fumaça', icon: '🌫️' },
  particles: { name: 'Partículas', description: 'Partículas', icon: '✨' }, custom: { name: 'Personalizado', description: 'Customizado', icon: '🎨' },
};

export function createMask(params: { id: string; type: MaskType; targetId: EntityId; frameIndex: number; timestamp: number; mask: Float32Array | Uint8Array; width: number; height: number; confidence: number; bbox: BoundingBox; centroid: Point2D }): SmartMask {
  return { id: params.id, type: params.type, targetId: params.targetId, frameIndex: params.frameIndex, timestamp: params.timestamp, mask: params.mask, width: params.width, height: params.height, confidence: params.confidence, bbox: params.bbox, centroid: params.centroid };
}

export function createLayer(params: { id: string; name: string; type: MaskType; masks?: SmartMask[] }): MaskLayer {
  return { id: params.id, name: params.name, type: params.type, masks: params.masks || [], blendMode: 'normal', opacity: 1.0, enabled: true };
}

export const smartMaskService = { store: useSmartMaskStore, types: MASK_TYPES, createMask, createLayer };
export default smartMaskService;