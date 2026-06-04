import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Video, Share2, Users, Download, Eye, Activity, TrendingUp, Mail, MessageSquareText, ArrowRight } from 'lucide-react';
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
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="six3-glass p-4 sm:p-6">
        <div className="six3-shimmer mb-4 h-5 w-48 rounded-lg bg-white/10" />
        <div className="six3-shimmer h-[200px] rounded-2xl bg-white/10" />
      </div>
      <div className="six3-glass p-4 sm:p-6">
        <div className="six3-shimmer mb-4 h-5 w-40 rounded-lg bg-white/10" />
        <div className="six3-shimmer h-[200px] rounded-2xl bg-white/10" />
      </div>
    </div>
  );
}

type MetricTone = 'brand' | 'blue' | 'green' | 'yellow' | 'orange' | 'pink' | 'cyan';

const metricToneClass: Record<MetricTone, { shell: string; icon: string; value: string; bar: string }> = {
  brand: {
    shell: 'border-brand-300/18 bg-brand-500/[0.08]',
    icon: 'border-brand-200/18 bg-brand-500/14 text-brand-100',
    value: 'text-brand-50',
    bar: 'bg-brand-400',
  },
  blue: {
    shell: 'border-blue-300/16 bg-blue-500/[0.07]',
    icon: 'border-blue-200/18 bg-blue-500/14 text-blue-100',
    value: 'text-blue-50',
    bar: 'bg-blue-400',
  },
  green: {
    shell: 'border-emerald-300/16 bg-emerald-500/[0.07]',
    icon: 'border-emerald-200/18 bg-emerald-500/14 text-emerald-100',
    value: 'text-emerald-50',
    bar: 'bg-emerald-400',
  },
  yellow: {
    shell: 'border-yellow-300/16 bg-yellow-500/[0.07]',
    icon: 'border-yellow-200/18 bg-yellow-500/14 text-yellow-100',
    value: 'text-yellow-50',
    bar: 'bg-yellow-300',
  },
  orange: {
    shell: 'border-orange-300/16 bg-orange-500/[0.07]',
    icon: 'border-orange-200/18 bg-orange-500/14 text-orange-100',
    value: 'text-orange-50',
    bar: 'bg-orange-400',
  },
  pink: {
    shell: 'border-pink-300/16 bg-pink-500/[0.07]',
    icon: 'border-pink-200/18 bg-pink-500/14 text-pink-100',
    value: 'text-pink-50',
    bar: 'bg-pink-400',
  },
  cyan: {
    shell: 'border-cyan-300/16 bg-cyan-500/[0.07]',
    icon: 'border-cyan-200/18 bg-cyan-500/14 text-cyan-100',
    value: 'text-cyan-50',
    bar: 'bg-cyan-400',
  },
};

