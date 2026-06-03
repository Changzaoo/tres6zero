type RenderEffectSegment = {
  effect: string;
  start: number;
  end: number;
};

type LoadedAsset<T extends HTMLImageElement | HTMLVideoElement> = {
  element: T;
  objectUrl?: string;
};

type BoomerangFrameCache = {
  frames: ImageBitmap[];
  outputStart: number;
  outputEnd: number;
  forwardDuration: number;
};

export type BrowserVideoRenderOptions = {
  input: Blob;
  durationSeconds: number;
  outputOrientation?: 'portrait' | 'landscape';
  trimStartSeconds?: number;
  trimEndSeconds?: number;
  effect?: string;
  effectSegments?: RenderEffectSegment[];
  overlayUrl?: string;
  animationUrl?: string;
  fallbackOverlayUrl?: string;
  overlayOpacity?: number;
  musicUrl?: string;
  musicTheme?: string;
  onProgress?: (pct: number) => void;
};

const TARGET_FPS = 30;
const MAX_RENDER_SIDE = 720;
const MIN_RENDER_SIDE = 360;
const BOOMERANG_CACHE_FPS = 18;
const MAX_BOOMERANG_FRAMES = 96;

type AudioContextConstructor = typeof AudioContext;

export function canRenderVideoInBrowser() {
  return typeof window !== 'undefined'
    && typeof MediaRecorder !== 'undefined'
    && typeof HTMLCanvasElement !== 'undefined'
    && typeof HTMLCanvasElement.prototype.captureStream === 'function';
}

export function canUseTransparentMotionOverlay() {
  if (typeof navigator === 'undefined') return false;

  const userAgent = navigator.userAgent || '';
  const platform = navigator.platform || '';
  const maxTouchPoints = navigator.maxTouchPoints || 0;
  const isIOS = /iPad|iPhone|iPod/i.test(userAgent)
    || (platform === 'MacIntel' && maxTouchPoints > 1);
  const isAndroid = /Android/i.test(userAgent);

  return !isIOS && !isAndroid;
}

function supportedMimeType() {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];

  return candidates.find((mime) => MediaRecorder.isTypeSupported(mime)) || '';
}

