import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Player de preview leve (um único <audio> reutilizado) para a biblioteca.
 * Toca a previewUrl (ou fileUrl como fallback). Mantém só uma faixa tocando.
 */
export function useMusicPreview() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    setPlayingId(null);
    setLoadingId(null);
  }, []);

  const toggle = useCallback(
    async (id: string, url?: string) => {
      setError(null);
      if (!url) {
        setError('PREVIEW_FAILED');
        return;
      }
      if (playingId === id) {
        stop();
        return;
      }

      if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.preload = 'auto';
        audioRef.current.onended = () => setPlayingId(null);
        audioRef.current.onerror = () => {
          setError('PREVIEW_FAILED');
          setPlayingId(null);
          setLoadingId(null);
        };
      }

      const audio = audioRef.current;
      try {
        setLoadingId(id);
        audio.src = url;
        audio.currentTime = 0;
        await audio.play();
        setPlayingId(id);
      } catch {
        setError('PREVIEW_FAILED');
        setPlayingId(null);
      } finally {
        setLoadingId(null);
      }
    },
    [playingId, stop],
  );

  return { playingId, loadingId, error, toggle, stop };
}

export type UseMusicPreview = ReturnType<typeof useMusicPreview>;
