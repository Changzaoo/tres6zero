import { useEffect, useState } from 'react';
import { Video, Eye, Download, Share2, ExternalLink } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getUserVideos } from '@/services/videoService';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { motion } from 'framer-motion';
import type { AppVideo } from '@/types';

const statusLabel: Record<string, string> = { uploaded: 'Enviado', processing: 'Processando', processed: 'Processado', failed: 'Falhou', published: 'Publicado' };
const statusVariant: Record<string, any> = { uploaded: 'info', processing: 'warning', processed: 'success', failed: 'danger', published: 'success' };

export default function VideosPage() {
  const { user } = useAuth();
  const [videos, setVideos] = useState<AppVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getUserVideos(user.uid).then(setVideos).finally(() => setLoading(false));
  }, [user]);

  if (loading) return <div className="animate-pulse space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-2xl bg-white/5" />)}</div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Vídeos</h1>
        <p className="text-white/40 text-sm">{videos.length} vídeo(s)</p>
      </div>

      {videos.length === 0 ? (
        <EmptyState icon={<Video className="w-8 h-8" />} title="Nenhum vídeo ainda" description="Use o Modo Operador para publicar vídeos." />
      ) : (
        <div className="space-y-3">
          {videos.map(v => (
            <motion.div key={v.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="bg-gradient-glass border border-white/[0.08] rounded-2xl p-4 flex items-center gap-4">
              <div className="w-16 h-12 rounded-xl bg-black/40 overflow-hidden shrink-0">
                {v.thumbnailUrl ? <img src={v.thumbnailUrl} className="w-full h-full object-cover" alt="" /> :
                  <div className="w-full h-full flex items-center justify-center text-white/20"><Video className="w-5 h-5" /></div>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white truncate">{v.title}</span>
                  <Badge variant={statusVariant[v.status]}>{statusLabel[v.status]}</Badge>
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-white/40">
                  <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{v.views}</span>
                  <span className="flex items-center gap-1"><Download className="w-3 h-3" />{v.downloads}</span>
                  <span className="flex items-center gap-1"><Share2 className="w-3 h-3" />{v.shares}</span>
                </div>
              </div>
              {v.videoUrl && (
                <a href={v.videoUrl} target="_blank" rel="noreferrer" className="p-2 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.08]">
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
