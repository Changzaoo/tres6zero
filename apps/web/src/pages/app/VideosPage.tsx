import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckSquare,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  MessageCircle,
  MoreVertical,
  Pencil,
  PlayCircle,
  Share2,
  Square,
  Trash2,
  Video,
  X,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { getUserEvents } from '@/services/eventService';
import { deleteVideo, getUserVideos, incrementVideoStat, updateVideo } from '@/services/videoService';
import { downloadUrlAsFile } from '@/services/downloadService';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/Toast';
import type { AppEvent, AppVideo } from '@/types';

const STANDALONE_EVENT_ID = 'standalone';

const statusLabel: Record<string, string> = {
  uploaded: 'Enviado',
  processing: 'Processando',
  processed: 'Processado',
  failed: 'Falhou',
  published: 'Publicado',
};

const statusTone: Record<string, string> = {
  uploaded: 'border-cyan-300/25 bg-cyan-400/14 text-cyan-100',
  processing: 'border-amber-300/25 bg-amber-400/14 text-amber-100',
  processed: 'border-emerald-300/25 bg-emerald-400/14 text-emerald-100',
  failed: 'border-red-300/25 bg-red-400/14 text-red-100',
  published: 'border-emerald-300/25 bg-emerald-400/14 text-emerald-100',
};

const compactNumber = new Intl.NumberFormat('pt-BR', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

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
  return `https://wa.me/?text=${encodeURIComponent(`Olha esse vídeo SIX3: ${videoShareUrl(video)}`)}`;
}

function formatDuration(duration?: number) {
  if (!Number.isFinite(duration) || !duration) return null;
  const total = Math.max(0, Math.round(duration));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function formatRelativeDate(value?: string) {
  if (!value) return 'agora';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'agora';

  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const abs = Math.abs(diffSeconds);
  const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });

  if (abs < 60) return rtf.format(diffSeconds, 'second');
  if (abs < 3600) return rtf.format(Math.round(diffSeconds / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diffSeconds / 3600), 'hour');
  if (abs < 2592000) return rtf.format(Math.round(diffSeconds / 86400), 'day');
  if (abs < 31536000) return rtf.format(Math.round(diffSeconds / 2592000), 'month');
  return rtf.format(Math.round(diffSeconds / 31536000), 'year');
}

function formatViews(value?: number) {
  const views = statValue(value);
  return `${compactNumber.format(views)} ${views === 1 ? 'visualização' : 'visualizações'}`;
}

function eventForVideo(video: AppVideo, eventMap: Map<string, AppEvent>) {
  if (!video.eventId || video.eventId === STANDALONE_EVENT_ID) return null;
  return eventMap.get(video.eventId) || null;
}

function eventNameForVideo(video: AppVideo, eventMap: Map<string, AppEvent>) {
  if (!video.eventId || video.eventId === STANDALONE_EVENT_ID) return 'Vídeo avulso';
  return eventMap.get(video.eventId)?.name || 'Evento';
}

function eventInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || 'S';
}