function MetricCard({
  title,
  value,
  helper,
  icon,
  tone = 'brand',
  loading,
}: {
  title: string;
  value: string | number;
  helper: string;
  icon: ReactNode;
  tone?: MetricTone;
  loading?: boolean;
}) {
  const toneClass = metricToneClass[tone];

  return (
    <div className={`relative min-w-0 overflow-hidden rounded-[20px] border p-3 ${toneClass.shell}`}>
      <span className={`absolute inset-x-0 top-0 h-0.5 ${toneClass.bar}`} />
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-bold uppercase tracking-normal text-white/42">{title}</p>
          {loading ? (
            <div className="six3-shimmer mt-3 h-7 w-16 rounded-lg bg-white/10" />
          ) : (
            <p className={`mt-1 truncate text-2xl font-black leading-none ${toneClass.value}`}>{value}</p>
          )}
        </div>
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-2xl border ${toneClass.icon}`}>
          {icon}
        </span>
      </div>
      <p className="mt-2 line-clamp-2 min-h-[2rem] text-xs leading-snug text-white/44">{helper}</p>
    </div>
  );
}

function InsightPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-black/22 px-3 py-2">
      <p className="truncate text-[11px] font-semibold text-white/38">{label}</p>
      <p className="mt-0.5 truncate text-sm font-black text-white">{value}</p>
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

  const firstName = user?.name?.split(' ')[0] || 'Admin';
  const contentTotal = stats ? stats.totalEvents + stats.totalVideos : '-';
  const publicActions = stats ? stats.totalViews + stats.totalDownloads + stats.totalShares : '-';
  const peopleSummary = resultsSnapshot
    ? `${resultsSnapshot.people} pessoa(s), ${resultsSnapshot.contacts} contato(s)`
    : 'Carregando pessoas e contatos';

  return (
    <div className="space-y-4 pb-4 animate-fade-in">
      <section className="relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#0d111b] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.34)] sm:p-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(82,100,255,0.24),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.018))]" />
        <div className="relative">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-brand-100/68">Resumo simples</p>
          <h1 className="mt-2 text-3xl font-black leading-tight text-white">
            Olá, <span className="six3-gradient-text">{firstName}</span>
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-white/55">
            Veja em uma tela o que foi publicado, quantas pessoas interagiram e quais links deram resultado.
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <InsightPill label="Conteúdo" value={contentTotal} />
            <InsightPill label="Ações" value={publicActions} />
            <InsightPill label="Pessoas" value={resultsSnapshot?.people ?? '-'} />
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="rounded-2xl border border-white/[0.08] bg-black/22 px-3 py-2 text-xs font-semibold text-white/48">
              {loading ? 'Carregando os números mais recentes...' : peopleSummary}
            </p>
            <Link
              to="/app/leads"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-black text-[#10131c] transition hover:bg-brand-50"
            >
              Ver contatos
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-black text-white">O que você já tem</h2>
          <p className="mt-0.5 text-xs text-white/42">Eventos e vídeos publicados na sua conta.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          <MetricCard title="Eventos" value={stats?.totalEvents ?? '-'} helper="Páginas de evento criadas." icon={<Calendar className="h-4 w-4" />} loading={loading} tone="brand" />
          <MetricCard title="Vídeos" value={stats?.totalVideos ?? '-'} helper="Vídeos prontos ou publicados." icon={<Video className="h-4 w-4" />} loading={loading} tone="green" />
          <MetricCard title="Ativos" value={stats?.activeEvents ?? '-'} helper="Eventos abertos agora." icon={<Activity className="h-4 w-4" />} loading={loading} tone="cyan" />
          <MetricCard title="Leads" value={stats?.totalLeads ?? '-'} helper="Registros recebidos nos links." icon={<Users className="h-4 w-4" />} loading={loading} tone="yellow" />
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-black text-white">Como o público respondeu</h2>
          <p className="mt-0.5 text-xs text-white/42">Visualizações, downloads e compartilhamentos.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          <MetricCard title="Views" value={stats?.totalViews ?? '-'} helper="Quantas vezes abriram vídeos." icon={<Eye className="h-4 w-4" />} loading={loading} tone="pink" />
          <MetricCard title="Downloads" value={stats?.totalDownloads ?? '-'} helper="Arquivos baixados pelo público." icon={<Download className="h-4 w-4" />} loading={loading} tone="orange" />
          <MetricCard title="Compart." value={stats?.totalShares ?? '-'} helper="Compartilhamentos registrados." icon={<Share2 className="h-4 w-4" />} loading={loading} tone="blue" />
          <MetricCard title="Média" value={stats ? `${stats.shareRate}%` : '-'} helper="Compartilhamentos por vídeo." icon={<TrendingUp className="h-4 w-4" />} loading={loading} tone="brand" />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-white">Pessoas interessadas</h2>
            <p className="mt-0.5 text-xs text-white/42">Contatos, feedbacks e cliques dos links públicos.</p>
          </div>
          <Link to="/app/leads" className="shrink-0 text-xs font-black text-brand-200 hover:text-white">Detalhes</Link>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <MetricCard title="Pessoas" value={resultsSnapshot?.people ?? '-'} helper="Visitantes com alguma ação." icon={<Users className="h-4 w-4" />} loading={loading} tone="cyan" />
          <MetricCard title="Contatos" value={resultsSnapshot?.contacts ?? '-'} helper="Quem deixou nome, telefone ou e-mail." icon={<Mail className="h-4 w-4" />} loading={loading} tone="green" />
          <MetricCard title="Feedbacks" value={resultsSnapshot?.feedbacks ?? '-'} helper="Mensagens recebidas." icon={<MessageSquareText className="h-4 w-4" />} loading={loading} tone="yellow" />
          <MetricCard title="Cliques" value={resultsSnapshot?.clicks ?? '-'} helper="WhatsApp, QR ou link copiado." icon={<Share2 className="h-4 w-4" />} loading={loading} tone="blue" />
        </div>
      </section>

      <section className="rounded-[24px] border border-white/[0.08] bg-white/[0.035] p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-2xl border border-brand-200/18 bg-brand-500/12 text-brand-100">
              <Activity className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-black text-white">Últimas ações</h3>
              <p className="text-xs text-white/38">O que aconteceu mais recentemente.</p>
            </div>
          </div>
        </div>
        {loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="six3-shimmer h-14 rounded-2xl bg-white/10" />
            ))}
          </div>
        ) : resultsSnapshot?.recent.length ? (
          <div className="space-y-2">
            {resultsSnapshot.recent.map((item) => (
              <div key={item.id} className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-black/18 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">{item.title}</p>
                  <p className="truncate text-xs text-white/42">{item.detail}</p>
                </div>
                <span className="shrink-0 text-right text-[11px] font-semibold text-white/30">{formatActivityDate(item.createdAt)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-white/[0.08] bg-black/18 px-4 py-5 text-center text-sm text-white/38">
            Nenhuma interação real registrada ainda.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-black text-white">Últimos 7 dias</h2>
          <p className="mt-0.5 text-xs text-white/42">Vídeos e leads crescendo ao longo da semana.</p>
        </div>
        {loadCharts ? (
          <Suspense fallback={<ChartFallback />}>
            <DashboardCharts data={chartData} />
          </Suspense>
        ) : (
          <ChartFallback />
        )}
      </section>
    </div>
  );
}
