import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckSquare, Copy, Download, Edit3, ExternalLink, Eye, MessageCircle, Pencil, PlayCircle, Share2, Square, Trash2, Video, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { deleteVideo, getUserVideos, incrementVideoStat, updateVideo } from '@/services/videoService';
import { downloadUrlAsFile } from '@/services/downloadService';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
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
  return `https://wa.me/?text=${encodeURIComponent(`Olha esse vídeo SIX3: ${videoShareUrl(video)}`)}`;
}

function ActionButton({
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
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-full border px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
        tone === 'danger'
          ? 'border-red-300/20 bg-red-500/[0.08] text-red-200 hover:border-red-300/35 hover:bg-red-500/[0.14] hover:text-red-50'
          : 'border-white/10 bg-white/[0.055] text-white/70 hover:border-white/20 hover:bg-white/[0.1] hover:text-white'
      }`}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

export default function VideosPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [videos, setVideos] = useState<AppVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedVideoId, setExpandedVideoId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [deleteIds, setDeleteIds] = useState<string[] | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [renameVideo, setRenameVideo] = useState<AppVideo | null>(null);
  const [titleDraft, setTitleDraft] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);

  useEffect(() => {
    if (!user) return;
    getUserVideos(user.uid)
      .then(setVideos)
      .catch((error) => {
        console.warn('[vídeos] Load failed:', error);
        toast.error('Não foi possível carregar os vídeos.');
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
    setDeleteIds(ids);
  }

  function openRenameModal(video: AppVideo) {
    setRenameVideo(video);
    setTitleDraft(video.title || '');
  }

  function editVideoAgain(video: AppVideo) {
    navigate(`/app/gravar?edit=${encodeURIComponent(video.id)}`);
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
      setExpandedVideoId((current) => current && deletedIds.includes(current) ? null : current);
      if (navigator.onLine) {
        toast.success(deletedIds.length === 1 ? 'Vídeo excluído.' : `${deletedIds.length} vídeos excluídos.`);
      } else {
        toast.info(deletedIds.length === 1
          ? 'Vídeo removido deste dispositivo. A exclusão será enviada depois.'
          : `${deletedIds.length} vídeos removidos deste dispositivo. As exclusoes serão enviadas depois.`);
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

  async function downloadVideo(video: AppVideo) {
    try {
      await downloadUrlAsFile(video.videoUrl, video.title || `six3-video-${video.id}`);
      bumpStat(video.id, 'downloads');
      toast.success('Download iniciado.');
    } catch (error) {
      console.warn('[vídeos] Download failed:', error);
      toast.error('Não foi possível baixar o vídeo.');
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-2xl bg-white/5" />)}
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
        <div className="space-y-3">
          {videos.map((video) => {
            const isExpanded = expandedVideoId === video.id;
            const canPlay = Boolean(video.videoUrl);
            const shareUrl = videoShareUrl(video);
            const isSelected = selectedIds.has(video.id);

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
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition ${
                      isSelected
                        ? 'border-brand-300/35 bg-brand-500/18 text-brand-100'
                        : 'border-white/10 bg-white/[0.045] text-white/38 hover:bg-white/[0.08] hover:text-white'
                    }`}
                    onClick={() => toggleSelection(video.id)}
                    aria-label={isSelected ? 'Remover vídeo da seleção' : 'Selecionar vídeo'}
                  >
                    {isSelected ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
                  </button>
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
                    <ActionButton onClick={() => openRenameModal(video)} icon={<Edit3 className="h-4 w-4" />}>
                      Editar nome
                    </ActionButton>
                    <ActionButton disabled={!canPlay} onClick={() => editVideoAgain(video)} icon={<Pencil className="h-4 w-4" />}>
                      Editar vídeo
                    </ActionButton>
                    <ActionButton disabled={!canPlay} onClick={() => openVideo(video)} icon={<ExternalLink className="h-4 w-4" />}>
                      Abrir
                    </ActionButton>
                    <ActionButton tone="danger" onClick={() => openDeleteConfirmation([video.id])} icon={<Trash2 className="h-4 w-4" />}>
                      Excluir
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
