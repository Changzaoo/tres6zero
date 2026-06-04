import { Search } from 'lucide-react';
import { MUSIC_CATEGORY_PROFILES } from '../categoryMap';
import { VIDEO_DURATIONS } from '../types';
import type { MusicCategory, VideoDuration } from '../types';

export interface MusicFilterState {
  search: string;
  category: MusicCategory | 'all';
  duration: VideoDuration | 'all';
  /** 'all' | 'calm' (1-3) | 'mid' (4-6) | 'high' (7-10) */
  energy: 'all' | 'calm' | 'mid' | 'high';
}

export const DEFAULT_MUSIC_FILTERS: MusicFilterState = {
  search: '',
  category: 'all',
  duration: 'all',
  energy: 'all',
};

const ENERGY_OPTIONS: Array<{ value: MusicFilterState['energy']; label: string }> = [
  { value: 'all', label: 'Toda energia' },
  { value: 'calm', label: 'Calma' },
  { value: 'mid', label: 'Moderada' },
  { value: 'high', label: 'Intensa' },
];

const CATEGORIES = Object.values(MUSIC_CATEGORY_PROFILES);

export function MusicFilters({ value, onChange }: { value: MusicFilterState; onChange: (next: MusicFilterState) => void }) {
  const set = (patch: Partial<MusicFilterState>) => onChange({ ...value, ...patch });
  const selectClass = 'min-h-[40px] rounded-xl border border-white/[0.1] bg-white/[0.04] px-2 text-xs font-semibold text-white/75 focus:border-brand-300/40 focus:outline-none';

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
        <input
          value={value.search}
          onChange={(e) => set({ search: e.target.value })}
          placeholder="Buscar música por nome..."
          className="min-h-[44px] w-full rounded-xl border border-white/[0.1] bg-white/[0.04] pl-9 pr-3 text-sm text-white/85 placeholder:text-white/35 focus:border-brand-300/40 focus:outline-none"
        />
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <select className={selectClass} value={value.category} onChange={(e) => set({ category: e.target.value as MusicFilterState['category'] })}>
          <option value="all">Categoria</option>
          {CATEGORIES.map((c) => (
            <option key={c.category} value={c.category}>{c.label}</option>
          ))}
        </select>
        <select className={selectClass} value={String(value.duration)} onChange={(e) => set({ duration: e.target.value === 'all' ? 'all' : (Number(e.target.value) as VideoDuration) })}>
          <option value="all">Duração</option>
          {VIDEO_DURATIONS.map((d) => (
            <option key={d} value={d}>{d}s</option>
          ))}
        </select>
        <select className={selectClass} value={value.energy} onChange={(e) => set({ energy: e.target.value as MusicFilterState['energy'] })}>
          {ENERGY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

/** Aplica os filtros a uma lista de faixas (puro, fácil de testar). */
export function applyMusicFilters<T extends { title: string; category: MusicCategory; availableCuts: VideoDuration[]; bestForDurations: VideoDuration[]; energyLevel: number; isActive: boolean }>(
  tracks: T[],
  filters: MusicFilterState,
): T[] {
  const search = filters.search.trim().toLowerCase();
  return tracks.filter((track) => {
    if (!track.isActive) return false;
    if (search && !track.title.toLowerCase().includes(search)) return false;
    if (filters.category !== 'all' && track.category !== filters.category) return false;
    if (filters.duration !== 'all' && !track.availableCuts.includes(filters.duration) && !track.bestForDurations.includes(filters.duration)) return false;
    if (filters.energy === 'calm' && track.energyLevel > 3) return false;
    if (filters.energy === 'mid' && (track.energyLevel < 4 || track.energyLevel > 6)) return false;
    if (filters.energy === 'high' && track.energyLevel < 7) return false;
    return true;
  });
}
