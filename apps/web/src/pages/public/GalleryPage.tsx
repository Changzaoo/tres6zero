import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarDays, Download, Lock, Pencil, MapPin, Play, QrCode, Share2, Sparkles, Video } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { getEventBySlug } from '@/services/eventService';
import { getEventVideos } from '@/services/videoService';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';
import type { AppEvent, AppVideo } from '@/types';

function isVideoUrl(url: string) {
  return /\.(mp4|webm|mov)(\?|$)/i.test(url);
}

export default function GalleryPage() {
  const { eventSlug } = useParams<{ eventSlug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
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
      <h1 className="text-xl font-bold text-white">Galeria não encontrada</h1>
      <p className="text-white/40">Este evento não existe ou foi removido.</p>
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
  const canEditPage = Boolean(user && (user.uid === event.ownerId || user.role === 'admin'));
  const primaryColor = event.branding?.primaryColor || '#3b6dff';
  const secondaryColor = event.branding?.secondaryColor || '#7c3aed';
  const coverFallbackStyle = {
    background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
  };

  return (
    <div className="min-h-screen bg-surface text-white">
      <div className="mx-auto max-w-5xl border-x border-white/[0.06] min-h-screen bg-surface">
        <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-white/[0.08] bg-surface/85 px-4 py-3 backdrop-blur-xl">
          <div className="relative h-11 w-32 shrink-0 overflow-hidden sm:h-14 sm:w-44" aria-label="SIX3">
            <img
              src="/brand/six3.png"
              alt=""
              aria-hidden="true"
              className="absolute left-1/2 top-[56%] w-[200px] max-w-none -translate-x-1/2 -translate-y-1/2 select-none object-contain sm:w-[260px]"
              draggable={false}
            />
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {canEditPage && (
              <Button variant="secondary" size="sm" onClick={() => navigate(`/app/events/${event.id}/edit`)} icon={<Pencil className="w-4 h-4" />}>
                Editar página
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => setQrOpen(true)} icon={<QrCode className="w-4 h-4" />}>QR</Button>
            <Button variant="secondary" size="sm" icon={<Share2 className="w-4 h-4" />}
              onClick={() => navigator.share?.({ url: publicUrl, title: event.name }) || navigator.clipboard.writeText(publicUrl)}>
              Compartilhar
            </Button>
          </div>
        </div>

        <div className="relative z-0 h-52 overflow-hidden sm:h-72">
          {event.coverUrl ? (
            <img src={event.coverUrl} className="h-full w-full object-cover" alt="" />
          ) : (
            <div className="h-full w-full opacity-85" style={coverFallbackStyle} />
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-surface via-surface/15 to-transparent" />
        </div>

        <section className="relative z-10 border-b border-white/[0.08] px-4 pb-6 sm:px-6">
          <div className="-mt-12 flex flex-col gap-4 sm:-mt-16 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div
                className="relative z-10 flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-surface bg-gradient-brand text-4xl font-black text-white shadow-2xl shadow-black/40 ring-1 ring-white/12 sm:h-32 sm:w-32"
                style={!event.avatarUrl && !event.logoUrl ? coverFallbackStyle : undefined}
              >
                {event.avatarUrl || event.logoUrl ? (
                  <img src={event.avatarUrl || event.logoUrl} alt="" className="h-full w-full rounded-full object-cover" />
                ) : (
                  event.name.charAt(0)
                )}
              </div>
              <div className="min-w-0 pb-2">
                <h1 className="text-2xl sm:text-4xl font-black leading-tight">{event.name}</h1>
                <p className="text-white/50 text-sm sm:text-base">{event.clientName}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {canEditPage && (
                <Button variant="secondary" onClick={() => navigate(`/app/events/${event.id}/edit`)} icon={<Pencil className="w-4 h-4" />}>
                  Editar página
                </Button>
              )}
              <Button variant="outline" onClick={() => setQrOpen(true)} icon={<QrCode className="w-4 h-4" />}>QR Code do evento</Button>
            </div>
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
              <p className="text-xs text-white/40">vídeos</p>
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
            <h2 className="text-sm font-bold text-white/70 mb-3">Mídias em destaque</h2>
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
          <h2 className="text-sm font-bold text-white/70 mb-3">Vídeos publicados</h2>
          {videos.length === 0 ? (
            <div className="relative flex min-h-[220px] flex-col items-center justify-center overflow-hidden rounded-[28px] border border-white/[0.08] bg-white/[0.025] px-6 py-12 text-center">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,109,255,0.14),transparent_58%)]" />
              <div className="relative mb-5 grid h-24 w-24 place-items-center rounded-[28px] border border-white/[0.1] bg-gradient-to-br from-brand-500/18 via-white/[0.045] to-fuchsia-500/12 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
                <span className="absolute -right-1 top-5 h-3 w-3 rounded-full bg-cyan-300/70 shadow-[0_0_18px_rgba(103,232,249,0.55)]" />
                <span className="absolute bottom-4 left-3 h-2 w-2 rounded-full bg-brand-200/80 shadow-[0_0_16px_rgba(147,197,253,0.45)]" />
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/[0.09] text-white/80 ring-1 ring-white/12">
                  <Play className="ml-0.5 h-7 w-7" fill="currentColor" />
                </span>
              </div>
              <p className="relative text-sm font-semibold text-white/55">Nenhum vídeo publicado ainda</p>
              <p className="relative mt-1 max-w-xs text-xs text-white/32">Os vídeos do evento aparecerão aqui quando forem publicados.</p>
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
                        <span className="text-xs">Vídeo 360</span>
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
