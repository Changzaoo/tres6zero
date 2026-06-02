import { useEffect, useState } from 'react';
import { Download, ExternalLink, Eye, Share2, Video } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { getUserVideos } from '@/services/videoService';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
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

export default function VideosPage() {
  const { user } = useAuth();
  const [videos, setVideos] = useState<AppVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getUserVideos(user.uid).then(setVideos).finally(() => setLoading(false));
  }, [user]);

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
          {videos.map((video) => (
            <motion.div
              key={video.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-gradient-glass p-4"
            >
              <div className="h-12 w-16 shrink-0 overflow-hidden rounded-xl bg-black/40">
                {video.thumbnailUrl ? (
                  <img src={video.thumbnailUrl} className="h-full w-full object-cover" alt="" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-white/20">
                    <Video className="h-5 w-5" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-white">{video.title}</span>
                  <Badge variant={statusVariant[video.status] || 'default'}>{statusLabel[video.status] || video.status}</Badge>
                </div>
                <div className="mt-1 flex items-center gap-4 text-xs text-white/40">
                  <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{video.views}</span>
                  <span className="flex items-center gap-1"><Download className="h-3 w-3" />{video.downloads}</span>
                  <span className="flex items-center gap-1"><Share2 className="h-3 w-3" />{video.shares}</span>
                </div>
              </div>
              {video.videoUrl && (
                <a href={video.videoUrl} target="_blank" rel="noreferrer" className="rounded-lg p-2 text-white/30 hover:bg-white/[0.08] hover:text-white">
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
