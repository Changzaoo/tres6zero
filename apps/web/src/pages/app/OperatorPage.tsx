import { useState, useRef, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Camera, Upload, RefreshCw, Check, QrCode, Share2, Video, Loader2, Lock, Wand2, Music2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { toast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { getUserEvents } from '@/services/eventService';
import { createVideo, updateVideo } from '@/services/videoService';
import { getTemplates, seedTemplates } from '@/services/templateService';
import { uploadVideoToServer, processVideoOnServer } from '@/services/serverMediaService';
import { VIDEO_EFFECTS, hasFeature } from '@/config/plans';
import type { AppEvent, AppTemplate } from '@/types';

type Step = 'select' | 'capture' | 'preview' | 'processing' | 'done';

const musicOptions = [
  { value: 'none', label: 'Sem trilha' },
  { value: 'ambient', label: 'Ambient leve' },
  { value: 'party', label: 'Party beat' },
  { value: 'luxury', label: 'Luxury pulse' },
  { value: 'wedding', label: 'Wedding soft' },
  { value: 'corporate', label: 'Corporate clean' },
];

export default function OperatorPage() {
  const { user, isAdmin } = useAuth();
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [templates, setTemplates] = useState<AppTemplate[]>([]);
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
  const [duration, setDuration] = useState(10);

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
        musicTheme,
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
        overlayUrl: selectedTemplate?.overlayUrl,
        effect,
        musicTheme,
        eventType: selectedEvent.type,
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
      });

      setProgress(100);
      setStep('done');
      toast.success('Video processado e publicado!');
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
            <Select label="Trilha tema" options={musicOptions} value={musicTheme} onChange={e => setMusicTheme(e.target.value)} />
            {(!canUseEffect || !canUseTemplate) && (
              <div className="flex gap-2 rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-xs text-amber-100">
                <Lock className="w-4 h-4 shrink-0" />
                Recurso bloqueado pelo plano atual. O servidor tambem valida antes de processar.
              </div>
            )}
          </div>
        </motion.div>
      )}

      {step === 'capture' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid lg:grid-cols-[minmax(320px,520px)_1fr] gap-4">
          <div className="space-y-4">
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-[9/16] max-h-[68vh]">
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
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
              <Select label="" options={[{value:'5',label:'5s'},{value:'10',label:'10s'},{value:'15',label:'15s'},{value:'30',label:'30s'}]}
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
            <p className="text-sm text-white/50 flex items-center gap-2"><Music2 className="w-4 h-4" />{musicOptions.find(o => o.value === musicTheme)?.label}</p>
          </div>
        </motion.div>
      )}

      {step === 'preview' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid lg:grid-cols-[minmax(320px,560px)_1fr] gap-4">
          <div className="rounded-2xl overflow-hidden bg-black">
            <video ref={previewRef} src={videoUrl} controls className="w-full" />
          </div>
          <div className="space-y-4">
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 space-y-3">
              <p className="text-sm font-semibold text-white">Pronto para processar</p>
              <p className="text-sm text-white/50">O video sera enviado para o backend, editado com Python/FFmpeg e salvo no Supabase.</p>
              <p className="text-xs text-white/35">Template: {selectedTemplate?.name || 'Sem overlay'}</p>
              <p className="text-xs text-white/35">Efeito: {effectMeta?.label || effect}</p>
              <p className="text-xs text-white/35">Trilha: {musicOptions.find(o => o.value === musicTheme)?.label}</p>
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
