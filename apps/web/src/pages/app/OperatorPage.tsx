import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, Play, RefreshCw, Check, QrCode, Share2, Video, Loader2, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { toast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { getUserEvents } from '@/services/eventService';
import { createVideo } from '@/services/videoService';
import { uploadVideoToStorage } from '@/services/videoService';
import type { AppEvent } from '@/types';

type Step = 'select' | 'capture' | 'preview' | 'processing' | 'done';

export default function OperatorPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [step, setStep] = useState<Step>('select');
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [savedVideoId, setSavedVideoId] = useState('');
  const [progress, setProgress] = useState(0);
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
  }, [user]);

  const eventOptions = [
    { value: '', label: 'Selecione um evento...' },
    ...events.map(e => ({ value: e.id, label: e.name })),
  ];

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      setStep('capture');
    } catch { toast.error('Permissão de câmera negada. Use o upload manual.'); }
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
    if (!file) return;
    setVideoBlob(file);
    setVideoUrl(URL.createObjectURL(file));
    setStep('preview');
  }

  async function handleProcess() {
    if (!videoBlob || !user || !selectedEventId) return;
    setStep('processing');
    try {
      const path = `videos/${user.uid}/${Date.now()}.webm`;
      const uploadedUrl = await uploadVideoToStorage(videoBlob, path, setProgress);
      const video = await createVideo({
        eventId: selectedEventId, ownerId: user.uid, operatorId: user.uid,
        title: `Vídeo 360 – ${new Date().toLocaleDateString('pt-BR')}`,
        storagePath: path, videoUrl: uploadedUrl, status: 'published',
        views: 0, downloads: 0, shares: 0,
        size: videoBlob.size, format: 'webm',
      });
      setSavedVideoId(video.id);
      setStep('done');
      toast.success('Vídeo salvo com sucesso!');
    } catch { toast.error('Erro ao salvar vídeo. Tente novamente.'); setStep('preview'); }
  }

  function reset() {
    setVideoBlob(null); setVideoUrl(''); setSavedVideoId(''); setProgress(0);
    setStep(selectedEventId ? 'capture' : 'select');
  }

  const selectedEvent = events.find(e => e.id === selectedEventId);
  const publicUrl = selectedEvent ? `${window.location.origin}/g/${selectedEvent.slug}` : '';

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-white">Modo Operador</h1>
        <p className="text-white/40 text-sm">Capture e publique vídeos 360 em tempo real</p>
      </div>

      {step === 'select' && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="bg-gradient-glass border border-white/8 rounded-2xl p-6 space-y-4">
            <Select label="Evento ativo" options={eventOptions} value={selectedEventId}
              onChange={e => setSelectedEventId(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Button variant="primary" size="xl" className="flex-col h-28 gap-3 justify-center"
                disabled={!selectedEventId} onClick={startCamera} icon={null}>
                <Camera className="w-8 h-8" />
                <span>Gravar</span>
              </Button>
              <label className={`flex flex-col items-center justify-center gap-3 h-28 rounded-2xl border font-medium transition-all cursor-pointer text-lg
                ${selectedEventId ? 'border-white/10 bg-white/5 text-white hover:bg-white/10' : 'border-white/5 bg-white/3 text-white/30 pointer-events-none'}`}>
                <Upload className="w-8 h-8" />
                <span>Enviar</span>
                <input type="file" accept="video/*" className="hidden" onChange={handleFileUpload} disabled={!selectedEventId} />
              </label>
            </div>
          </div>
        </motion.div>
      )}

      {step === 'capture' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="relative rounded-2xl overflow-hidden bg-black aspect-[9/16] max-h-[60vh]">
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
              {recording ? 'Gravando...' : 'Iniciar gravação'}
            </Button>
          </div>
          <Button variant="ghost" className="w-full justify-center" onClick={() => { streamRef.current?.getTracks().forEach(t => t.stop()); setStep('select'); }}>
            Cancelar
          </Button>
        </motion.div>
      )}

      {step === 'preview' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="rounded-2xl overflow-hidden bg-black">
            <video ref={previewRef} src={videoUrl} controls className="w-full" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" onClick={reset} icon={<RefreshCw className="w-4 h-4" />}>Refazer</Button>
            <Button onClick={handleProcess} icon={<Check className="w-4 h-4" />}>Salvar no evento</Button>
          </div>
        </motion.div>
      )}

      {step === 'processing' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="bg-gradient-glass border border-white/8 rounded-2xl p-8 flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-brand-400 animate-spin" />
          <p className="text-white font-medium">Enviando vídeo...</p>
          <div className="w-full bg-white/10 rounded-full h-2">
            <div className="bg-gradient-brand h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-white/40 text-sm">{progress}%</p>
        </motion.div>
      )}

      {step === 'done' && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-glass border border-green-500/20 rounded-2xl p-8 flex flex-col items-center gap-5 text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center">
            <Check className="w-8 h-8 text-green-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Vídeo publicado!</h2>
            <p className="text-white/50 text-sm mt-1">Compartilhe o QR Code com o convidado</p>
          </div>
          {publicUrl && (
            <div className="bg-white p-4 rounded-xl">
              <QRCodeSVG value={publicUrl} size={200} />
            </div>
          )}
          <p className="text-xs text-white/30 break-all">{publicUrl}</p>
          <div className="flex gap-3 w-full">
            <Button variant="secondary" className="flex-1 justify-center" onClick={reset} icon={<RefreshCw className="w-4 h-4" />}>
              Novo vídeo
            </Button>
            <Button className="flex-1 justify-center" onClick={() => navigator.share?.({ url: publicUrl, title: 'Vídeo 360' })}
              icon={<Share2 className="w-4 h-4" />}>
              Compartilhar
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
