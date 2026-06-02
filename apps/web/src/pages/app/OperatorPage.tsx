import { useState, useRef, useEffect, useMemo, type CSSProperties, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Camera, Upload, RefreshCw, Check, QrCode, Share2, Video, Loader2, Lock, Wand2, Music2, Eye, Clock, Volume2, Sparkles } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { toast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { getUserEvents } from '@/services/eventService';
import { createVideo, updateVideo } from '@/services/videoService';
import { getTemplates, seedTemplates } from '@/services/templateService';
import { getUserMusic } from '@/services/musicService';
import { uploadVideoToServer, processVideoOnServer, getGeneratedMusic } from '@/services/serverMediaService';
import { VIDEO_EFFECTS, hasFeature } from '@/config/plans';
import type { AppEvent, AppMusic, AppTemplate } from '@/types';

type Step = 'select' | 'capture' | 'preview' | 'processing' | 'done';

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
];

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
  ai_auto: 'A IA escolhe corte, efeito e clima no servidor.',
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

export default function OperatorPage() {
  const { user, isAdmin } = useAuth();
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [templates, setTemplates] = useState<AppTemplate[]>([]);
  const [musicCatalog, setMusicCatalog] = useState<AppMusic[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [effect, setEffect] = useState('clean');
  const [musicTheme, setMusicTheme] = useState('none');
  const [step, setStep] = useState<Step>('select');
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [savedVideoId, setSavedVideoId] = useState('');
  const [progress, setProgress] = useState(0);
  const [processingLabel, setProcessingLabel] = useState('Preparando video...');
  const [recording, setRecording] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [duration, setDuration] = useState(15);

  const videoRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (!user) return;
    getUserEvents(user.uid).then(evs => {
      setEvents(evs.filter(e => e.status === 'active'));
    });
    seedTemplates().then(() => getTemplates()).then((items) => {
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
  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
  const effectMeta = VIDEO_EFFECTS.find(item => item.value === effect);
  const canUseEffect = !effectMeta || hasFeature(user?.planId, effectMeta.feature, isAdmin);
  const canUseTemplate = !selectedTemplate || isAdmin
    || selectedTemplate.category !== 'premium'
    || hasFeature(user?.planId, 'premium_templates', isAdmin);

  const eventOptions = [
    { value: '', label: 'Selecione um evento...' },
    ...events.map(e => ({ value: e.id, label: e.name })),
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
  const selectedMusicLabel = resolvedMusicOptions.find(o => o.value === musicTheme)?.label || 'Sem trilha';
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
  const effectDescription = effectPreviewText[effect] || 'Acabamento aplicado pelo servidor.';

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
      streamRef.current?.getTracks().forEach(t => t.stop());
      setStep('preview');
    };
    mr.start();
    setRecording(true);
    setTimeout(() => { mr.stop(); setRecording(false); }, duration * 1000);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setVideoBlob(file);
    setVideoUrl(URL.createObjectURL(file));
    setStep('preview');
  }

  async function handleProcess() {
    if (!videoBlob || !user || !selectedEventId || !selectedEvent) return;
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
    let createdVideoId = '';
    try {
      setProcessingLabel('Enviando video para o servidor...');
      const uploaded = await uploadVideoToServer(videoBlob, (pct) => setProgress(Math.min(55, Math.round(pct * 0.55))));
      setProcessingLabel('Criando registro do video...');
      const video = await createVideo({
        eventId: selectedEventId, ownerId: user.uid, operatorId: user.uid,
        title: `Video 360 - ${new Date().toLocaleDateString('pt-BR')}`,
        storagePath: uploaded.storagePath,
        videoUrl: uploaded.videoUrl || '',
        rawVideoUrl: uploaded.videoUrl,
        status: 'processing',
        views: 0, downloads: 0, shares: 0,
        size: videoBlob.size, format: videoBlob.type || 'video/webm',
        templateId: selectedTemplateId || undefined,
        effect,
        musicTheme: storedMusicTheme,
        musicUrl: processingMusicUrl,
        duration,
      });

      createdVideoId = video.id;
      setSavedVideoId(video.id);
      setProgress(65);
      setProcessingLabel('Processando com Python e FFmpeg...');
      const processed = await processVideoOnServer({
        videoId: video.id,
        inputUrl: uploaded.videoUrl || '',
        storagePath: uploaded.storagePath,
        templateId: selectedTemplateId || undefined,
        overlayUrl: selectedTemplate?.animationUrl || selectedTemplate?.overlayUrl,
        effect,
        musicTheme: processingMusicUrl ? 'none' : musicTheme,
        musicUrl: processingMusicUrl,
        eventType: selectedEvent.type,
        durationSeconds: duration,
      });

      if (processed.status !== 'processed' || !processed.outputUrl) {
        await updateVideo(video.id, { status: 'failed' });
        throw new Error(processed.error || 'VIDEO_PROCESSING_FAILED');
      }

      await updateVideo(video.id, {
        storagePath: processed.storagePath || uploaded.storagePath,
        videoUrl: processed.outputUrl,
        status: 'published',
        effect: processed.effect || effect,
        musicTheme: storedMusicTheme || processed.musicTheme || musicTheme,
        musicUrl: processingMusicUrl,
        duration,
      });

      setProgress(100);
      setStep('done');
      toast.success(processed.aiRationale || 'Video processado e publicado!');
    } catch (error) {
      if (createdVideoId) {
        updateVideo(createdVideoId, { status: 'failed' }).catch(() => undefined);
      }
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

  const publicUrl = selectedEvent ? `${window.location.origin}/g/${selectedEvent.slug}` : '';

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Modo Operador</h1>
        <p className="text-white/40 text-sm">Capture, edite e publique videos 360 pelo servidor</p>
      </div>

      {step === 'select' && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid lg:grid-cols-[1fr_0.82fr] gap-4">
          <div className="bg-gradient-glass border border-white/[0.08] rounded-2xl p-5 sm:p-6 space-y-4">
            <Select label="Evento ativo" options={eventOptions} value={selectedEventId}
              onChange={e => setSelectedEventId(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Button variant="primary" size="xl" className="flex-col h-32 gap-3 justify-center"
                disabled={!selectedEventId} onClick={startCamera} icon={null}>
                <Camera className="w-8 h-8" />
                <span>Gravar</span>
              </Button>
              <label className={`flex flex-col items-center justify-center gap-3 h-32 rounded-2xl border font-medium transition-all cursor-pointer text-lg
                ${selectedEventId ? 'border-white/10 bg-white/5 text-white hover:bg-white/10' : 'border-white/5 bg-white/3 text-white/30 pointer-events-none'}`}>
                <Upload className="w-8 h-8" />
                <span>Enviar</span>
                <input type="file" accept="video/*" className="hidden" onChange={handleFileUpload} disabled={!selectedEventId} />
              </label>
            </div>
          </div>

          <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-white font-semibold">
              <Wand2 className="w-4 h-4 text-brand-300" />
              Edicao do video
            </div>
            <Select label="Template transparente" options={templateOptions} value={selectedTemplateId}
              onChange={e => setSelectedTemplateId(e.target.value)} />
            <Select label="Efeito" options={effectOptions} value={effect} onChange={e => setEffect(e.target.value)} />
            <Select label="Trilha" options={resolvedMusicOptions} value={musicTheme} onChange={e => setMusicTheme(e.target.value)} />
            {(!canUseEffect || !canUseTemplate) && (
              <div className="flex gap-2 rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-xs text-amber-100">
                <Lock className="w-4 h-4 shrink-0" />
                Recurso bloqueado pelo plano atual. O servidor tambem valida antes de processar.
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
                      {musicTheme === 'none' ? 'Sem trilha selecionada.' : 'Essa trilha sera gerada no processamento do servidor.'}
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
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid lg:grid-cols-[minmax(320px,560px)_1fr] gap-4">
          <VideoPreviewFrame template={selectedTemplate} effect={effect} label="Preview aplicado" className="aspect-[9/16] max-h-[70vh]">
            <video ref={previewRef} src={videoUrl} controls className="h-full w-full object-contain" />
          </VideoPreviewFrame>
          <div className="space-y-4">
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 space-y-3">
              <p className="text-sm font-semibold text-white">Pronto para processar</p>
              <p className="text-sm text-white/50">O video sera enviado para o backend, editado com Python/FFmpeg e salvo no Supabase.</p>
              <p className="text-xs text-white/35">Template: {selectedTemplate?.name || 'Sem overlay'}</p>
              <p className="text-xs text-white/35">Efeito: {effectMeta?.label || effect}</p>
              <p className="text-xs text-white/35">Duracao final: {duration} segundos</p>
              <p className="text-xs text-white/35">Trilha: {selectedMusicLabel}</p>
              {musicPreviewUrl && <audio src={musicPreviewUrl} controls preload="metadata" className="h-10 w-full" />}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" onClick={reset} icon={<RefreshCw className="w-4 h-4" />}>Refazer</Button>
              <Button onClick={handleProcess} icon={<Check className="w-4 h-4" />}>Processar</Button>
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
            <h2 className="text-xl font-bold text-white">Video publicado!</h2>
            <p className="text-white/50 text-sm mt-1">Compartilhe o QR Code com o cliente</p>
          </div>
          {publicUrl && (
            <div className="bg-white p-4 rounded-xl">
              <QRCodeSVG value={publicUrl} size={200} />
            </div>
          )}
          <p className="text-xs text-white/30 break-all">{publicUrl}</p>
          <div className="flex gap-3 w-full">
            <Button variant="secondary" className="flex-1 justify-center" onClick={reset} icon={<RefreshCw className="w-4 h-4" />}>
              Novo video
            </Button>
            <Button className="flex-1 justify-center" onClick={() => navigator.share?.({ url: publicUrl, title: 'Video 360' })}
              icon={<Share2 className="w-4 h-4" />}>
              Compartilhar
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
