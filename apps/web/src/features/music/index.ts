export * from './types';
export * from './categoryMap';
export * from './audioMix';
export * from './recommendation';
export * from './messages';
export * from './adapters';
export { buildMusicSeed, MUSIC_SEED } from './seed';

// Services
export {
  loadMusicCatalog,
  loadPlayableTracks,
  createMusicTrack,
  updateMusicTrack,
  setMusicActive,
  archiveMusic,
  type MusicCatalogEntry,
} from './services/musicCatalogService';

// Hooks
export { useAudioMixSettings, type UseAudioMixSettings } from './hooks/useAudioMixSettings';
export { useMusicPreview, type UseMusicPreview } from './hooks/useMusicPreview';
export { useRecommendedMusic, type UseRecommendedMusicInput } from './hooks/useRecommendedMusic';

// Components
export { MusicSelector } from './components/MusicSelector';
export { MusicCard } from './components/MusicCard';
export { MusicPreviewButton } from './components/MusicPreviewButton';
export { MusicVolumeControls } from './components/MusicVolumeControls';
export { AutoMusicRecommendation } from './components/AutoMusicRecommendation';
export { MusicFilters, DEFAULT_MUSIC_FILTERS, applyMusicFilters, type MusicFilterState } from './components/MusicFilters';
export { AdminMusicPanel } from './components/AdminMusicPanel';
