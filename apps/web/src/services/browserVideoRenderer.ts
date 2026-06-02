type RenderEffectSegment = {
  effect: string;
  start: number;
  end: number;
};

type LoadedAsset<T extends HTMLImageElement | HTMLVideoElement | HTMLAudioElement> = {
  element: T;
  objectUrl?: string;
};

export type BrowserVideoRenderOptions = {
  input: Blob;
  durationSeconds: number;
  effect?: string;
  effectSegments?: RenderEffectSegment[];
  overlayUrl?: string;
  animationUrl?: string;
  musicUrl?: string;
  onProgress?: (pct: number) => void;
};

const TARGET_FPS = 30;
const MAX_RENDER_SIDE = 720;
const MIN_RENDER_SIDE = 360;

type CaptureElement = HTMLMediaElement & {
  captureStream?: () => MediaStream;
  mozCaptureStream?: () => MediaStream;
};

export function canRenderVideoInBrowser() {
  return typeof window !== 'undefined'
    && typeof MediaRecorder !== 'undefined'
    && typeof HTMLCanvasElement !== 'undefined'
    && typeof HTMLCanvasElement.prototype.captureStream === 'function';
}

function supportedMimeType() {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];

  return candidates.find((mime) => MediaRecorder.isTypeSupported(mime)) || '';
}

function captureMediaStream(element: HTMLMediaElement) {
  const captureElement = element as CaptureElement;
  return captureElement.captureStream?.() || captureElement.mozCaptureStream?.();
}

function waitForEvent<T extends EventTarget>(target: T, eventName: string, timeoutMs = 15000) {
  return new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error(`${eventName.toUpperCase()}_TIMEOUT`));
    }, timeoutMs);

    const cleanup = () => {
      window.clearTimeout(timeout);
      target.removeEventListener(eventName, onEvent);
      target.removeEventListener('error', onError);
    };

    const onEvent = () => {
      cleanup();
      resolve();
    };

    const onError = () => {
      cleanup();
      reject(new Error(`${eventName.toUpperCase()}_FAILED`));
    };

    target.addEventListener(eventName, onEvent, { once: true });
    target.addEventListener('error', onError, { once: true });
  });
}

async function toObjectUrl(url?: string) {
  if (!url) return undefined;
  if (url.startsWith('blob:') || url.startsWith('data:')) return { src: url };

  try {
    const response = await fetch(url, { mode: 'cors', cache: 'force-cache' });
    if (!response.ok) return undefined;

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    return { src: objectUrl, objectUrl };
  } catch {
    return undefined;
  }
}

async function loadImage(url?: string): Promise<LoadedAsset<HTMLImageElement> | undefined> {
  const asset = await toObjectUrl(url);
  if (!asset) return undefined;

  const image = new Image();
  image.decoding = 'async';
  image.crossOrigin = 'anonymous';
  image.src = asset.src;

  if ('decode' in image) {
    await image.decode().catch(() => waitForEvent(image, 'load', 8000));
  } else {
    await waitForEvent(image, 'load', 8000);
  }

  return { element: image, objectUrl: asset.objectUrl };
}

async function loadOverlayVideo(url?: string): Promise<LoadedAsset<HTMLVideoElement> | undefined> {
  const asset = await toObjectUrl(url);
  if (!asset) return undefined;

  const video = document.createElement('video');
  video.crossOrigin = 'anonymous';
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.src = asset.src;
  await waitForEvent(video, 'loadedmetadata', 10000);
  return { element: video, objectUrl: asset.objectUrl };
}

async function loadMusic(url?: string): Promise<LoadedAsset<HTMLAudioElement> | undefined> {
  const asset = await toObjectUrl(url);
  if (!asset) return undefined;

  const audio = document.createElement('audio');
  audio.crossOrigin = 'anonymous';
  audio.loop = true;
  audio.preload = 'auto';
  audio.src = asset.src;
  await waitForEvent(audio, 'canplay', 12000).catch(() => undefined);
  return { element: audio, objectUrl: asset.objectUrl };
}

