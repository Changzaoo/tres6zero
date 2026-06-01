import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Video, Share2, Users, Download, Eye, Activity, TrendingUp } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/hooks/useAuth';
import { getUserEvents } from '@/services/eventService';
import { getUserVideos } from '@/services/videoService';
import { getAllLeads } from '@/services/leadService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import type { DashboardStats } from '@/types';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [events, videos, leads] = await Promise.all([
          getUserEvents(user.uid),
          getUserVideos(user.uid),
          getAllLeads(),
        ]);
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
      } finally { setLoading(false); }
    })();
  }, [user]);

  const chartData = [
    { name: 'Seg', videos: 4, leads: 8 },
    { name: 'Ter', videos: 7, leads: 14 },
    { name: 'Qua', videos: 3, leads: 6 },
    { name: 'Qui', videos: 9, leads: 18 },
    { name: 'Sex', videos: 12, leads: 24 },
    { name: 'Sáb', videos: 18, leads: 36 },
    { name: 'Dom', videos: 15, leads: 30 },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Olá, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="text-white/40 text-sm mt-0.5">Aqui está um resumo da sua plataforma</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Eventos" value={stats?.totalEvents ?? '—'} icon={<Calendar className="w-5 h-5" />} loading={loading} />
        <StatCard title="Vídeos" value={stats?.totalVideos ?? '—'} icon={<Video className="w-5 h-5" />} loading={loading} color="text-green-400" />
        <StatCard title="Leads" value={stats?.totalLeads ?? '—'} icon={<Users className="w-5 h-5" />} loading={loading} color="text-yellow-400" />
        <StatCard title="Compartilhamentos" value={stats?.totalShares ?? '—'} icon={<Share2 className="w-5 h-5" />} loading={loading} color="text-blue-400" />
        <StatCard title="Visualizações" value={stats?.totalViews ?? '—'} icon={<Eye className="w-5 h-5" />} loading={loading} color="text-pink-400" />
        <StatCard title="Downloads" value={stats?.totalDownloads ?? '—'} icon={<Download className="w-5 h-5" />} loading={loading} color="text-orange-400" />
        <StatCard title="Eventos ativos" value={stats?.activeEvents ?? '—'} icon={<Activity className="w-5 h-5" />} loading={loading} color="text-cyan-400" />
        <StatCard title="Taxa compartilhamento" value={stats ? `${stats.shareRate}%` : '—'} icon={<TrendingUp className="w-5 h-5" />} loading={loading} color="text-brand-400" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="text-sm font-semibold text-white/70 mb-4">Vídeos e Leads (últimos 7 dias)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff' }} />
              <Bar dataKey="videos" fill="#7c3aed" radius={[4, 4, 0, 0]} name="Vídeos" />
              <Bar dataKey="leads" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Leads" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-white/70 mb-4">Crescimento semanal</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff' }} />
              <Line type="monotone" dataKey="videos" stroke="#7c3aed" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="leads" stroke="#4f46e5" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