function MenuAction({
  children,
  icon,
  disabled,
  tone = 'default',
  onClick,
}: {
  children: ReactNode;
  icon: ReactNode;
  disabled?: boolean;
  tone?: 'default' | 'danger';
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
        tone === 'danger'
          ? 'text-red-200 hover:bg-red-500/12 hover:text-red-100'
          : 'text-white/72 hover:bg-white/[0.07] hover:text-white'
      }`}
    >
      <span className="grid h-5 w-5 place-items-center text-white/45">{icon}</span>
      <span>{children}</span>
    </button>
  );
}

export default function VideosPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [videos, setVideos] = useState<AppVideo[]>([]);
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [inlinePreviewId, setInlinePreviewId] = useState<string | null>(null);
  const [previewVideo, setPreviewVideo] = useState<AppVideo | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [deleteIds, setDeleteIds] = useState<string[] | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [renameVideo, setRenameVideo] = useState<AppVideo | null>(null);
  const [titleDraft, setTitleDraft] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);

  const eventMap = useMemo(() => new Map(events.map((event) => [event.id, event])), [events]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    setLoading(true);
    Promise.allSettled([
      getUserVideos(user.uid),
      getUserEvents(user.uid),
    ])
      .then(([videosResult, eventsResult]) => {
        if (cancelled) return;

        if (videosResult.status === 'fulfilled') {
          setVideos(videosResult.value);
        } else {
          console.warn('[vídeos] Load failed:', videosResult.reason);
          toast.error('Não foi possível carregar os vídeos.');
        }

        if (eventsResult.status === 'fulfilled') {
          setEvents(eventsResult.value);
        } else {
          console.warn('[vídeos] Event load failed:', eventsResult.reason);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!openMenuId) return undefined;
    const closeMenu = () => setOpenMenuId(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, [openMenuId]);

  function bumpStat(videoId: string, field: 'downloads' | 'shares') {
    setVideos((current) => current.map((video) => (
      video.id === videoId
        ? { ...video, [field]: statValue(video[field]) + 1 }
        : video
    )));
    void incrementVideoStat(videoId, field);
  }

  function toggleSelection(videoId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(videoId)) next.delete(videoId);
      else next.add(videoId);
      return next;
    });
  }

  function selectAllVideos() {
    setSelectedIds(new Set(videos.map((video) => video.id)));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function openDeleteConfirmation(ids: string[]) {
    if (ids.length === 0) return;
    setOpenMenuId(null);
    setDeleteIds(ids);
  }

  function openRenameModal(video: AppVideo) {
    setOpenMenuId(null);
    setRenameVideo(video);
    setTitleDraft(video.title || '');
  }

  function editVideoAgain(video: AppVideo) {
    setOpenMenuId(null);
    navigate(`/app/gravar?edit=${encodeURIComponent(video.id)}`);
  }

  function openPreview(video: AppVideo) {
    setOpenMenuId(null);
    setInlinePreviewId(null);
    setPreviewVideo(video);
  }

  async function saveVideoTitle() {
    if (!renameVideo) return;
    const nextTitle = titleDraft.trim();
    if (!nextTitle) {
      toast.error('Digite um nome para o vídeo.');
      return;
    }

    setSavingTitle(true);
    try {
      await updateVideo(renameVideo.id, { title: nextTitle });
      setVideos((current) => current.map((video) => (
        video.id === renameVideo.id
          ? { ...video, title: nextTitle, updatedAt: new Date().toISOString() }
          : video
      )));
      setRenameVideo(null);
      setTitleDraft('');
      toast.success('Nome do vídeo atualizado.');
    } catch (error) {
      console.warn('[vídeos] Rename failed:', error);
      toast.error('Não foi possível atualizar o nome.');
    } finally {
      setSavingTitle(false);
    }
  }

  async function confirmDelete() {
    if (!deleteIds?.length) return;
    setDeleting(true);

    const results = await Promise.allSettled(deleteIds.map((id) => deleteVideo(id)));
    const deletedIds = deleteIds.filter((_, index) => results[index].status === 'fulfilled');
    const failedCount = results.length - deletedIds.length;

    if (deletedIds.length) {
      setVideos((current) => current.filter((video) => !deletedIds.includes(video.id)));
      setSelectedIds((current) => {
        const next = new Set(current);
        deletedIds.forEach((id) => next.delete(id));
        return next;
      });
      if (previewVideo && deletedIds.includes(previewVideo.id)) setPreviewVideo(null);
      if (navigator.onLine) {
        toast.success(deletedIds.length === 1 ? 'Vídeo excluído.' : `${deletedIds.length} vídeos excluídos.`);
      } else {
        toast.info(deletedIds.length === 1
          ? 'Vídeo removido deste dispositivo. A exclusão será enviada depois.'
          : `${deletedIds.length} vídeos removidos deste dispositivo. As exclusões serão enviadas depois.`);
      }
    }

    if (failedCount) {
      toast.error(failedCount === 1 ? 'Não foi possível excluir 1 vídeo.' : `Não foi possível excluir ${failedCount} vídeos.`);
    }

    setDeleteIds(null);
    setDeleting(false);
  }

  async function copyLink(video: AppVideo) {
    const url = videoShareUrl(video);
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copiado.');
    } catch {
      toast.error('Não foi possível copiar o link.');
    }
  }

  async function shareVideo(video: AppVideo) {
    setOpenMenuId(null);
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
    setOpenMenuId(null);
    window.open(whatsappUrl(video), '_blank', 'noopener,noreferrer');
    bumpStat(video.id, 'shares');
  }

  function openVideo(video: AppVideo) {
    setOpenMenuId(null);
    setInlinePreviewId(null);
    const url = video.status === 'published' ? videoShareUrl(video) : video.videoUrl;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  async function downloadVideo(video: AppVideo) {
    setOpenMenuId(null);
    try {
      await downloadUrlAsFile(video.videoUrl, video.title || `six3-video-${video.id}`);
      bumpStat(video.id, 'downloads');
      toast.success('Download iniciado.');
    } catch (error) {
      console.warn('[vídeos] Download failed:', error);
      toast.error('Não foi possível baixar o vídeo.');
    }
  }

  async function copyVideoLinkFromMenu(video: AppVideo) {
    setOpenMenuId(null);
    await copyLink(video);
  }

  if (loading) {
    return (
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="animate-pulse space-y-3">
            <div className="aspect-video rounded-xl bg-white/5" />
            <div className="h-4 w-4/5 rounded bg-white/5" />
            <div className="h-3 w-1/2 rounded bg-white/5" />
          </div>
        ))}
      </div>
    );
  }

  const selectedCount = selectedIds.size;
  const allSelected = videos.length > 0 && selectedCount === videos.length;
  const deleteCount = deleteIds?.length || 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Vídeos</h1>
          <p className="text-sm text-white/40">{videos.length} vídeo(s)</p>
        </div>
        {videos.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="inline-flex h-9 items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3 text-xs font-semibold text-white/62 transition hover:bg-white/[0.08] hover:text-white"
              onClick={allSelected ? clearSelection : selectAllVideos}
            >
              {allSelected ? <CheckSquare className="h-4 w-4 text-brand-200" /> : <Square className="h-4 w-4" />}
              {allSelected ? 'Limpar seleção' : 'Selecionar todos'}
            </button>
            {selectedCount > 0 && (
              <>
                <span className="rounded-full border border-brand-300/20 bg-brand-500/10 px-3 py-2 text-xs font-semibold text-brand-100">
                  {selectedCount} selecionado(s)
                </span>
                <Button
                  size="sm"
                  variant="danger"
                  icon={<Trash2 className="h-4 w-4" />}
                  onClick={() => openDeleteConfirmation([...selectedIds])}
                >
                  Excluir selecionados
                </Button>
                <button
                  type="button"
                  className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.045] text-white/45 transition hover:bg-white/[0.08] hover:text-white"
                  onClick={clearSelection}
                  aria-label="Limpar seleção"
                >
                  <X className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {videos.length === 0 ? (
        <EmptyState icon={<Video className="h-8 w-8" />} title="Nenhum vídeo ainda" description="Use a aba Gravar para publicar vídeos." />
      ) : (
        <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {videos.map((video) => {
            const canPlay = Boolean(video.videoUrl);
            const isSelected = selectedIds.has(video.id);
            const duration = formatDuration(video.duration);
            const event = eventForVideo(video, eventMap);
            const eventName = eventNameForVideo(video, eventMap);
            const menuOpen = openMenuId === video.id;
            const showInlinePreview = canPlay && inlinePreviewId === video.id;

            return (
              <motion.article
                key={video.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative min-w-0"
              >
                <div
                  className="relative overflow-hidden rounded-xl bg-black ring-1 ring-white/[0.08]"
                  onMouseEnter={() => {
                    if (canPlay) setInlinePreviewId(video.id);
                  }}
                  onMouseLeave={() => {
                    setInlinePreviewId((current) => current === video.id ? null : current);
                  }}
                  onFocus={() => {
                    if (canPlay) setInlinePreviewId(video.id);
                  }}
                  onBlur={(eventBlur) => {
                    if (!eventBlur.currentTarget.contains(eventBlur.relatedTarget)) {
                      setInlinePreviewId((current) => current === video.id ? null : current);
                    }
                  }}
                >
                  <button
                    type="button"
                    disabled={!canPlay}
                    onClick={() => openPreview(video)}
                    className="relative block aspect-video w-full overflow-hidden bg-black disabled:cursor-not-allowed"
                    aria-label={`Visualizar ${video.title || 'vídeo'}`}
                  >
                    {video.thumbnailUrl ? (
                      <img
                        src={video.thumbnailUrl}
                        className={`h-full w-full object-cover transition duration-300 group-hover:scale-[1.03] ${showInlinePreview ? 'opacity-0' : 'opacity-100'}`}
                        alt=""
                        loading="lazy"
                      />
                    ) : canPlay ? (
                      <video
                        src={video.videoUrl}
                        muted
                        playsInline
                        preload="metadata"
                        className={`h-full w-full object-cover transition duration-300 ${showInlinePreview ? 'opacity-0' : 'opacity-100'}`}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-white/[0.06] to-white/[0.015] text-white/28">
                        <Video className="h-10 w-10" />
                      </div>
                    )}
                    {showInlinePreview && (
                      <video
                        src={video.videoUrl}
                        autoPlay
                        muted
                        loop
                        playsInline
                        preload="auto"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    )}
                    {canPlay && (
                      <span className={`absolute inset-0 grid place-items-center text-white transition ${showInlinePreview ? 'bg-black/0 opacity-0' : 'bg-black/0 opacity-0 group-hover:bg-black/20 group-hover:opacity-100'}`}>
                        <PlayCircle className="h-12 w-12 drop-shadow" />
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    className={`absolute left-2 top-2 grid h-8 w-8 place-items-center rounded-lg border text-white shadow-lg shadow-black/35 backdrop-blur transition ${
                      isSelected
                        ? 'border-brand-200/50 bg-brand-500/80'
                        : 'border-white/14 bg-black/45 hover:bg-black/65'
                    }`}
                    onClick={(eventClick) => {
                      eventClick.stopPropagation();
                      toggleSelection(video.id);
                    }}
                    aria-label={isSelected ? 'Remover vídeo da seleção' : 'Selecionar vídeo'}
                  >
                    {isSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                  </button>

                  <span className={`absolute right-2 top-2 rounded-full border px-2 py-1 text-[11px] font-bold shadow-lg shadow-black/30 backdrop-blur ${statusTone[video.status] || 'border-white/15 bg-black/45 text-white/70'}`}>
                    {statusLabel[video.status] || video.status}
                  </span>

                  {duration && (
                    <span className="absolute bottom-2 right-2 rounded bg-black/75 px-1.5 py-0.5 text-xs font-bold text-white">
                      {duration}
                    </span>
                  )}

                  {showInlinePreview && (
                    <span className="absolute bottom-2 left-2 rounded bg-black/75 px-2 py-0.5 text-[11px] font-bold uppercase tracking-normal text-white/90">
                      Preview
                    </span>
                  )}
                </div>

                <div className="mt-3 flex min-w-0 gap-3">
                  <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-gradient-brand text-sm font-black text-white shadow-lg shadow-brand-500/20">
                    {event?.coverUrl ? (
                      <img src={event.coverUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <span className="grid h-full w-full place-items-center">{eventInitial(eventName)}</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      disabled={!canPlay}
                      onClick={() => openPreview(video)}
                      className="block w-full text-left text-sm font-bold leading-snug text-white transition hover:text-brand-100 disabled:cursor-default disabled:hover:text-white"
                    >
                      <span
                        className="block overflow-hidden"
                        style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
                      >
                        {video.title || 'Vídeo sem nome'}
                      </span>
                    </button>
                    <p className="mt-1 truncate text-sm text-white/50">{eventName}</p>
                    <p className="mt-0.5 truncate text-xs text-white/35">
                      {formatViews(video.views)} • {formatRelativeDate(video.createdAt)}
                    </p>
                  </div>

                  <div className="relative shrink-0">
                    <button
                      type="button"
                      className="grid h-9 w-9 place-items-center rounded-full text-white/58 transition hover:bg-white/[0.08] hover:text-white"
                      onClick={(eventClick) => {
                        eventClick.stopPropagation();
                        setInlinePreviewId(null);
                        setOpenMenuId((current) => current === video.id ? null : video.id);
                      }}
                      aria-label="Abrir ações do vídeo"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </button>

                    {menuOpen && (
                      <div
                        className="absolute right-0 top-10 z-30 w-56 rounded-2xl border border-white/[0.12] bg-[#14161e] p-2 shadow-2xl shadow-black/60"
                        onClick={(eventClick) => eventClick.stopPropagation()}
                      >
                        <MenuAction disabled={!canPlay} onClick={() => openPreview(video)} icon={<PlayCircle className="h-4 w-4" />}>
                          Visualizar
                        </MenuAction>
                        <MenuAction disabled={!canPlay} onClick={() => shareVideo(video)} icon={<Share2 className="h-4 w-4" />}>
                          Compartilhar
                        </MenuAction>
                        <MenuAction disabled={!canPlay} onClick={() => openWhatsApp(video)} icon={<MessageCircle className="h-4 w-4" />}>
                          WhatsApp
                        </MenuAction>
                        <MenuAction disabled={!canPlay} onClick={() => copyVideoLinkFromMenu(video)} icon={<Copy className="h-4 w-4" />}>
                          Copiar link
                        </MenuAction>
                        <MenuAction disabled={!canPlay} onClick={() => downloadVideo(video)} icon={<Download className="h-4 w-4" />}>
                          Baixar
                        </MenuAction>
                        <div className="my-1 h-px bg-white/[0.08]" />
                        <MenuAction onClick={() => openRenameModal(video)} icon={<Edit3 className="h-4 w-4" />}>
                          Editar nome
                        </MenuAction>
                        <MenuAction disabled={!canPlay} onClick={() => editVideoAgain(video)} icon={<Pencil className="h-4 w-4" />}>
                          Editar vídeo
                        </MenuAction>
                        <MenuAction disabled={!canPlay} onClick={() => openVideo(video)} icon={<ExternalLink className="h-4 w-4" />}>
                          Abrir
                        </MenuAction>
                        <div className="my-1 h-px bg-white/[0.08]" />
                        <MenuAction tone="danger" onClick={() => openDeleteConfirmation([video.id])} icon={<Trash2 className="h-4 w-4" />}>
                          Excluir
                        </MenuAction>
                      </div>
                    )}
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}

      <Modal
        open={Boolean(previewVideo)}
        onClose={() => setPreviewVideo(null)}
        title={previewVideo?.title || 'Visualizar vídeo'}
        size="xl"
        panelClassName="max-w-5xl"
      >
        {previewVideo && (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-black">
              <video
                key={previewVideo.id}
                src={previewVideo.videoUrl}
                poster={previewVideo.thumbnailUrl}
                controls
                playsInline
                preload="metadata"
                className="max-h-[72vh] w-full bg-black object-contain"
              />
            </div>
            <div className="flex flex-col gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] p-3 sm:flex-row sm:items-center">
              <span className="min-w-0 flex-1 truncate text-xs text-white/40">{videoShareUrl(previewVideo)}</span>
              <button
                type="button"
                onClick={() => copyLink(previewVideo)}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-white/[0.08] px-3 text-xs font-semibold text-white/75 hover:bg-white/[0.12] hover:text-white"
              >
                <Copy className="h-4 w-4" />
                Copiar link
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={Boolean(renameVideo)} onClose={() => !savingTitle && setRenameVideo(null)} title="Editar nome do vídeo">
        <div className="space-y-5">
          <Input
            label="Nome do vídeo"
            value={titleDraft}
            onChange={(event) => setTitleDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void saveVideoTitle();
            }}
            maxLength={90}
            autoFocus
          />
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="secondary" className="flex-1 justify-center" disabled={savingTitle} onClick={() => setRenameVideo(null)}>
              Cancelar
            </Button>
            <Button className="flex-1 justify-center" loading={savingTitle} onClick={saveVideoTitle}>
              Salvar nome
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={Boolean(deleteIds?.length)} onClose={() => !deleting && setDeleteIds(null)} title={deleteCount === 1 ? 'Excluir vídeo' : 'Excluir vídeos'}>
        <p className="mb-6 text-sm leading-relaxed text-white/70">
          {deleteCount === 1
            ? 'Tem certeza que deseja excluir este vídeo? Esta ação não pode ser desfeita.'
            : `Tem certeza que deseja excluir ${deleteCount} vídeos selecionados? Esta ação não pode ser desfeita.`}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="secondary" className="flex-1 justify-center" disabled={deleting} onClick={() => setDeleteIds(null)}>
            Cancelar
          </Button>
          <Button variant="danger" className="flex-1 justify-center" loading={deleting} onClick={confirmDelete}>
            Excluir
          </Button>
        </div>
      </Modal>
    </div>
  );
}