function scaledCanvasSize(videoWidth: number, videoHeight: number) {
  const safeWidth = Math.max(videoWidth || 0, MIN_RENDER_SIDE);
  const safeHeight = Math.max(videoHeight || 0, MIN_RENDER_SIDE);
  const scale = Math.min(1, MAX_RENDER_SIDE / Math.max(safeWidth, safeHeight));

  return {
    width: Math.max(2, Math.round(safeWidth * scale)),
    height: Math.max(2, Math.round(safeHeight * scale)),
  };
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  source: HTMLVideoElement | HTMLImageElement,
  width: number,
  height: number,
) {
  const sourceWidth = source instanceof HTMLVideoElement ? source.videoWidth : source.naturalWidth;
  const sourceHeight = source instanceof HTMLVideoElement ? source.videoHeight : source.naturalHeight;
  if (!sourceWidth || !sourceHeight) return;

  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  const drawX = (width - drawWidth) / 2;
  const drawY = (height - drawHeight) / 2;
  ctx.drawImage(source, drawX, drawY, drawWidth, drawHeight);
}

function canvasFilter(effect: string) {
  const filters: Record<string, string> = {
    clean: 'contrast(1.05) saturate(1.08) brightness(1.01)',
    slow_motion: 'contrast(1.04) saturate(1.08)',
    boomerang: 'contrast(1.08) saturate(1.12)',
    speed_ramp: 'contrast(1.1) saturate(1.18)',
    cinematic: 'contrast(1.12) saturate(0.95) brightness(0.94)',
    neon: 'contrast(1.18) saturate(1.55) hue-rotate(8deg)',
    party: 'contrast(1.12) saturate(1.35)',
    luxury: 'contrast(1.08) saturate(1.05) sepia(0.12)',
    glitch_flash: 'contrast(1.25) saturate(1.35)',
    wedding_soft: 'contrast(0.98) saturate(1.05) brightness(1.05)',
    corporate_sharp: 'contrast(1.08) saturate(0.92)',
    ai_auto: 'contrast(1.1) saturate(1.12)',
  };

  return filters[effect] || filters.clean;
}

function activeEffect(baseEffect: string, segments: RenderEffectSegment[] | undefined, elapsed: number) {
  const segment = segments?.find((item) => elapsed >= item.start && elapsed <= item.end);
  return segment?.effect || baseEffect || 'clean';
}