function createAudioContext() {
  const AudioContextCtor = window.AudioContext
    || (window as unknown as { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext;
  return AudioContextCtor ? new AudioContextCtor() : undefined;
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

function seekVideo(video: HTMLVideoElement, time: number) {
  const safeTime = Math.max(0, time);
  if (Math.abs(video.currentTime - safeTime) < 0.035) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      resolve();
    }, 3500);

    const cleanup = () => {
      window.clearTimeout(timeout);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
    };

    const onSeeked = () => {
      cleanup();
      resolve();
    };

    const onError = () => {
      cleanup();
      reject(new Error('VIDEO_SEEK_FAILED'));
    };

    video.addEventListener('seeked', onSeeked, { once: true });
    video.addEventListener('error', onError, { once: true });

    if ('fastSeek' in video && typeof video.fastSeek === 'function') {
      video.fastSeek(safeTime);
    } else {
      video.currentTime = safeTime;
    }
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

async function loadFirstImage(urls: Array<string | undefined>): Promise<LoadedAsset<HTMLImageElement> | undefined> {
  const seen = new Set<string>();
  const candidates = urls.filter((url): url is string => Boolean(url && !seen.has(url) && seen.add(url)));

  for (const url of candidates) {
    const image = await loadImage(url).catch(() => undefined);
    if (image) return image;
  }

  return undefined;
}

function looksLikeVideoUrl(url?: string) {
  return /\.(webm|mp4|mov)(\?|$)/i.test(url || '');
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

async function loadMusicBuffer(audioContext: AudioContext | undefined, url?: string) {
  if (!audioContext || !url) return undefined;

  try {
    const response = await fetch(url, { mode: 'cors', cache: 'force-cache' });
    if (!response.ok) return undefined;

    const arrayBuffer = await response.arrayBuffer();
    return await audioContext.decodeAudioData(arrayBuffer.slice(0));
  } catch {
    return undefined;
  }
}

function scaledCanvasSize(videoWidth: number, videoHeight: number, outputOrientation?: 'portrait' | 'landscape') {
  if (outputOrientation === 'portrait') {
    return { width: 405, height: 720 };
  }

  if (outputOrientation === 'landscape') {
    return { width: 720, height: 405 };
  }

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

function drawFullFrame(
  ctx: CanvasRenderingContext2D,
  source: HTMLVideoElement | HTMLImageElement,
  width: number,
  height: number,
) {
  const sourceWidth = source instanceof HTMLVideoElement ? source.videoWidth : source.naturalWidth;
  const sourceHeight = source instanceof HTMLVideoElement ? source.videoHeight : source.naturalHeight;
  if (!sourceWidth || !sourceHeight) return;

  ctx.drawImage(source, 0, 0, width, height);
}

function drawBitmapCover(
  ctx: CanvasRenderingContext2D,
  source: ImageBitmap,
  width: number,
  height: number,
) {
  if (!source.width || !source.height) return;

  const scale = Math.max(width / source.width, height / source.height);
  const drawWidth = source.width * scale;
  const drawHeight = source.height * scale;
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

function normalizeEffectSegments(segments: RenderEffectSegment[] | undefined, targetDuration: number) {
  return (segments || [])
    .map((segment) => {
      const start = Math.max(0, Math.min(targetDuration, segment.start));
      const end = Math.max(start, Math.min(targetDuration, segment.end));
      return { ...segment, start, end };
    })
    .filter((segment) => segment.end - segment.start >= 0.05);
}

function activeEffectState(baseEffect: string, segments: RenderEffectSegment[] | undefined, elapsed: number, targetDuration: number) {
  const segment = segments?.find((item) => elapsed >= item.start && elapsed <= item.end);
  if (segment) {
    return {
      effect: segment.effect,
      localElapsed: Math.max(0, elapsed - segment.start),
      duration: Math.max(0.1, segment.end - segment.start),
      start: segment.start,
      end: segment.end,
      segmented: true,
    };
  }

  return {
    effect: baseEffect || 'clean',
    localElapsed: elapsed,
    duration: targetDuration,
    start: 0,
    end: targetDuration,
    segmented: false,
  };
}

function isTemporalEffect(effect: string) {
  return effect === 'slow_motion' || effect === 'speed_ramp' || effect === 'boomerang';
}

function mapPlaybackRate(effect: string, elapsed: number, duration: number) {
  if (effect === 'slow_motion') return 0.38;

  if (effect === 'speed_ramp') {
    const progress = Math.min(1, Math.max(0, elapsed / Math.max(duration, 1)));
    if (progress < 0.16) return 0.55;
    if (progress < 0.5) return 2.45;
    if (progress < 0.72) return 1.25;
    if (progress < 0.86) return 0.45;
    return 0.95;
  }

  return 1;
}

function boomerangFrameIndex(cache: BoomerangFrameCache, localElapsed: number) {
  if (cache.frames.length <= 1) return 0;

  const cycleDuration = Math.max(0.2, cache.forwardDuration * 2);
  const cyclePosition = localElapsed % cycleDuration;
  const forward = cyclePosition <= cache.forwardDuration;
  const progress = forward
    ? cyclePosition / cache.forwardDuration
    : 1 - ((cyclePosition - cache.forwardDuration) / cache.forwardDuration);
  return Math.max(0, Math.min(cache.frames.length - 1, Math.round(progress * (cache.frames.length - 1))));
}

async function buildBoomerangFrameCache({
  sourceVideo,
  width,
  height,
  trimStart,
  trimEnd,
  targetDuration,
  baseEffect,
  segments,
}: {
  sourceVideo: HTMLVideoElement;
  width: number;
  height: number;
  trimStart: number;
  trimEnd: number;
  targetDuration: number;
  baseEffect: string;
  segments: RenderEffectSegment[];
}): Promise<BoomerangFrameCache | undefined> {
  const boomerangRange = segments.find((segment) => segment.effect === 'boomerang')
    || (baseEffect === 'boomerang' ? { effect: 'boomerang', start: 0, end: targetDuration } : undefined);
  if (!boomerangRange) return undefined;

  const outputStart = Math.max(0, Math.min(targetDuration, boomerangRange.start));
  const outputEnd = Math.max(outputStart + 0.2, Math.min(targetDuration, boomerangRange.end));
  const sourceStart = Math.max(trimStart, Math.min(trimEnd - 0.05, trimStart + outputStart));
  const sourceAvailable = Math.max(0.2, trimEnd - sourceStart);
  const outputDuration = Math.max(0.2, outputEnd - outputStart);
  const forwardDuration = Math.max(0.35, Math.min(sourceAvailable, outputDuration / 2, 4));
  const frameCount = Math.max(8, Math.min(MAX_BOOMERANG_FRAMES, Math.round(forwardDuration * BOOMERANG_CACHE_FPS)));
  const frameCanvas = document.createElement('canvas');
  frameCanvas.width = width;
  frameCanvas.height = height;
  const frameCtx = frameCanvas.getContext('2d');
  if (!frameCtx) return undefined;

  const frames: ImageBitmap[] = [];
  sourceVideo.pause();
  sourceVideo.playbackRate = 1;

  for (let index = 0; index < frameCount; index += 1) {
    const progress = frameCount <= 1 ? 0 : index / (frameCount - 1);
    const sourceTime = Math.min(trimEnd - 0.04, sourceStart + (progress * forwardDuration));
    await seekVideo(sourceVideo, sourceTime).catch(() => undefined);
    frameCtx.clearRect(0, 0, width, height);
    frameCtx.filter = canvasFilter('boomerang');
    drawCover(frameCtx, sourceVideo, width, height);
    frameCtx.filter = 'none';
    frames.push(await createImageBitmap(frameCanvas));
  }

  return frames.length ? { frames, outputStart, outputEnd, forwardDuration } : undefined;
}

function mapManualSourceTime(effect: string, elapsed: number, effectDuration: number, sourceStart: number, sourceEnd: number) {
  const usableDuration = Math.max(0.2, Math.min(Math.max(0.2, sourceEnd - sourceStart), effectDuration));

  if (effect === 'boomerang') {
    const halfCycle = Math.max(0.5, Math.min(usableDuration, effectDuration / 2));
    const cyclePosition = elapsed % (halfCycle * 2);
    const localTime = cyclePosition <= halfCycle ? cyclePosition : halfCycle - (cyclePosition - halfCycle);
    return sourceStart + localTime;
  }

  return Math.min(sourceEnd - 0.04, sourceStart + (elapsed % usableDuration));
}

function isBoomerangReverseFrame(elapsed: number, effectDuration: number, sourceStart: number, sourceEnd: number) {
  const usableDuration = Math.max(0.2, Math.min(Math.max(0.2, sourceEnd - sourceStart), effectDuration));
  const halfCycle = Math.max(0.5, Math.min(usableDuration, effectDuration / 2));
  return elapsed % (halfCycle * 2) > halfCycle;
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

  if (effect === 'boomerang') {
    const sweep = (Math.sin(elapsed * 7) + 1) / 2;
    const x = width * sweep;
    const gradient = ctx.createLinearGradient(x - width * 0.24, 0, x + width * 0.24, height);
    gradient.addColorStop(0, 'rgba(255,255,255,0)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.12)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  if (effect === 'speed_ramp') {
    const pulse = Math.abs(Math.sin(elapsed * 10)) * 0.14;
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = `rgba(59,130,246,${pulse})`;
    ctx.fillRect(0, 0, width, height);
  }

  if (effect === 'slow_motion') {
    const gradient = ctx.createRadialGradient(width / 2, height / 2, width * 0.1, width / 2, height / 2, width * 0.72);
    gradient.addColorStop(0, 'rgba(255,255,255,0)');
    gradient.addColorStop(1, 'rgba(255,255,255,0.08)');
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  ctx.restore();
}

function scheduleTone(
  audioContext: AudioContext,
  destination: AudioNode,
  start: number,
  duration: number,
  frequency: number,
  gainValue: number,
  type: OscillatorType = 'sine',
) {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(gainValue, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function scheduleKick(audioContext: AudioContext, destination: AudioNode, start: number, gainValue = 0.12) {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(120, start);
  oscillator.frequency.exponentialRampToValueAtTime(48, start + 0.16);
  gain.gain.setValueAtTime(gainValue, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
  oscillator.connect(gain);
  gain.connect(destination);
  oscillator.start(start);
  oscillator.stop(start + 0.2);
}

function scheduleSyntheticMusic(audioContext: AudioContext, destination: AudioNode, theme: string, duration: number) {
  const start = audioContext.currentTime + 0.06;
  const normalizedTheme = theme === 'none' ? 'ambient' : theme;
  const tempo = normalizedTheme === 'wedding' || normalizedTheme === 'ambient' ? 84
    : normalizedTheme === 'corporate' || normalizedTheme === 'luxury' ? 104
      : 126;
  const beat = 60 / tempo;
  const scale = normalizedTheme === 'wedding'
    ? [261.63, 329.63, 392, 523.25]
    : normalizedTheme === 'luxury'
      ? [220, 277.18, 329.63, 440]
      : normalizedTheme === 'corporate'
        ? [246.94, 329.63, 392, 493.88]
        : [261.63, 329.63, 392, 523.25, 659.25];

  const master = audioContext.createGain();
  master.gain.setValueAtTime(0.72, start);
  master.connect(destination);

  for (let time = 0; time < duration + 1; time += beat) {
    const absoluteTime = start + time;
    const step = Math.round(time / beat);
    const root = scale[step % scale.length];

    if (normalizedTheme !== 'ambient' && normalizedTheme !== 'wedding' && step % 2 === 0) {
      scheduleKick(audioContext, master, absoluteTime, normalizedTheme === 'corporate' ? 0.06 : 0.11);
    }

    if (step % 4 === 0) {
      scheduleTone(audioContext, master, absoluteTime, beat * 3.6, root / 2, 0.035, normalizedTheme === 'luxury' ? 'triangle' : 'sine');
      scheduleTone(audioContext, master, absoluteTime, beat * 3.6, root, 0.025, 'triangle');
    }

    if (normalizedTheme === 'party' || normalizedTheme === 'birthday' || normalizedTheme === 'viral') {
      scheduleTone(audioContext, master, absoluteTime + beat * 0.5, beat * 0.22, scale[(step + 2) % scale.length], 0.035, 'square');
      scheduleTone(audioContext, master, absoluteTime + beat * 0.75, beat * 0.18, scale[(step + 4) % scale.length], 0.028, 'sawtooth');
    } else if (normalizedTheme === 'wedding' || normalizedTheme === 'ambient') {
      scheduleTone(audioContext, master, absoluteTime, beat * 1.6, root * 2, 0.018, 'sine');
    } else {
      scheduleTone(audioContext, master, absoluteTime + beat * 0.5, beat * 0.35, root * 2, 0.022, 'triangle');
    }
  }
}

function attachAudioTrack(
  outputStream: MediaStream,
  audioContext: AudioContext | undefined,
  musicBuffer: AudioBuffer | undefined,
  musicTheme: string | undefined,
  duration: number,
) {
  if (!audioContext) return undefined;
  const destination = audioContext.createMediaStreamDestination();
  const theme = musicTheme && musicTheme !== 'none' ? musicTheme : undefined;

  if (musicBuffer) {
    const source = audioContext.createBufferSource();
    const gain = audioContext.createGain();
    source.buffer = musicBuffer;
    source.loop = true;
    gain.gain.setValueAtTime(0.92, audioContext.currentTime);
    source.connect(gain);
    gain.connect(destination);
    source.start(audioContext.currentTime);
    window.setTimeout(() => {
      try {
        source.stop();
      } catch {
        // The source can already be stopped when rendering finishes early.
      }
    }, Math.max(1, duration + 0.3) * 1000);
  } else if (theme) {
    scheduleSyntheticMusic(audioContext, destination, theme, duration);
  } else {
    return undefined;
  }

  destination.stream.getAudioTracks().forEach((track) => outputStream.addTrack(track));
  return () => {
    destination.stream.getTracks().forEach((track) => track.stop());
  };
}

function revokeAssets(assets: Array<LoadedAsset<HTMLImageElement | HTMLVideoElement> | undefined>, inputUrl: string) {
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
  sourceVideo.loop = false;
  sourceVideo.playsInline = true;
  sourceVideo.preload = 'auto';

  let overlayImage: LoadedAsset<HTMLImageElement> | undefined;
  let overlayVideo: LoadedAsset<HTMLVideoElement> | undefined;
  let boomerangCache: BoomerangFrameCache | undefined;
  const needsAudio = Boolean(options.musicUrl || (options.musicTheme && options.musicTheme !== 'none'));
  const audioContext = needsAudio ? createAudioContext() : undefined;
  let cleanupAudio: (() => void) | undefined;

  try {
    await audioContext?.resume().catch(() => undefined);
    await waitForEvent(sourceVideo, 'loadedmetadata', 15000);
    const { width, height } = scaledCanvasSize(sourceVideo.videoWidth, sourceVideo.videoHeight, options.outputOrientation);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('CANVAS_CONTEXT_UNAVAILABLE');

    const imageOverlayUrl = looksLikeVideoUrl(options.overlayUrl) ? undefined : options.overlayUrl;
    const motionOverlayUrl = canUseTransparentMotionOverlay()
      ? options.animationUrl || (looksLikeVideoUrl(options.overlayUrl) ? options.overlayUrl : undefined)
      : undefined;
    const [loadedOverlayImage, loadedOverlayVideo, loadedMusicBuffer] = await Promise.all([
      loadFirstImage([imageOverlayUrl, options.fallbackOverlayUrl]).catch(() => undefined),
      loadOverlayVideo(motionOverlayUrl).catch(() => undefined),
      loadMusicBuffer(audioContext, options.musicUrl).catch(() => undefined),
    ]);
    overlayImage = loadedOverlayImage;
    overlayVideo = loadedOverlayVideo;

    const outputStream = canvas.captureStream(TARGET_FPS);
    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(outputStream, {
      ...(mimeType ? { mimeType } : {}),
      videoBitsPerSecond: 2_800_000,
      audioBitsPerSecond: 128_000,
    });
    const sourceDuration = Number.isFinite(sourceVideo.duration) && sourceVideo.duration > 0
      ? sourceVideo.duration
      : Math.max(1, Math.min(60, options.durationSeconds || 15));
    const trimStart = Math.max(0, Math.min(sourceDuration - 0.05, options.trimStartSeconds || 0));
    const trimEndCandidate = typeof options.trimEndSeconds === 'number' && Number.isFinite(options.trimEndSeconds)
      ? options.trimEndSeconds
      : trimStart + (options.durationSeconds || 15);
    const trimEnd = Math.max(trimStart + 0.05, Math.min(sourceDuration, trimEndCandidate));
    const availableDuration = Math.max(0.05, trimEnd - trimStart);
    const targetDuration = Math.max(0.5, Math.min(60, options.durationSeconds || availableDuration, availableDuration));
    const normalizedSegments = normalizeEffectSegments(options.effectSegments, targetDuration);
    boomerangCache = await buildBoomerangFrameCache({
      sourceVideo,
      width,
      height,
      trimStart,
      trimEnd,
      targetDuration,
      baseEffect: options.effect || 'clean',
      segments: normalizedSegments,
    }).catch(() => undefined);
    cleanupAudio = attachAudioTrack(outputStream, audioContext, loadedMusicBuffer, options.musicTheme, targetDuration);

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

    await seekVideo(sourceVideo, trimStart);
    overlayVideo?.element.play().catch(() => undefined);
    await sourceVideo.play();

    const start = performance.now();
    let previousEffect = options.effect || 'clean';
    recorder.start(1000);

    const drawFrame = () => {
      const elapsed = (performance.now() - start) / 1000;
      const effectState = activeEffectState(options.effect || 'clean', normalizedSegments, elapsed, targetDuration);
      const currentEffect = effectState.effect;
      const sourceEffectStart = trimStart + effectState.start;
      const sourceEffectEnd = Math.min(trimEnd, trimStart + effectState.end);
      options.onProgress?.(Math.min(99, Math.round((elapsed / targetDuration) * 100)));

      if (currentEffect === 'boomerang') {
        sourceVideo.pause();
        if (!boomerangCache) {
          const mappedTime = mapManualSourceTime(currentEffect, effectState.localElapsed, effectState.duration, sourceEffectStart, sourceEffectEnd);
          if (Number.isFinite(mappedTime) && Math.abs(sourceVideo.currentTime - mappedTime) > 0.035) {
            if ('fastSeek' in sourceVideo && typeof sourceVideo.fastSeek === 'function') {
              sourceVideo.fastSeek(mappedTime);
            } else {
              sourceVideo.currentTime = mappedTime;
            }
          }
        }
      } else {
        if (isTemporalEffect(previousEffect) && previousEffect !== currentEffect) {
          const resumedTime = Math.min(trimEnd - 0.03, trimStart + elapsed);
          if (Number.isFinite(resumedTime) && Math.abs(sourceVideo.currentTime - resumedTime) > 0.08) {
            sourceVideo.currentTime = resumedTime;
          }
        }

        const nextRate = mapPlaybackRate(currentEffect, effectState.localElapsed, effectState.duration);
        if (Math.abs(sourceVideo.playbackRate - nextRate) > 0.02) {
          sourceVideo.playbackRate = nextRate;
        }
        if (sourceVideo.currentTime >= trimEnd - 0.03) {
          sourceVideo.pause();
          sourceVideo.currentTime = Math.max(trimStart, trimEnd - 0.03);
        } else if (sourceVideo.paused) {
          sourceVideo.play().catch(() => undefined);
        }
      }

      ctx.clearRect(0, 0, width, height);
      ctx.filter = canvasFilter(currentEffect);
      const cachedBoomerangFrame = currentEffect === 'boomerang' && boomerangCache
        ? boomerangCache.frames[boomerangFrameIndex(boomerangCache, effectState.localElapsed)]
        : undefined;

      if (cachedBoomerangFrame) {
        drawBitmapCover(ctx, cachedBoomerangFrame, width, height);
      } else if (currentEffect === 'boomerang' && isBoomerangReverseFrame(effectState.localElapsed, effectState.duration, sourceEffectStart, sourceEffectEnd)) {
        ctx.save();
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
        drawCover(ctx, sourceVideo, width, height);
        ctx.restore();
      } else {
        drawCover(ctx, sourceVideo, width, height);
      }
      ctx.filter = 'none';

      if (overlayImage) {
        ctx.globalAlpha = Math.min(1, Math.max(0.2, options.overlayOpacity ?? 1));
        drawFullFrame(ctx, overlayImage.element, width, height);
        ctx.globalAlpha = 1;
      }

      if (overlayVideo && overlayVideo.element.readyState >= 2) {
        ctx.globalAlpha = Math.min(1, Math.max(0.2, options.overlayOpacity ?? 1));
        drawFullFrame(ctx, overlayVideo.element, width, height);
        ctx.globalAlpha = 1;
      }

      drawEffectOverlay(ctx, currentEffect, effectState.localElapsed, width, height);

      if (elapsed >= targetDuration) {
        if (recorder.state !== 'inactive') recorder.stop();
        sourceVideo.pause();
        overlayVideo?.element.pause();
        options.onProgress?.(100);
        return;
      }

      previousEffect = currentEffect;
      window.requestAnimationFrame(drawFrame);
    };

    window.requestAnimationFrame(drawFrame);
    return await rendered;
  } finally {
    sourceVideo.pause();
    overlayVideo?.element.pause();
    boomerangCache?.frames.forEach((frame) => frame.close());
    cleanupAudio?.();
    audioContext?.close().catch(() => undefined);
    revokeAssets([overlayImage, overlayVideo], inputUrl);
  }
}
