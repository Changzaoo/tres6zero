import { lazy, Suspense, useEffect, useState } from 'react';
import { Calendar, Video, Share2, Users, Download, Eye, Activity, TrendingUp } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { useAuth } from '@/hooks/useAuth';
import { getUserEvents } from '@/services/eventService';
import { getUserVideos } from '@/services/videoService';
import { getAllLeads } from '@/services/leadService';
import { toast } from '@/components/ui/Toast';
import type { DashboardStats } from '@/types';

const DashboardCharts = lazy(() => import('./DashboardCharts'));

function ChartFallback() {
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="six3-glass p-6">
        <div className="six3-shimmer mb-4 h-5 w-48 rounded-lg bg-white/10" />
        <div className="six3-shimmer h-[200px] rounded-2xl bg-white/10" />
      </div>
      <div className="six3-glass p-6">
        <div className="six3-shimmer mb-4 h-5 w-40 rounded-lg bg-white/10" />
        <div className="six3-shimmer h-[200px] rounded-2xl bg-white/10" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadCharts, setLoadCharts] = useState(false);

  useEffect(() => {
    if (!user) return;

    (async () => {
      try {
        const [eventsResult, videosResult, leadsResult] = await Promise.allSettled([
          getUserEvents(user.uid),
          getUserVideos(user.uid),
          getAllLeads(),
        ]);
        const events = eventsResult.status === 'fulfilled' ? eventsResult.value : [];
        const videos = videosResult.status === 'fulfilled' ? videosResult.value : [];
        const leads = leadsResult.status === 'fulfilled' ? leadsResult.value : [];

        if (eventsResult.status === 'rejected' || videosResult.status === 'rejected' || leadsResult.status === 'rejected') {
          toast.error('Alguns dados do dashboard nao foram carregados.');
        }

        const totalShares = videos.reduce((s, v) => s + (v.shares || 0), 0);
        const totalDownloads = videos.reduce((s, v) => s + (v.downloads || 0), 0);
        const totalViews = videos.reduce((s, v) => s + (v.views || 0), 0);

        setStats({
          totalEvents: events.length,
          totalVideos: videos.length,
          totalShares,
          totalLeads: leads.length,
          totalDownloads,
          totalViews,
          activeEvents: events.filter(e => e.status === 'active').length,
          shareRate: videos.length > 0 ? Math.round((totalShares / videos.length) * 100) : 0,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setLoadCharts(true), 250);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Olá, {user?.name?.split(' ')[0]}</h1>
        <p className="text-white/40 text-sm mt-0.5">Aqui está um resumo da sua plataforma</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Eventos" value={stats?.totalEvents ?? '-'} icon={<Calendar className="w-5 h-5" />} loading={loading} />
        <StatCard title="Vídeos" value={stats?.totalVideos ?? '-'} icon={<Video className="w-5 h-5" />} loading={loading} color="text-green-400" />
        <StatCard title="Leads" value={stats?.totalLeads ?? '-'} icon={<Users className="w-5 h-5" />} loading={loading} color="text-yellow-400" />
        <StatCard title="Compartilhamentos" value={stats?.totalShares ?? '-'} icon={<Share2 className="w-5 h-5" />} loading={loading} color="text-blue-400" />
        <StatCard title="Visualizações" value={stats?.totalViews ?? '-'} icon={<Eye className="w-5 h-5" />} loading={loading} color="text-pink-400" />
        <StatCard title="Downloads" value={stats?.totalDownloads ?? '-'} icon={<Download className="w-5 h-5" />} loading={loading} color="text-orange-400" />
        <StatCard title="Eventos ativos" value={stats?.activeEvents ?? '-'} icon={<Activity className="w-5 h-5" />} loading={loading} color="text-cyan-400" />
        <StatCard title="Taxa compartilhamento" value={stats ? `${stats.shareRate}%` : '-'} icon={<TrendingUp className="w-5 h-5" />} loading={loading} color="text-brand-400" />
      </div>

      {loadCharts ? (
        <Suspense fallback={<ChartFallback />}>
          <DashboardCharts />
        </Suspense>
      ) : (
        <ChartFallback />
      )}
    </div>
  );
}
