import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarDays, Download, Lock, MapPin, QrCode, Share2, Sparkles, Video } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { getEventBySlug } from '@/services/eventService';
import { getEventVideos } from '@/services/videoService';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { BrandWordmark } from '@/components/brand/BrandLogo';
import type { AppEvent, AppVideo } from '@/types';

function isVideoUrl(url: string) {
  return /\.(mp4|webm|mov)(\?|$)/i.test(url);
}

export default function GalleryPage() {
  const { eventSlug } = useParams<{ eventSlug: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<AppEvent | null>(null);
  const [videos, setVideos] = useState<AppVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrOpen, setQrOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [wrongPass, setWrongPass] = useState(false);

  useEffect(() => {
    if (!eventSlug) return;
    getEventBySlug(eventSlug).then(e => {
      setEvent(e);
      if (e && !e.passwordEnabled) {
        setUnlocked(true);
        getEventVideos(e.id).then(setVideos).catch(() => setVideos([]));
      }
    }).catch(() => setEvent(null)).finally(() => setLoading(false));
  }, [eventSlug]);

  const stats = useMemo(() => {
    const views = videos.reduce((sum, video) => sum + (video.views || 0), 0);
    const downloads = videos.reduce((sum, video) => sum + (video.downloads || 0), 0);
    return { views, downloads, videos: videos.length };
  }, [videos]);

  function handleUnlock() {
    if (event && password === 'senha123') {
      setUnlocked(true);
      getEventVideos(event.id).then(setVideos).catch(() => setVideos([]));
    } else {
      setWrongPass(true);
    }
  }

  if (loading) return <div className="min-h-screen bg-surface flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-brand-500 animate-spin" /></div>;

  if (!event) return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-4 text-center p-4">
      <Video className="w-16 h-16 text-white/20" />
      <h1 className="text-xl font-bold text-white">Galeria nao encontrada</h1>
      <p className="text-white/40">Este evento nao existe ou foi removido.</p>
    </div>
  );

  if (event.passwordEnabled && !unlocked) return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-gradient-glass border border-white/[0.08] rounded-2xl p-6 space-y-4">
        <div className="text-center">
          <Lock className="w-10 h-10 text-brand-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white">Galeria protegida</h2>
          <p className="text-white/40 text-sm">{event.name}</p>
        </div>
        <Input label="Senha" type="password" placeholder="Digite a senha" value={password}
          onChange={e => setPassword(e.target.value)} error={wrongPass ? 'Senha incorreta' : undefined} />
        <Button className="w-full justify-center" onClick={handleUnlock}>Acessar</Button>
      </div>
    </div>
  );

  const publicUrl = window.location.href;
  const featuredMedia = event.mediaUrls || [];

  return (
    <div className="min-h-screen bg-surface text-white">
      <div className="mx-auto max-w-5xl border-x border-white/[0.06] min-h-screen bg-surface">
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-white/[0.08] bg-surface/85 px-4 py-3 backdrop-blur-xl">
          <BrandWordmark className="text-xl" />
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setQrOpen(true)} icon={<QrCode className="w-4 h-4" />}>QR</Button>
            <Button variant="secondary" size="sm" icon={<Share2 className="w-4 h-4" />}
              onClick={() => navigator.share?.({ url: publicUrl, title: event.name }) || navigator.clipboard.writeText(publicUrl)}>
              Compartilhar
            </Button>
          </div>
        </div>

        <div className="relative">
          {event.coverUrl ? (
            <img src={event.coverUrl} className="w-full h-48 sm:h-64 object-cover" alt="" />
          ) : (
            <div className="w-full h-48 sm:h-64 bg-gradient-brand opacity-70" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-surface/80 via-transparent to-transparent" />
        </div>

        <section className="px-4 sm:px-6 pb-6 border-b border-white/[0.08]">
          <div className="-mt-12 sm:-mt-16 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-gradient-brand flex items-center justify-center text-4xl font-black text-white shadow-2xl shrink-0 border-4 border-surface overflow-hidden">
                {event.avatarUrl || event.logoUrl ? (
                  <img src={event.avatarUrl || event.logoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  event.name.charAt(0)
                )}
              </div>
              <div className="pb-2">
                <h1 className="text-2xl sm:text-4xl font-black leading-tight">{event.name}</h1>
                <p className="text-white/50 text-sm sm:text-base">{event.clientName}</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => setQrOpen(true)} icon={<QrCode className="w-4 h-4" />}>QR Code do evento</Button>
          </div>

          <p className="mt-5 max-w-2xl text-white/75">{event.profileHeadline || event.description || 'Momentos 360 prontos para assistir, baixar e compartilhar.'}</p>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-white/45">
            <span className="inline-flex items-center gap-1.5"><CalendarDays className="w-4 h-4" />{new Date(event.date).toLocaleDateString('pt-BR')}</span>
            <span className="inline-flex items-center gap-1.5"><MapPin className="w-4 h-4" />{event.location}</span>
            <span className="inline-flex items-center gap-1.5"><Sparkles className="w-4 h-4" />{event.type}</span>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2 max-w-lg">
            <div className="rounded-2xl bg-white/[0.05] p-3">
              <p className="text-lg font-black">{stats.videos}</p>
              <p className="text-xs text-white/40">videos</p>
            </div>
            <div className="rounded-2xl bg-white/[0.05] p-3">
              <p className="text-lg font-black">{stats.views}</p>
              <p className="text-xs text-white/40">views</p>
            </div>
            <div className="rounded-2xl bg-white/[0.05] p-3">
              <p className="text-lg font-black">{stats.downloads}</p>
              <p className="text-xs text-white/40">downloads</p>
            </div>
          </div>
        </section>

        {featuredMedia.length > 0 && (
          <section className="px-4 sm:px-6 py-5 border-b border-white/[0.08]">
            <h2 className="text-sm font-bold text-white/70 mb-3">Midias em destaque</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {featuredMedia.map((url, index) => (
                <div key={`${url}-${index}`} className="aspect-square rounded-2xl overflow-hidden bg-black/40 border border-white/[0.08]">
                  {isVideoUrl(url) ? (
                    <video src={url} controls className="w-full h-full object-cover" />
                  ) : (
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="px-4 sm:px-6 py-5">
          <h2 className="text-sm font-bold text-white/70 mb-3">Videos publicados</h2>
          {videos.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <Video className="w-12 h-12 text-white/20" />
              <p className="text-white/40">Nenhum video publicado ainda</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {videos.map(v => (
                <motion.div key={v.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  onClick={() => navigate(`/g/${eventSlug}/${v.id}`)}
                  className="bg-gradient-glass border border-white/[0.08] rounded-2xl overflow-hidden cursor-pointer hover:border-brand-500/30 transition-all">
                  <div className="aspect-[9/16] bg-black/40 flex items-center justify-center overflow-hidden">
                    {v.thumbnailUrl ? (
                      <img src={v.thumbnailUrl} className="w-full h-full object-cover" alt={v.title} />
                    ) : v.videoUrl ? (
                      <video src={v.videoUrl} className="w-full h-full object-cover" muted playsInline />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-white/20">
                        <Video className="w-10 h-10" />
                        <span className="text-xs">Video 360</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm text-white/70 truncate">{v.title}</p>
                    <p className="mt-1 text-xs text-white/35 inline-flex items-center gap-1"><Download className="w-3 h-3" />{v.downloads || 0}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </div>

      <Modal open={qrOpen} onClose={() => setQrOpen(false)} title="QR Code da galeria" size="sm">
        <div className="flex flex-col items-center gap-4">
          <div className="bg-white p-4 rounded-xl">
            <QRCodeSVG value={publicUrl} size={200} />
          </div>
          <p className="text-xs text-white/30 break-all text-center">{publicUrl}</p>
          <Button className="w-full justify-center" onClick={() => navigator.clipboard.writeText(publicUrl)}>
            Copiar link
          </Button>
        </div>
      </Modal>
    </div>
  );
}
