import { useState, useRef, useEffect, useMemo, type CSSProperties, type ReactNode, type SyntheticEvent } from 'react';
import { motion } from 'framer-motion';
import { Camera, Upload, RefreshCw, Check, QrCode, Share2, Video, Loader2, Lock, Wand2, Music2, Eye, Clock, Volume2, Sparkles, Film, Layers, SlidersHorizontal } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { toast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { getUserEvents } from '@/services/eventService';
import { createVideo } from '@/services/videoService';
import { getTemplates, seedTemplates } from '@/services/templateService';
import { getUserMusic } from '@/services/musicService';
import { uploadVideoToServer, getGeneratedMusic } from '@/services/serverMediaService';
import { canRenderVideoInBrowser, renderVideoInBrowser } from '@/services/browserVideoRenderer';
import { getOperatorPreferences } from '@/services/appPreferences';
import { VIDEO_EFFECTS, hasFeature } from '@/config/plans';
import type { AppEvent, AppMusic, AppTemplate } from '@/types';

type Step = 'select' | 'capture' | 'preview' | 'processing' | 'done';

type EffectSegment = {
  id: string;
  effect: string;
  start: number;
  end: number;
};

const STANDALONE_EVENT_ID = 'standalone';
const MIN_EFFECT_SEGMENT_SECONDS = 0.5;

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

const effectPreviewText: Record<string, string> = {
  clean: 'Contraste leve e cores mais vivas.',
  slow_motion: 'Movimento suavizado para entradas e giros.',
  boomerang: 'Vai e volta para clipes curtos e virais.',
  speed_ramp: 'Acelera o giro para mais impacto.',
  cinematic: 'Contraste, nitidez e acabamento de filme.',
  neon: 'Cores intensas com brilho moderno.',
  party: 'Saturacao alta e clima de festa.',
  luxury: 'Tons mais quentes e acabamento premium.',
  glitch_flash: 'Flash e falhas rapidas para impacto.',
  wedding_soft: 'Visual suave para eventos delicados.',
  corporate_sharp: 'Nitidez limpa para marcas e empresas.',
  ai_auto: 'A automacao escolhe corte, efeito e clima no navegador.',
};

const effectPreviewFilters: Record<string, string> = {
  clean: 'contrast(1.05) saturate(1.08) brightness(1.01)',
  slow_motion: 'contrast(1.04) saturate(1.08)',
  boomerang: 'contrast(1.08) saturate(1.12)',
  speed_ramp: 'contrast(1.1) saturate(1.18)',
  cinematic: 'contrast(1.12) saturate(0.95) brightness(0.94)',
  neon: 'contrast(1.18) saturate(1.55) hue-rotate(8deg)',
  party: 'contrast(1.12) saturate(1.35)',
  luxury: 'contrast(1.08) saturate(1.05) sepia(0.12)',
  glitch_flash: 'contrast(1.25) saturate(1.35)',
  wedding_soft: 'contrast(0.98) saturate(1.05) brightness(1.05) blur(0.25px)',
  corporate_sharp: 'contrast(1.08) saturate(0.92)',
  ai_auto: 'contrast(1.1) saturate(1.12)',
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

function effectLabel(effectId: string) {
  return VIDEO_EFFECTS.find((item) => item.value === effectId)?.label || effectId;
}

function localAiDirection(eventType?: AppEvent['type'], templateCategory?: AppTemplate['category']) {
  if (eventType === 'wedding' || templateCategory === 'wedding') return { effect: 'wedding_soft', musicTheme: 'wedding' };
  if (eventType === 'corporate' || templateCategory === 'corporate') return { effect: 'corporate_sharp', musicTheme: 'corporate' };
  if (eventType === 'birthday' || templateCategory === 'birthday') return { effect: 'party', musicTheme: 'birthday' };
  if (eventType === 'club' || templateCategory === 'party') return { effect: 'neon', musicTheme: 'party' };
  if (templateCategory === 'premium') return { effect: 'luxury', musicTheme: 'luxury' };
  return { effect: 'cinematic', musicTheme: 'viral' };
}

function renderedVideoFile(blob: Blob) {
  const extension = blob.type.includes('mp4') ? 'mp4' : 'webm';
  return new File([blob], `six3-edited-${Date.now()}.${extension}`, { type: blob.type || 'video/webm' });
}

function getEffectPreviewStyle(effect: string): CSSProperties {
  return { filter: effectPreviewFilters[effect] || effectPreviewFilters.clean };
}

function templateSource(template?: AppTemplate) {
  return template?.animationUrl || template?.overlayUrl || template?.previewUrl;
}

function isVideoOverlay(src?: string) {
  return /\.(webm|mp4|mov)(\?|$)/i.test(src || '');
}

function TemplateOverlayPreview({ template }: { template?: AppTemplate }) {
  const src = templateSource(template);
  if (!src) return null;

  const className = 'absolute inset-0 h-full w-full object-cover opacity-95 pointer-events-none';
  if (isVideoOverlay(src)) {
    return <video src={src} className={className} muted autoPlay loop playsInline preload="metadata" />;
  }

  return <img src={src} alt="" className={className} loading="lazy" decoding="async" />;
}

function EffectPreviewLayer({ effect }: { effect: string }) {
  const layers: Record<string, string> = {
    neon: 'bg-[linear-gradient(135deg,rgba(14,165,233,0.16),rgba(139,92,246,0.18),rgba(236,72,153,0.1))] mix-blend-screen',
    party: 'bg-[linear-gradient(135deg,rgba(34,197,94,0.12),rgba(59,130,246,0.14),rgba(236,72,153,0.12))] mix-blend-screen',
    luxury: 'bg-[linear-gradient(135deg,rgba(245,158,11,0.16),rgba(255,255,255,0.04),rgba(88,28,135,0.08))] mix-blend-screen',
    glitch_flash: 'bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.08)_0,rgba(255,255,255,0.08)_2px,transparent_2px,transparent_18px)] mix-blend-screen',
    wedding_soft: 'bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(244,114,182,0.08),transparent)] mix-blend-screen',
    cinematic: 'bg-[linear-gradient(180deg,rgba(0,0,0,0.24),transparent_18%,transparent_82%,rgba(0,0,0,0.28))]',
    ai_auto: 'bg-[linear-gradient(135deg,rgba(59,130,246,0.14),rgba(139,92,246,0.16),rgba(255,255,255,0.04))] mix-blend-screen',
  };

  const className = layers[effect];
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
  effect,
  label,
  className = '',
}: {
  children?: ReactNode;
  template?: AppTemplate;
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
      <TemplateOverlayPreview template={template} />
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
}: {
  label: string;
  start: number;
  end: number;
  duration: number;
  className: string;
}) {
  const safeDuration = Math.max(duration, 1);
  const left = `${clamp(start / safeDuration, 0, 1) * 100}%`;
  const width = `${Math.max(2, clamp((end - start) / safeDuration, 0, 1) * 100)}%`;

  return (
    <div
      className={`absolute top-1/2 flex h-8 -translate-y-1/2 items-center rounded-xl border px-3 text-xs font-bold text-white shadow-lg ${className}`}
      style={{ left, width }}
      title={`${label} - ${formatTime(start)} ate ${formatTime(end)}`}
    >
      <span className="truncate">{label}</span>
    </div>
  );
}

function TimelineRow({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid min-w-[640px] grid-cols-[116px_minmax(0,1fr)] items-center gap-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-white/58">
        {icon}
        <span>{label}</span>
      </div>
      <div className="relative h-11 rounded-2xl border border-white/[0.08] bg-black/24">
        {children}
      </div>
    </div>
  );
}

function EditorTimeline({
  duration,
  sourceDuration,
  templateName,
  musicLabel,
  effect,
  effectSegments,
}: {
  duration: number;
  sourceDuration: number;
  templateName?: string;
  musicLabel: string;
  effect: string;
  effectSegments: EffectSegment[];
}) {
  const markers = [0, duration / 2, duration].map((value) => clamp(value, 0, duration));

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm font-bold text-white">
          <SlidersHorizontal className="h-4 w-4 text-brand-300" />
          Timeline de edicao
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-white/35">
          <span>Fonte {sourceDuration ? formatTime(sourceDuration) : '--:--'}</span>
          <span>Final {formatTime(duration)}</span>
        </div>
      </div>

      <div className="hide-scrollbar overflow-x-auto">
        <div className="min-w-[640px] space-y-2">
          <div className="grid grid-cols-[116px_minmax(0,1fr)] gap-3">
            <div />
            <div className="relative h-5">
              {markers.map((marker) => (
                <span
                  key={marker}
                  className="absolute top-0 -translate-x-1/2 text-[11px] font-semibold text-white/35"
                  style={{ left: `${(marker / Math.max(duration, 1)) * 100}%` }}
                >
                  {formatTime(marker)}
                </span>
              ))}
            </div>
          </div>

          <TimelineRow icon={<Film className="h-4 w-4" />} label="Video">
            <TimelineClip label="Video carregado" start={0} end={duration} duration={duration} className="border-blue-300/30 bg-blue-500/24" />
          </TimelineRow>

          <TimelineRow icon={<Layers className="h-4 w-4" />} label="Template">
            {templateName ? (
              <TimelineClip label={templateName} start={0} end={duration} duration={duration} className="border-cyan-300/30 bg-cyan-500/24" />
            ) : (
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-white/24">Sem template</span>
            )}
          </TimelineRow>

          <TimelineRow icon={<Sparkles className="h-4 w-4" />} label="Efeito">
            {effectSegments.length > 0 ? effectSegments.map((segment) => (
              <TimelineClip
                key={segment.id}
                label={effectLabel(segment.effect)}
                start={segment.start}
                end={segment.end}
                duration={duration}
                className="border-violet-300/35 bg-violet-500/28"
              />
            )) : effect === 'ai_auto' ? (
              <TimelineClip label="Automacao local" start={0} end={duration} duration={duration} className="border-violet-300/35 bg-violet-500/28" />
            ) : (
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-white/24">Sem efeito marcado</span>
            )}
          </TimelineRow>

          <TimelineRow icon={<Music2 className="h-4 w-4" />} label="Trilha">
            {musicLabel !== 'Sem trilha' ? (
              <TimelineClip label={musicLabel} start={0} end={duration} duration={duration} className="border-emerald-300/30 bg-emerald-500/24" />
            ) : (
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-white/24">Sem trilha sonora</span>
            )}
          </TimelineRow>
        </div>
      </div>
    </div>
  );
}

