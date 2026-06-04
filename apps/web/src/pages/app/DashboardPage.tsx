import { lazy, Suspense, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Video, Share2, Users, Download, Eye, Activity, TrendingUp, Mail, MessageSquareText, ArrowRight } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { useAuth } from '@/hooks/useAuth';
import { getUserEvents } from '@/services/eventService';
import { getUserVideos } from '@/services/videoService';
import { getAllLeads } from '@/services/leadService';
import { getEngagementEvents } from '@/services/engagementService';
import { toast } from '@/components/ui/Toast';
import type { AppEvent, AppVideo, DashboardChartPoint, DashboardStats, EngagementEvent, EngagementEventType, Lead } from '@/types';

const DashboardCharts = lazy(() => import('./DashboardCharts'));

const weekdayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
const linkActionTypes: EngagementEventType[] = ['whatsapp', 'copy_link', 'share', 'qr_code'];

type ResultActivity = {
  id: string;
  title: string;
  detail: string;
  createdAt: string;
};

type ResultsSnapshot = {
  people: number;
  contacts: number;
  feedbacks: number;
  clicks: number;
  recent: ResultActivity[];
};

const engagementLabels: Record<EngagementEventType, string> = {
  view: 'Visualização',
  download: 'Download',
  share: 'Compartilhamento',
  whatsapp: 'WhatsApp',
  copy_link: 'Link copiado',
  qr_code: 'QR Code',
  feedback: 'Feedback',
};

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function safeDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatActivityDate(value?: string) {
  const date = safeDate(value);
  if (!date) return 'Sem data';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

function hasContact(lead: Lead) {
  return Boolean(
    (lead.name && lead.name !== 'Visitante')
    || lead.phone
    || lead.email
    || lead.instagram
  );
}

function countByType(events: EngagementEvent[], types: EngagementEventType[]) {
  return events.filter((event) => types.includes(event.type)).length;
}

function countResultPeople(leads: Lead[], engagementEvents: EngagementEvent[]) {
  const rows = new Map<string, { leads: number; hasAction: boolean }>();

  engagementEvents.forEach((event) => {
    const key = event.visitorId || `event:${event.id}`;
    const row = rows.get(key) || { leads: 0, hasAction: false };
    if (event.type !== 'view') row.hasAction = true;
    rows.set(key, row);
  });

  leads.forEach((lead) => {
    const key = lead.visitorId || `lead:${lead.id}`;
    const row = rows.get(key) || { leads: 0, hasAction: false };
    row.leads += 1;
    rows.set(key, row);
  });

  return Array.from(rows.values()).filter((row) => row.leads > 0 || row.hasAction).length;
}

function buildResultsSnapshot(
  leads: Lead[],
  engagementEvents: EngagementEvent[],
  events: AppEvent[],
  videos: AppVideo[],
): ResultsSnapshot {
  const eventMap = new Map(events.map((event) => [event.id, event]));
  const videoMap = new Map(videos.map((video) => [video.id, video]));
  const feedbackLeads = leads.filter((lead) => Boolean(lead.feedback));
  const recentFromEvents = engagementEvents
    .filter((event) => event.type !== 'view')
    .map((event) => {
      const videoTitle = event.videoId ? videoMap.get(event.videoId)?.title : '';
      const eventName = event.eventId ? eventMap.get(event.eventId)?.name : '';
      return {
        id: `engagement:${event.id}`,
        title: engagementLabels[event.type],
        detail: videoTitle || eventName || 'Link público',
        createdAt: event.createdAt,
      };
    });
  const recentFromFeedbacks = feedbackLeads.map((lead) => ({
    id: `feedback:${lead.id}`,
    title: 'Feedback recebido',
    detail: lead.name && lead.name !== 'Visitante'
      ? lead.name
      : lead.email || lead.phone || videoMap.get(lead.videoId || '')?.title || eventMap.get(lead.eventId)?.name || 'Visitante',
    createdAt: lead.createdAt,
  }));

  return {
    people: countResultPeople(leads, engagementEvents),
    contacts: leads.filter(hasContact).length,
    feedbacks: feedbackLeads.length,
    clicks: countByType(engagementEvents, linkActionTypes),
    recent: [...recentFromEvents, ...recentFromFeedbacks]
      .sort((a, b) => Date.parse(b.createdAt || '') - Date.parse(a.createdAt || ''))
      .slice(0, 5),
  };
}

function buildDashboardChartData(videos: AppVideo[] = [], leads: Lead[] = []): DashboardChartPoint[] {
  const today = startOfLocalDay(new Date());
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (6 - index));
    return day;
  });
  const points = new Map<string, DashboardChartPoint>();

  days.forEach((day) => {
    points.set(dateKey(day), {
      name: weekdayLabels[day.getDay()],
      date: dateKey(day),
      videos: 0,
      leads: 0,
      cumulativeVideos: 0,
      cumulativeLeads: 0,
    });
  });

  videos.forEach((video) => {
    const createdAt = safeDate(video.createdAt);
    if (!createdAt) return;
    const point = points.get(dateKey(startOfLocalDay(createdAt)));
    if (point) point.videos += 1;
  });

  leads.forEach((lead) => {
    const createdAt = safeDate(lead.createdAt);
    if (!createdAt) return;
    const point = points.get(dateKey(startOfLocalDay(createdAt)));
    if (point) point.leads += 1;
  });

  let cumulativeVideos = 0;
  let cumulativeLeads = 0;
  return days.map((day) => {
    const point = points.get(dateKey(day))!;
    cumulativeVideos += point.videos;
    cumulativeLeads += point.leads;
    return { ...point, cumulativeVideos, cumulativeLeads };
  });
}

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
  const [resultsSnapshot, setResultsSnapshot] = useState<ResultsSnapshot | null>(null);
  const [chartData, setChartData] = useState<DashboardChartPoint[]>(() => buildDashboardChartData());
  const [loading, setLoading] = useState(true);
  const [loadCharts, setLoadCharts] = useState(false);

  useEffect(() => {
    if (!user) return;

    (async () => {
      try {
        const [eventsResult, videosResult, leadsResult, engagementResult] = await Promise.allSettled([
          getUserEvents(user.uid),
          getUserVideos(user.uid),
          getAllLeads(),
          getEngagementEvents(),
        ]);
        const events = eventsResult.status === 'fulfilled' ? eventsResult.value : [];
        const videos = videosResult.status === 'fulfilled' ? videosResult.value : [];
        const leads = leadsResult.status === 'fulfilled' ? leadsResult.value : [];
        const engagementEvents = engagementResult.status === 'fulfilled' ? engagementResult.value : [];

        if (
          eventsResult.status === 'rejected'
          || videosResult.status === 'rejected'
          || leadsResult.status === 'rejected'
          || engagementResult.status === 'rejected'
        ) {
          toast.error('Alguns dados do dashboard não foram carregados.');
        }

        const totalShares = videos.reduce((s, v) => s + (v.shares || 0), 0);
        const totalDownloads = videos.reduce((s, v) => s + (v.downloads || 0), 0);
        const totalViews = videos.reduce((s, v) => s + (v.views || 0), 0);

        setChartData(buildDashboardChartData(videos, leads));
        setResultsSnapshot(buildResultsSnapshot(leads, engagementEvents, events, videos));
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
        <h1 className="text-2xl font-black tracking-[-0.02em] text-white">
          Olá, <span className="six3-gradient-text">{user?.name?.split(' ')[0]}</span>
        </h1>
        <p className="mt-1 text-sm text-white/40">Aqui está um resumo da sua plataforma SIX3°</p>
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

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">Resultados dos links</h2>
            <p className="mt-1 text-sm text-white/40">Resumo dos cliques, contatos e feedbacks recebidos nas páginas públicas.</p>
          </div>
          <Link
            to="/app/leads"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-4 py-2 text-sm font-semibold text-white/72 transition hover:border-brand-300/35 hover:text-white"
          >
            Ver detalhes
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard title="Pessoas" value={resultsSnapshot?.people ?? '-'} icon={<Users className="w-5 h-5" />} loading={loading} color="text-cyan-300" />
          <StatCard title="Contatos" value={resultsSnapshot?.contacts ?? '-'} icon={<Mail className="w-5 h-5" />} loading={loading} color="text-green-300" />
          <StatCard title="Feedbacks" value={resultsSnapshot?.feedbacks ?? '-'} icon={<MessageSquareText className="w-5 h-5" />} loading={loading} color="text-yellow-300" />
          <StatCard title="Cliques" value={resultsSnapshot?.clicks ?? '-'} icon={<Share2 className="w-5 h-5" />} loading={loading} color="text-blue-300" />
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-gradient-glass p-5">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-brand-300" />
            <h3 className="text-base font-semibold text-white">Últimas interações</h3>
          </div>
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="six3-shimmer h-20 rounded-2xl bg-white/10" />
              ))}
            </div>
          ) : resultsSnapshot?.recent.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {resultsSnapshot.recent.map((item) => (
                <div key={item.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
                  <p className="truncate text-sm font-semibold text-white">{item.title}</p>
                  <p className="mt-1 truncate text-xs text-white/45">{item.detail}</p>
                  <p className="mt-3 text-[11px] text-white/30">{formatActivityDate(item.createdAt)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-5 text-center text-sm text-white/38">
              Nenhuma interação real registrada ainda.
            </p>
          )}
        </div>
      </section>

      {loadCharts ? (
        <Suspense fallback={<ChartFallback />}>
          <DashboardCharts data={chartData} />
        </Suspense>
      ) : (
        <ChartFallback />
      )}
    </div>
  );
}
