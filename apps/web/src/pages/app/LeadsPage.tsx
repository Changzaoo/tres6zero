import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  BarChart2,
  Download,
  Eye,
  Mail,
  MessageCircle,
  MessageSquareText,
  Phone,
  QrCode,
  Search,
  Share2,
  Users,
} from 'lucide-react';
import { getUserEvents } from '@/services/eventService';
import { getEngagementEvents } from '@/services/engagementService';
import { getAllLeads, leadsToCSV, downloadCSV } from '@/services/leadService';
import { getUserVideos } from '@/services/videoService';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatCard } from '@/components/ui/StatCard';
import { toast } from '@/components/ui/Toast';
import type { AppEvent, AppVideo, EngagementEvent, EngagementEventType, Lead } from '@/types';

type VisitorRow = {
  key: string;
  visitorId: string | null;
  leads: Lead[];
  events: EngagementEvent[];
  lastAt: string;
};

const actionLabels: Record<EngagementEventType, string> = {
  view: 'Visualizou',
  download: 'Baixou',
  share: 'Compartilhou',
  whatsapp: 'WhatsApp',
  copy_link: 'Copiou link',
  qr_code: 'Abriu QR',
  feedback: 'Feedback',
};

const actionIcons: Record<EngagementEventType, ReactNode> = {
  view: <Eye className="h-3.5 w-3.5" />,
  download: <Download className="h-3.5 w-3.5" />,
  share: <Share2 className="h-3.5 w-3.5" />,
  whatsapp: <MessageCircle className="h-3.5 w-3.5" />,
  copy_link: <Share2 className="h-3.5 w-3.5" />,
  qr_code: <QrCode className="h-3.5 w-3.5" />,
  feedback: <MessageSquareText className="h-3.5 w-3.5" />,
};

function safeDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateTime(value?: string | null) {
  const date = safeDate(value);
  if (!date) return 'Sem data';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

function shortId(value?: string | null, size = 8) {
  if (!value) return 'anônimo';
  return value.length <= size ? value : `${value.slice(0, size)}...`;
}

function isNamedLead(lead?: Lead) {
  return Boolean(lead?.name && lead.name !== 'Visitante');
}

function contactLabel(lead?: Lead) {
  if (!lead) return 'Visitante anônimo';
  if (isNamedLead(lead)) return lead.name;
  if (lead.phone) return lead.phone;
  if (lead.email) return lead.email;
  return 'Visitante anônimo';
}

function hasContact(lead: Lead) {
  return isNamedLead(lead) || Boolean(lead.phone || lead.email || lead.instagram);
}

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

function weekdayLabel(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(date).replace('.', '');
}

function countByType(events: EngagementEvent[], types: EngagementEventType[]) {
  return events.filter((event) => types.includes(event.type)).length;
}

function buildVisitorRows(leads: Lead[], events: EngagementEvent[]) {
  const map = new Map<string, VisitorRow>();

  function ensure(key: string, visitorId: string | null) {
    const current = map.get(key);
    if (current) return current;
    const row: VisitorRow = { key, visitorId, leads: [], events: [], lastAt: '' };
    map.set(key, row);
    return row;
  }

  events.forEach((event) => {
    const key = event.visitorId || `event:${event.id}`;
    const row = ensure(key, event.visitorId || null);
    row.events.push(event);
  });

  leads.forEach((lead) => {
    const key = lead.visitorId || `lead:${lead.id}`;
    const row = ensure(key, lead.visitorId || null);
    row.leads.push(lead);
  });

  return Array.from(map.values())
    .map((row) => {
      const latest = [
        ...row.events.map((event) => event.createdAt),
        ...row.leads.map((lead) => lead.createdAt),
      ].sort((a, b) => Date.parse(b || '') - Date.parse(a || ''))[0] || '';
      return {
        ...row,
        events: row.events.sort((a, b) => Date.parse(b.createdAt || '') - Date.parse(a.createdAt || '')),
        leads: row.leads.sort((a, b) => Date.parse(b.createdAt || '') - Date.parse(a.createdAt || '')),
        lastAt: latest,
      };
    })
    .filter((row) => row.leads.length > 0 || row.events.some((event) => event.type !== 'view'))
    .sort((a, b) => Date.parse(b.lastAt || '') - Date.parse(a.lastAt || ''));
}

function ActivityChart({ events, leads }: { events: EngagementEvent[]; leads: Lead[] }) {
  const points = useMemo(() => {
    const today = startOfLocalDay(new Date());
    const days = Array.from({ length: 7 }, (_, index) => {
      const day = new Date(today);
      day.setDate(today.getDate() - (6 - index));
      return day;
    });
    const map = new Map(days.map((day) => [dateKey(day), {
      label: weekdayLabel(day),
      actions: 0,
      feedbacks: 0,
    }]));

    events.forEach((event) => {
      const date = safeDate(event.createdAt);
      if (!date || event.type === 'view') return;
      const point = map.get(dateKey(startOfLocalDay(date)));
      if (point) point.actions += 1;
    });

    leads.forEach((lead) => {
      const date = safeDate(lead.createdAt);
      if (!date || !lead.feedback) return;
      const point = map.get(dateKey(startOfLocalDay(date)));
      if (point) point.feedbacks += 1;
    });

    return days.map((day) => map.get(dateKey(day))!);
  }, [events, leads]);

  const max = Math.max(1, ...points.map((point) => point.actions + point.feedbacks));

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-gradient-glass p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <BarChart2 className="h-5 w-5 text-brand-300" />
        <h2 className="text-base font-semibold text-white">Atividade real dos ultimos 7 dias</h2>
      </div>
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {points.map((point) => {
          const total = point.actions + point.feedbacks;
          return (
            <div key={point.label} className="flex min-h-[8.5rem] flex-col justify-end rounded-2xl border border-white/[0.07] bg-white/[0.03] p-1.5 sm:min-h-[11rem] sm:p-2">
              <div className="flex flex-1 items-end justify-center">
                <div
                  className="w-full rounded-t-xl bg-gradient-brand"
                  style={{ height: total > 0 ? `${Math.max(8, Math.round((total / max) * 100))}%` : '0%' }}
                />
              </div>
              <p className="mt-2 text-center text-xs font-bold text-white/70">{total}</p>
              <p className="text-center text-[11px] text-white/35">{point.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function LeadsPage() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [engagementEvents, setEngagementEvents] = useState<EngagementEvent[]>([]);
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [videos, setVideos] = useState<AppVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) return;

    Promise.allSettled([
      getAllLeads(),
      getEngagementEvents(),
      getUserEvents(user.uid),
      getUserVideos(user.uid),
    ])
      .then(([leadsResult, engagementResult, eventsResult, videosResult]) => {
        if (leadsResult.status === 'fulfilled') setLeads(leadsResult.value);
        if (engagementResult.status === 'fulfilled') setEngagementEvents(engagementResult.value);
        if (eventsResult.status === 'fulfilled') setEvents(eventsResult.value);
        if (videosResult.status === 'fulfilled') setVideos(videosResult.value);

        if ([leadsResult, engagementResult, eventsResult, videosResult].some((result) => result.status === 'rejected')) {
          toast.error('Alguns resultados não foram carregados.');
        }
      })
      .finally(() => setLoading(false));
  }, [user]);

  const eventMap = useMemo(() => new Map(events.map((event) => [event.id, event])), [events]);
  const videoMap = useMemo(() => new Map(videos.map((video) => [video.id, video])), [videos]);
  const feedbacks = useMemo(() => leads.filter((lead) => Boolean(lead.feedback)), [leads]);
  const visitorRows = useMemo(() => buildVisitorRows(leads, engagementEvents), [leads, engagementEvents]);
  const linkClicks = useMemo(
    () => countByType(engagementEvents, ['whatsapp', 'copy_link', 'share', 'qr_code']),
    [engagementEvents]
  );
  const downloads = useMemo(() => countByType(engagementEvents, ['download']), [engagementEvents]);
  const views = useMemo(() => countByType(engagementEvents, ['view']), [engagementEvents]);
  const contacts = useMemo(() => leads.filter(hasContact).length, [leads]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return visitorRows;

    return visitorRows.filter((row) => {
      const leadText = row.leads.map((lead) => [
        lead.name,
        lead.phone,
        lead.email,
        lead.instagram,
        lead.feedback,
        lead.visitorId,
      ].join(' ')).join(' ');
      const eventText = row.events.map((event) => [
        actionLabels[event.type],
        event.eventId ? eventMap.get(event.eventId)?.name : '',
        event.videoId ? videoMap.get(event.videoId)?.title : '',
        event.visitorId,
      ].join(' ')).join(' ');
      return `${leadText} ${eventText}`.toLowerCase().includes(query);
    });
  }, [eventMap, search, videoMap, visitorRows]);

  function eventName(id?: string | null) {
    if (!id || id === 'standalone') return 'Vídeo avulso';
    return eventMap.get(id)?.name || 'Evento';
  }

  function videoTitle(id?: string | null) {
    if (!id) return '';
    return videoMap.get(id)?.title || 'Vídeo';
  }

  function handleExport() {
    downloadCSV(leadsToCSV(leads));
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-20 rounded-2xl bg-white/5" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {[...Array(4)].map((_, index) => <div key={index} className="h-28 rounded-2xl bg-white/5" />)}
        </div>
        <div className="h-80 rounded-2xl bg-white/5" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Resultados</h1>
          <p className="text-sm text-white/40">Leads, feedbacks, downloads e cliques reais dos seus links públicos.</p>
        </div>
        <Button className="w-full justify-center sm:w-auto" variant="secondary" onClick={handleExport} icon={<Download className="h-4 w-4" />} size="sm">
          Exportar CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-6">
        <StatCard title="Pessoas" value={visitorRows.length} icon={<Users className="h-5 w-5" />} color="text-cyan-300" />
        <StatCard title="Contatos" value={contacts} icon={<Mail className="h-5 w-5" />} color="text-green-300" />
        <StatCard title="Feedbacks" value={feedbacks.length} icon={<MessageSquareText className="h-5 w-5" />} color="text-yellow-300" />
        <StatCard title="Downloads" value={downloads} icon={<Download className="h-5 w-5" />} color="text-orange-300" />
        <StatCard title="Cliques" value={linkClicks} icon={<Share2 className="h-5 w-5" />} color="text-blue-300" />
        <StatCard title="Views" value={views} icon={<Eye className="h-5 w-5" />} color="text-pink-300" />
      </div>

      <ActivityChart events={engagementEvents} leads={leads} />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nome, telefone, e-mail, feedback, evento ou vídeo..."
          className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-4 text-sm text-white placeholder-white/30 focus:border-brand-500/40 focus:outline-none"
        />
      </div>

      {filteredRows.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title="Nenhuma acao real ainda"
          description="Downloads, cliques, feedbacks e contatos enviados pela página pública aparecem aqui."
        />
      ) : (
        <div className="space-y-3">
          {filteredRows.map((row, index) => {
            const mainLead = row.leads.find(hasContact) || row.leads[0];
            const rowFeedbacks = row.leads.filter((lead) => lead.feedback);
            const rowDownloads = countByType(row.events, ['download']);
            const rowLinks = countByType(row.events, ['whatsapp', 'copy_link', 'share', 'qr_code']);
            const rowViews = countByType(row.events, ['view']);
            const initial = contactLabel(mainLead).charAt(0).toUpperCase();

            return (
              <div key={row.key} className="rounded-2xl border border-white/[0.08] bg-gradient-glass p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-sm font-black text-white ring-1 ring-white/15">
                      {/[A-Z0-9]/i.test(initial) ? initial : 'V'}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{contactLabel(mainLead)}</p>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-white/42">
                        {mainLead?.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{mainLead.phone}</span>}
                        {mainLead?.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{mainLead.email}</span>}
                        <span>Visitante {shortId(row.visitorId)}</span>
                      </div>
                      <p className="mt-1 text-xs text-white/30">Ultima acao: {formatDateTime(row.lastAt)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center sm:flex sm:flex-wrap sm:justify-end">
                    {[
                      ['Views', rowViews],
                      ['Downloads', rowDownloads],
                      ['Cliques', rowLinks],
                    ].map(([label, value]) => (
                      <span key={label as string} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/55">
                        <b className="block text-sm text-white">{value as number}</b>
                        {label as string}
                      </span>
                    ))}
                  </div>
                </div>

                {row.events.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {row.events.slice(0, 8).map((event) => (
                      <span key={event.id} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/60">
                        {actionIcons[event.type]}
                        {actionLabels[event.type]}
                        <span className="text-white/28">- {videoTitle(event.videoId) || eventName(event.eventId)}</span>
                      </span>
                    ))}
                  </div>
                )}

                {rowFeedbacks.length > 0 && (
                  <div className="mt-4 grid gap-2">
                    {rowFeedbacks.slice(0, 3).map((lead) => (
                      <div key={lead.id} className="rounded-2xl border border-brand-300/15 bg-brand-500/10 p-3">
                        <p className="text-sm leading-relaxed text-white/78">{lead.feedback}</p>
                        <p className="mt-2 text-xs text-white/35">{eventName(lead.eventId)} {lead.videoId ? `- ${videoTitle(lead.videoId)}` : ''}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {feedbacks.length > 0 && (
        <div className="rounded-2xl border border-white/[0.08] bg-gradient-glass p-5">
          <div className="mb-4 flex items-center gap-2">
            <MessageSquareText className="h-5 w-5 text-brand-300" />
            <h2 className="text-base font-semibold text-white">Feedbacks recebidos</h2>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {feedbacks.slice(0, 8).map((lead) => (
              <div key={lead.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
                <p className="text-sm leading-relaxed text-white/78">{lead.feedback}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/38">
                  <span>{contactLabel(lead)}</span>
                  <span>{formatDateTime(lead.createdAt)}</span>
                  <span>{eventName(lead.eventId)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