export default function OperatorPage() {
  const operatorPreferences = useMemo(() => getOperatorPreferences(), []);
  const { user, isAdmin } = useAuth();
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [templates, setTemplates] = useState<AppTemplate[]>([]);
  const [musicCatalog, setMusicCatalog] = useState<AppMusic[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [effect, setEffect] = useState('clean');
  const [musicTheme, setMusicTheme] = useState<string>(operatorPreferences.defaultMusicTheme);
  const [step, setStep] = useState<Step>('select');
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [savedVideoId, setSavedVideoId] = useState('');
  const [progress, setProgress] = useState(0);
  const [processingLabel, setProcessingLabel] = useState('Preparando video...');
  const [recording, setRecording] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [duration, setDuration] = useState<number>(operatorPreferences.defaultDuration);
  const [sourceDuration, setSourceDuration] = useState(0);
  const [effectSegmentStart, setEffectSegmentStart] = useState(0);
  const [effectSegmentEnd, setEffectSegmentEnd] = useState<number>(operatorPreferences.defaultDuration);

  const videoRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (!user) return;
    getUserEvents(user.uid).then(evs => {
      setEvents(evs.filter(e => e.status !== 'archived'));
    });
    seedTemplates().then(() => getTemplates(user.uid)).then((items) => {
      setTemplates(items.filter((item) => item.isActive));
      if (items[0]) setSelectedTemplateId(items[0].id);
    }).catch(() => undefined);
    Promise.all([
      getGeneratedMusic().catch(() => []),
      getUserMusic(user.uid).catch(() => []),
    ]).then(([generated, custom]) => {
      setMusicCatalog([...generated, ...custom].filter((item) => item.musicUrl));
    });
  }, [user]);

  const selectedEvent = events.find(e => e.id === selectedEventId);
  const isStandaloneVideo = !selectedEventId;
  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
  const effectMeta = VIDEO_EFFECTS.find(item => item.value === effect);
  const aiAutoSelected = effect === 'ai_auto';
  const canUseAiAuto = hasFeature(user?.planId, 'ai_auto_edit', isAdmin);
  const canUseEffect = !effectMeta || hasFeature(user?.planId, effectMeta.feature, isAdmin);
  const canUseTemplate = !selectedTemplate || isAdmin
    || selectedTemplate.category !== 'premium'
    || hasFeature(user?.planId, 'premium_templates', isAdmin);

  const eventOptions = [
    { value: '', label: 'Sem evento - video avulso' },
    ...events.map(e => ({ value: e.id, label: `${e.name} - ${eventStatusLabel[e.status] || e.status}` })),
  ];

  const templateOptions = [
    { value: '', label: 'Sem overlay' },
    ...templates.slice(0, 240).map(t => {
      const locked = !isAdmin && t.category === 'premium' && !hasFeature(user?.planId, 'premium_templates', isAdmin);
      return { value: t.id, label: `${locked ? 'Bloqueado - ' : ''}${t.name}` };
    }),
  ];

  const effectOptions = VIDEO_EFFECTS.map(item => {
    const locked = !hasFeature(user?.planId, item.feature, isAdmin);
    return { value: item.value, label: `${locked ? 'Bloqueado - ' : ''}${item.label}` };
  });

  const resolvedMusicOptions = [
    ...musicOptions,
    ...musicCatalog.map((track) => ({
      value: `url:${track.musicUrl}`,
      label: `${track.source === 'custom' ? 'Sua musica - ' : 'SIX3 - '}${track.name}`,
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
  const musicPreviewUrl = selectedMusicUrl || selectedMusicTrack?.musicUrl;
  const processingMusicUrl = musicTheme === 'none' ? undefined : musicPreviewUrl;
  const storedMusicTheme = processingMusicUrl ? (selectedMusicTrack?.theme || 'custom') : musicTheme;
  const effectDescription = effectPreviewText[effect] || 'Acabamento aplicado pelo editor.';
  const effectSegments = useMemo<EffectSegment[]>(() => {
    if (effect === 'clean' || effect === 'ai_auto') return [];

    const start = clamp(effectSegmentStart, 0, Math.max(0, duration - MIN_EFFECT_SEGMENT_SECONDS));
    const end = clamp(effectSegmentEnd, start + MIN_EFFECT_SEGMENT_SECONDS, duration);
    return [{ id: 'main-effect', effect, start, end }];
  }, [duration, effect, effectSegmentEnd, effectSegmentStart]);
  const shouldProcessEffectAsSegment = effectSegments.length > 0
    && (effectSegments[0].start > 0.05 || effectSegments[0].end < duration - 0.05);
  const processingBaseEffect = shouldProcessEffectAsSegment ? 'clean' : effect;

  useEffect(() => {
    setEffectSegmentStart((current) => clamp(current, 0, Math.max(0, duration - MIN_EFFECT_SEGMENT_SECONDS)));
    setEffectSegmentEnd((current) => clamp(current, MIN_EFFECT_SEGMENT_SECONDS, duration));
  }, [duration]);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      setStep('capture');
    } catch { toast.error('Permissao de camera negada. Use o upload manual.'); }
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
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mr = new MediaRecorder(streamRef.current, { mimeType: 'video/webm' });
    mediaRecorderRef.current = mr;
    mr.ondataavailable = e => chunksRef.current.push(e.data);
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      setVideoBlob(blob);
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setSourceDuration(duration);
      setEffectSegmentStart(0);
      setEffectSegmentEnd(duration);
      streamRef.current?.getTracks().forEach(t => t.stop());
      setStep('preview');
    };
    mr.start();
    setRecording(true);
    setTimeout(() => { mr.stop(); setRecording(false); }, duration * 1000);
  }

  function handlePreviewMetadata(event: SyntheticEvent<HTMLVideoElement>) {
    const mediaDuration = event.currentTarget.duration;
    if (Number.isFinite(mediaDuration) && mediaDuration > 0) {
      setSourceDuration(mediaDuration);
    }
  }

  function updateEffectStart(value: number) {
    const maxStart = Math.max(0, duration - MIN_EFFECT_SEGMENT_SECONDS);
    const nextStart = clamp(value, 0, maxStart);
    setEffectSegmentStart(nextStart);
    setEffectSegmentEnd((currentEnd) => Math.max(currentEnd, nextStart + MIN_EFFECT_SEGMENT_SECONDS));
  }

  function updateEffectEnd(value: number) {
    const minEnd = Math.min(duration, effectSegmentStart + MIN_EFFECT_SEGMENT_SECONDS);
    setEffectSegmentEnd(clamp(value, minEnd, duration));
  }

  function setEffectRangePreset(preset: 'all' | 'intro' | 'center' | 'ending') {
    if (preset === 'all') {
      setEffectSegmentStart(0);
      setEffectSegmentEnd(duration);
      return;
    }

    const segmentSize = clamp(duration * 0.34, MIN_EFFECT_SEGMENT_SECONDS, Math.max(MIN_EFFECT_SEGMENT_SECONDS, duration));
    const starts = {
      intro: 0,
      center: Math.max(0, (duration - segmentSize) / 2),
      ending: Math.max(0, duration - segmentSize),
    };

    setEffectSegmentStart(starts[preset]);
    setEffectSegmentEnd(Math.min(duration, starts[preset] + segmentSize));
  }

  function enableAiAutoEdit() {
    if (!canUseAiAuto) {
      toast.error('A edicao automatica com IA esta liberada no plano Ilimitado.');
      return;
    }

    setEffect('ai_auto');
    setMusicTheme('none');
    setEffectSegmentStart(0);
    setEffectSegmentEnd(duration);
    toast.success('IA automatica ativada. O editor vai escolher efeito e clima sem sobrecarregar o servidor.');
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setVideoBlob(file);
    setVideoUrl(URL.createObjectURL(file));
    setSourceDuration(0);
    setEffectSegmentStart(0);
    setEffectSegmentEnd(duration);
    setStep('preview');
  }

  async function handleProcess() {
    if (!videoBlob || !user) return;
    if (!canUseEffect) {
      toast.error('Esse efeito nao esta liberado no seu plano.');
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
        throw new Error('Seu navegador nao suporta o editor local. Atualize o navegador e tente novamente.');
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
        : 'Editando video no navegador...');

      const renderedBlob = await renderVideoInBrowser({
        input: videoBlob,
        durationSeconds: duration,
        overlayUrl: selectedTemplate?.overlayUrl,
        animationUrl: selectedTemplate?.animationUrl,
        fallbackOverlayUrl: selectedTemplate?.frameUrl || selectedTemplate?.previewUrl,
        effect: browserEffect,
        effectSegments: shouldProcessEffectAsSegment ? effectSegments.map(({ effect: segmentEffect, start, end }) => ({
          effect: segmentEffect,
          start,
          end,
        })) : undefined,
        musicUrl: processingMusicUrl,
        musicTheme: rendererMusicTheme,
        onProgress: (pct) => setProgress(Math.min(70, 2 + Math.round(pct * 0.68))),
      });

      setProgress(72);
      setProcessingLabel('Enviando video editado para a nuvem...');
      const uploaded = await uploadVideoToServer(renderedVideoFile(renderedBlob), (pct) => {
        setProgress(Math.min(94, 72 + Math.round(pct * 0.22)));
      });

      setProcessingLabel('Publicando video...');
      const video = await createVideo({
        eventId: selectedEventId || STANDALONE_EVENT_ID, ownerId: user.uid, operatorId: user.uid,
        title: `${isStandaloneVideo ? 'Video avulso' : 'Video 360'} - ${new Date().toLocaleDateString('pt-BR')}`,
        storagePath: uploaded.storagePath,
        videoUrl: uploaded.videoUrl || '',
        rawVideoUrl: undefined,
        status: 'published',
        views: 0, downloads: 0, shares: 0,
        size: renderedBlob.size, format: renderedBlob.type || 'video/webm',
        templateId: selectedTemplateId || undefined,
        effect,
        musicTheme: effect === 'ai_auto' && musicTheme === 'none' ? aiDirection.musicTheme : storedMusicTheme,
        musicUrl: processingMusicUrl,
        duration,
      });

      setSavedVideoId(video.id);
      setProgress(100);
      setStep('done');
      toast.success('Video editado no navegador e publicado sem sobrecarregar o servidor.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao processar video.');
      setStep('preview');
    }
  }

  function reset() {
    setVideoBlob(null);
    setVideoUrl('');
    setSavedVideoId('');
    setProgress(0);
    setProcessingLabel('Preparando video...');
    setStep(selectedEventId ? 'capture' : 'select');
  }

  const publicUrl = savedVideoId
    ? selectedEvent
      ? `${window.location.origin}/g/${selectedEvent.slug}/${savedVideoId}`
      : `${window.location.origin}/v/${savedVideoId}`
    : '';

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Gravar</h1>
        <p className="text-white/40 text-sm">Grave, edite com IA e publique videos 360 sem sobrecarregar o servidor</p>
      </div>

      {step === 'select' && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid lg:grid-cols-[1fr_0.82fr] gap-4">
          <div className="bg-gradient-glass border border-white/[0.08] rounded-2xl p-5 sm:p-6 space-y-5">
            <Select label="Evento vinculado" options={eventOptions} value={selectedEventId}
              onChange={e => setSelectedEventId(e.target.value)} />
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

          <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-white font-semibold">
              <Wand2 className="w-4 h-4 text-brand-300" />
              Edicao do video
            </div>
            <button
              type="button"
              onClick={enableAiAutoEdit}
              className={`group flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all ${
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
                <span className="block text-sm font-bold text-white">Edicao automatica com IA</span>
                <span className="block text-xs leading-relaxed text-white/42">
                  Escolhe efeito e clima no navegador para publicar sem derrubar o backend.
                </span>
              </span>
              {!canUseAiAuto && <Lock className="h-4 w-4 shrink-0 text-white/35" />}
            </button>
            <Select label="Template transparente" options={templateOptions} value={selectedTemplateId}
              onChange={e => setSelectedTemplateId(e.target.value)} />
            <Select label="Efeito" options={effectOptions} value={effect} onChange={e => setEffect(e.target.value)} />
            <Select label="Trilha" options={resolvedMusicOptions} value={musicTheme} onChange={e => setMusicTheme(e.target.value)} />
            {(!canUseEffect || !canUseTemplate) && (
              <div className="flex gap-2 rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-xs text-amber-100">
                <Lock className="w-4 h-4 shrink-0" />
                Recurso bloqueado pelo plano atual. O backend tambem valida antes de publicar.
              </div>
            )}
            <div className="grid gap-4 border-t border-white/[0.08] pt-4 sm:grid-cols-[180px_minmax(0,1fr)]">
              <VideoPreviewFrame template={selectedTemplate} effect={effect} label="Preview" className="mx-auto aspect-[9/16] max-w-[220px]" />
              <div className="min-w-0 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Sparkles className="h-4 w-4 text-brand-300" />
                    {effectMeta?.label || 'Efeito'}
                  </div>
                  <p className="text-sm leading-relaxed text-white/50">{effectDescription}</p>
                  <p className="text-xs text-white/30">{selectedTemplate?.name || 'Sem template transparente'}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Clock className="h-4 w-4 text-brand-300" />
                    Duracao final
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
                    Previa da musica
                  </div>
                  {musicPreviewUrl ? (
                    <audio src={musicPreviewUrl} controls preload="metadata" className="h-10 w-full" />
                  ) : (
                    <p className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/40">
                      {musicTheme === 'none' ? 'Sem trilha selecionada.' : 'Essa trilha sera aplicada no editor local.'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {step === 'capture' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid lg:grid-cols-[minmax(320px,520px)_1fr] gap-4">
          <div className="space-y-4">
            <div className="relative">
              <VideoPreviewFrame template={selectedTemplate} effect={effect} label="Ao vivo" className="aspect-[9/16] max-h-[68vh]">
                <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
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

            <div className="flex items-center gap-3">
              <Select label="" options={durationOptions}
                value={String(duration)} onChange={e => setDuration(Number(e.target.value))} className="w-24" />
              <Button className="flex-1 justify-center" size="xl" onClick={startCountdown} disabled={recording}
                icon={<Video className="w-5 h-5" />}>
                {recording ? 'Gravando...' : 'Iniciar gravacao'}
              </Button>
            </div>
            <Button variant="ghost" className="w-full justify-center" onClick={() => { streamRef.current?.getTracks().forEach(t => t.stop()); setStep('select'); }}>
              Cancelar
            </Button>
          </div>

          <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 h-fit space-y-3">
            <p className="text-sm font-semibold text-white">Configuracao aplicada</p>
            <p className="text-sm text-white/50">{selectedTemplate?.name || 'Sem overlay'}</p>
            <p className="text-sm text-white/50">{effectMeta?.label || effect}</p>
            <p className="text-sm text-white/50 flex items-center gap-2"><Clock className="w-4 h-4" />{duration} segundos</p>
            <p className="text-sm text-white/50 flex items-center gap-2"><Music2 className="w-4 h-4" />{selectedMusicLabel}</p>
            {musicPreviewUrl && <audio src={musicPreviewUrl} controls preload="metadata" className="h-10 w-full" />}
          </div>
        </motion.div>
      )}

      {step === 'preview' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(300px,500px)_minmax(0,1fr)]">
            <VideoPreviewFrame template={selectedTemplate} effect={effect} label="Editor" className="aspect-[9/16] max-h-[66vh]">
              <video
                ref={previewRef}
                src={videoUrl}
                controls
                onLoadedMetadata={handlePreviewMetadata}
                className="h-full w-full object-contain"
              />
            </VideoPreviewFrame>

            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4 sm:p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-sm font-bold text-white">
                    <Wand2 className="h-4 w-4 text-brand-300" />
                    Editor do video
                  </div>
                  <p className="mt-1 text-xs text-white/38">Ajuste tudo antes de gerar o video final.</p>
                </div>
                <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-bold text-white/55">
                  {formatTime(duration)}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={enableAiAutoEdit}
                  className={`flex min-h-[62px] items-center gap-3 rounded-2xl border px-3 text-left transition-all sm:col-span-2 ${
                    aiAutoSelected
                      ? 'border-brand-300/55 bg-brand-500/18 shadow-glow'
                      : canUseAiAuto
                        ? 'border-white/10 bg-white/[0.045] hover:border-brand-300/35 hover:bg-white/[0.07]'
                        : 'border-white/10 bg-white/[0.035] opacity-70'
                  }`}
                >
                  <Sparkles className="h-5 w-5 shrink-0 text-brand-200" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-white">Edicao automatica com IA</span>
                    <span className="block truncate text-xs text-white/42">O editor local decide acabamento, clima e trilha sem servidor externo.</span>
                  </span>
                  {!canUseAiAuto && <Lock className="h-4 w-4 shrink-0 text-white/35" />}
                </button>
                <Select label="Template" options={templateOptions} value={selectedTemplateId}
                  onChange={e => setSelectedTemplateId(e.target.value)} />
                <Select label="Efeito" options={effectOptions} value={effect} onChange={e => setEffect(e.target.value)} />
                <Select label="Trilha sonora" options={resolvedMusicOptions} value={musicTheme} onChange={e => setMusicTheme(e.target.value)} />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-white/70">Duracao final</p>
                  <div className="grid grid-cols-5 gap-1.5">
                    {DURATION_OPTIONS.map((seconds) => (
                      <button
                        key={seconds}
                        type="button"
                        onClick={() => setDuration(seconds)}
                        className={`h-10 rounded-full border text-sm font-bold transition-all ${
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
              </div>

              <div className="mt-4 space-y-3 rounded-2xl border border-white/[0.08] bg-black/18 p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Sparkles className="h-4 w-4 text-brand-300" />
                    Trecho do efeito
                  </div>
                  <div className="flex gap-1.5">
                    {[
                      ['all', 'Tudo'],
                      ['intro', 'Inicio'],
                      ['center', 'Centro'],
                      ['ending', 'Final'],
                    ].map(([preset, label]) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setEffectRangePreset(preset as 'all' | 'intro' | 'center' | 'ending')}
                        className="h-8 rounded-full border border-white/10 bg-white/[0.045] px-3 text-xs font-bold text-white/58 transition-all hover:border-brand-300/35 hover:text-white"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1.5 text-xs font-semibold text-white/52">
                    Inicio {formatTime(effectSegments[0]?.start || 0)}
                    <input
                      type="range"
                      min={0}
                      max={duration}
                      step={0.1}
                      value={effectSegments[0]?.start || 0}
                      disabled={effect === 'clean' || effect === 'ai_auto'}
                      onChange={(event) => updateEffectStart(Number(event.target.value))}
                      className="w-full accent-violet-400 disabled:opacity-35"
                    />
                  </label>
                  <label className="space-y-1.5 text-xs font-semibold text-white/52">
                    Fim {formatTime(effectSegments[0]?.end || duration)}
                    <input
                      type="range"
                      min={0}
                      max={duration}
                      step={0.1}
                      value={effectSegments[0]?.end || duration}
                      disabled={effect === 'clean' || effect === 'ai_auto'}
                      onChange={(event) => updateEffectEnd(Number(event.target.value))}
                      className="w-full accent-violet-400 disabled:opacity-35"
                    />
                  </label>
                </div>
                <p className="text-xs leading-relaxed text-white/38">
                  {effect === 'clean'
                    ? 'Escolha um efeito para marcar o trecho na timeline.'
                    : effect === 'ai_auto'
                      ? 'A automacao escolhe efeito e clima no editor local.'
                      : effectDescription}
                </p>
              </div>

              {musicPreviewUrl && (
                <div className="mt-4 rounded-2xl border border-white/[0.08] bg-black/18 p-3">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
                    <Volume2 className="h-4 w-4 text-brand-300" />
                    Preview da trilha
                  </div>
                  <audio src={musicPreviewUrl} controls preload="metadata" className="h-10 w-full" />
                </div>
              )}

              {(!canUseEffect || !canUseTemplate) && (
                <div className="mt-4 flex gap-2 rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-xs text-amber-100">
                  <Lock className="h-4 w-4 shrink-0" />
                  Alguma edicao escolhida esta bloqueada no seu plano.
                </div>
              )}

              <div className="mt-4 grid grid-cols-2 gap-3">
                <Button variant="secondary" onClick={reset} icon={<RefreshCw className="w-4 h-4" />}>Refazer</Button>
                <Button onClick={handleProcess} icon={<Check className="w-4 h-4" />}>Processar</Button>
              </div>
            </div>
          </div>

          <EditorTimeline
            duration={duration}
            sourceDuration={sourceDuration}
            templateName={selectedTemplate?.name}
            musicLabel={selectedMusicLabel}
            effect={effect}
            effectSegments={effectSegments}
          />
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
            <h2 className="text-xl font-bold text-white">Video publicado!</h2>
            <p className="text-white/50 text-sm mt-1">{selectedEvent ? 'Compartilhe o QR Code com o cliente' : 'Video avulso pronto para compartilhar'}</p>
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
              Ver video
            </Button>
            <Button variant="secondary" className="flex-1 justify-center" onClick={reset} icon={<RefreshCw className="w-4 h-4" />}>
              Novo video
            </Button>
            <Button className="flex-1 justify-center" disabled={!publicUrl} onClick={() => navigator.share?.({ url: publicUrl, title: 'Video 360' })}
              icon={<Share2 className="w-4 h-4" />}>
              Compartilhar
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
