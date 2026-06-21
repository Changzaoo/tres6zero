import { useEffect, useRef, type RefObject } from 'react';
import { FxEngineRunner, isEngineEffect } from './engine';

type EffectLivePreviewProps = {
  /** Vídeo de origem (o <video> do preview do editor). */
  videoRef: RefObject<HTMLVideoElement>;
  /** Efeito do motor a pré-visualizar, ou null para desligar. */
  effectId: string | null;
  params: Record<string, number | string | boolean>;
  intensity: number;
  className?: string;
};

const MAX_PREVIEW_SIDE = 480;

/**
 * Sobrepõe um <canvas> ao vídeo do editor e roda o MESMO módulo do motor em
 * tempo real — o usuário vê a aura/efeito antes de exportar (preview ≡ export).
 * É defensivo: qualquer falha (modelo indisponível, contexto perdido) apenas
 * apaga o canvas e deixa o vídeo normal aparecer.
 */
export function EffectLivePreview({ videoRef, effectId, params, intensity, className = '' }: EffectLivePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Refs para o RAF ler sempre o valor mais recente sem reiniciar o efeito.
  const paramsRef = useRef(params);
  const intensityRef = useRef(intensity);
  paramsRef.current = params;
  intensityRef.current = intensity;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !effectId || !isEngineEffect(effectId)) {
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    let cancelled = false;
    let raf = 0;
    const runner = new FxEngineRunner([effectId]);
    const sourceCanvas = document.createElement('canvas');
    const sourceCtx = sourceCanvas.getContext('2d');
    const start = performance.now();
    let lastTime = start;

    const sizeFor = (video: HTMLVideoElement) => {
      const vw = video.videoWidth || 16;
      const vh = video.videoHeight || 9;
      const scale = Math.min(1, MAX_PREVIEW_SIDE / Math.max(vw, vh));
      return { w: Math.max(2, Math.round(vw * scale)), h: Math.max(2, Math.round(vh * scale)) };
    };

    const loop = () => {
      if (cancelled) return;
      const video = videoRef.current;
      const ctx = canvas.getContext('2d');
      if (video && ctx && sourceCtx && runner && video.videoWidth > 0) {
        const { w, h } = sizeFor(video);
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
          sourceCanvas.width = w;
          sourceCanvas.height = h;
        }
        const now = performance.now();
        const dt = Math.min(0.1, Math.max(0.001, (now - lastTime) / 1000));
        lastTime = now;
        const elapsed = (now - start) / 1000;

        sourceCtx.clearRect(0, 0, w, h);
        sourceCtx.drawImage(video, 0, 0, w, h);
        ctx.clearRect(0, 0, w, h);
        const mode = runner.compositeMode(effectId);
        if (mode === 'overlay') ctx.drawImage(sourceCanvas, 0, 0, w, h);
        try {
          runner.renderFrame(effectId, {
            ctx,
            sourceCanvas,
            segSource: sourceCanvas,
            segWidth: w,
            segHeight: h,
            width: w,
            height: h,
            time: elapsed,
            globalTime: elapsed,
            dt,
            intensity: intensityRef.current,
            params: paramsRef.current,
            audioEnergy: 0,
          });
        } catch {
          // Em caso de erro pontual, mostra o frame cru.
          ctx.drawImage(sourceCanvas, 0, 0, w, h);
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.filter = 'none';
      }
      raf = window.requestAnimationFrame(loop);
    };

    runner
      .prepare(MAX_PREVIEW_SIDE, MAX_PREVIEW_SIDE)
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) raf = window.requestAnimationFrame(loop);
      });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
      runner.dispose();
    };
  }, [effectId, videoRef]);

  if (!effectId || !isEngineEffect(effectId)) return null;

  // O canvas cobre os controles nativos do vídeo; clicar nele alterna play/pause
  // (o scrub continua pela timeline do editor).
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => undefined);
    else video.pause();
  };

  return (
    <canvas
      ref={canvasRef}
      onClick={togglePlay}
      title="Prévia ao vivo do efeito — clique para reproduzir/pausar"
      className={`absolute inset-0 h-full w-full cursor-pointer object-contain ${className}`}
    />
  );
}
