import { useState, useRef, useEffect, useMemo, type CSSProperties, type ReactNode, type SyntheticEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Camera, Upload, RefreshCw, Check, QrCode, Share2, Video, Loader2, Lock, Wand2, Music2, Eye, Clock, Volume2, Sparkles, Film, Layers, SlidersHorizontal, Scissors, ChevronDown, Minus, Plus, X, Pencil, Star } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { toast } from '@/components/ui/Toast';
import { TemplateOverlayRenderer } from '@/components/templates/TemplateOverlayRenderer';
import { useAuth } from '@/hooks/useAuth';
import { getUserEvents } from '@/services/eventService';
import { createVideo, getUserVideos, updateVideo } from '@/services/videoService';
import { getTemplates, seedTemplates } from '@/services/templateService';
import { getUserMusic } from '@/services/musicService';
import { uploadVideoToServer, getGeneratedMusic } from '@/services/serverMediaService';
import { describeSunoStatus, generateSunoMusic, waitForSunoMusic } from '@/services/sunoMusicService';
import { canRenderVideoInBrowser, canUseTransparentMotionOverlay, renderVideoInBrowser } from '@/services/browserVideoRenderer';
import { getOperatorPreferences } from '@/services/appPreferences';
import { VIDEO_EFFECTS, hasFeature } from '@/config/plans';
import { EffectSelector } from '@/features/effects/EffectSelector';
import { useAudioMixSettings, MusicVolumeControls } from '@/features/music';
import { getVideoEffect, videoEffects } from '@/features/effects/effects.config';
import { API_URL } from '@/config/api';
import { isTemplateAnimated } from '@/services/templateStorage';
import { canUseTemplateForPlan, templateRequiresPremiumTemplates } from '@/services/templateAccess';
import { favoriteSet, getMediaFavorites, isMediaFavorite, sortFavoritesFirst, subscribeMediaFavorites, toggleMediaFavorite, type MediaFavorites } from '@/services/mediaFavorites';
import type { AppEvent, AppMusic, AppTemplate, AppVideo } from '@/types';

type Step = 'select' | 'capture' | 'preview' | 'processing' | 'done';
type VideoOrientation = 'portrait' | 'landscape';
type CameraFacing = 'user' | 'environment';

type EffectSegment = {
  id: string;
  effect: string;
  start: number;
  end: number;
};

const STANDALONE_EVENT_ID = 'standalone';
const MIN_EFFECT_SEGMENT_SECONDS = 0.5;
const MIN_TRIM_SECONDS = 0.5;

const DURATION_OPTIONS = [5, 15, 25, 35, 45] as const;

const durationOptions = DURATION_OPTIONS.map((seconds) => ({
  value: String(seconds),
  label: `${seconds}s`,
}));

const musicOptions = [
  { value: 'none', label: 'Sem trilha' },
  { value: 'ambient', label: 'Ambient leve' },
  { value: 'party', label: 'Party beat' },
  { value: 'luxury', label: 'Luxury pulse' },
  { value: 'wedding', label: 'Wedding soft' },
  { value: 'corporate', label: 'Corporate clean' },
  { value: 'birthday', label: 'Birthday pop' },
  { value: 'viral', label: 'Viral motion' },
];

const eventStatusLabel: Record<AppEvent['status'], string> = {
  draft: 'rascunho',
  active: 'ativo',
  closed: 'encerrado',
  archived: 'arquivado',
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatTime(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const mins = Math.floor(safeSeconds / 60);
  const secs = Math.floor(safeSeconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

function formatPreciseTime(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const mins = Math.floor(safeSeconds / 60);
  const secs = (safeSeconds % 60).toFixed(1).padStart(4, '0');
  return `${mins}:${secs}`;
}

function createEffectSegmentId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

function effectLabel(effectId: string) {
  return getVideoEffect(effectId)?.name || VIDEO_EFFECTS.find((item) => item.value === effectId)?.label || effectId;
}

function videoOrientationFromSize(width?: number, height?: number): VideoOrientation | null {
  if (!width || !height || !Number.isFinite(width) || !Number.isFinite(height)) return null;
  return width > height ? 'landscape' : 'portrait';
}

function templateMatchesVideoOrientation(template: AppTemplate, orientation: VideoOrientation | null) {
  if (!orientation) return true;
  if (template.aspectRatio === 'auto' || template.aspectRatio === '1:1') return true;
  return orientation === 'portrait'
    ? template.aspectRatio === '9:16'
    : template.aspectRatio === '16:9';
}

function videoOrientationLabel(orientation: VideoOrientation) {
  return orientation === 'portrait' ? 'retrato' : 'paisagem';
}

function templateOrientationPlural(orientation: VideoOrientation) {
  return orientation === 'portrait' ? 'retratos' : 'paisagens';
}

function cameraFacingLabel(facing: CameraFacing) {
  return facing === 'environment' ? 'Traseira' : 'Frontal';
}

function cameraFacingFromStream(stream: MediaStream, fallback: CameraFacing): CameraFacing {
  const facingMode = stream.getVideoTracks()[0]?.getSettings().facingMode;
  return facingMode === 'environment' || facingMode === 'user' ? facingMode : fallback;
}

function readVideoMetadata(url: string) {
  return new Promise<{ duration: number; width: number; height: number }>((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = () => {
      resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      });
      video.removeAttribute('src');
      video.load();
    };
    video.onerror = () => reject(new Error('VIDEO_METADATA_UNAVAILABLE'));
    video.src = url;
  });
}

function localAiDirection(eventType?: AppEvent['type'], templateCategory?: AppTemplate['category']) {
  if (eventType === 'wedding' || templateCategory === 'wedding') return { effect: 'wedding_soft', musicTheme: 'wedding' };
  if (eventType === 'corporate' || templateCategory === 'corporate') return { effect: 'corporate_sharp', musicTheme: 'corporate' };
  if (eventType === 'graduation' || templateCategory === 'graduation') return { effect: 'luxury', musicTheme: 'luxury' };
  if (eventType === 'store' || templateCategory === 'store') return { effect: 'corporate_sharp', musicTheme: 'corporate' };
  if (eventType === 'church' || templateCategory === 'church') return { effect: 'wedding_soft', musicTheme: 'ambient' };
  if (eventType === 'birthday' || templateCategory === 'birthday') return { effect: 'party', musicTheme: 'birthday' };
  if (eventType === 'club' || templateCategory === 'party') return { effect: 'neon', musicTheme: 'party' };
  if (templateCategory === 'premium') return { effect: 'luxury', musicTheme: 'luxury' };
  return { effect: 'cinematic', musicTheme: 'viral' };
}

function renderedVideoFile(blob: Blob) {
  const type = blob.type.includes('mp4') ? 'video/mp4' : 'video/webm';
  const extension = type === 'video/mp4' ? 'mp4' : 'webm';
  return new File([blob], `six3-edited-${Date.now()}.${extension}`, { type });
}

function titleFromFileName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
}

function getSupportedRecordingMimeType() {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return '';
  }

  return [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4;codecs=h264,aac',
    'video/mp4',
  ].find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) || '';
}

function orientationFromViewport(): VideoOrientation {
  if (typeof window === 'undefined') return 'portrait';
  return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
}

function cameraVideoConstraints(orientation: VideoOrientation, facingMode: CameraFacing, strictFacing = false): MediaTrackConstraints {
  const portrait = orientation === 'portrait';
  const constraints: MediaTrackConstraints = {
    facingMode: strictFacing ? { exact: facingMode } : { ideal: facingMode },
    width: { ideal: portrait ? 1080 : 1920 },
    height: { ideal: portrait ? 1920 : 1080 },
  };
  return constraints;
}

async function requestCameraStream(orientation: VideoOrientation, facingMode: CameraFacing) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('CAMERA_API_UNAVAILABLE');
  }

  const strictVideo = cameraVideoConstraints(orientation, facingMode, true);
  const preferredVideo = cameraVideoConstraints(orientation, facingMode);
  const portrait = orientation === 'portrait';
  const simpleVideo: MediaTrackConstraints = {
    facingMode: { ideal: facingMode },
    width: { ideal: portrait ? 720 : 1280 },
    height: { ideal: portrait ? 1280 : 720 },
  };
  const fallbackVideo: MediaTrackConstraints = { facingMode: { ideal: facingMode } };
  const attempts: MediaStreamConstraints[] = [
    { video: strictVideo, audio: { echoCancellation: true, noiseSuppression: true } },
    { video: preferredVideo, audio: { echoCancellation: true, noiseSuppression: true } },
    { video: preferredVideo, audio: false },
    { video: simpleVideo, audio: false },
    { video: fallbackVideo, audio: false },
    { video: true, audio: false },
  ];

  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(attempt);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('CAMERA_STREAM_UNAVAILABLE');
}

function getEffectPreviewStyle(effect: string): CSSProperties {
  return { filter: getVideoEffect(effect)?.previewStyle.previewFilter || getVideoEffect('clean')?.previewStyle.previewFilter };
}

function uniqueSources(sources: Array<string | undefined>) {
  const seen = new Set<string>();
  return sources.filter((source): source is string => Boolean(source && !seen.has(source) && seen.add(source)));
}

function generatedTemplateBaseId(template?: AppTemplate) {
  const candidates = [
    template?.id,
    template?.overlayUrl,
    template?.previewUrl,
    template?.frameUrl,
    template?.animationUrl,
    template?.storagePath,
    template?.animationStoragePath,
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    const normalized = candidate.replace(/^animated-/, '');
    const match = /(?:generated|idea)-\d+/.exec(normalized);
    if (match) return match[0];
  }

  return undefined;
}

function generatedTemplateRenderUrl(template?: AppTemplate) {
  const id = generatedTemplateBaseId(template);
  return id ? `${API_URL}/api/templates/render/${encodeURIComponent(id)}.png` : undefined;
}

function generatedTemplateMotionUrl(template?: AppTemplate) {
  const animationUrl = template?.animationUrl;
  return animationUrl && /\.(webm|mp4|mov)(\?|$)/i.test(animationUrl) && !/render-motion/i.test(animationUrl) ? animationUrl : undefined;
}

function templateImageSources(template?: AppTemplate) {
  return uniqueSources([
    generatedTemplateRenderUrl(template),
    template?.overlayUrl,
    template?.frameUrl,
    template?.previewUrl,
    template?.animationUrl && !/\.(webm|mp4|mov)(\?|$)/i.test(template.animationUrl) ? template.animationUrl : undefined,
  ]);
}

function templateRenderAssets(template?: AppTemplate) {
  const imageSources = templateImageSources(template);
  const renderFallback = imageSources[1] || imageSources[0] || generatedTemplateRenderUrl(template);

  return {
    overlayUrl: imageSources[0] || renderFallback,
    animationUrl: canUseTransparentMotionOverlay() ? generatedTemplateMotionUrl(template) : undefined,
    fallbackOverlayUrl: renderFallback,
  };
}

function TemplateOverlayPreview({ template, opacity }: { template?: AppTemplate; opacity?: number }) {
  const imageSources = useMemo(() => templateImageSources(template), [template]);
  const motionSrc = generatedTemplateMotionUrl(template);
  const [imageIndex, setImageIndex] = useState(0);
  const [motionFailed, setMotionFailed] = useState(false);
  const useMotionPreview = Boolean(motionSrc && !motionFailed && canUseTransparentMotionOverlay());

  useEffect(() => {
    setImageIndex(0);
    setMotionFailed(false);
  }, [template?.id, template?.overlayUrl, template?.animationUrl]);

  const className = 'absolute inset-0 h-full w-full object-contain pointer-events-none';
  if (useMotionPreview && motionSrc) {
    return (
      <video
        key={`${template?.id}-${motionSrc}`}
        src={motionSrc}
        className={className}
        style={{ opacity: opacity ?? template?.opacityDefault ?? 0.95 }}
        muted
        autoPlay
        loop
        playsInline
        preload="metadata"
        onError={() => setMotionFailed(true)}
      />
    );
  }

  if (template && imageSources.length === 0) {
    return <TemplateOverlayRenderer template={template} opacity={opacity} />;
  }

  const src = imageSources[imageIndex];
  if (!src) return null;

  return (
    <img
      key={`${template?.id}-${src}`}
      src={src}
      alt=""
      className={className}
      style={{ opacity: opacity ?? template?.opacityDefault ?? 0.95 }}
      loading="lazy"
      decoding="async"
      onError={() => setImageIndex((current) => Math.min(current + 1, imageSources.length))}
    />
  );
}

function EffectPreviewLayer({ effect }: { effect: string }) {
  const className = getVideoEffect(effect)?.previewStyle.overlayClass;
  return className ? <div className={`absolute inset-0 pointer-events-none ${className}`} /> : null;
}

function MockVideoPreview({ effect }: { effect: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden" style={getEffectPreviewStyle(effect)}>
      <div className="absolute inset-0 bg-[linear-gradient(145deg,#171923_0%,#0b0d13_42%,#17101f_100%)]" />
      <div className="absolute inset-x-6 bottom-8 h-28 rounded-t-[80px] border border-white/10 bg-white/[0.055]" />
      <div className="absolute left-[24%] top-[22%] h-16 w-16 rounded-full border border-white/10 bg-white/[0.08]" />
      <div className="absolute right-6 top-7 h-16 w-24 rounded-xl border border-white/10 bg-black/20" />
    </div>
  );
}

function VideoPreviewFrame({
  children,
  template,
  templateOpacity,
  effect,
  label,
  className = '',
}: {
  children?: ReactNode;
  template?: AppTemplate;
  templateOpacity?: number;
  effect: string;
  label: string;
  className?: string;
}) {
  return (
    <div className={`relative w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-black ${className}`}>
      {children ? (
        <div className="absolute inset-0" style={getEffectPreviewStyle(effect)}>
          {children}
        </div>
      ) : (
        <MockVideoPreview effect={effect} />
      )}
      <TemplateOverlayPreview template={template} opacity={templateOpacity} />
      <EffectPreviewLayer effect={effect} />
      <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/45 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur-md">
        <Eye className="h-3.5 w-3.5" />
        {label}
      </div>
    </div>
  );
}