function drawEffectOverlay(ctx: CanvasRenderingContext2D, effect: string, elapsed: number, width: number, height: number) {
  ctx.save();
  ctx.filter = 'none';

  if (effect === 'cinematic') {
    const barHeight = Math.max(18, height * 0.08);
    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    ctx.fillRect(0, 0, width, barHeight);
    ctx.fillRect(0, height - barHeight, width, barHeight);
  }

  if (effect === 'neon' || effect === 'ai_auto') {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, 'rgba(14,165,233,0.18)');
    gradient.addColorStop(0.5, 'rgba(139,92,246,0.16)');
    gradient.addColorStop(1, 'rgba(236,72,153,0.1)');
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  if (effect === 'party') {
    const pulse = 0.08 + Math.abs(Math.sin(elapsed * 6)) * 0.08;
    const gradient = ctx.createRadialGradient(width * 0.72, height * 0.18, 0, width * 0.72, height * 0.18, width * 0.8);
    gradient.addColorStop(0, `rgba(34,197,94,${pulse})`);
    gradient.addColorStop(0.45, `rgba(59,130,246,${pulse * 0.8})`);
    gradient.addColorStop(1, 'rgba(236,72,153,0)');
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  if (effect === 'luxury') {
    const gradient = ctx.createLinearGradient(0, height, width, 0);
    gradient.addColorStop(0, 'rgba(245,158,11,0.16)');
    gradient.addColorStop(0.55, 'rgba(255,255,255,0.04)');
    gradient.addColorStop(1, 'rgba(88,28,135,0.08)');
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  if (effect === 'wedding_soft') {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(255,255,255,0.12)');
    gradient.addColorStop(0.45, 'rgba(244,114,182,0.08)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  if (effect === 'glitch_flash' && Math.sin(elapsed * 22) > 0.82) {
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(59,130,246,0.16)';
    ctx.fillRect(-6, 0, width, height);
    ctx.fillStyle = 'rgba(236,72,153,0.14)';
    ctx.fillRect(6, 0, width, height);
  }

  ctx.restore();
}

function revokeAssets(assets: Array<LoadedAsset<HTMLImageElement | HTMLVideoElement | HTMLAudioElement> | undefined>, inputUrl: string) {
  assets.forEach((asset) => {
    if (asset?.objectUrl) URL.revokeObjectURL(asset.objectUrl);
  });
  URL.revokeObjectURL(inputUrl);
}

export async function renderVideoInBrowser(options: BrowserVideoRenderOptions) {
  if (!canRenderVideoInBrowser()) {
    throw new Error('BROWSER_RENDER_UNSUPPORTED');
  }

  const mimeType = supportedMimeType();
  const inputUrl = URL.createObjectURL(options.input);
  const sourceVideo = document.createElement('video');
  sourceVideo.src = inputUrl;
  sourceVideo.muted = true;
  sourceVideo.loop = true;
  sourceVideo.playsInline = true;
  sourceVideo.preload = 'auto';

  let overlayImage: LoadedAsset<HTMLImageElement> | undefined;
  let overlayVideo: LoadedAsset<HTMLVideoElement> | undefined;
  let music: LoadedAsset<HTMLAudioElement> | undefined;

  try {
    await waitForEvent(sourceVideo, 'loadedmetadata', 15000);
    const { width, height } = scaledCanvasSize(sourceVideo.videoWidth, sourceVideo.videoHeight);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('CANVAS_CONTEXT_UNAVAILABLE');

    const [loadedOverlayImage, loadedOverlayVideo, loadedMusic] = await Promise.all([
      loadImage(options.overlayUrl).catch(() => undefined),
      loadOverlayVideo(options.animationUrl).catch(() => undefined),
      loadMusic(options.musicUrl).catch(() => undefined),
    ]);
    overlayImage = loadedOverlayImage;
    overlayVideo = loadedOverlayVideo;
    music = loadedMusic;

    const outputStream = canvas.captureStream(TARGET_FPS);
    const musicStream = music ? captureMediaStream(music.element) : undefined;
    musicStream?.getAudioTracks().forEach((track) => outputStream.addTrack(track));

    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(outputStream, mimeType ? { mimeType } : undefined);
    const targetDuration = Math.max(1, Math.min(60, options.durationSeconds || 15));

    const rendered = new Promise<Blob>((resolve, reject) => {
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };

      recorder.onerror = () => reject(new Error('BROWSER_RENDER_FAILED'));
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || 'video/webm' });
        if (!blob.size) {
          reject(new Error('BROWSER_RENDER_EMPTY'));
          return;
        }
        resolve(blob);
      };
    });

    sourceVideo.currentTime = 0;
    sourceVideo.playbackRate = options.effect === 'slow_motion' ? 0.72 : options.effect === 'speed_ramp' ? 1.1 : 1;
    overlayVideo?.element.play().catch(() => undefined);
    music?.element.play().catch(() => undefined);
    await sourceVideo.play();

    const start = performance.now();
    recorder.start(1000);

    const drawFrame = () => {
      const elapsed = (performance.now() - start) / 1000;
      const currentEffect = activeEffect(options.effect || 'clean', options.effectSegments, elapsed);
      options.onProgress?.(Math.min(99, Math.round((elapsed / targetDuration) * 100)));

      ctx.clearRect(0, 0, width, height);
      ctx.filter = canvasFilter(currentEffect);
      drawCover(ctx, sourceVideo, width, height);
      ctx.filter = 'none';

      if (overlayImage) {
        drawCover(ctx, overlayImage.element, width, height);
      }

      if (overlayVideo && overlayVideo.element.readyState >= 2) {
        drawCover(ctx, overlayVideo.element, width, height);
      }

      drawEffectOverlay(ctx, currentEffect, elapsed, width, height);

      if (elapsed >= targetDuration) {
        if (recorder.state !== 'inactive') recorder.stop();
        sourceVideo.pause();
        overlayVideo?.element.pause();
        music?.element.pause();
        options.onProgress?.(100);
        return;
      }

      window.requestAnimationFrame(drawFrame);
    };

    window.requestAnimationFrame(drawFrame);
    return await rendered;
  } finally {
    sourceVideo.pause();
    overlayVideo?.element.pause();
    music?.element.pause();
    revokeAssets([overlayImage, overlayVideo, music], inputUrl);
  }
}
