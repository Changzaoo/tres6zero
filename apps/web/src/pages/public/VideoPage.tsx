import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download, Share2, QrCode, MessageCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { getVideo } from '@/services/videoService';
import { getEvent } from '@/services/eventService';
import { createLead } from '@/services/leadService';
import { incrementVideoStat } from '@/services/videoService';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { toast } from '@/components/ui/Toast';
import type { AppVideo, AppEvent } from '@/types';

export default function VideoPage() {
  const { eventSlug, videoId } = useParams();
  const [video, setVideo] = useState<AppVideo | null>(null);
  const [event, setEvent] = useState<AppEvent | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadSaved, setLeadSaved] = useState(false);

  useEffect(() => {
    if (!videoId) return;
    getVideo(videoId).then(async v => {
      setVideo(v);
      if (v) {
        const ev = await getEvent(v.eventId);
        setEvent(ev);
        incrementVideoStat(v.id, 'views');
      }
    });
  }, [videoId]);

  async function handleDownload() {
    if (!video) return;
    if (event?.leadCaptureRequired && !leadSaved) { setLeadOpen(true); return; }
    window.open(video.videoUrl, '_blank');
    incrementVideoStat(video.id, 'downloads');
  }

  async function handleLeadSubmit() {
    if (!video || !event || !leadName) { toast.error('Informe seu nome'); return; }
    await createLead({ eventId: event.id, videoId: video.id, name: leadName, phone: leadPhone, email: leadEmail, acceptedTerms: true, source: 'gallery' });
    setLeadSaved(true);
    setLeadOpen(false);
    window.open(video.videoUrl, '_blank');
    incrementVideoStat(video.id, 'downloads');
    toast.success('Obrigado! O download foi iniciado.');
  }

  if (!video) return <div className="min-h-screen bg-surface flex items-center justify-center"><div className="w-8 h-8 border-2 border-white/10 border-t-brand-500 rounded-full animate-spin" /></div>;

  const shareUrl = window.location.href;
  const whatsappMsg = encodeURIComponent(`Olha meu vídeo 360 no evento ${event?.name || ''}! 🎥✨ ${shareUrl}`);

  return (
    <div className="min-h-screen bg-surface max-w-md mx-auto pb-20">
      <div className="relative bg-black">
        <video src={video.videoUrl} controls playsInline className="w-full" />
      </div>

      <div className="p-4 space-y-4">
        <div>
          <h1 className="text-lg font-bold text-white">{video.title}</h1>
          {event && <p className="text-sm text-white/40">{event.name}</p>}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button onClick={handleDownload} icon={<Download className="w-4 h-4" />} className="justify-center">Baixar</Button>
          <a href={`https://wa.me/?text=${whatsappMsg}`} target="_blank" rel="noreferrer">
            <Button variant="secondary" icon={<MessageCircle className="w-4 h-4" />} className="w-full justify-center">WhatsApp</Button>
          </a>
          <Button variant="secondary" onClick={() => setQrOpen(true)} icon={<QrCode className="w-4 h-4" />} className="justify-center">QR Code</Button>
          <Button variant="secondary" onClick={() => navigator.share?.({ url: shareUrl }) || navigator.clipboard.writeText(shareUrl)}
            icon={<Share2 className="w-4 h-4" />} className="justify-center">Copiar link</Button>
        </div>

        <div className="bg-gradient-brand/10 border border-brand-500/20 rounded-xl p-4 text-center">
          <p className="text-sm text-white/70 mb-2">Gostou da experiência 360?</p>
          <p className="text-xs text-white/40">Contrate nossa plataforma para o seu evento!</p>
          <p className="text-xs text-brand-400 mt-1 font-medium">Tres6Zero – 360 Photo Booth</p>
        </div>
      </div>

      <Modal open={qrOpen} onClose={() => setQrOpen(false)} title="QR Code do vídeo" size="sm">
        <div className="flex flex-col items-center gap-4">
          <div className="bg-white p-4 rounded-xl"><QRCodeSVG value={shareUrl} size={200} /></div>
          <Button className="w-full justify-center" onClick={() => navigator.clipboard.writeText(shareUrl)}>Copiar link</Button>
        </div>
      </Modal>

      <Modal open={leadOpen} onClose={() => setLeadOpen(false)} title="Antes de baixar...">
        <div className="space-y-3">
          <p className="text-sm text-white/60">Deixe seus dados para baixar o vídeo.</p>
          <Input label="Nome *" placeholder="Seu nome" value={leadName} onChange={e => setLeadName(e.target.value)} />
          <Input label="WhatsApp" placeholder="(11) 9 9999-9999" value={leadPhone} onChange={e => setLeadPhone(e.target.value)} />
          <Input label="E-mail" type="email" placeholder="seu@email.com" value={leadEmail} onChange={e => setLeadEmail(e.target.value)} />
          <p className="text-xs text-white/30">Ao continuar, você aceita os termos de uso e política de privacidade.</p>
          <Button className="w-full justify-center" onClick={handleLeadSubmit}>Baixar vídeo</Button>
        </div>
      </Modal>
    </div>
  );
}
