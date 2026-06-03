import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Download, MessageCircle, QrCode, Share2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { getEvent } from '@/services/eventService';
import { createLead } from '@/services/leadService';
import { getVideo, incrementVideoStat } from '@/services/videoService';
import { downloadUrlAsFile } from '@/services/downloadService';
import { BrandWordmark } from '@/components/brand/BrandLogo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/Toast';
import type { AppEvent, AppVideo } from '@/types';

const STANDALONE_EVENT_ID = 'standalone';

export default function VideoPage() {
  const { videoId } = useParams();
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
    getVideo(videoId).then(async (foundVideo) => {
      setVideo(foundVideo);
      if (!foundVideo) return;

      if (foundVideo.eventId && foundVideo.eventId !== STANDALONE_EVENT_ID) {
        const foundEvent = await getEvent(foundVideo.eventId);
        setEvent(foundEvent);
      }
      incrementVideoStat(foundVideo.id, 'views');
    });
  }, [videoId]);

  async function handleDownload() {
    if (!video) return;
    if (event?.leadCaptureRequired && !leadSaved) {
      setLeadOpen(true);
      return;
    }
    try {
      await downloadUrlAsFile(video.videoUrl, video.title || `six3-video-${video.id}`);
      incrementVideoStat(video.id, 'downloads');
      toast.success('Download iniciado.');
    } catch (error) {
      console.warn('[video] Download failed:', error);
      toast.error('Nao foi possivel baixar o video.');
    }
  }

  async function handleLeadSubmit() {
    if (!video || !event || !leadName) {
      toast.error('Informe seu nome');
      return;
    }

    await createLead({
      eventId: event.id,
      videoId: video.id,
      name: leadName,
      phone: leadPhone,
      email: leadEmail,
      acceptedTerms: true,
      source: 'gallery',
    });
    setLeadSaved(true);
    setLeadOpen(false);
    try {
      await downloadUrlAsFile(video.videoUrl, video.title || `six3-video-${video.id}`);
      incrementVideoStat(video.id, 'downloads');
      toast.success('Obrigado! O download foi iniciado.');
    } catch (error) {
      console.warn('[video] Lead download failed:', error);
      toast.error('Cadastro salvo, mas nao foi possivel baixar o video.');
    }
  }

  if (!video) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-brand-500" />
      </div>
    );
  }

  const shareUrl = window.location.href;
  const whatsappMsg = encodeURIComponent(event?.name
    ? `Olha meu video 360 no evento ${event.name}: ${shareUrl}`
    : `Olha meu video 360: ${shareUrl}`);

  return (
    <div className="mx-auto min-h-screen max-w-md bg-surface pb-20">
      <div className="relative bg-black">
        <video src={video.videoUrl} controls playsInline className="w-full" />
      </div>

      <div className="space-y-4 p-4">
        <div>
          <h1 className="text-lg font-bold text-white">{video.title}</h1>
          {event && <p className="text-sm text-white/40">{event.name}</p>}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button onClick={handleDownload} icon={<Download className="h-4 w-4" />} className="justify-center">
            Baixar
          </Button>
          <a href={`https://wa.me/?text=${whatsappMsg}`} target="_blank" rel="noreferrer">
            <Button variant="secondary" icon={<MessageCircle className="h-4 w-4" />} className="w-full justify-center">
              WhatsApp
            </Button>
          </a>
          <Button variant="secondary" onClick={() => setQrOpen(true)} icon={<QrCode className="h-4 w-4" />} className="justify-center">
            QR Code
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigator.share?.({ url: shareUrl }) || navigator.clipboard.writeText(shareUrl)}
            icon={<Share2 className="h-4 w-4" />}
            className="justify-center"
          >
            Copiar link
          </Button>
        </div>

        <div className="rounded-[22px] border border-brand-400/20 bg-brand-500/10 p-4 text-center">
          <p className="mb-2 text-sm text-white/70">Gostou da experiência 360?</p>
          <p className="text-xs text-white/40">Contrate nossa plataforma para o seu evento.</p>
          <p className="mt-2 flex justify-center">
            <BrandWordmark className="text-lg" />
          </p>
        </div>
      </div>

      <Modal open={qrOpen} onClose={() => setQrOpen(false)} title="QR Code do vídeo" size="sm">
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-xl bg-white p-4">
            <QRCodeSVG value={shareUrl} size={200} />
          </div>
          <Button className="w-full justify-center" onClick={() => navigator.clipboard.writeText(shareUrl)}>
            Copiar link
          </Button>
        </div>
      </Modal>

      <Modal open={leadOpen} onClose={() => setLeadOpen(false)} title="Antes de baixar...">
        <div className="space-y-3">
          <p className="text-sm text-white/60">Deixe seus dados para baixar o vídeo.</p>
          <Input label="Nome *" placeholder="Seu nome" value={leadName} onChange={(event) => setLeadName(event.target.value)} />
          <Input label="WhatsApp" placeholder="(11) 9 9999-9999" value={leadPhone} onChange={(event) => setLeadPhone(event.target.value)} />
          <Input label="E-mail" type="email" placeholder="seu@email.com" value={leadEmail} onChange={(event) => setLeadEmail(event.target.value)} />
          <p className="text-xs text-white/30">Ao continuar, você aceita os termos de uso e política de privacidade.</p>
          <Button className="w-full justify-center" onClick={handleLeadSubmit}>
            Baixar vídeo
          </Button>
        </div>
      </Modal>
    </div>
  );
}
