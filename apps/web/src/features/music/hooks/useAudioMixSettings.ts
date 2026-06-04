import { useCallback, useMemo, useState } from 'react';
import { DEFAULT_MIX_SETTINGS, MIX_MODE_PRESETS, applyMixMode, clamp01 } from '../audioMix';
import type { AudioMixMode, AudioMixSettings } from '../types';

/**
 * Gerencia as configurações de mixagem de áudio (volume da música, volume do
 * áudio original, modo, fades, normalização). Usado pelos controles do editor.
 */
export function useAudioMixSettings(initial?: Partial<AudioMixSettings>) {
  const [settings, setSettings] = useState<AudioMixSettings>({ ...DEFAULT_MIX_SETTINGS, ...initial });

  const setMode = useCallback((mode: AudioMixMode) => {
    setSettings((prev) => applyMixMode(prev, mode));
  }, []);

  const setMusicVolume = useCallback((value: number) => {
    setSettings((prev) => ({ ...prev, musicVolume: clamp01(value), mode: 'balanced' }));
  }, []);

  const setOriginalVolume = useCallback((value: number) => {
    setSettings((prev) => ({ ...prev, originalVolume: clamp01(value), mode: 'balanced' }));
  }, []);

  const muteOriginal = useCallback(() => {
    setSettings((prev) => ({ ...prev, mode: 'music_only', ...MIX_MODE_PRESETS.music_only }));
  }, []);

  const setFadeIn = useCallback((value: number) => {
    setSettings((prev) => ({ ...prev, fadeInSeconds: Math.max(0, value) }));
  }, []);

  const setFadeOut = useCallback((value: number) => {
    setSettings((prev) => ({ ...prev, fadeOutSeconds: Math.max(0, value) }));
  }, []);

  const setNormalize = useCallback((value: boolean) => {
    setSettings((prev) => ({ ...prev, normalize: value }));
  }, []);

  const reset = useCallback(() => setSettings({ ...DEFAULT_MIX_SETTINGS, ...initial }), [initial]);

  return useMemo(
    () => ({ settings, setSettings, setMode, setMusicVolume, setOriginalVolume, muteOriginal, setFadeIn, setFadeOut, setNormalize, reset }),
    [settings, setMode, setMusicVolume, setOriginalVolume, muteOriginal, setFadeIn, setFadeOut, setNormalize, reset],
  );
}

export type UseAudioMixSettings = ReturnType<typeof useAudioMixSettings>;
