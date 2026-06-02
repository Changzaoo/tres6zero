import { useEffect, useState, type ReactNode } from 'react';
import { Copy, Download, ExternalLink, Eye, MessageCircle, PlayCircle, Share2, Video } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { getUserVideos, incrementVideoStat } from '@/services/videoService';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { toast } from '@/components/ui/Toast';
import type { AppVideo } from '@/types';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';

const statusLabel: Record<string, string> = {
  uploaded: 'Enviado',
  processing: 'Processando',
  processed: 'Processado',
  failed: 'Falhou',
  published: 'Publicado',
};

const statusVariant: Record<string, BadgeVariant> = {
  uploaded: 'info',
  processing: 'warning',
  processed: 'success',
  failed: 'danger',
  published: 'success',
};

function statValue(value: number | undefined) {
  return Number.isFinite(value) ? value || 0 : 0;
}

function videoShareUrl(video: AppVideo) {
  if (typeof window === 'undefined') return video.videoUrl;
  return video.status === 'published'
    ? `${window.location.origin}/v/${video.id}`
    : video.videoUrl;
}

function whatsappUrl(video: AppVideo) {
  return `https://wa.me/?text=${encodeURIComponent(`Olha esse video SIX3: ${videoShareUrl(video)}`)}`;
}

function ActionButton({
  children,
  icon,
  disabled,
  onClick,
}: {
  children: ReactNode;
  icon: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-3 text-xs font-semibold text-white/70 transition hover:border-white/20 hover:bg-white/[0.1] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

export default function VideosPage() {
  const { user } = useAuth();
  const [videos, setVideos] = useState<AppVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedVideoId, setExpandedVideoId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getUserVideos(user.uid)
      .then(setVideos)
      .catch((error) => {
        console.warn('[videos] Load failed:', error);
        toast.error('Nao foi possivel carregar os videos.');
      })
      .finally(() => setLoading(false));
  }, [user]);

  function bumpStat(videoId: string, field: 'downloads' | 'shares') {
    setVideos((current) => current.map((video) => (
      video.id === videoId
        ? { ...video, [field]: statValue(video[field]) + 1 }
        : video
    )));
    void incrementVideoStat(videoId, field);
  }

  async function copyLink(video: AppVideo) {
    const url = videoShareUrl(video);
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copiado.');
    } catch {
      toast.error('Nao foi possivel copiar o link.');
    }
  }

  async function shareVideo(video: AppVideo) {
    const url = videoShareUrl(video);
    try {
      if (navigator.share) {
        await navigator.share({ title: video.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Link copiado para compartilhar.');
      }
      bumpStat(video.id, 'shares');
    } catch (error) {
      if ((error as Error)?.name !== 'AbortError') {
        await copyLink(video);
      }
    }
  }

  function openWhatsApp(video: AppVideo) {
    window.open(whatsappUrl(video), '_blank', 'noopener,noreferrer');
    bumpStat(video.id, 'shares');
  }

  function openVideo(video: AppVideo) {
    const url = video.status === 'published' ? videoShareUrl(video) : video.videoUrl;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function downloadVideo(video: AppVideo) {
    window.open(video.videoUrl, '_blank', 'noopener,noreferrer');
    bumpStat(video.id, 'downloads');
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-2xl bg-white/5" />)}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Vídeos</h1>
        <p className="text-sm text-white/40">{videos.length} vídeo(s)</p>
      </div>

      {videos.length === 0 ? (
        <EmptyState icon={<Video className="h-8 w-8" />} title="Nenhum vídeo ainda" description="Use a aba Gravar para publicar vídeos." />
      ) : (
        <div className="space-y-3">
          {videos.map((video) => {
            const isExpanded = expandedVideoId === video.id;
            const canPlay = Boolean(video.videoUrl);
            const shareUrl = videoShareUrl(video);

            return (
              <motion.div
                key={video.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-2xl border border-white/[0.08] bg-gradient-glass p-4"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                  <button
                    type="button"
                    disabled={!canPlay}
                    onClick={() => setExpandedVideoId((current) => current === video.id ? null : video.id)}
                    className="group relative h-28 w-full shrink-0 overflow-hidden rounded-xl bg-black/45 ring-1 ring-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50 sm:h-24 lg:h-16 lg:w-24"
                  >
                    {video.thumbnailUrl ? (
                      <img src={video.thumbnailUrl} className="h-full w-full object-cover transition group-hover:scale-105" alt="" loading="lazy" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-white/20">
                        <Video className="h-6 w-6" />
                      </div>
                    )}
                    {canPlay && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/20 text-white transition group-hover:bg-black/35">
                        <PlayCircle className="h-7 w-7 drop-shadow" />
                      </span>
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-medium text-white">{video.title}</span>
                      <Badge variant={statusVariant[video.status] || 'default'}>{statusLabel[video.status] || video.status}</Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-4 text-xs text-white/40">
                      <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{statValue(video.views)}</span>
                      <span className="flex items-center gap-1"><Download className="h-3 w-3" />{statValue(video.downloads)}</span>
                      <span className="flex items-center gap-1"><Share2 className="h-3 w-3" />{statValue(video.shares)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
                    <ActionButton disabled={!canPlay} onClick={() => setExpandedVideoId((current) => current === video.id ? null : video.id)} icon={<PlayCircle className="h-4 w-4" />}>
                      {isExpanded ? 'Fechar' : 'Visualizar'}
                    </ActionButton>
                    <ActionButton disabled={!canPlay} onClick={() => shareVideo(video)} icon={<Share2 className="h-4 w-4" />}>
                      Compartilhar
                    </ActionButton>
                    <ActionButton disabled={!canPlay} onClick={() => openWhatsApp(video)} icon={<MessageCircle className="h-4 w-4" />}>
                      WhatsApp
                    </ActionButton>
                    <ActionButton disabled={!canPlay} onClick={() => downloadVideo(video)} icon={<Download className="h-4 w-4" />}>
                      Baixar
                    </ActionButton>
                    <ActionButton disabled={!canPlay} onClick={() => openVideo(video)} icon={<ExternalLink className="h-4 w-4" />}>
                      Abrir
                    </ActionButton>
                  </div>
                </div>

                {isExpanded && canPlay && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4 overflow-hidden"
                  >
                    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-black">
                      <video
                        key={video.id}
                        src={video.videoUrl}
                        poster={video.thumbnailUrl}
                        controls
                        playsInline
                        preload="metadata"
                        className="max-h-[72vh] w-full bg-black object-contain"
                      />
                    </div>
                    <div className="mt-3 flex flex-col gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] p-3 sm:flex-row sm:items-center">
                      <span className="min-w-0 flex-1 truncate text-xs text-white/40">{shareUrl}</span>
                      <button
                        type="button"
                        onClick={() => copyLink(video)}
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-white/[0.08] px-3 text-xs font-semibold text-white/75 hover:bg-white/[0.12] hover:text-white"
                      >
                        <Copy className="h-4 w-4" />
                        Copiar link
                      </button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