function TimelineClip({
  label,
  start,
  end,
  duration,
  className,
  onLeftHandleDown,
  onRightHandleDown,
  onClick,
}: {
  label: string;
  start: number;
  end: number;
  duration: number;
  className: string;
  onLeftHandleDown?: (e: React.MouseEvent | React.TouchEvent) => void;
  onRightHandleDown?: (e: React.MouseEvent | React.TouchEvent) => void;
  onClick?: () => void;
}) {
  const safeDuration = Math.max(duration, 1);
  const leftPct = clamp(start / safeDuration, 0, 1) * 100;
  const widthPct = Math.max(2, clamp((end - start) / safeDuration, 0, 1) * 100);
  const isDraggable = !!onLeftHandleDown || !!onRightHandleDown;
  const isClickable = !!onClick;

  return (
    <div
      className={`absolute top-1/2 flex h-8 -translate-y-1/2 items-center rounded-xl border text-xs font-bold text-white shadow-lg select-none ${
        isClickable && !isDraggable ? 'cursor-pointer hover:brightness-110' : ''
      } ${className}`}
      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
      title={`${label} - ${formatTime(start)} até ${formatTime(end)}`}
      onClick={isClickable && !isDraggable ? onClick : undefined}
    >
      {isDraggable && onLeftHandleDown && (
        <div
          className="absolute -left-3 top-0 bottom-0 w-7 sm:-left-2 sm:w-5 z-10 flex cursor-ew-resize touch-manipulation items-center justify-center"
          onMouseDown={onLeftHandleDown}
          onTouchStart={onLeftHandleDown}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="h-5 w-[3px] rounded-full bg-white/60 transition-colors hover:bg-white/90" />
        </div>
      )}

      <span className="min-w-0 flex-1 truncate px-3">{label}</span>

      {isClickable && !isDraggable && (
        <ChevronDown className="mr-2 h-3 w-3 shrink-0 text-white/55" />
      )}

      {isClickable && isDraggable && (
        <button
          type="button"
          className="mr-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-black/30 hover:bg-black/55 z-10"
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          title="Alterar efeito"
        >
          <ChevronDown className="h-3 w-3 text-white/60" />
        </button>
      )}

      {isDraggable && onRightHandleDown && (
        <div
          className="absolute -right-3 top-0 bottom-0 w-7 sm:-right-2 sm:w-5 z-10 flex cursor-ew-resize touch-manipulation items-center justify-center"
          onMouseDown={onRightHandleDown}
          onTouchStart={onRightHandleDown}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="h-5 w-[3px] rounded-full bg-white/60 transition-colors hover:bg-white/90" />
        </div>
      )}
    </div>
  );
}

function TimelineRow({
  icon,
  label,
  children,
  trackRef,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
  trackRef?: React.RefObject<HTMLDivElement>;
}) {
  return (
    <div className="grid min-w-0 grid-cols-[80px_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[116px_minmax(0,1fr)] sm:gap-3">
      <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-semibold text-white/55 truncate">
        <span className="shrink-0">{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <div ref={trackRef} className="relative h-11 sm:h-11 rounded-xl sm:rounded-2xl border border-white/[0.08] bg-black/24 overflow-visible touch-pan-x">
        {children}
      </div>
    </div>
  );
}

function InlineSelectPopover({
  options,
  value,
  onChange,
  onClose,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="absolute left-0 top-full z-50 mt-1.5 max-h-56 w-72 overflow-y-auto rounded-2xl border border-white/[0.08] py-1.5"
      style={{
        background: 'rgba(13, 15, 20, 0.98)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.05)',
        backdropFilter: 'blur(20px)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors hover:bg-white/[0.055] ${
            value === opt.value ? 'font-semibold text-brand-200' : 'text-white/65'
          }`}
          onClick={() => { onChange(opt.value); onClose(); }}
        >
          {value === opt.value
            ? <Check className="h-3.5 w-3.5 shrink-0 text-brand-300" />
            : <span className="h-3.5 w-3.5 shrink-0" />}
          <span className="truncate">{opt.label}</span>
        </button>
      ))}
    </div>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  birthday: 'Aniversário',
  wedding: 'Casamento',
  corporate: 'Corporativo',
  party: 'Festa',
  graduation: 'Formatura',
  store: 'Loja',
  church: 'Igreja',
  premium: 'Premium',
  viral: 'Viral',
  infantil: 'Infantil',
  esportivo: 'Esportivo',
  natal: 'Natal',
  carnaval: 'Carnaval',
  cha_revelacao: 'Chá Revelação',
  halloween: 'Halloween',
  brilhos_estrelas: 'Brilhos',
  confetes_festa: 'Confetes',
  neon_glow: 'Neon',
  circulos_animados: 'Circulos',
  setas_chamadas: 'Setas',
  emojis_reacoes: 'Reacoes',
  elementos_festivos: 'Festa',
  cards_faixas: 'Cards',
  tech_futurista: 'Tech',
  cubos_isometricos: 'Cubos',
  flores_decorativos: 'Flores',
  minimal_premium: 'Minimal',
  gamer_neon: 'Gamer',
  tropical: 'Tropical',
  booth_360: '360 Booth',
};

function TemplatePicker({
  templates,
  selectedId,
  onChange,
  videoOrientation,
  favoriteTemplateIds,
  onToggleFavorite,
}: {
  templates: AppTemplate[];
  selectedId: string;
  onChange: (id: string) => void;
  videoOrientation?: 'portrait' | 'landscape' | null;
  favoriteTemplateIds: Set<string>;
  onToggleFavorite: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');

  const selectedTemplate = templates.find((t) => t.id === selectedId);

  const categories = useMemo(
    () => [...new Set(templates.map((t) => t.category))].sort(),
    [templates]
  );

  const visibleTemplates = useMemo(() => {
    const base = activeCategory === 'favorites'
      ? templates.filter((t) => favoriteTemplateIds.has(t.id))
      : activeCategory === 'all'
        ? templates
        : templates.filter((t) => t.category === activeCategory);
    return base.slice(0, 40);
  }, [activeCategory, favoriteTemplateIds, templates]);

  const thumbFrame = videoOrientation === 'landscape'
    ? 'h-6 w-10'
    : 'h-9 w-5';
  const thumbGrid = videoOrientation === 'landscape'
    ? 'aspect-video'
    : 'aspect-[9/16]';

  function handleSelect(id: string) {
    onChange(id);
    setExpanded(false);
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-white/52">Template</p>

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className={`flex min-h-[48px] w-full items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-left transition-all active:scale-[0.99] touch-manipulation ${
          expanded
            ? 'border-brand-300/40 bg-brand-500/10 ring-2 ring-brand-500/15'
            : 'border-white/[0.09] bg-white/[0.045] hover:border-white/[0.18] hover:bg-white/[0.065]'
        }`}
      >
        <div className={`relative shrink-0 overflow-hidden rounded border border-white/15 bg-black/40 ${thumbFrame}`}>
          {selectedTemplate && (selectedTemplate.previewUrl || selectedTemplate.overlayUrl) ? (
            <img
              src={selectedTemplate.previewUrl || selectedTemplate.overlayUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-contain"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Layers className="h-2.5 w-2.5 text-white/25" />
            </div>
          )}
        </div>
        <p className="min-w-0 flex-1 truncate text-xs font-semibold text-white">
          {selectedTemplate ? selectedTemplate.name : 'Sem overlay'}
        </p>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-white/42 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Inline picker */}
      {expanded && (
        <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025]">
          {/* Category tabs */}
          <div className="hide-scrollbar flex gap-1 overflow-x-auto border-b border-white/[0.06] px-2 py-2">
            <button
              onClick={() => setActiveCategory('all')}
              className={`min-h-[32px] shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold transition-colors touch-manipulation ${
                activeCategory === 'all'
                  ? 'border border-brand-300/35 bg-brand-500/22 text-brand-200'
                  : 'text-white/38 hover:text-white/70'
              }`}
            >
              Todos
            </button>
            {favoriteTemplateIds.size > 0 && (
              <button
                onClick={() => setActiveCategory('favorites')}
                className={`min-h-[32px] shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold transition-colors touch-manipulation ${
                  activeCategory === 'favorites'
                    ? 'border border-amber-300/40 bg-amber-400/18 text-amber-100'
                    : 'text-white/38 hover:text-amber-100'
                }`}
              >
                Favoritos
              </button>
            )}
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`min-h-[32px] shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold transition-colors touch-manipulation ${
                  activeCategory === cat
                    ? 'border border-brand-300/35 bg-brand-500/22 text-brand-200'
                    : 'text-white/38 hover:text-white/70'
                }`}
              >
                {CATEGORY_LABELS[cat] || cat}
              </button>
            ))}
          </div>

          {/* Grid */}
          <div
            className="grid grid-cols-4 gap-1.5 overflow-y-auto p-2 sm:grid-cols-5"
            style={{ maxHeight: 240 }}
          >
            {/* No template option */}
            <button
              onClick={() => handleSelect('')}
              className={`flex ${thumbGrid} min-h-11 touch-manipulation flex-col items-center justify-center rounded-lg border text-[8px] font-bold transition-all ${
                !selectedId
                  ? 'border-brand-300/55 bg-brand-500/15 text-brand-200'
                  : 'border-white/10 bg-white/[0.03] text-white/30 hover:border-white/20'
              }`}
            >
              <X className="mb-0.5 h-2.5 w-2.5 opacity-50" />
              Sem
            </button>

            {visibleTemplates.map((t) => {
              const favorite = favoriteTemplateIds.has(t.id);
              return (
              <div
                key={t.id}
                title={t.name}
                className={`relative ${thumbGrid} min-h-11 touch-manipulation overflow-hidden rounded-lg border transition-all ${
                  selectedId === t.id
                    ? 'border-brand-300/70 ring-1 ring-brand-300/30'
                    : 'border-white/[0.08] hover:border-white/30'
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleSelect(t.id)}
                  className="absolute inset-0"
                >
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.15),rgba(0,0,0,0.5))]" />
                  {(t.previewUrl || t.overlayUrl) && (
                    <img
                      src={t.previewUrl || t.overlayUrl}
                      alt=""
                      className="absolute inset-0 h-full w-full object-contain"
                      loading="lazy"
                      decoding="async"
                    />
                  )}
                  {selectedId === t.id && (
                    <div className="absolute inset-0 flex items-center justify-center bg-brand-500/25">
                      <Check className="h-3 w-3 text-brand-200" />
                    </div>
                  )}
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleFavorite(t.id);
                  }}
                  className={`absolute right-1 top-1 z-10 grid h-6 w-6 place-items-center rounded-full border backdrop-blur-md ${
                    favorite
                      ? 'border-amber-200/45 bg-amber-400/18 text-amber-100'
                      : 'border-white/10 bg-black/35 text-white/40 hover:text-amber-100'
                  }`}
                  aria-label={favorite ? 'Remover template dos favoritos' : 'Favoritar template'}
                >
                  <Star className="h-3 w-3" fill={favorite ? 'currentColor' : 'none'} />
                </button>
              </div>
            );
            })}
          </div>

          {/* Count hint */}
          {(() => {
            const total = activeCategory === 'favorites'
              ? templates.filter((t) => favoriteTemplateIds.has(t.id)).length
              : activeCategory === 'all' ? templates.length : templates.filter((t) => t.category === activeCategory).length;
            return total > visibleTemplates.length ? (
              <p className="border-t border-white/[0.05] px-3 py-1.5 text-center text-[10px] text-white/28">
                Mostrando 40 de {total} — filtre por categoria para ver mais
              </p>
            ) : null;
          })()}
        </div>
      )}
    </div>
  );
}

