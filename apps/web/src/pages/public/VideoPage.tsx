import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Download, MessageCircle, QrCode, Send, Share2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { getEvent } from '@/services/eventService';
import { createLead } from '@/services/leadService';
import { getPublicVisitorId, trackEngagement } from '@/services/engagementService';
import { getVideo, incrementVideoStat } from '@/services/videoService';
import { downloadUrlAsFile } from '@/services/downloadService';
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
  const [feedbackName, setFeedbackName] = useState('');
  const [feedbackPhone, setFeedbackPhone] = useState('');
  const [feedbackEmail, setFeedbackEmail] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackSending, setFeedbackSending] = useState(false);

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
      trackEngagement({
        type: 'view',
        eventId: foundVideo.eventId,
        videoId: foundVideo.id,
      });
    });
  }, [videoId]);

  function publicEventId() {
    return event?.id || video?.eventId || STANDALONE_EVENT_ID;
  }

  async function startVideoDownload(successMessage = 'Download iniciado.') {
    if (!video) return;
    await downloadUrlAsFile(video.videoUrl, video.title || `six3-video-${video.id}`);
    incrementVideoStat(video.id, 'downloads');
    trackEngagement({
      type: 'download',
      eventId: publicEventId(),
      videoId: video.id,
      metadata: { title: video.title },
    });
    toast.success(successMessage);
  }

  async function handleDownload() {
    if (!video) return;
    if (event?.leadCaptureRequired && !leadSaved) {
      setLeadOpen(true);
      return;
    }
    try {
      await startVideoDownload();
    } catch (error) {
      console.warn('[vídeo] Download failed:', error);
      toast.error('Não foi possível baixar o vídeo.');
    }
  }

  async function handleLeadSubmit() {
    if (!video) return;

    await createLead({
      eventId: publicEventId(),
      videoId: video.id,
      name: leadName.trim() || undefined,
      phone: leadPhone.trim() || undefined,
      email: leadEmail.trim() || undefined,
      visitorId: getPublicVisitorId(),
      acceptedTerms: true,
      source: 'download_gate',
    });
    setLeadSaved(true);
    setLeadOpen(false);
    try {
      await startVideoDownload('Obrigado! O download foi iniciado.');
    } catch (error) {
      console.warn('[vídeo] Lead download failed:', error);
      toast.error('Cadastro salvo, mas não foi possível baixar o vídeo.');
    }
  }

  async function handleFeedbackSubmit(eventSubmit: React.FormEvent) {
    eventSubmit.preventDefault();
    if (!video || feedbackSending) return;

    const hasAnyField = [feedbackName, feedbackPhone, feedbackEmail, feedbackText].some((value) => value.trim());
    if (!hasAnyField) {
      toast.error('Escreva um feedback ou deixe algum contato.');
      return;
    }

    setFeedbackSending(true);
    try {
      await createLead({
        eventId: publicEventId(),
        videoId: video.id,
        name: feedbackName.trim() || undefined,
        phone: feedbackPhone.trim() || undefined,
        email: feedbackEmail.trim() || undefined,
        feedback: feedbackText.trim() || undefined,
        visitorId: getPublicVisitorId(),
        acceptedTerms: false,
        source: 'feedback',
      });
      trackEngagement({
        type: 'feedback',
        eventId: publicEventId(),
        videoId: video.id,
        metadata: { hasContact: Boolean(feedbackName || feedbackPhone || feedbackEmail) },
      });
      setFeedbackSent(true);
      setFeedbackName('');
      setFeedbackPhone('');
      setFeedbackEmail('');
      setFeedbackText('');
      toast.success('Feedback enviado. Obrigado!');
    } catch (error) {
      console.warn('[vídeo] Feedback failed:', error);
      toast.error('Não foi possível enviar o feedback.');
    } finally {
      setFeedbackSending(false);
    }
  }

  function handleQrOpen() {
    if (video) {
      trackEngagement({ type: 'qr_code', eventId: publicEventId(), videoId: video.id });
    }
    setQrOpen(true);
  }

  function handleWhatsappClick() {
    if (!video) return;
    incrementVideoStat(video.id, 'shares');
    trackEngagement({
      type: 'whatsapp',
      eventId: publicEventId(),
      videoId: video.id,
      metadata: { channel: 'whatsapp' },
    });
  }

  async function handleShareLink() {
    if (!video) return;
    try {
      const usedNativeShare = Boolean(navigator.share);
      if (usedNativeShare) {
        await navigator.share({ url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Link copiado.');
      }
      incrementVideoStat(video.id, 'shares');
      trackEngagement({
        type: 'copy_link',
        eventId: publicEventId(),
        videoId: video.id,
        metadata: { channel: usedNativeShare ? 'native_share' : 'clipboard' },
      });
    } catch {
      // Native share can be cancelled by the visitor.
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
    ? `Olha meu vídeo 360 no evento ${event.name}: ${shareUrl}`
    : `Olha meu vídeo 360: ${shareUrl}`);

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
          <a href={`https://wa.me/?text=${whatsappMsg}`} target="_blank" rel="noreferrer" onClick={handleWhatsappClick}>
            <Button variant="secondary" icon={<MessageCircle className="h-4 w-4" />} className="w-full justify-center">
              WhatsApp
            </Button>
          </a>
          <Button variant="secondary" onClick={handleQrOpen} icon={<QrCode className="h-4 w-4" />} className="justify-center">
            QR Code
          </Button>
          <Button
            variant="secondary"
            onClick={handleShareLink}
            icon={<Share2 className="h-4 w-4" />}
            className="justify-center"
          >
            Copiar link
          </Button>
        </div>

        <form onSubmit={handleFeedbackSubmit} className="rounded-[22px] border border-brand-400/20 bg-brand-500/10 p-4">
          <div className="mb-3 text-center">
            <p className="text-sm font-semibold text-white/82">Deixe seu feedback</p>
            <p className="mt-1 text-xs text-white/40">Nome, WhatsApp e e-mail são opcionais.</p>
          </div>
          {feedbackSent && (
            <div className="mb-3 rounded-2xl border border-green-300/15 bg-green-500/10 px-3 py-2 text-center text-xs font-semibold text-green-100/80">
              Feedback recebido. Valeu por participar.
            </div>
          )}
          <div className="space-y-2">
            <Input label="Nome" placeholder="Seu nome" value={feedbackName} onChange={(eventInput) => setFeedbackName(eventInput.target.value)} />
            <Input label="WhatsApp" placeholder="(11) 9 9999-9999" value={feedbackPhone} onChange={(eventInput) => setFeedbackPhone(eventInput.target.value)} />
            <Input label="E-mail" type="email" placeholder="seu@email.com" value={feedbackEmail} onChange={(eventInput) => setFeedbackEmail(eventInput.target.value)} />
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-white/60">Feedback</span>
              <textarea
                value={feedbackText}
                onChange={(eventInput) => setFeedbackText(eventInput.target.value)}
                rows={3}
                placeholder="Conte como foi sua experiência..."
                className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-brand-500/50 focus:outline-none"
              />
            </label>
            <Button type="submit" loading={feedbackSending} icon={<Send className="h-4 w-4" />} className="w-full justify-center">
              Enviar feedback
            </Button>
          </div>
        </form>
      </div>

      <Modal open={qrOpen} onClose={() => setQrOpen(false)} title="QR Code do vídeo" size="sm">
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-xl bg-white p-4">
            <QRCodeSVG value={shareUrl} size={200} />
          </div>
          <Button className="w-full justify-center" onClick={handleShareLink}>
            Copiar link
          </Button>
        </div>
      </Modal>

      <Modal open={leadOpen} onClose={() => setLeadOpen(false)} title="Antes de baixar...">
        <div className="space-y-3">
          <p className="text-sm text-white/60">Deixe seus dados para baixar o vídeo. Os campos são opcionais.</p>
          <Input label="Nome" placeholder="Seu nome" value={leadName} onChange={(event) => setLeadName(event.target.value)} />
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
