// Semantic Search Service - Busca Semântica no Vídeo
import { create } from 'zustand';
import type { EntityId, SemanticKeyframe, PersonTrack, ObjectTrack, SceneNarrative } from '@six3zero/shared/src/types';

interface SearchResult {
  type: 'keyframe' | 'person' | 'object' | 'narrative';
  id: EntityId;
  frameIndex: number;
  timestamp: number;
  description: string;
  relevance: number;
  matchedTerms: string[];
}

interface State {
  results: SearchResult[];
  isSearching: boolean;
  lastQuery: string;
  filters: SearchFilters;
}

interface SearchFilters {
  type?: 'keyframe' | 'person' | 'object' | 'narrative';
  frameRange?: { start: number; end: number };
  minRelevance?: number;
  emotion?: string;
  personId?: EntityId;
}

interface Actions {
  search: (query: string, data: SearchData) => void;
  setFilters: (filters: Partial<SearchFilters>) => void;
  clearResults: () => void;
  reset: () => void;
}

interface SearchData {
  keyframes: SemanticKeyframe[];
  people: PersonTrack[];
  objects: ObjectTrack[];
  narrative: SceneNarrative | null;
  duration: number;
  fps: number;
}

const init: State = {
  results: [],
  isSearching: false,
  lastQuery: '',
  filters: {},
};

export const useSemanticSearchStore = create<State & Actions>((set) => ({
  ...init,
  
  search: (query, data) => {
    set({ isSearching: true, lastQuery: query });
    
    const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    const results: SearchResult[] = [];
    
    // Search keyframes
    for (const kf of data.keyframes) {
      const desc = kf.description.toLowerCase();
      const tags = kf.type.toLowerCase();
      const matched = terms.filter(t => desc.includes(t) || tags.includes(t));
      if (matched.length > 0) {
        results.push({
          type: 'keyframe',
          id: `kf_${kf.frameIndex}`,
          frameIndex: kf.frameIndex,
          timestamp: kf.frameIndex / data.fps,
          description: kf.description,
          relevance: matched.length / terms.length,
          matchedTerms: matched,
        });
      }
    }
    
    // Search people
    for (const person of data.people) {
      const matched = terms.filter(t => 
        person.clothing.top.toLowerCase().includes(t) ||
        person.clothing.bottom.toLowerCase().includes(t) ||
        person.hair.toLowerCase().includes(t)
      );
      if (matched.length > 0) {
        results.push({
          type: 'person',
          id: person.id,
          frameIndex: person.appearances[0]?.startFrame || 0,
          timestamp: (person.appearances[0]?.startFrame || 0) / data.fps,
          description: `Pessoa com ${person.clothing.top}`,
          relevance: matched.length / terms.length,
          matchedTerms: matched,
        });
      }
    }
    
    // Search objects
    for (const obj of data.objects) {
      const matched = terms.filter(t =>
        obj.category.toLowerCase().includes(t) ||
        obj.subcategory.toLowerCase().includes(t) ||
        obj.color.toLowerCase().includes(t)
      );
      if (matched.length > 0) {
        results.push({
          type: 'object',
          id: obj.id,
          frameIndex: 0,
          timestamp: 0,
          description: `${obj.color} ${obj.category}`,
          relevance: matched.length / terms.length,
          matchedTerms: matched,
        });
      }
    }
    
    // Sort by relevance
    results.sort((a, b) => b.relevance - a.relevance);
    
    set({ results, isSearching: false });
  },
  
  setFilters: (filters) => set((s) => ({ filters: { ...s.filters, ...filters } })),
  clearResults: () => set({ results: [] }),
  reset: () => set(init),
}));

// Search query templates
export const SEARCH_TEMPLATES = {
  PERSON_BY_CLOTHING: (color: string) => `pessoa com ${color}`,
  PERSON_SMILE: () => 'pessoa sorrindo',
  PERSON_LOOKING: () => 'pessoa olhando para câmera',
  NIGHT_SCENE: () => 'cena noturna',
  ACTION_SCENE: () => 'cena de ação',
  FUNNY_MOMENT: () => 'momento engraçado',
  EMOTIONAL: () => 'momento emocional',
  CAR_RED: () => 'carro vermelho',
  EXPLOSION: () => 'explosão',
  CROWD: () => 'multidão',
};

// Pre-built semantic queries
export const SEMANTIC_QUERIES = {
  smiling: { query: 'sorriso sorrindo feliz', tags: ['emotion', 'happy'] },
  running: { query: 'correndo movimento rápido', tags: ['action', 'motion'] },
  night: { query: 'noite escuro iluminação baixa', tags: ['lighting', 'time'] },
  indoor: { query: 'dentro ambiente fechado', tags: ['setting', 'indoor'] },
  outdoor: { query: 'fora externo natureza', tags: ['setting', 'outdoor'] },
  group: { query: 'grupo pessoas multidão', tags: ['people', 'group'] },
  closeUp: { query: 'close rosto detalhe', tags: ['shot', 'closeup'] },
  wide: { query: 'panorâmico amplo visão geral', tags: ['shot', 'wide'] },
};

export const semanticSearchService = {
  store: useSemanticSearchStore,
  templates: SEARCH_TEMPLATES,
  queries: SEMANTIC_QUERIES,
};

export default semanticSearchService;