function TemplateFineControls({
  template,
  opacity,
  onOpacityChange,
  onRemove,
}: {
  template?: AppTemplate;
  opacity: number;
  onOpacityChange: (value: number) => void;
  onRemove: () => void;
}) {
  if (!template) return null;

  const opacityOptions = [0.2, 0.4, 0.6, 0.8, 1];
  const premium = Boolean(template.isPremium || template.category === 'premium' || template.category === 'minimal_premium' || template.category === 'booth_360');

  return (
    <div className="space-y-2 rounded-2xl border border-white/[0.07] bg-white/[0.035] p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] font-bold uppercase text-white/52">
          {isTemplateAnimated(template) ? 'Animado' : 'Estático'}
        </span>
        <span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${premium ? 'border-yellow-300/25 bg-yellow-500/12 text-yellow-100' : 'border-emerald-300/20 bg-emerald-500/10 text-emerald-100'}`}>
          {premium ? 'Premium' : 'Gratis'}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="ml-auto inline-flex h-7 items-center gap-1 rounded-full border border-white/10 bg-white/[0.045] px-2 text-[10px] font-bold text-white/52 transition hover:bg-white/[0.08] hover:text-white"
        >
          <X className="h-3 w-3" />
          Remover
        </button>
      </div>
      <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase text-white/35">Opacidade</p>
        <div className="grid grid-cols-5 gap-1.5">
          {opacityOptions.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onOpacityChange(value)}
              className={`h-8 rounded-full border text-[10px] font-bold transition-all ${
                Math.abs(opacity - value) < 0.01
                  ? 'border-brand-300/60 bg-brand-500/22 text-white'
                  : 'border-white/10 bg-white/[0.04] text-white/50 hover:text-white'
              }`}
            >
              {Math.round(value * 100)}%
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function EditorTimeline({
  sourceDuration,
  outputDuration,
  trimStart,
  trimEnd,
  currentTime,
  templateName,
  musicLabel,
  effect,
  effectSegments,
  selectedEffectSegmentId,
  onSeek,
  onTrimStartChange,
  onTrimEndChange,
  onEffectSegmentStartChange,
  onEffectSegmentEndChange,
  onEffectSegmentSelect,
  onEffectSegmentEffectChange,
  templateOptions,
  selectedTemplateId,
  onTemplateChange,
  onEffectChange,
  resolvedMusicOptions,
  selectedMusicValue,
  onMusicChange,
}: {
  sourceDuration: number;
  outputDuration: number;
  trimStart: number;
  trimEnd: number;
  currentTime: number;
  templateName?: string;
  musicLabel: string;
  effect: string;
  effectSegments: EffectSegment[];
  selectedEffectSegmentId?: string | null;
  onSeek?: (t: number) => void;
  onTrimStartChange?: (v: number) => void;
  onTrimEndChange?: (v: number) => void;
  onEffectSegmentStartChange?: (id: string, v: number) => void;
  onEffectSegmentEndChange?: (id: string, v: number) => void;
  onEffectSegmentSelect?: (id: string) => void;
  onEffectSegmentEffectChange?: (id: string, effect: string) => void;
  templateOptions?: { value: string; label: string }[];
  selectedTemplateId?: string;
  onTemplateChange?: (v: string) => void;
  onEffectChange?: (id: string) => void;
  resolvedMusicOptions?: { value: string; label: string }[];
  selectedMusicValue?: string;
  onMusicChange?: (v: string) => void;
}) {
  const [editingRow, setEditingRow] = useState<'template' | 'effect' | 'music' | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const videoTrackRef = useRef<HTMLDivElement>(null);
  const effectTrackRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const timelineDuration = Math.max(sourceDuration || outputDuration, MIN_TRIM_SECONDS);
  const outputStart = clamp(trimStart, 0, timelineDuration);
  const outputEnd = clamp(outputStart + outputDuration, outputStart, timelineDuration);
  const safeTrimEnd = clamp(trimEnd, outputStart, timelineDuration);
  const playhead = clamp(currentTime, 0, timelineDuration);
  const selectedEffectSegment = effectSegments.find((segment) => segment.id === selectedEffectSegmentId) || effectSegments[0];
  const allEffectOptions = videoEffects.map((e) => ({ value: e.id, label: e.name }));

  // Adaptive time markers based on zoom
  const markerTimes = useMemo(() => {
    const niceIntervals = [0.5, 1, 2, 5, 10, 15, 30, 60, 120];
    const visibleRange = timelineDuration / zoomLevel;
    const rawInterval = visibleRange / 7;
    const interval = niceIntervals.find((v) => v >= rawInterval) ?? 120;
    const result: number[] = [];
    for (let t = 0; t <= timelineDuration + 0.001; t = Math.round((t + interval) * 100) / 100) {
      result.push(Math.min(t, timelineDuration));
      if (t >= timelineDuration) break;
    }
    return result;
  }, [timelineDuration, zoomLevel]);

  // Waveform bars for music (deterministic from label)
  const waveformBars = useMemo(() => {
    let seed = 0;
    for (let i = 0; i < musicLabel.length; i++) seed = (seed * 31 + musicLabel.charCodeAt(i)) | 0;
    seed = Math.abs(seed);
    const count = Math.min(160, Math.max(24, Math.round(outputDuration * 14)));
    return Array.from({ length: count }, (_, i) => {
      const h = 14 + Math.abs(
        Math.sin(i * 0.72 + seed * 0.001) * 38 +
        Math.sin(i * 2.1 + seed * 0.004) * 22 +
        Math.sin(i * 0.28 + seed * 0.007) * 16
      );
      return Math.min(86, Math.max(8, h));
    });
  }, [musicLabel, outputDuration]);

  // Scroll to playhead when zoomed
  useEffect(() => {
    if (zoomLevel <= 1 || !scrollRef.current) return;
    const el = scrollRef.current;
    const playheadPct = playhead / timelineDuration;
    const targetScrollLeft = playheadPct * el.scrollWidth - el.clientWidth / 2;
    el.scrollLeft = Math.max(0, targetScrollLeft);
  }, [playhead, zoomLevel, timelineDuration]);

  function makeDrag(
    trackRef: React.RefObject<HTMLDivElement>,
    onChange: (t: number) => void,
    min: number,
    max: number
  ) {
    return (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();

      function onMove(evt: MouseEvent | TouchEvent) {
        const track = trackRef.current;
        if (!track) return;
        const rect = track.getBoundingClientRect();
        const clientX = 'touches' in evt
          ? (evt as TouchEvent).touches[0].clientX
          : (evt as MouseEvent).clientX;
        onChange(clamp(((clientX - rect.left) / rect.width) * timelineDuration, min, max));
      }

      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.removeEventListener('touchend', onUp);
      }

      document.addEventListener('mousemove', onMove);
      document.addEventListener('touchmove', onMove, { passive: false });
      document.addEventListener('mouseup', onUp);
      document.addEventListener('touchend', onUp);
    };
  }

  function handleRulerClick(e: React.MouseEvent) {
    if (!onSeek || !rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();
    onSeek(clamp(((e.clientX - rect.left) / rect.width) * timelineDuration, 0, timelineDuration));
  }

  useEffect(() => {
    if (!editingRow) return;
    const timeout = setTimeout(() => {
      function close() { setEditingRow(null); }
      document.addEventListener('click', close, { once: true });
    }, 0);
    return () => clearTimeout(timeout);
  }, [editingRow]);

  const playheadPct = `${(playhead / timelineDuration) * 100}%`;
  const TRACK_ROWS = 4; // video, template, effect, music
  const ROW_H = 44; // px per row (h-11)
  const ROW_GAP = 6; // gap-1.5 = 6px
  const RULER_H = 24; // px
  const playheadTotalH = TRACK_ROWS * ROW_H + (TRACK_ROWS - 1) * ROW_GAP + RULER_H + 8;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#070a0f]">
      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-white/[0.06] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <SlidersHorizontal className="h-4 w-4 text-brand-300" />
          <span className="text-sm font-bold text-white">Timeline</span>
          <span className="rounded-full border border-brand-300/22 bg-brand-500/10 px-2 py-0.5 text-[10px] font-bold text-brand-100/65">
            {formatPreciseTime(playhead)}
          </span>
          {onSeek && (
            <span className="hidden text-[10px] text-white/25 sm:inline">
              · arraste as alças ou clique na régua
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-wrap gap-2 text-[10px] text-white/28">
            <span>Fonte {sourceDuration ? formatPreciseTime(sourceDuration) : '--:--'}</span>
            <span>Corte {formatPreciseTime(outputStart)} – {formatPreciseTime(safeTrimEnd)}</span>
            <span className="text-brand-100/55 font-semibold">Final {formatPreciseTime(outputDuration)}</span>
          </div>
          {/* Zoom controls */}
          <div className="flex items-center gap-0.5 rounded-xl border border-white/[0.07] bg-white/[0.03] p-0.5">
            <button
              type="button"
              disabled={zoomLevel <= 1}
              onClick={() => setZoomLevel((z) => Math.max(1, z / 2))}
              className="flex h-6 w-6 items-center justify-center rounded-[9px] transition-colors hover:bg-white/[0.08] disabled:opacity-30"
            >
              <Minus className="h-3 w-3 text-white/55" />
            </button>
            <span className="min-w-[26px] text-center text-[10px] font-bold text-white/45">{zoomLevel}x</span>
            <button
              type="button"
              disabled={zoomLevel >= 8}
              onClick={() => setZoomLevel((z) => Math.min(8, z * 2))}
              className="flex h-6 w-6 items-center justify-center rounded-[9px] transition-colors hover:bg-white/[0.08] disabled:opacity-30"
            >
              <Plus className="h-3 w-3 text-white/55" />
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable tracks area */}
      <div ref={scrollRef} className="hide-scrollbar overflow-x-auto p-3">
        <div
          className="space-y-1.5"
          style={{
            minWidth: `${Math.max(320, zoomLevel * 480)}px`,
            width: zoomLevel > 1 ? `${zoomLevel * 100}%` : undefined,
          }}
        >
          {/* Ruler */}
          <div className="grid grid-cols-[80px_minmax(0,1fr)] gap-2 sm:grid-cols-[116px_minmax(0,1fr)] sm:gap-3">
            <div className="flex items-end pb-0.5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-white/18">Regua</span>
            </div>
            <div
              ref={rulerRef}
              className={`relative overflow-hidden rounded-lg border border-white/[0.05] bg-white/[0.015] ${onSeek ? 'cursor-pointer' : ''}`}
              style={{ height: RULER_H }}
              onClick={handleRulerClick}
            >
              {/* Minor grid lines */}
              {Array.from({ length: 20 }, (_, i) => (
                <div
                  key={i}
                  className="absolute top-0 w-px bg-white/[0.07]"
                  style={{ left: `${(i / 20) * 100}%`, height: i % 5 === 0 ? '55%' : '30%' }}
                />
              ))}
              {/* Time labels */}
              {markerTimes.map((t) => (
                <span
                  key={t}
                  className="pointer-events-none absolute bottom-1 -translate-x-1/2 text-[10px] font-semibold text-white/38"
                  style={{ left: `${(t / timelineDuration) * 100}%` }}
                >
                  {formatTime(t)}
                </span>
              ))}
              {/* Playhead tick on ruler */}
              <div
                className="pointer-events-none absolute top-0 z-10 h-full w-0.5 bg-white/70"
                style={{ left: playheadPct, transform: 'translateX(-50%)' }}
              />
            </div>
          </div>

          {/* VIDEO ROW */}
          <TimelineRow icon={<Film className="h-3.5 w-3.5" />} label="Vídeo" trackRef={videoTrackRef}>
            {/* Outside-output dimmed regions */}
            <div className="pointer-events-none absolute inset-y-0 rounded-xl bg-black/20" style={{ left: 0, width: `${(outputStart / timelineDuration) * 100}%` }} />
            <div className="pointer-events-none absolute inset-y-0 rounded-xl bg-black/20" style={{ left: `${(outputEnd / timelineDuration) * 100}%`, right: 0 }} />
            <TimelineClip
              label="Corte final"
              start={outputStart}
              end={outputEnd}
              duration={timelineDuration}
              className="border-blue-400/40 bg-gradient-to-r from-blue-600/35 to-blue-400/22"
              onLeftHandleDown={onTrimStartChange ? makeDrag(videoTrackRef, onTrimStartChange, 0, safeTrimEnd - MIN_TRIM_SECONDS) : undefined}
              onRightHandleDown={onTrimEndChange ? makeDrag(videoTrackRef, onTrimEndChange, outputStart + MIN_TRIM_SECONDS, timelineDuration) : undefined}
            />
            {safeTrimEnd > outputEnd + 0.05 && (
              <TimelineClip label="Sobrou" start={outputEnd} end={safeTrimEnd} duration={timelineDuration} className="border-white/10 bg-white/[0.04] text-white/35" />
            )}
          </TimelineRow>

          {/* TEMPLATE ROW */}
          <TimelineRow icon={<Layers className="h-3.5 w-3.5" />} label="Template">
            {templateName ? (
              <TimelineClip
                label={templateName}
                start={outputStart}
                end={outputEnd}
                duration={timelineDuration}
                className="border-cyan-400/38 bg-gradient-to-r from-cyan-600/28 to-cyan-400/18"
                onClick={onTemplateChange ? () => setEditingRow(editingRow === 'template' ? null : 'template') : undefined}
              />
            ) : onTemplateChange ? (
              <button type="button" onClick={() => setEditingRow(editingRow === 'template' ? null : 'template')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-white/28 transition-colors hover:text-white/60">
                + Adicionar template
              </button>
            ) : (
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-white/20">Sem template</span>
            )}
            {editingRow === 'template' && templateOptions && onTemplateChange && (
              <InlineSelectPopover options={templateOptions} value={selectedTemplateId || ''} onChange={onTemplateChange} onClose={() => setEditingRow(null)} />
            )}
          </TimelineRow>

          {/* EFFECT ROW */}
          <TimelineRow icon={<Sparkles className="h-3.5 w-3.5" />} label="Efeito" trackRef={effectTrackRef}>
            {effectSegments.length > 0 ? (
              <>
                {effectSegments.map((segment, index) => {
                  const selected = selectedEffectSegment?.id === segment.id;
                  return (
                    <TimelineClip
                      key={segment.id}
                      label={`${index + 1}. ${effectLabel(segment.effect)}`}
                      start={outputStart + segment.start}
                      end={outputStart + segment.end}
                      duration={timelineDuration}
                      className={selected
                        ? 'border-fuchsia-300/70 bg-gradient-to-r from-fuchsia-600/42 to-violet-400/24 shadow-[0_0_0_1px_rgba(240,171,252,.25)]'
                        : 'border-violet-400/42 bg-gradient-to-r from-violet-600/32 to-violet-400/20'}
                      onLeftHandleDown={onEffectSegmentStartChange
                        ? makeDrag(effectTrackRef, (t) => onEffectSegmentStartChange(segment.id, t - outputStart), outputStart, outputStart + segment.end - MIN_EFFECT_SEGMENT_SECONDS)
                        : undefined}
                      onRightHandleDown={onEffectSegmentEndChange
                        ? makeDrag(effectTrackRef, (t) => onEffectSegmentEndChange(segment.id, t - outputStart), outputStart + segment.start + MIN_EFFECT_SEGMENT_SECONDS, outputStart + outputDuration)
                        : undefined}
                      onClick={onEffectSegmentSelect ? () => {
                        onEffectSegmentSelect(segment.id);
                        setEditingRow(editingRow === 'effect' && selected ? null : 'effect');
                      } : undefined}
                    />
                  );
                })}
                {editingRow === 'effect' && selectedEffectSegment && onEffectSegmentEffectChange && (
                  <InlineSelectPopover
                    options={allEffectOptions}
                    value={selectedEffectSegment.effect}
                    onChange={(nextEffect) => onEffectSegmentEffectChange(selectedEffectSegment.id, nextEffect)}
                    onClose={() => setEditingRow(null)}
                  />
                )}
              </>
            ) : effect === 'ai_auto' ? (
              <TimelineClip label="Automacao IA" start={outputStart} end={outputEnd} duration={timelineDuration} className="border-brand-300/38 bg-gradient-to-r from-brand-600/28 to-brand-400/18" />
            ) : (
              <>
                {onEffectChange ? (
                  <button type="button" onClick={() => setEditingRow(editingRow === 'effect' ? null : 'effect')}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-white/28 transition-colors hover:text-white/60">
                    + Definir trecho do efeito
                  </button>
                ) : (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-white/20">Sem efeito marcado</span>
                )}
                {editingRow === 'effect' && onEffectChange && (
                  <InlineSelectPopover options={allEffectOptions} value={effect} onChange={onEffectChange} onClose={() => setEditingRow(null)} />
                )}
              </>
            )}
          </TimelineRow>

          {/* MUSIC ROW — waveform visualization */}
          <TimelineRow icon={<Music2 className="h-3.5 w-3.5" />} label="Trilha">
            {musicLabel !== 'Sem trilha' ? (
              <>
                {/* Waveform clip */}
                <div
                  className="absolute inset-y-1.5 cursor-pointer overflow-hidden rounded-xl border border-emerald-400/32 bg-gradient-to-r from-emerald-700/25 to-emerald-500/14 transition-all hover:border-emerald-300/45"
                  style={{
                    left: `${(outputStart / timelineDuration) * 100}%`,
                    width: `${Math.max(2, ((outputEnd - outputStart) / timelineDuration) * 100)}%`,
                  }}
                  onClick={onMusicChange ? () => setEditingRow(editingRow === 'music' ? null : 'music') : undefined}
                >
                  {/* Waveform bars */}
                  <div className="absolute inset-0 flex items-center gap-px px-1.5">
                    {waveformBars.map((h, i) => (
                      <div
                        key={i}
                        className="flex-shrink-0 rounded-sm bg-emerald-400"
                        style={{ width: 1.5, height: `${h}%`, opacity: 0.42 + (i % 3) * 0.09, minHeight: 1 }}
                      />
                    ))}
                  </div>
                  {/* Label overlay */}
                  <div className="absolute inset-0 flex items-center px-2.5">
                    <span className="relative z-10 select-none truncate text-[10px] font-bold leading-none text-emerald-200/80 drop-shadow">
                      {musicLabel}
                    </span>
                    {onMusicChange && <ChevronDown className="ml-auto h-3 w-3 shrink-0 text-emerald-300/50" />}
                  </div>
                </div>
                {editingRow === 'music' && resolvedMusicOptions && onMusicChange && (
                  <InlineSelectPopover options={resolvedMusicOptions} value={selectedMusicValue || ''} onChange={onMusicChange} onClose={() => setEditingRow(null)} />
                )}
              </>
            ) : onMusicChange ? (
              <button type="button" onClick={() => setEditingRow(editingRow === 'music' ? null : 'music')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-white/28 transition-colors hover:text-white/60">
                + Adicionar trilha
              </button>
            ) : (
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-white/20">Sem trilha sonora</span>
            )}
          </TimelineRow>

          {/* PLAYHEAD */}
          <div className="grid grid-cols-[80px_minmax(0,1fr)] gap-2 sm:grid-cols-[116px_minmax(0,1fr)] sm:gap-3">
            <div />
            <div className="relative h-0">
              {/* Triangle handle */}
              <div
                className="pointer-events-none absolute z-30"
                style={{ left: playheadPct, top: `-${playheadTotalH}px`, transform: 'translateX(-50%)' }}
              >
                <div className="mx-auto h-0 w-0 border-l-[5px] border-r-[5px] border-t-[7px] border-l-transparent border-r-transparent border-t-white/85" />
              </div>
              {/* Vertical line */}
              <div
                className="pointer-events-none absolute z-20"
                style={{
                  left: playheadPct,
                  top: `-${playheadTotalH}px`,
                  height: `${playheadTotalH}px`,
                  width: 2,
                  transform: 'translateX(-50%)',
                  background: 'rgba(255,255,255,0.78)',
                  boxShadow: '0 0 10px rgba(255,255,255,0.35)',
                }}
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function OperatorPage() {
  const operatorPreferences = useMemo(() => getOperatorPreferences(), []);
  const { user, isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const editVideoId = searchParams.get('edit');
  const requestedTemplateId = searchParams.get('template') || '';
  const requestedMusicId = searchParams.get('music') || '';
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [templates, setTemplates] = useState<AppTemplate[]>([]);
  const [musicCatalog, setMusicCatalog] = useState<AppMusic[]>([]);
  const [favorites, setFavorites] = useState<MediaFavorites>(() => getMediaFavorites(user?.uid));
  const [videoTitle, setVideoTitle] = useState('');
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [editingOriginalVideo, setEditingOriginalVideo] = useState<AppVideo | null>(null);
  const [loadingEditVideo, setLoadingEditVideo] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [templateOpacity, setTemplateOpacity] = useState(1);
  const [effect, setEffect] = useState('clean');
  const [musicTheme, setMusicTheme] = useState<string>(operatorPreferences.defaultMusicTheme);
  const mix = useAudioMixSettings();
  const [step, setStep] = useState<Step>('select');
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [savedVideoId, setSavedVideoId] = useState('');
  const [progress, setProgress] = useState(0);
  const [processingLabel, setProcessingLabel] = useState('Preparando vídeo...');
  const [recording, setRecording] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [duration, setDuration] = useState<number>(operatorPreferences.defaultDuration);
  const [sourceDuration, setSourceDuration] = useState(0);
  const [videoOrientation, setVideoOrientation] = useState<VideoOrientation | null>(null);
  const [recordingOrientation, setRecordingOrientation] = useState<VideoOrientation>(() => orientationFromViewport());
  const [cameraFacing, setCameraFacing] = useState<CameraFacing>('user');
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState<number>(operatorPreferences.defaultDuration);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);
  const [effectSegmentsDraft, setEffectSegmentsDraft] = useState<EffectSegment[]>([]);
  const [activeEffectSegmentId, setActiveEffectSegmentId] = useState<string | null>(null);
  const [generatingAiMusic, setGeneratingAiMusic] = useState(false);
  const [aiMusicStatus, setAiMusicStatus] = useState('');
  const [timelineExpanded, setTimelineExpanded] = useState(false);
  const [mobileEditorTab, setMobileEditorTab] = useState<'controls' | 'timeline'>('controls');

  const videoRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingTimeoutRef = useRef<number | null>(null);
  const objectVideoUrlRef = useRef<string | null>(null);
  const loadedEditVideoIdRef = useRef<string | null>(null);

  useEffect(() => {
    setFavorites(getMediaFavorites(user?.uid));
    return subscribeMediaFavorites(() => {
      setFavorites(getMediaFavorites(user?.uid));
    });
  }, [user?.uid]);

  useEffect(() => {
    if (!user) return;
    getUserEvents(user.uid).then(evs => {
      setEvents(evs.filter(e => e.status !== 'archived'));
    });
    seedTemplates().then(() => getTemplates(user.uid)).then((items) => {
      const activeItems = items.filter((item) => item.isActive);
      setTemplates(activeItems);
      if (editVideoId) return;
      const requestedTemplate = requestedTemplateId
        ? activeItems.find((item) => item.id === requestedTemplateId && canUseTemplateForPlan(item, user.planId, isAdmin))
        : undefined;
      const firstAvailable = activeItems.find((item) => canUseTemplateForPlan(item, user.planId, isAdmin));
      setSelectedTemplateId(requestedTemplate?.id || firstAvailable?.id || '');
    }).catch(() => undefined);
    Promise.all([
      getGeneratedMusic().catch(() => []),
      getUserMusic(user.uid).catch(() => []),
    ]).then(([generated, custom]) => {
      const catalog = [...generated, ...custom].filter((item) => item.musicUrl);
      setMusicCatalog(catalog);
      if (editVideoId || !requestedMusicId) return;
      const requestedTrack = catalog.find((item) => item.id === requestedMusicId);
      if (requestedTrack?.musicUrl) {
        setMusicTheme(`url:${requestedTrack.musicUrl}`);
      }
    });
  }, [editVideoId, isAdmin, requestedMusicId, requestedTemplateId, user]);

  const selectedEvent = events.find(e => e.id === selectedEventId);
  const isStandaloneVideo = !selectedEventId;
  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
  const effectMeta = getVideoEffect(effect);
  const aiAutoSelected = effect === 'ai_auto';
  const aiPreviewDirection = useMemo(
    () => localAiDirection(selectedEvent?.type, selectedTemplate?.category),
    [selectedEvent?.type, selectedTemplate?.category]
  );
  const previewEffect = aiAutoSelected ? aiPreviewDirection.effect : effect;
  const canUseAiAuto = hasFeature(user?.planId, 'ai_auto_edit', isAdmin);
  const canUsePremiumTemplates = hasFeature(user?.planId, 'premium_templates', isAdmin);
  const canUseSelectedEffect = !effectMeta || hasFeature(user?.planId, effectMeta.requiredFeature, isAdmin);
  const canUseTemplate = !selectedTemplate || isAdmin
    || !templateRequiresPremiumTemplates(selectedTemplate)
    || canUsePremiumTemplates;
  const favoriteTemplateIds = useMemo(() => favoriteSet(favorites.templates), [favorites.templates]);
  const favoriteMusicIds = useMemo(() => favoriteSet(favorites.music), [favorites.music]);
  const templateOrientation = step === 'select' || step === 'capture'
    ? recordingOrientation
    : videoOrientation || recordingOrientation;
  const filteredTemplates = useMemo(
    () => sortFavoritesFirst(
      templates.filter((template) => (
        templateMatchesVideoOrientation(template, templateOrientation)
        && canUseTemplateForPlan(template, user?.planId, isAdmin)
      )),
      favoriteTemplateIds
    ),
    [favoriteTemplateIds, isAdmin, templates, templateOrientation, user?.planId]
  );
  const templateAspectHint = `Formato ${videoOrientationLabel(templateOrientation)}: mostrando apenas templates ${templateOrientationPlural(templateOrientation)}.`;
  const templatePreviewClass = templateOrientation === 'landscape'
    ? 'mx-auto aspect-video max-w-[260px]'
    : 'mx-auto aspect-[9/16] max-w-[220px]';
  const videoPreviewFrameClass = templateOrientation === 'landscape'
    ? 'aspect-video max-h-[48vh] sm:max-h-[80vh]'
    : 'aspect-[9/16] max-h-[48vh] sm:max-h-[80vh] mx-auto';
  const livePreviewFrameClass = templateOrientation === 'landscape'
    ? 'aspect-video max-h-[48vh] sm:max-h-[68vh]'
    : 'aspect-[9/16] max-h-[48vh] sm:max-h-[68vh] mx-auto';

  const eventOptions = [
    { value: '', label: 'Sem evento - vídeo avulso' },
    ...events.map(e => ({ value: e.id, label: `${e.name} - ${eventStatusLabel[e.status] || e.status}` })),
  ];
  const defaultVideoTitle = `${isStandaloneVideo ? 'Vídeo avulso' : selectedEvent?.name || 'Vídeo 360'} - ${new Date().toLocaleDateString('pt-BR')}`;
  const resolvedVideoTitle = videoTitle.trim() || defaultVideoTitle;
  const processActionLabel = editingVideoId ? 'Atualizar' : 'Processar';

  const templateOptions = [
    { value: '', label: `Sem overlay (${videoOrientationLabel(templateOrientation)})` },
    ...filteredTemplates.slice(0, 240).map(t => ({ value: t.id, label: t.name })),
  ];

  const isEffectLocked = (item: { requiredFeature: Parameters<typeof hasFeature>[1] }) => (
    !hasFeature(user?.planId, item.requiredFeature, isAdmin)
  );

  const resolvedMusicOptions = [
    ...musicOptions,
    ...sortFavoritesFirst(musicCatalog, favoriteMusicIds).map((track) => ({
      value: `url:${track.musicUrl}`,
      label: `${favoriteMusicIds.has(track.id) ? '★ ' : ''}${track.source === 'custom' ? 'Sua música - ' : 'SIX3 - '}${track.name}`,
    })),
  ];

  const selectedMusicUrl = musicTheme.startsWith('url:') ? musicTheme.slice(4) : undefined;
  const selectedMusicLabel = aiAutoSelected && musicTheme === 'none'
    ? 'IA escolhe a trilha'
    : resolvedMusicOptions.find(o => o.value === musicTheme)?.label || 'Sem trilha';
  const selectedMusicTrack = useMemo(() => {
    if (selectedMusicUrl) {
      return musicCatalog.find((track) => track.musicUrl === selectedMusicUrl);
    }
    if (musicTheme === 'none') return undefined;
    return musicCatalog.find((track) =>
      track.theme === musicTheme
      || track.category === musicTheme
      || track.name.toLowerCase().includes(musicTheme.toLowerCase())
    );
  }, [musicCatalog, musicTheme, selectedMusicUrl]);
  const selectedMusicFavorite = Boolean(selectedMusicTrack && favoriteMusicIds.has(selectedMusicTrack.id));
  const musicPreviewUrl = selectedMusicUrl || selectedMusicTrack?.musicUrl;
  const processingMusicUrl = musicTheme === 'none' ? undefined : musicPreviewUrl;
  const storedMusicTheme = processingMusicUrl ? (selectedMusicTrack?.theme || 'custom') : musicTheme;
  const sourceTimelineDuration = Math.max(sourceDuration || duration, MIN_TRIM_SECONDS);
  const safeTrimStart = clamp(trimStart, 0, Math.max(0, sourceTimelineDuration - MIN_TRIM_SECONDS));
  const safeTrimEnd = clamp(trimEnd, safeTrimStart + MIN_TRIM_SECONDS, sourceTimelineDuration);
  const outputDuration = Math.max(MIN_TRIM_SECONDS, safeTrimEnd - safeTrimStart);
  const effectDescription = aiAutoSelected
    ? `A IA local vai aplicar ${effectLabel(previewEffect)} para este contexto.`
    : effectMeta?.shortDescription || 'Acabamento aplicado pelo editor.';
  const effectSegments = useMemo<EffectSegment[]>(() => {
    if (effect === 'ai_auto') return [];

    return effectSegmentsDraft
      .map((segment) => {
        const start = clamp(segment.start, 0, Math.max(0, outputDuration - MIN_EFFECT_SEGMENT_SECONDS));
        const end = clamp(segment.end, start + MIN_EFFECT_SEGMENT_SECONDS, outputDuration);
        return { ...segment, start, end };
      })
      .filter((segment) => segment.effect !== 'clean' && segment.end - segment.start >= MIN_EFFECT_SEGMENT_SECONDS)
      .sort((a, b) => a.start - b.start || a.end - b.end);
  }, [effect, effectSegmentsDraft, outputDuration]);
  const activeEffectSegment = effectSegments.find((segment) => segment.id === activeEffectSegmentId) || effectSegments[0];
  const lockedEffectSegment = effectSegments.find((segment) => {
    const meta = getVideoEffect(segment.effect);
    return meta && !hasFeature(user?.planId, meta.requiredFeature, isAdmin);
  });
  const canUseEffect = canUseSelectedEffect && !lockedEffectSegment;
  const processingBaseEffect = effectSegments.length > 0 ? 'clean' : effect;
  const previewLocalTime = clamp(previewCurrentTime - safeTrimStart, 0, outputDuration);
  const previewInsideOutput = previewCurrentTime >= safeTrimStart - 0.04 && previewCurrentTime <= safeTrimStart + outputDuration + 0.04;
  const editorPreviewEffect = aiAutoSelected
    ? previewEffect
    : previewInsideOutput
      ? effectSegments.find((segment) => previewLocalTime >= segment.start && previewLocalTime <= segment.end)?.effect || 'clean'
      : 'clean';

  useEffect(() => {
    setTrimStart((current) => clamp(current, 0, Math.max(0, sourceTimelineDuration - MIN_TRIM_SECONDS)));
    setTrimEnd((current) => clamp(current, MIN_TRIM_SECONDS, sourceTimelineDuration));
  }, [sourceTimelineDuration]);

  useEffect(() => {
    setEffectSegmentsDraft((current) => current
      .map((segment) => {
        const start = clamp(segment.start, 0, Math.max(0, outputDuration - MIN_EFFECT_SEGMENT_SECONDS));
        const end = clamp(segment.end, start + MIN_EFFECT_SEGMENT_SECONDS, outputDuration);
        return { ...segment, start, end };
      })
      .filter((segment) => segment.end - segment.start >= MIN_EFFECT_SEGMENT_SECONDS));
  }, [outputDuration]);

  useEffect(() => {
    if (!selectedTemplateId) return;
    if (filteredTemplates.some((template) => template.id === selectedTemplateId)) return;
    setSelectedTemplateId(filteredTemplates[0]?.id || '');
  }, [filteredTemplates, selectedTemplateId]);

  useEffect(() => {
    if (
      editingVideoId
      && selectedTemplate?.id
      && selectedTemplate.id === editingOriginalVideo?.templateId
      && typeof editingOriginalVideo.templateOpacity === 'number'
    ) {
      setTemplateOpacity(editingOriginalVideo.templateOpacity);
      return;
    }

    setTemplateOpacity(selectedTemplate?.opacityDefault ?? 1);
  }, [editingOriginalVideo?.templateId, editingOriginalVideo?.templateOpacity, editingVideoId, selectedTemplate?.id, selectedTemplate?.opacityDefault]);

  useEffect(() => {
    if (step !== 'capture') return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;

    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    const playPreview = () => video.play().catch(() => undefined);
    playPreview();

    return () => {
      if (video.srcObject === stream) {
        video.pause();
        video.srcObject = null;
      }
    };
  }, [step]);

  useEffect(() => {
    if (step !== 'preview') return;
    setMobileEditorTab('controls');
    setTimelineExpanded(false);
  }, [step]);

  useEffect(() => () => {
    if (recordingTimeoutRef.current) {
      window.clearTimeout(recordingTimeoutRef.current);
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (objectVideoUrlRef.current) {
      URL.revokeObjectURL(objectVideoUrlRef.current);
    }
  }, []);

  function replaceEditorVideoBlob(blob: Blob) {
    if (objectVideoUrlRef.current) {
      URL.revokeObjectURL(objectVideoUrlRef.current);
    }

    const url = URL.createObjectURL(blob);
    objectVideoUrlRef.current = url;
    setVideoBlob(blob);
    setVideoUrl(url);
    return url;
  }

  function clearEditMode() {
    setEditingVideoId(null);
    setEditingOriginalVideo(null);
    loadedEditVideoIdRef.current = null;
    if (editVideoId) {
      setSearchParams({}, { replace: true });
    }
  }

  function prepareVideoForEditor(blob: Blob, options?: { title?: string; video?: AppVideo }) {
    const url = replaceEditorVideoBlob(blob);
    const video = options?.video;

    if (options?.title !== undefined) {
      setVideoTitle(options.title);
    }

    if (video) {
      setEditingVideoId(video.id);
      setEditingOriginalVideo(video);
      setSelectedEventId(video.eventId && video.eventId !== STANDALONE_EVENT_ID ? video.eventId : '');
      setSelectedTemplateId(video.templateId || '');
      setTemplateOpacity(video.templateOpacity ?? 1);
      setEffect(video.effect || 'clean');
      setMusicTheme(video.musicUrl ? `url:${video.musicUrl}` : video.musicTheme || operatorPreferences.defaultMusicTheme);
    }

    setSourceDuration(0);
    setVideoOrientation(null);
    setTrimStart(0);
    setTrimEnd(duration);
    setPreviewCurrentTime(0);
    setEffectSegmentsDraft([]);
    setActiveEffectSegmentId(null);
    setStep('preview');
    readVideoMetadata(url).then((metadata) => {
      const nextOrientation = videoOrientationFromSize(metadata.width, metadata.height);
      if (nextOrientation) {
        setVideoOrientation(nextOrientation);
        setRecordingOrientation(nextOrientation);
      }
      if (Number.isFinite(metadata.duration) && metadata.duration > 0) {
        setSourceDuration(metadata.duration);
        setTrimEnd(Math.min(metadata.duration, duration));
      }
    }).catch(() => undefined);
  }

  useEffect(() => {
    if (!user || !editVideoId) return;
    if (loadedEditVideoIdRef.current === editVideoId) return;

    let cancelled = false;
    loadedEditVideoIdRef.current = editVideoId;
    setLoadingEditVideo(true);

    getUserVideos(user.uid)
      .then(async (items) => {
        const video = items.find((item) => item.id === editVideoId);
        const sourceUrl = video?.rawVideoUrl || video?.videoUrl;
        if (!video || !sourceUrl || sourceUrl.startsWith('offline://')) {
          throw new Error('VIDEO_EDIT_SOURCE_NOT_FOUND');
        }

        const response = await fetch(sourceUrl, { mode: 'cors', cache: 'no-store' });
        if (!response.ok) throw new Error('VIDEO_EDIT_SOURCE_LOAD_FAILED');
        const blob = await response.blob();
        if (cancelled) return;

        prepareVideoForEditor(blob, {
          title: video.title || '',
          video,
        });
        toast.success('Vídeo carregado para reedicacao.');
      })
      .catch((error) => {
        console.warn('[operator] Edit vídeo load failed:', error);
        if (!cancelled) {
          loadedEditVideoIdRef.current = null;
          setEditingVideoId(null);
          setEditingOriginalVideo(null);
          setSearchParams({}, { replace: true });
          toast.error('Não foi possível abrir este vídeo para editar.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingEditVideo(false);
      });

    return () => {
      cancelled = true;
    };
  }, [editVideoId, setSearchParams, user]);

  async function startCamera() {
    try {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      const stream = await requestCameraStream(recordingOrientation, cameraFacing);
      streamRef.current = stream;
      setCameraFacing(cameraFacingFromStream(stream, cameraFacing));
      setVideoOrientation(recordingOrientation);
      setStep('capture');
    } catch {
      toast.error('Não foi possível abrir a câmera. Verifique a permissão do app ou use o upload manual.');
    }
  }

  async function restartCameraWithOrientation(orientation: VideoOrientation) {
    chooseRecordingOrientation(orientation);
    if (recording) return;
    try {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      const stream = await requestCameraStream(orientation, cameraFacing);
      streamRef.current = stream;
      setCameraFacing(cameraFacingFromStream(stream, cameraFacing));
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => undefined);
      }
      setVideoOrientation(orientation);
    } catch {
      toast.error('Não foi possível trocar o formato da câmera.');
    }
  }

  async function restartCameraWithFacing(facing: CameraFacing) {
    if (recording) return;
    if (step !== 'capture') {
      setCameraFacing(facing);
      return;
    }
    try {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      const stream = await requestCameraStream(recordingOrientation, facing);
      streamRef.current = stream;
      setCameraFacing(cameraFacingFromStream(stream, facing));
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => undefined);
      }
      setVideoOrientation(recordingOrientation);
    } catch {
      toast.error('Não foi possível trocar a câmera.');
    }
  }

  function startCountdown() {
    let c = 3;
    setCountdown(c);
    const interval = setInterval(() => {
      c--;
      setCountdown(c);
      if (c === 0) { clearInterval(interval); setCountdown(0); startRecording(); }
    }, 1000);
  }

  function startRecording() {
    const stream = streamRef.current;
    if (!stream || !stream.getVideoTracks().some((track) => track.readyState === 'live')) {
      toast.error('Câmera indisponível. Abra a câmera novamente.');
      setStep('select');
      return;
    }

    if (typeof MediaRecorder === 'undefined') {
      toast.error('Este navegador não suporta gravação local. Use o upload manual.');
      return;
    }

    chunksRef.current = [];
    const mimeType = getSupportedRecordingMimeType();
    let mr: MediaRecorder;
    try {
      mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    } catch {
      mr = new MediaRecorder(stream);
    }

    mediaRecorderRef.current = mr;
    mr.ondataavailable = e => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    mr.onerror = () => {
      toast.error('Falha ao gravar. Tente novamente ou use o upload manual.');
      setRecording(false);
    };
    mr.onstop = () => {
      if (recordingTimeoutRef.current) {
        window.clearTimeout(recordingTimeoutRef.current);
        recordingTimeoutRef.current = null;
      }
      setRecording(false);
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;

      if (chunksRef.current.length === 0) {
        toast.error('A gravação saiu vazia. Tente novamente ou use o upload manual.');
        setStep('select');
        return;
      }

      const blobType = mr.mimeType || chunksRef.current[0]?.type || mimeType || 'video/webm';
      const blob = new Blob(chunksRef.current, { type: blobType });
      const url = replaceEditorVideoBlob(blob);
      setSourceDuration(duration);
      setTrimStart(0);
      setTrimEnd(duration);
      setPreviewCurrentTime(0);
      setEffectSegmentsDraft([]);
      setActiveEffectSegmentId(null);
      setVideoOrientation(recordingOrientation);
      setStep('preview');
      readVideoMetadata(url).then((metadata) => {
        if (Number.isFinite(metadata.duration) && metadata.duration > 0) {
          setSourceDuration(metadata.duration);
          setTrimEnd(Math.min(metadata.duration, duration));
        }
      }).catch(() => undefined);
    };

    mr.start(1000);
    setRecording(true);
    recordingTimeoutRef.current = window.setTimeout(() => {
      if (mr.state === 'recording') {
        mr.requestData();
        mr.stop();
      }
    }, duration * 1000);
  }

  function handlePreviewMetadata(event: SyntheticEvent<HTMLVideoElement>) {
    const mediaDuration = event.currentTarget.duration;
    if (Number.isFinite(mediaDuration) && mediaDuration > 0) {
      setSourceDuration(mediaDuration);
      setTrimStart(0);
      setTrimEnd(Math.min(mediaDuration, duration));
      setPreviewCurrentTime(0);
    }
    const nextOrientation = videoOrientationFromSize(event.currentTarget.videoWidth, event.currentTarget.videoHeight);
    if (nextOrientation) setVideoOrientation(nextOrientation);
  }

  function handlePreviewTimeUpdate(event: SyntheticEvent<HTMLVideoElement>) {
    const current = event.currentTarget.currentTime;
    setPreviewCurrentTime(current);
    if (current > safeTrimEnd + 0.04) {
      event.currentTarget.pause();
      event.currentTarget.currentTime = safeTrimEnd;
      setPreviewCurrentTime(safeTrimEnd);
    }
  }

  function handleLiveMetadata(event: SyntheticEvent<HTMLVideoElement>) {
    event.currentTarget.dataset.sourceSize = `${event.currentTarget.videoWidth}x${event.currentTarget.videoHeight}`;
    setVideoOrientation(recordingOrientation);
  }

  function seekPreview(time: number) {
    const nextTime = clamp(time, 0, sourceTimelineDuration);
    setPreviewCurrentTime(nextTime);
    if (previewRef.current && Number.isFinite(nextTime)) {
      previewRef.current.currentTime = nextTime;
    }
  }

  function setFinalDurationPreset(seconds: number) {
    setDuration(seconds);
    const nextEnd = clamp(safeTrimStart + seconds, safeTrimStart + MIN_TRIM_SECONDS, sourceTimelineDuration);
    setTrimEnd(nextEnd);
  }

  function chooseRecordingOrientation(orientation: VideoOrientation) {
    setRecordingOrientation(orientation);
    if (step === 'select' || step === 'capture') {
      setVideoOrientation(orientation);
    }
  }

  function updateTrimStart(value: number) {
    const nextStart = clamp(value, 0, Math.max(0, safeTrimEnd - MIN_TRIM_SECONDS));
    setTrimStart(nextStart);
    seekPreview(nextStart);
  }

  function updateTrimEnd(value: number) {
    const nextEnd = clamp(value, safeTrimStart + MIN_TRIM_SECONDS, sourceTimelineDuration);
    setTrimEnd(nextEnd);
    if (previewCurrentTime > nextEnd) seekPreview(nextEnd);
  }

  function markTrimAtCurrent(edge: 'start' | 'end') {
    const current = clamp(previewCurrentTime, 0, sourceTimelineDuration);
    if (edge === 'start') {
      updateTrimStart(Math.min(current, safeTrimEnd - MIN_TRIM_SECONDS));
      return;
    }
    updateTrimEnd(Math.max(current, safeTrimStart + MIN_TRIM_SECONDS));
  }

  function currentTimeInsideCut() {
    return clamp(previewCurrentTime - safeTrimStart, 0, outputDuration);
  }

  function addEffectSegment(effectId = effect !== 'clean' && effect !== 'ai_auto' ? effect : 'cinematic') {
    const id = createEffectSegmentId();
    const segmentSize = clamp(outputDuration * 0.28, MIN_EFFECT_SEGMENT_SECONDS, outputDuration);
    const cursorStart = currentTimeInsideCut();
    const start = clamp(cursorStart, 0, Math.max(0, outputDuration - segmentSize));
    const end = Math.min(outputDuration, start + segmentSize);
    const segment: EffectSegment = { id, effect: effectId, start, end };
    setEffect(effectId);
    setEffectSegmentsDraft((current) => [...current, segment].sort((a, b) => a.start - b.start));
    setActiveEffectSegmentId(id);
    setTimelineExpanded(true);
    return segment;
  }

  function removeEffectSegment(id: string) {
    setEffectSegmentsDraft((current) => current.filter((segment) => segment.id !== id));
    setActiveEffectSegmentId((current) => current === id ? null : current);
  }

  function updateEffectSegmentEffect(id: string, nextEffect: string) {
    if (nextEffect === 'clean' || nextEffect === 'ai_auto') {
      removeEffectSegment(id);
      setEffect(nextEffect);
      return;
    }
    setEffect(nextEffect);
    setEffectSegmentsDraft((current) => current.map((segment) => segment.id === id ? { ...segment, effect: nextEffect } : segment));
    setActiveEffectSegmentId(id);
  }

  function applyEffectSelection(nextEffect: string) {
    if (nextEffect === 'clean') {
      setEffect('clean');
      setEffectSegmentsDraft([]);
      setActiveEffectSegmentId(null);
      return;
    }

    if (nextEffect === 'ai_auto') {
      enableAiAutoEdit();
      return;
    }

    const activeId = activeEffectSegment?.id;
    if (activeId) {
      updateEffectSegmentEffect(activeId, nextEffect);
      return;
    }

    const id = createEffectSegmentId();
    setEffect(nextEffect);
    setEffectSegmentsDraft([{
      id,
      effect: nextEffect,
      start: 0,
      end: outputDuration,
    }]);
    setActiveEffectSegmentId(id);
    setTimelineExpanded(true);
  }

  function updateEffectStart(id: string, value: number) {
    const currentSegment = effectSegments.find((segment) => segment.id === id);
    if (!currentSegment) return;
    const maxStart = Math.max(0, outputDuration - MIN_EFFECT_SEGMENT_SECONDS);
    const nextStart = clamp(value, 0, maxStart);
    setEffectSegmentsDraft((current) => current.map((segment) => segment.id === id
      ? { ...segment, start: nextStart, end: Math.max(segment.end, nextStart + MIN_EFFECT_SEGMENT_SECONDS) }
      : segment));
    setActiveEffectSegmentId(id);
    seekPreview(safeTrimStart + nextStart);
  }

  function updateEffectEnd(id: string, value: number) {
    const currentSegment = effectSegments.find((segment) => segment.id === id);
    if (!currentSegment) return;
    const minEnd = Math.min(outputDuration, currentSegment.start + MIN_EFFECT_SEGMENT_SECONDS);
    const nextEnd = clamp(value, minEnd, outputDuration);
    setEffectSegmentsDraft((current) => current.map((segment) => segment.id === id ? { ...segment, end: nextEnd } : segment));
    setActiveEffectSegmentId(id);
    seekPreview(safeTrimStart + nextEnd);
  }

  function markEffectAtCurrent(edge: 'start' | 'end') {
    if (effect === 'clean' || effect === 'ai_auto') return;
    const segment = activeEffectSegment || addEffectSegment();
    const localTime = currentTimeInsideCut();
    if (edge === 'start') {
      updateEffectStart(segment.id, Math.min(localTime, outputDuration - MIN_EFFECT_SEGMENT_SECONDS));
      return;
    }
    updateEffectEnd(segment.id, Math.max(localTime, segment.start + MIN_EFFECT_SEGMENT_SECONDS));
  }

  function setEffectRangePreset(preset: 'all' | 'intro' | 'center' | 'ending') {
    const segment = activeEffectSegment || addEffectSegment();
    if (preset === 'all') {
      setEffectSegmentsDraft((current) => current.map((item) => item.id === segment.id ? { ...item, start: 0, end: outputDuration } : item));
      setActiveEffectSegmentId(segment.id);
      return;
    }

    const segmentSize = clamp(outputDuration * 0.34, MIN_EFFECT_SEGMENT_SECONDS, Math.max(MIN_EFFECT_SEGMENT_SECONDS, outputDuration));
    const starts = {
      intro: 0,
      center: Math.max(0, (outputDuration - segmentSize) / 2),
      ending: Math.max(0, outputDuration - segmentSize),
    };

    setEffectSegmentsDraft((current) => current.map((item) => item.id === segment.id
      ? { ...item, start: starts[preset], end: Math.min(outputDuration, starts[preset] + segmentSize) }
      : item));
    setActiveEffectSegmentId(segment.id);
    seekPreview(safeTrimStart + starts[preset]);
  }

  function enableAiAutoEdit() {
    if (!canUseAiAuto) {
      toast.error('A edição automática com IA está liberada no plano Ilimitado.');
      return;
    }

    setEffect('ai_auto');
    setMusicTheme('none');
    setEffectSegmentsDraft([]);
    setActiveEffectSegmentId(null);
    toast.success('IA automática ativada. O editor vai escolher efeito e clima sem sobrecarregar o servidor.');
  }

  async function generateAiMusicFromContext() {
    if (!canUseAiAuto) {
      toast.error('Geração de trilha IA está liberada no plano Ilimitado.');
      return;
    }
    if (generatingAiMusic) return;

    const aiDirection = localAiDirection(selectedEvent?.type, selectedTemplate?.category);
    const promptParts = [
      selectedEvent
        ? `Trilha original para evento ${selectedEvent.name}, tipo ${selectedEvent.type}, cliente ${selectedEvent.clientName || 'SIX3'}`
        : 'Trilha original para vídeo avulso de photo booth 360',
      selectedTemplate ? `template visual ${selectedTemplate.name}` : 'sem template definido',
      `efeito de vídeo ${effect === 'ai_auto' ? aiDirection.effect : effect}`,
      `duração final ${outputDuration.toFixed(1)} segundos`,
      'energia moderna, memoravel, pronta para vídeo curto e sem qualquer melodia conhecida',
    ];

    setGeneratingAiMusic(true);
    setAiMusicStatus('Criando prompt musical com IA...');
    try {
      const started = await generateSunoMusic({
        prompt: promptParts.join('. '),
        mode: 'instrumental',
        source: 'ai_auto_edit',
        eventType: selectedEvent?.type,
        templateName: selectedTemplate?.name,
        effect: effect === 'ai_auto' ? aiDirection.effect : effect,
        mood: musicTheme !== 'none' && !selectedMusicUrl ? musicTheme : aiDirection.musicTheme,
        durationSeconds: Math.max(5, Math.round(outputDuration)),
        title: selectedEvent ? `${selectedEvent.name} SIX3` : 'SIX3 Auto Track',
        language: 'pt-BR',
      });

      const taskId = started.taskId || started.generation.taskId;
      setAiMusicStatus('Suno gerando trilha original...');
      const result = await waitForSunoMusic(taskId, (status) => {
        setAiMusicStatus(describeSunoStatus(status));
      });
      const tracks = result.music || [];
      const selectedTrack = tracks.find((track) => track.musicUrl) || tracks[0];
      if (!selectedTrack?.musicUrl) throw new Error('SUNO_MUSIC_NOT_READY');

      setMusicCatalog((current) => [
        ...tracks,
        ...current.filter((track) => !tracks.some((created) => created.id === track.id)),
      ]);
      setMusicTheme(`url:${selectedTrack.musicUrl}`);
      setAiMusicStatus('Trilha IA selecionada.');
      toast.success('Trilha IA gerada, salva e selecionada.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao gerar trilha IA.';
      setAiMusicStatus(message === 'SUNO_GENERATION_STILL_PROCESSING'
        ? 'A Suno ainda está processando. Tente novamente em alguns minutos.'
        : message);
      toast.error(message === 'SUNO_GENERATION_STILL_PROCESSING'
        ? 'A Suno ainda está processando a trilha.'
        : message);
    } finally {
      setGeneratingAiMusic(false);
    }
  }

  function handleToggleTemplateFavorite(id: string) {
    const next = toggleMediaFavorite('template', id, user?.uid);
    setFavorites(next);
    toast.success(isMediaFavorite('template', id, next) ? 'Template favoritado.' : 'Template removido dos favoritos.');
  }

  function handleToggleSelectedMusicFavorite() {
    if (!selectedMusicTrack) return;
    const next = toggleMediaFavorite('music', selectedMusicTrack.id, user?.uid);
    setFavorites(next);
    toast.success(isMediaFavorite('music', selectedMusicTrack.id, next) ? 'Música favoritada.' : 'Música removida dos favoritos.');
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    clearEditMode();
    prepareVideoForEditor(file, {
      title: videoTitle.trim() || titleFromFileName(file.name),
    });
  }

  async function handleProcess() {
    if (!videoBlob || !user) return;
    if (!canUseEffect) {
      toast.error('Esse efeito não está liberado no seu plano.');
      return;
    }
    if (!canUseTemplate) {
      toast.error('Esse template esta bloqueado no seu plano.');
      return;
    }

    setStep('processing');
    setProgress(2);
    try {
      if (!canRenderVideoInBrowser()) {
        throw new Error('Seu navegador não suporta o editor local. Atualize o navegador e tente novamente.');
      }

      const aiDirection = localAiDirection(selectedEvent?.type, selectedTemplate?.category);
      const browserEffect = processingBaseEffect === 'ai_auto'
        ? aiDirection.effect
        : processingBaseEffect;
      const rendererMusicTheme = processingMusicUrl
        ? undefined
        : effect === 'ai_auto'
          ? aiDirection.musicTheme
          : musicTheme;

      setProcessingLabel(effect === 'ai_auto'
        ? 'Editando com IA local: efeito, template e trilha...'
        : 'Editando vídeo no navegador...');

      const templateAssets = templateRenderAssets(selectedTemplate);
      const renderedBlob = await renderVideoInBrowser({
        input: videoBlob,
        durationSeconds: outputDuration,
        trimStartSeconds: safeTrimStart,
        trimEndSeconds: safeTrimEnd,
        overlayUrl: templateAssets.overlayUrl,
        animationUrl: templateAssets.animationUrl,
        fallbackOverlayUrl: templateAssets.fallbackOverlayUrl,
        overlayOpacity: selectedTemplate ? templateOpacity : undefined,
        outputOrientation: videoOrientation || recordingOrientation,
        effect: browserEffect,
        effectSegments: effectSegments.length > 0 ? effectSegments.map(({ effect: segmentEffect, start, end }) => ({
          effect: segmentEffect,
          start,
          end,
        })) : undefined,
        musicUrl: processingMusicUrl,
        musicTheme: rendererMusicTheme,
        mixSettings: mix.settings,
        onProgress: (pct) => setProgress(Math.min(70, 2 + Math.round(pct * 0.68))),
      });

      setProgress(72);
      setProcessingLabel('Enviando vídeo editado para a nuvem...');
      const uploaded = await uploadVideoToServer(renderedVideoFile(renderedBlob), (pct) => {
        setProgress(Math.min(94, 72 + Math.round(pct * 0.22)));
      });

      setProcessingLabel(editingVideoId ? 'Atualizando vídeo...' : 'Publicando vídeo...');
      const savedFields = {
        title: resolvedVideoTitle,
        storagePath: uploaded.storagePath,
        videoUrl: uploaded.videoUrl || '',
        rawVideoUrl: editingOriginalVideo?.rawVideoUrl || editingOriginalVideo?.videoUrl,
        status: 'published' as const,
        visibility: editingOriginalVideo?.visibility || 'public' as const,
        size: renderedBlob.size, format: renderedBlob.type || 'video/webm',
        templateId: selectedTemplateId || undefined,
        templateStoragePath: selectedTemplate?.storagePath,
        templateType: selectedTemplate ? (selectedTemplate.templateType || selectedTemplate.type || (selectedTemplate.animationUrl ? 'animated' : 'static')) : undefined,
        templateOpacity: selectedTemplate ? templateOpacity : undefined,
        effect,
        musicTheme: effect === 'ai_auto' && musicTheme === 'none' ? aiDirection.musicTheme : storedMusicTheme,
        musicUrl: processingMusicUrl,
        duration: outputDuration,
      };

      let publishedVideoId = editingVideoId || '';

      if (editingVideoId) {
        await updateVideo(editingVideoId, savedFields);
        publishedVideoId = editingVideoId;
        setSavedVideoId(editingVideoId);
      } else {
        const video = await createVideo({
          eventId: selectedEventId || STANDALONE_EVENT_ID, ownerId: user.uid, operatorId: user.uid,
          ...savedFields,
          rawVideoUrl: undefined,
          views: 0, downloads: 0, shares: 0,
        });
        publishedVideoId = video.id;
        setSavedVideoId(video.id);
      }

      setProgress(100);
      setStep('done');
      if (uploaded.status === 'pending_offline' || publishedVideoId.startsWith('local_')) {
        toast.info('Vídeo salvo neste dispositivo. Ele será enviado quando a internet voltar.');
      } else if (editingVideoId) {
        toast.success('Vídeo atualizado.');
      } else {
        toast.success('Vídeo editado no navegador e publicado sem sobrecarregar o servidor.');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao processar vídeo.');
      setStep('preview');
    }
  }

  function reset() {
    if (recordingTimeoutRef.current) {
      window.clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
    mediaRecorderRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (objectVideoUrlRef.current) {
      URL.revokeObjectURL(objectVideoUrlRef.current);
      objectVideoUrlRef.current = null;
    }
    setVideoTitle('');
    setEditingVideoId(null);
    setEditingOriginalVideo(null);
    loadedEditVideoIdRef.current = null;
    if (editVideoId) {
      setSearchParams({}, { replace: true });
    }
    setVideoBlob(null);
    setVideoUrl('');
    setVideoOrientation(null);
    setTrimStart(0);
    setTrimEnd(duration);
    setPreviewCurrentTime(0);
    setEffectSegmentsDraft([]);
    setActiveEffectSegmentId(null);
    setSavedVideoId('');
    setProgress(0);
    setProcessingLabel('Preparando vídeo...');
    setStep('select');
  }

  const publicUrl = savedVideoId
    ? selectedEvent
      ? `${window.location.origin}/g/${selectedEvent.slug}/${savedVideoId}`
      : `${window.location.origin}/v/${savedVideoId}`
    : '';

  return (
    <div className="mx-auto max-w-6xl space-y-4 sm:space-y-5">
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-white sm:text-2xl">Gravar</h1>
        <p className="hidden text-sm text-white/40 sm:block">Grave, edite com IA e publique vídeos 360 sem sobrecarregar o servidor</p>
      </div>

      {(loadingEditVideo || (editingVideoId && step !== 'done')) && (
        <div className="flex items-center gap-3 rounded-2xl border border-brand-300/20 bg-brand-500/10 px-4 py-3 text-sm text-brand-100">
          {loadingEditVideo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
          <span>{loadingEditVideo ? 'Carregando vídeo para editar...' : 'Reeditando vídeo existente. Ao atualizar, ele continua no mesmo item da lista.'}</span>
        </div>
      )}

      {step === 'select' && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid gap-3 sm:gap-4 lg:grid-cols-[1fr_0.82fr]">
          <div className="space-y-4 rounded-2xl border border-white/[0.08] bg-gradient-glass p-4 sm:space-y-5 sm:p-6">
            <Input
              label="Nome do vídeo"
              value={videoTitle}
              onChange={(event) => setVideoTitle(event.target.value)}
              maxLength={90}
              placeholder={defaultVideoTitle}
            />
            <Select label="Evento vinculado" options={eventOptions} value={selectedEventId}
              onChange={e => setSelectedEventId(e.target.value)} />
            <div className="space-y-2">
              <p className="text-sm font-semibold text-white">Formato da gravação</p>
              <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-black/20 p-1">
                {(['portrait', 'landscape'] as const).map((orientation) => (
                  <button
                    key={orientation}
                    type="button"
                    onClick={() => chooseRecordingOrientation(orientation)}
                    className={`min-h-11 rounded-xl px-3 text-sm font-bold transition ${
                      recordingOrientation === orientation
                        ? 'bg-brand-500 text-white shadow-glow'
                        : 'text-white/55 hover:bg-white/[0.07] hover:text-white'
                    }`}
                  >
                    {orientation === 'portrait' ? 'Retrato 9:16' : 'Paisagem 16:9'}
                  </button>
                ))}
              </div>
              <p className="text-xs text-white/40">
                No iOS/Android, escolha aqui antes de abrir a câmera para gravar em pé ou deitado.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-white">Câmera</p>
              <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-black/20 p-1">
                {(['user', 'environment'] as const).map((facing) => (
                  <button
                    key={facing}
                    type="button"
                    onClick={() => setCameraFacing(facing)}
                    className={`min-h-11 rounded-xl px-3 text-sm font-bold transition ${
                      cameraFacing === facing
                        ? 'bg-brand-500 text-white shadow-glow'
                        : 'text-white/55 hover:bg-white/[0.07] hover:text-white'
                    }`}
                  >
                    {cameraFacingLabel(facing)}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <button
                type="button"
                onClick={startCamera}
                className="group flex h-24 flex-col items-center justify-center gap-2 rounded-[24px] border border-brand-300/35 bg-gradient-brand text-white shadow-glow transition-all hover:scale-[1.01] hover:border-white/20 active:scale-[0.99] sm:h-28"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/12 ring-1 ring-white/12 transition-all group-hover:bg-white/18">
                  <Camera className="h-5 w-5" />
                </span>
                <span className="text-sm font-bold sm:text-base">Gravar</span>
              </button>
              <label className="group flex h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-[24px] border border-white/10 bg-white/[0.045] text-white transition-all hover:scale-[1.01] hover:border-white/18 hover:bg-white/[0.075] active:scale-[0.99] sm:h-28">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.07] text-white/70 ring-1 ring-white/10 transition-all group-hover:text-white">
                  <Upload className="h-5 w-5" />
                </span>
                <span className="text-sm font-bold sm:text-base">Enviar</span>
                <input type="file" accept="video/*" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4 sm:space-y-4 sm:p-5">
            <div className="flex items-center gap-2 text-white font-semibold">
              <Wand2 className="w-4 h-4 text-brand-300" />
              Edição do vídeo
            </div>
            <button
              type="button"
              onClick={enableAiAutoEdit}
              className={`group flex min-h-[58px] w-full touch-manipulation items-center gap-3 rounded-2xl border p-3 text-left transition-all ${
                aiAutoSelected
                  ? 'border-brand-300/55 bg-brand-500/18 shadow-glow'
                  : canUseAiAuto
                    ? 'border-white/10 bg-white/[0.045] hover:border-brand-300/35 hover:bg-white/[0.07]'
                    : 'border-white/10 bg-white/[0.035] opacity-70'
              }`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-brand text-white ring-1 ring-white/15">
                <Sparkles className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-white">Edição automática com IA</span>
                <span className="hidden text-xs leading-relaxed text-white/42 sm:block">
                  Escolhe efeito e clima no navegador para publicar sem derrubar o backend.
                </span>
              </span>
              {!canUseAiAuto && <Lock className="h-4 w-4 shrink-0 text-white/35" />}
            </button>
            <TemplatePicker
              templates={filteredTemplates}
              selectedId={selectedTemplateId}
              onChange={setSelectedTemplateId}
              videoOrientation={templateOrientation}
              favoriteTemplateIds={favoriteTemplateIds}
              onToggleFavorite={handleToggleTemplateFavorite}
            />
            <TemplateFineControls
              template={selectedTemplate}
              opacity={templateOpacity}
              onOpacityChange={setTemplateOpacity}
              onRemove={() => setSelectedTemplateId('')}
            />
            <EffectSelector
              value={effect}
              onChange={applyEffectSelection}
              isEffectLocked={isEffectLocked}
              compact
              onApply={(selected) => toast.success(`${selected.name} aplicado ao editor.`)}
            />
            <div className="space-y-2">
              <Select label="Trilha" options={resolvedMusicOptions} value={musicTheme} onChange={e => setMusicTheme(e.target.value)} />
              {selectedMusicTrack && (
                <button
                  type="button"
                  onClick={handleToggleSelectedMusicFavorite}
                  className={`inline-flex h-9 items-center gap-2 rounded-full border px-3 text-xs font-bold transition-all ${
                    selectedMusicFavorite
                      ? 'border-amber-300/35 bg-amber-400/12 text-amber-100'
                      : 'border-white/10 bg-white/[0.045] text-white/52 hover:border-amber-300/25 hover:text-amber-100'
                  }`}
                >
                  <Star className="h-4 w-4" fill={selectedMusicFavorite ? 'currentColor' : 'none'} />
                  {selectedMusicFavorite ? 'Trilha favorita' : 'Favoritar trilha'}
                </button>
              )}
            </div>
            <Button
              variant="secondary"
              size="sm"
              loading={generatingAiMusic}
              disabled={!canUseAiAuto}
              onClick={generateAiMusicFromContext}
              icon={<Music2 className="h-4 w-4" />}
              className="w-full justify-center"
            >
              Gerar trilha IA
            </Button>
            {aiMusicStatus && (
              <p className="rounded-xl border border-brand-300/20 bg-brand-500/10 px-3 py-2 text-xs text-brand-100">
                {aiMusicStatus}
              </p>
            )}
            {(!canUseEffect || !canUseTemplate) && (
              <div className="flex gap-2 rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-xs text-amber-100">
                <Lock className="w-4 h-4 shrink-0" />
                Recurso bloqueado pelo plano atual. O backend também válida antes de publicar.
              </div>
            )}
            <div className="hidden gap-4 border-t border-white/[0.08] pt-4 sm:grid sm:grid-cols-[180px_minmax(0,1fr)]">
              <VideoPreviewFrame template={selectedTemplate} templateOpacity={templateOpacity} effect={previewEffect} label="Preview" className={templatePreviewClass} />
              <div className="min-w-0 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Sparkles className="h-4 w-4 text-brand-300" />
                    {effectMeta?.name || 'Efeito'}
                  </div>
                  <p className="text-sm leading-relaxed text-white/50">{effectDescription}</p>
                  <p className="text-xs text-white/30">{selectedTemplate?.name || 'Sem template transparente'}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Clock className="h-4 w-4 text-brand-300" />
                    Duração final
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {DURATION_OPTIONS.map((seconds) => (
                      <button
                        key={seconds}
                        type="button"
                        onClick={() => setDuration(seconds)}
                        className={`h-10 rounded-full border text-sm font-bold transition-all ${
                          duration === seconds
                            ? 'border-brand-300/70 bg-brand-500/25 text-white shadow-glow'
                            : 'border-white/10 bg-white/[0.045] text-white/60 hover:border-white/20 hover:text-white'
                        }`}
                      >
                        {seconds}s
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Volume2 className="h-4 w-4 text-brand-300" />
                    Previa da música
                  </div>
                  {musicPreviewUrl ? (
                    <audio src={musicPreviewUrl} controls preload="metadata" className="h-10 w-full" />
                  ) : (
                    <p className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/40">
                      {musicTheme === 'none' ? 'Sem trilha selecionada.' : 'Essa trilha será aplicada no editor local.'}
                    </p>
                  )}
                </div>

                <MusicVolumeControls mix={mix} />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {step === 'capture' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid lg:grid-cols-[minmax(320px,520px)_1fr] gap-4">
          <div className="space-y-4">
            <div className="relative">
              <VideoPreviewFrame template={selectedTemplate} templateOpacity={templateOpacity} effect={previewEffect} label="Ao vivo" className={livePreviewFrameClass}>
                <video ref={videoRef} autoPlay muted playsInline onLoadedMetadata={handleLiveMetadata} className="h-full w-full object-contain" />
              </VideoPreviewFrame>
              {countdown > 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.span key={countdown} initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="text-8xl font-black text-white drop-shadow-2xl">{countdown}</motion.span>
                </div>
              )}
              {recording && (
                <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500/20 border border-red-500/30 rounded-full px-3 py-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs text-red-400 font-medium">Gravando</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-1">
              {(['portrait', 'landscape'] as const).map((orientation) => (
                <button
                  key={orientation}
                  type="button"
                  disabled={recording}
                  onClick={() => restartCameraWithOrientation(orientation)}
                  className={`min-h-10 rounded-xl px-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-55 ${
                    recordingOrientation === orientation
                      ? 'bg-brand-500 text-white'
                      : 'text-white/55 hover:bg-white/[0.07] hover:text-white'
                  }`}
                >
                  {orientation === 'portrait' ? 'Retrato' : 'Paisagem'}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-1">
              {(['user', 'environment'] as const).map((facing) => (
                <button
                  key={facing}
                  type="button"
                  disabled={recording}
                  onClick={() => restartCameraWithFacing(facing)}
                  className={`min-h-10 rounded-xl px-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-55 ${
                    cameraFacing === facing
                      ? 'bg-brand-500 text-white'
                      : 'text-white/55 hover:bg-white/[0.07] hover:text-white'
                  }`}
                >
                  {cameraFacingLabel(facing)}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <Select label="" options={durationOptions}
                value={String(duration)} onChange={e => setDuration(Number(e.target.value))} className="w-24" />
              <Button className="flex-1 justify-center" size="xl" onClick={startCountdown} disabled={recording}
                icon={<Video className="w-5 h-5" />}>
                {recording ? 'Gravando...' : 'Iniciar gravação'}
              </Button>
            </div>
            <Button variant="ghost" className="w-full justify-center" onClick={() => {
              if (recordingTimeoutRef.current) {
                window.clearTimeout(recordingTimeoutRef.current);
                recordingTimeoutRef.current = null;
              }
              mediaRecorderRef.current = null;
              streamRef.current?.getTracks().forEach(t => t.stop());
              streamRef.current = null;
              setVideoOrientation(null);
              setRecording(false);
              setStep('select');
            }}>
              Cancelar
            </Button>
          </div>

          <details className="group rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4 lg:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-white">
              <span className="flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-brand-300" />
                Configuração aplicada
              </span>
              <ChevronDown className="h-4 w-4 text-white/45 transition-transform group-open:rotate-180" />
            </summary>
            <div className="mt-3 space-y-2 border-t border-white/[0.06] pt-3">
              <p className="text-sm text-white/50">{selectedTemplate?.name || 'Sem overlay'}</p>
              <p className="text-sm text-white/50">{effectMeta?.name || effect}</p>
              <p className="flex items-center gap-2 text-sm text-white/50"><Clock className="h-4 w-4" />{duration} segundos</p>
              <p className="flex items-center gap-2 text-sm text-white/50"><Music2 className="h-4 w-4" />{selectedMusicLabel}</p>
              {musicPreviewUrl && <audio src={musicPreviewUrl} controls preload="metadata" className="h-10 w-full" />}
            </div>
          </details>

          <div className="hidden h-fit space-y-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 lg:block">
            <p className="text-sm font-semibold text-white">Configuração aplicada</p>
            <p className="text-sm text-white/50">{selectedTemplate?.name || 'Sem overlay'}</p>
            <p className="text-sm text-white/50">{effectMeta?.name || effect}</p>
            <p className="flex items-center gap-2 text-sm text-white/50"><Clock className="h-4 w-4" />{duration} segundos</p>
            <p className="flex items-center gap-2 text-sm text-white/50"><Music2 className="h-4 w-4" />{selectedMusicLabel}</p>
            {musicPreviewUrl && <audio src={musicPreviewUrl} controls preload="metadata" className="h-10 w-full" />}
          </div>
        </motion.div>
      )}

      {step === 'preview' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="grid items-start gap-4 lg:grid-cols-[1fr_300px]">
            <VideoPreviewFrame template={selectedTemplate} templateOpacity={templateOpacity} effect={editorPreviewEffect} label="Editor" className={videoPreviewFrameClass}>
              <video
                ref={previewRef}
                src={videoUrl}
                controls
                playsInline
                preload="metadata"
                onLoadedMetadata={handlePreviewMetadata}
                onTimeUpdate={handlePreviewTimeUpdate}
                onSeeked={handlePreviewTimeUpdate}
                className="h-full w-full object-contain"
              />
            </VideoPreviewFrame>

            <div className="grid grid-cols-2 gap-3 lg:hidden">
              <Button variant="secondary" onClick={reset} icon={<RefreshCw className="h-4 w-4" />}>Refazer</Button>
              <Button onClick={handleProcess} icon={<Check className="h-4 w-4" />}>{processActionLabel}</Button>
            </div>

            <div className="grid grid-cols-2 gap-1 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-1 lg:hidden">
              <button
                type="button"
                onClick={() => setMobileEditorTab('controls')}
                className={`flex h-11 items-center justify-center gap-2 rounded-xl text-xs font-bold transition-all ${
                  mobileEditorTab === 'controls'
                    ? 'bg-brand-500/20 text-brand-100 ring-1 ring-brand-300/25'
                    : 'text-white/42 hover:bg-white/[0.05] hover:text-white/75'
                }`}
              >
                <Wand2 className="h-4 w-4" />
                Ajustes
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileEditorTab('timeline');
                  setTimelineExpanded(true);
                }}
                className={`flex h-11 items-center justify-center gap-2 rounded-xl text-xs font-bold transition-all ${
                  mobileEditorTab === 'timeline'
                    ? 'bg-brand-500/20 text-brand-100 ring-1 ring-brand-300/25'
                    : 'text-white/42 hover:bg-white/[0.05] hover:text-white/75'
                }`}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Timeline
              </button>
            </div>

            {/* Sidebar — sticky, scrollable */}
            <div className={`${mobileEditorTab === 'controls' ? 'flex' : 'hidden'} flex-col gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4 lg:sticky lg:top-4 lg:flex lg:max-h-[calc(100vh-100px)] lg:overflow-y-auto`}>
              {/* Header */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <Wand2 className="h-4 w-4 text-brand-300" />
                  Editor
                </div>
                <span className="rounded-full border border-brand-300/30 bg-brand-500/14 px-2.5 py-1 text-xs font-bold text-brand-100">
                  {formatPreciseTime(outputDuration)}
                </span>
              </div>

              <Input
                label="Nome do vídeo"
                value={videoTitle}
                onChange={(event) => setVideoTitle(event.target.value)}
                maxLength={90}
                placeholder={defaultVideoTitle}
              />

              {/* IA auto edit */}
              <button
                type="button"
                onClick={enableAiAutoEdit}
                className={`flex items-center gap-2.5 rounded-2xl border p-3 text-left transition-all ${
                  aiAutoSelected
                    ? 'border-brand-300/55 bg-brand-500/18 shadow-glow'
                    : canUseAiAuto
                      ? 'border-white/10 bg-white/[0.045] hover:border-brand-300/35 hover:bg-white/[0.07]'
                      : 'border-white/10 bg-white/[0.035] opacity-60'
                }`}
              >
                <Sparkles className="h-4 w-4 shrink-0 text-brand-200" />
                <span className="min-w-0 flex-1 text-sm font-bold text-white">IA auto edit</span>
                {!canUseAiAuto && <Lock className="h-4 w-4 shrink-0 text-white/35" />}
              </button>

              {/* Template */}
              <TemplatePicker
                templates={filteredTemplates}
                selectedId={selectedTemplateId}
                onChange={setSelectedTemplateId}
                videoOrientation={templateOrientation}
                favoriteTemplateIds={favoriteTemplateIds}
                onToggleFavorite={handleToggleTemplateFavorite}
              />
              <TemplateFineControls
                template={selectedTemplate}
                opacity={templateOpacity}
                onOpacityChange={setTemplateOpacity}
                onRemove={() => setSelectedTemplateId('')}
              />

              {/* Effect — minimal: only dropdown, no detail panel */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-white/52">Efeito</p>
                <EffectSelector
                  value={effect}
                  onChange={applyEffectSelection}
                  isEffectLocked={isEffectLocked}
                  compact
                  minimal
                  onApply={(selected) => toast.success(`${selected.name} aplicado.`)}
                />
              </div>

              <div className="space-y-2 rounded-2xl border border-white/[0.08] bg-black/15 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-white/52">Efeitos no vídeo</p>
                  <button
                    type="button"
                    onClick={() => addEffectSegment()}
                    disabled={effect === 'ai_auto'}
                    className="rounded-full border border-brand-300/25 bg-brand-500/15 px-2.5 py-1 text-[11px] font-bold text-brand-100 transition hover:bg-brand-500/25 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    + Adicionar
                  </button>
                </div>

                {effect === 'ai_auto' ? (
                  <p className="rounded-xl border border-brand-300/18 bg-brand-500/10 px-3 py-2 text-xs text-brand-100/75">
                    A IA automática controla os efeitos neste modo.
                  </p>
                ) : effectSegments.length === 0 ? (
                  <p className="rounded-xl border border-white/8 bg-white/[0.035] px-3 py-2 text-xs text-white/38">
                    Selecione um efeito ou toque em adicionar para criar um trecho.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {effectSegments.map((segment, index) => (
                      <div
                        key={segment.id}
                        className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 ${
                          activeEffectSegment?.id === segment.id
                            ? 'border-fuchsia-300/35 bg-fuchsia-500/12'
                            : 'border-white/8 bg-white/[0.035]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setActiveEffectSegmentId(segment.id);
                            setEffect(segment.effect);
                            seekPreview(safeTrimStart + segment.start);
                            setTimelineExpanded(true);
                          }}
                          className="min-w-0 flex-1 text-left"
                        >
                          <span className="block truncate text-xs font-bold text-white">{index + 1}. {effectLabel(segment.effect)}</span>
                          <span className="block text-[11px] text-white/38">
                            {formatPreciseTime(segment.start)} - {formatPreciseTime(segment.end)}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => removeEffectSegment(segment.id)}
                          className="rounded-lg p-1.5 text-white/35 transition hover:bg-white/8 hover:text-rose-200"
                          title="Remover efeito"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {activeEffectSegment && effect !== 'ai_auto' && (
                  <div className="space-y-2 border-t border-white/[0.06] pt-2">
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        ['all', 'Tudo'],
                        ['intro', 'Início'],
                        ['center', 'Meio'],
                        ['ending', 'Fim'],
                      ].map(([preset, label]) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setEffectRangePreset(preset as 'all' | 'intro' | 'center' | 'ending')}
                          className="h-8 rounded-lg border border-white/8 bg-white/[0.04] text-[11px] font-bold text-white/55 transition hover:border-brand-300/25 hover:text-white"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => markEffectAtCurrent('start')}
                        className="h-8 rounded-lg border border-white/8 bg-white/[0.04] text-[11px] font-bold text-white/55 transition hover:border-brand-300/25 hover:text-white"
                      >
                        Início aqui
                      </button>
                      <button
                        type="button"
                        onClick={() => markEffectAtCurrent('end')}
                        className="h-8 rounded-lg border border-white/8 bg-white/[0.04] text-[11px] font-bold text-white/55 transition hover:border-brand-300/25 hover:text-white"
                      >
                        Fim aqui
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Music */}
              <div className="space-y-2">
                <Select label="Trilha sonora" options={resolvedMusicOptions} value={musicTheme}
                  onChange={e => setMusicTheme(e.target.value)} />
                {selectedMusicTrack && (
                  <button
                    type="button"
                    onClick={handleToggleSelectedMusicFavorite}
                    className={`inline-flex h-9 w-full items-center justify-center gap-2 rounded-full border px-3 text-xs font-bold transition-all ${
                      selectedMusicFavorite
                        ? 'border-amber-300/35 bg-amber-400/12 text-amber-100'
                        : 'border-white/10 bg-white/[0.045] text-white/52 hover:border-amber-300/25 hover:text-amber-100'
                    }`}
                  >
                    <Star className="h-4 w-4" fill={selectedMusicFavorite ? 'currentColor' : 'none'} />
                    {selectedMusicFavorite ? 'Trilha favorita' : 'Favoritar trilha'}
                  </button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  loading={generatingAiMusic}
                  disabled={!canUseAiAuto}
                  onClick={generateAiMusicFromContext}
                  icon={<Music2 className="h-4 w-4" />}
                  className="w-full justify-center"
                >
                  Gerar trilha IA
                </Button>
              </div>

              {aiMusicStatus && (
                <p className="rounded-xl border border-brand-300/20 bg-brand-500/10 px-3 py-2 text-xs text-brand-100">
                  {aiMusicStatus}
                </p>
              )}

              {/* Duration */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-white/52">Duração final</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {DURATION_OPTIONS.map((seconds) => (
                    <button
                      key={seconds}
                      type="button"
                      onClick={() => setFinalDurationPreset(seconds)}
                      className={`h-9 rounded-full border text-xs font-bold transition-all ${
                        duration === seconds
                          ? 'border-brand-300/70 bg-brand-500/25 text-white shadow-glow'
                          : 'border-white/10 bg-white/[0.045] text-white/58 hover:border-white/20 hover:text-white'
                      }`}
                    >
                      {seconds}s
                    </button>
                  ))}
                </div>
              </div>

              {musicPreviewUrl && (
                <audio src={musicPreviewUrl} controls preload="metadata" className="h-9 w-full" />
              )}

              {(!canUseEffect || !canUseTemplate) && (
                <div className="flex gap-2 rounded-xl border border-amber-400/20 bg-amber-400/10 p-2.5 text-xs text-amber-100">
                  <Lock className="h-3.5 w-3.5 mt-px shrink-0" />
                  Recurso bloqueado pelo plano.
                </div>
              )}

              {/* Actions */}
              <div className="hidden grid-cols-2 gap-3 pt-1 lg:grid">
                <Button variant="secondary" onClick={reset} icon={<RefreshCw className="w-4 h-4" />}>Refazer</Button>
                <Button onClick={handleProcess} icon={<Check className="w-4 h-4" />}>{processActionLabel}</Button>
              </div>
            </div>
          </div>

          <div className={`${mobileEditorTab === 'timeline' ? 'block' : 'hidden'} lg:block`}>
            <div className="mb-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-2 lg:hidden">
              <button
                type="button"
                onClick={() => setTimelineExpanded((expanded) => !expanded)}
                className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3 text-left text-sm font-bold text-white"
              >
                <span className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-brand-300" />
                  Timeline
                </span>
                <span className="flex items-center gap-2 text-xs text-white/42">
                  {formatPreciseTime(outputDuration)}
                  <ChevronDown className={`h-4 w-4 transition-transform ${timelineExpanded ? 'rotate-180' : ''}`} />
                </span>
              </button>
            </div>

            <div className={`${timelineExpanded ? 'block' : 'hidden'} lg:block`}>
              <EditorTimeline
                sourceDuration={sourceDuration}
                outputDuration={outputDuration}
                trimStart={safeTrimStart}
                trimEnd={safeTrimEnd}
                currentTime={previewCurrentTime}
                templateName={selectedTemplate?.name}
                musicLabel={selectedMusicLabel}
                effect={effect}
                effectSegments={effectSegments}
                selectedEffectSegmentId={activeEffectSegment?.id}
                onSeek={seekPreview}
                onTrimStartChange={updateTrimStart}
                onTrimEndChange={updateTrimEnd}
                onEffectSegmentStartChange={updateEffectStart}
                onEffectSegmentEndChange={updateEffectEnd}
                onEffectSegmentSelect={setActiveEffectSegmentId}
                onEffectSegmentEffectChange={updateEffectSegmentEffect}
                templateOptions={templateOptions}
                selectedTemplateId={selectedTemplateId}
                onTemplateChange={setSelectedTemplateId}
                onEffectChange={applyEffectSelection}
                resolvedMusicOptions={resolvedMusicOptions}
                selectedMusicValue={musicTheme}
                onMusicChange={setMusicTheme}
              />
            </div>
          </div>
        </motion.div>
      )}

      {step === 'processing' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="bg-gradient-glass border border-white/[0.08] rounded-2xl p-8 flex flex-col items-center gap-4 max-w-xl mx-auto">
          <Loader2 className="w-12 h-12 text-brand-400 animate-spin" />
          <p className="text-white font-medium">{processingLabel}</p>
          <div className="w-full bg-white/10 rounded-full h-2">
            <div className="bg-gradient-brand h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-white/40 text-sm">{progress}%</p>
        </motion.div>
      )}

      {step === 'done' && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-glass border border-green-500/20 rounded-2xl p-8 flex flex-col items-center gap-5 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center">
            <Check className="w-8 h-8 text-green-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{editingVideoId ? 'Vídeo atualizado!' : 'Vídeo publicado!'}</h2>
            <p className="text-white/50 text-sm mt-1">{selectedEvent ? 'Compartilhe o QR Code com o cliente' : 'Vídeo avulso pronto para compartilhar'}</p>
          </div>
          {publicUrl && (
            <div className="bg-white p-4 rounded-xl">
              <QRCodeSVG value={publicUrl} size={200} />
            </div>
          )}
          {publicUrl && <p className="text-xs text-white/30 break-all">{publicUrl}</p>}
          <div className="grid w-full gap-3 sm:grid-cols-3">
            <Button className="justify-center" disabled={!publicUrl} onClick={() => publicUrl && window.open(publicUrl, '_blank', 'noopener,noreferrer')}
              icon={<Eye className="w-4 h-4" />}>
              Ver vídeo
            </Button>
            <Button variant="secondary" className="flex-1 justify-center" onClick={reset} icon={<RefreshCw className="w-4 h-4" />}>
              Novo vídeo
            </Button>
            <Button className="flex-1 justify-center" disabled={!publicUrl} onClick={() => navigator.share?.({ url: publicUrl, title: resolvedVideoTitle })}
              icon={<Share2 className="w-4 h-4" />}>
              Compartilhar
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
