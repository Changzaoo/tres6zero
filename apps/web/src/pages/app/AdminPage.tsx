import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Database,
  ExternalLink,
  FileImage,
  KeyRound,
  MonitorSmartphone,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Users,
  Video,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAdminOverview } from '@/services/adminService';
import { getAdminSession } from '@/services/authService';
import { getPaidCustomers } from '@/services/billingService';
import { useAuthStore } from '@/store/authStore';
import { LoadingState } from '@/components/ui/LoadingState';
import { StatCard } from '@/components/ui/StatCard';
import { toast } from '@/components/ui/Toast';
import { AdminSupportPanel } from '@/components/support/AdminSupportPanel';
import type { PlanId } from '@/config/plans';
import type { AdminMediaItem, AdminOverview, AppEvent, AuthAuditLog, UserProfile } from '@/types';

type PaidCustomer = {
  id: string;
  name: string | null;
  email: string | null;
  planId: PlanId | null;
  currentPeriodEnd: string | null;
  renewalDay: number | null;
};

type AdminSection = 'users' | 'events' | 'media' | 'logins' | 'customers';

const mediaKindLabels: Record<string, string> = {
  event_cover: 'Capa do evento',
  event_avatar: 'Avatar',
  event_logo: 'Logo',
  event_media: 'Midia do evento',
  video: 'Video final',
  raw_video: 'Video original',
  thumbnail: 'Miniatura',
  music: 'Musica',
};

const authTypeLabels: Record<string, string> = {
  login: 'Login',
  register: 'Cadastro',
  password_reset: 'Reset de senha',
  logout: 'Logout',
};

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value?: string | null) {
  const date = parseDate(value);
  if (!date) return 'Sem data';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(date);
}

function formatDateTime(value?: string | null) {
  const date = parseDate(value);
  if (!date) return 'Sem data';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

function shortId(value?: string | null, size = 8) {
  if (!value) return '-';
  return value.length <= size ? value : `${value.slice(0, size)}...`;
}

function eventMediaCount(event: AppEvent) {
  return [
    event.coverUrl,
    event.avatarUrl,
    event.logoUrl,
    ...(event.mediaUrls || []),
  ].filter(Boolean).length;
}

function Panel({ title, icon, children, action }: { title: string; icon: ReactNode; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-gradient-glass p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-brand-400">{icon}</span>
          <h2 className="text-base font-semibold text-white">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-sm text-white/45">
      {children}
    </div>
  );
}

function OpenMediaLink({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 text-xs font-bold text-white/70 transition hover:border-brand-300/30 hover:bg-brand-500/10 hover:text-white"
    >
      <ExternalLink className="h-3.5 w-3.5" />
      Abrir
    </a>
  );
}

export default function AdminPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);
  const [adminUser, setAdminUser] = useState<UserProfile | null>(null);
  const [customers, setCustomers] = useState<PaidCustomer[]>([]);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [activeSection, setActiveSection] = useState<AdminSection>('users');

  useEffect(() => {
    let mounted = true;

    getAdminSession()
      .then(async ({ user }) => {
        if (!mounted) return;
        setAdminUser(user);
        setUser(user);

        const [customersResult, overviewResult] = await Promise.allSettled([
          getPaidCustomers(),
          getAdminOverview(),
        ]);

        if (!mounted) return;

        if (customersResult.status === 'fulfilled') {
          setCustomers(customersResult.value.customers);
        } else {
          toast.error('Nao foi possivel carregar clientes pagos.');
        }

        if (overviewResult.status === 'fulfilled') {
          setOverview(overviewResult.value);
        } else {
          toast.error('Nao foi possivel carregar auditoria administrativa.');
        }
      })
      .catch(() => {
        if (!mounted) return;
        toast.error('Acesso restrito ao administrador.');
        navigate('/app/billing', { replace: true });
      })
      .finally(() => {
        if (mounted) setLoadingOverview(false);
      });

    return () => {
      mounted = false;
    };
  }, [navigate, setUser]);

  const usersById = useMemo(() => {
    return new Map((overview?.users || []).map((user) => [user.uid, user]));
  }, [overview?.users]);

  const usersByEmail = useMemo(() => {
    return new Map(
      (overview?.users || [])
        .filter((user) => user.email)
        .map((user) => [user.email.toLowerCase(), user])
    );
  }, [overview?.users]);

  const videosByEvent = useMemo(() => {
    const map = new Map<string, number>();
    (overview?.videos || []).forEach((videoItem) => {
      map.set(videoItem.eventId, (map.get(videoItem.eventId) || 0) + 1);
    });
    return map;
  }, [overview?.videos]);

  function ownerFor(ownerId?: string | null) {
    return ownerId ? usersById.get(ownerId) || null : null;
  }

  function ownerName(ownerId?: string | null) {
    const owner = ownerFor(ownerId);
    return owner?.name || owner?.email || shortId(ownerId);
  }

  function logUser(log: AuthAuditLog) {
    if (log.uid) return usersById.get(log.uid) || null;
    if (log.email) return usersByEmail.get(log.email.toLowerCase()) || null;
    return null;
  }

  const sections: { id: AdminSection; label: string; icon: ReactNode; count: string | number }[] = [
    { id: 'users', label: 'Usuarios', icon: <Users className="h-4 w-4" />, count: overview?.summary.totalUsers ?? '-' },
    { id: 'events', label: 'Eventos', icon: <CalendarDays className="h-4 w-4" />, count: overview?.summary.totalEvents ?? '-' },
    { id: 'media', label: 'Midias', icon: <FileImage className="h-4 w-4" />, count: overview?.summary.totalMedia ?? '-' },
    { id: 'logins', label: 'Logins', icon: <KeyRound className="h-4 w-4" />, count: overview?.loginLogs.length ?? '-' },
    { id: 'customers', label: 'Clientes', icon: <UserCheck className="h-4 w-4" />, count: customers.length },
  ];

  if (!adminUser) {
    return <LoadingState message="Validando acesso administrativo..." />;
  }

  const renderUsers = () => {
    if (loadingOverview) {
      return <EmptyState>Carregando usuarios e dispositivos...</EmptyState>;
    }

    if (!overview || overview.users.length === 0) {
      return <EmptyState>Nenhum usuario encontrado.</EmptyState>;
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-[72rem] w-full text-left">
          <thead className="border-b border-white/10 text-xs uppercase text-white/35">
            <tr>
              <th className="pb-3 pr-4 font-semibold">Usuario</th>
              <th className="pb-3 pr-4 font-semibold">Acesso</th>
              <th className="pb-3 pr-4 font-semibold">Ultimo login</th>
              <th className="pb-3 pr-4 font-semibold">Dispositivos recentes</th>
              <th className="pb-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {overview.users.map((user) => {
              const mainDevice = user.devices[0];
              return (
                <tr key={user.uid} className="align-top">
                  <td className="py-4 pr-4">
                    <p className="max-w-[16rem] truncate text-sm font-semibold text-white">{user.name || user.email || 'Usuario'}</p>
                    <p className="max-w-[16rem] truncate text-xs text-white/42">{user.email || 'Sem e-mail'}</p>
                    <p className="mt-1 text-[11px] text-white/28">UID {shortId(user.uid, 12)}</p>
                  </td>
                  <td className="py-4 pr-4">
                    <p className="text-sm text-white/70">{user.role === 'admin' ? 'Admin' : 'Usuario'}</p>
                    <p className="text-xs text-white/40">{user.planId || user.subscriptionStatus || 'Sem plano'}</p>
                  </td>
                  <td className="py-4 pr-4">
                    <p className="text-sm text-white/70">{formatDateTime(user.lastSignInAt)}</p>
                    <p className="text-xs text-white/35">Criado em {formatDate(user.createdAt)}</p>
                  </td>
                  <td className="py-4 pr-4">
                    {mainDevice ? (
                      <div className="space-y-1">
                        <p className="max-w-[20rem] truncate text-sm text-white/76">{mainDevice.name}</p>
                        <p className="max-w-[20rem] truncate text-xs text-white/42">
                          {mainDevice.ip} - {mainDevice.location || 'Sem localizacao'}
                        </p>
                        <p className="text-[11px] text-white/30">
                          {user.devices.length} dispositivo(s), ultimo em {formatDateTime(mainDevice.lastSeenAt)}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-white/40">Sem dispositivo registrado</p>
                    )}
                  </td>
                  <td className="py-4">
                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${user.disabled ? 'bg-red-500/15 text-red-200' : 'bg-green-500/12 text-green-200'}`}>
                        {user.disabled ? 'Bloqueado' : 'Ativo'}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${user.emailVerified ? 'bg-blue-500/12 text-blue-100' : 'bg-yellow-500/12 text-yellow-100'}`}>
                        {user.emailVerified ? 'E-mail verificado' : 'E-mail pendente'}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderEvents = () => {
    if (loadingOverview) return <EmptyState>Carregando eventos...</EmptyState>;
    if (!overview || overview.events.length === 0) return <EmptyState>Nenhum evento encontrado.</EmptyState>;

    return (
      <div className="overflow-x-auto">
        <table className="min-w-[68rem] w-full text-left">
          <thead className="border-b border-white/10 text-xs uppercase text-white/35">
            <tr>
              <th className="pb-3 pr-4 font-semibold">Evento</th>
              <th className="pb-3 pr-4 font-semibold">Dono</th>
              <th className="pb-3 pr-4 font-semibold">Data e local</th>
              <th className="pb-3 pr-4 font-semibold">Midias</th>
              <th className="pb-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {overview.events.map((event) => (
              <tr key={event.id} className="align-top">
                <td className="py-4 pr-4">
                  <p className="max-w-[18rem] truncate text-sm font-semibold text-white">{event.name}</p>
                  <p className="max-w-[18rem] truncate text-xs text-white/42">{event.clientName}</p>
                  <p className="mt-1 text-[11px] text-white/28">ID {shortId(event.id, 12)}</p>
                </td>
                <td className="py-4 pr-4">
                  <p className="max-w-[16rem] truncate text-sm text-white/72">{ownerName(event.ownerId)}</p>
                  <p className="max-w-[16rem] truncate text-xs text-white/35">{ownerFor(event.ownerId)?.email || shortId(event.ownerId, 12)}</p>
                </td>
                <td className="py-4 pr-4">
                  <p className="text-sm text-white/72">{formatDate(event.date)}</p>
                  <p className="max-w-[16rem] truncate text-xs text-white/42">{event.location}</p>
                </td>
                <td className="py-4 pr-4">
                  <p className="text-sm text-white/72">{eventMediaCount(event)} arquivo(s)</p>
                  <p className="text-xs text-white/40">{videosByEvent.get(event.id) || 0} video(s)</p>
                </td>
                <td className="py-4">
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-bold uppercase text-white/60">
                    {event.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderMedia = () => {
    if (loadingOverview) return <EmptyState>Carregando midias...</EmptyState>;
    if (!overview || overview.media.length === 0) return <EmptyState>Nenhuma midia enviada encontrada.</EmptyState>;

    return (
      <div className="overflow-x-auto">
        <table className="min-w-[76rem] w-full text-left">
          <thead className="border-b border-white/10 text-xs uppercase text-white/35">
            <tr>
              <th className="pb-3 pr-4 font-semibold">Arquivo</th>
              <th className="pb-3 pr-4 font-semibold">Tipo</th>
              <th className="pb-3 pr-4 font-semibold">Usuario</th>
              <th className="pb-3 pr-4 font-semibold">Origem</th>
              <th className="pb-3 pr-4 font-semibold">Criado</th>
              <th className="pb-3 font-semibold">Link</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {overview.media.map((item: AdminMediaItem) => (
              <tr key={item.id} className="align-top">
                <td className="py-4 pr-4">
                  <p className="max-w-[20rem] truncate text-sm font-semibold text-white">{item.fileName || 'midia'}</p>
                  <p className="max-w-[20rem] truncate text-xs text-white/35">{item.storagePath || item.url}</p>
                </td>
                <td className="py-4 pr-4">
                  <p className="text-sm text-white/72">{mediaKindLabels[item.kind] || item.kind}</p>
                  <p className="text-xs text-white/38">{item.source === 'event' ? 'Evento' : 'Video'}</p>
                </td>
                <td className="py-4 pr-4">
                  <p className="max-w-[16rem] truncate text-sm text-white/72">{ownerName(item.ownerId)}</p>
                  <p className="max-w-[16rem] truncate text-xs text-white/35">{ownerFor(item.ownerId)?.email || shortId(item.ownerId, 12)}</p>
                </td>
                <td className="py-4 pr-4">
                  <p className="max-w-[16rem] truncate text-sm text-white/72">{item.sourceTitle}</p>
                  <p className="text-xs text-white/35">{item.eventId ? `Evento ${shortId(item.eventId, 10)}` : `Video ${shortId(item.videoId, 10)}`}</p>
                </td>
                <td className="py-4 pr-4 text-sm text-white/65">{formatDateTime(item.createdAt)}</td>
                <td className="py-4"><OpenMediaLink url={item.url} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderLogins = () => {
    if (loadingOverview) return <EmptyState>Carregando logs de login...</EmptyState>;
    if (!overview || overview.loginLogs.length === 0) return <EmptyState>Nenhum log de autenticacao registrado ainda.</EmptyState>;

    return (
      <div className="overflow-x-auto">
        <table className="min-w-[84rem] w-full text-left">
          <thead className="border-b border-white/10 text-xs uppercase text-white/35">
            <tr>
              <th className="pb-3 pr-4 font-semibold">Horario</th>
              <th className="pb-3 pr-4 font-semibold">Conta</th>
              <th className="pb-3 pr-4 font-semibold">Resultado</th>
              <th className="pb-3 pr-4 font-semibold">IP e local</th>
              <th className="pb-3 pr-4 font-semibold">Dispositivo</th>
              <th className="pb-3 font-semibold">User-agent</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {overview.loginLogs.map((log) => {
              const user = logUser(log);
              const location = log.location || [log.city, log.region, log.country].filter(Boolean).join(', ') || 'Sem localizacao';
              return (
                <tr key={log.id} className="align-top">
                  <td className="py-4 pr-4">
                    <p className="text-sm text-white/72">{formatDateTime(log.createdAt)}</p>
                    <p className="text-xs text-white/35">{authTypeLabels[log.type] || log.type}</p>
                  </td>
                  <td className="py-4 pr-4">
                    <p className="max-w-[16rem] truncate text-sm font-semibold text-white">{user?.name || log.email || 'Conta nao identificada'}</p>
                    <p className="max-w-[16rem] truncate text-xs text-white/42">{user?.email || log.email || shortId(log.uid, 12)}</p>
                  </td>
                  <td className="py-4 pr-4">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${log.success ? 'bg-green-500/12 text-green-200' : 'bg-red-500/14 text-red-200'}`}>
                      {log.success ? <CheckCircle2 className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
                      {log.success ? 'Sucesso' : 'Falha'}
                    </span>
                    {log.reason && <p className="mt-1 max-w-[12rem] truncate text-xs text-white/35">{log.reason}</p>}
                  </td>
                  <td className="py-4 pr-4">
                    <p className="text-sm text-white/72">{log.ip}</p>
                    <p className="max-w-[14rem] truncate text-xs text-white/40">{location}</p>
                  </td>
                  <td className="py-4 pr-4">
                    <p className="max-w-[18rem] truncate text-sm text-white/72">{log.deviceName || 'Dispositivo nao informado'}</p>
                    <p className="text-xs text-white/35">Hash {shortId(log.deviceHash, 12)}</p>
                  </td>
                  <td className="py-4">
                    <p className="max-w-[22rem] truncate text-xs text-white/42">{log.userAgent || 'Sem user-agent'}</p>
                    {log.origin && <p className="mt-1 max-w-[22rem] truncate text-[11px] text-white/28">{log.origin}</p>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderCustomers = () => {
    if (customers.length === 0) return <EmptyState>Nenhum cliente pago ativo no momento.</EmptyState>;

    return (
      <div className="space-y-2">
        {customers.map((customer) => (
          <div key={customer.id} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{customer.name || customer.email || 'Cliente'}</p>
                <p className="truncate text-xs text-white/40">{customer.email}</p>
              </div>
              <div className="text-left text-xs text-white/45 sm:text-right">
                <p className="capitalize">{customer.planId || 'plano'}</p>
                <p>Ate {formatDate(customer.currentPeriodEnd)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-yellow-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Admin</h1>
            <p className="text-sm text-white/40">Sessao administrativa confirmada</p>
          </div>
        </div>
        <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/45">
          Atualizado {overview ? formatDateTime(overview.generatedAt) : 'agora'}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Usuarios" value={overview?.summary.totalUsers ?? '-'} icon={<Users className="h-5 w-5" />} color="text-cyan-300" loading={loadingOverview} />
        <StatCard title="Eventos" value={overview?.summary.totalEvents ?? '-'} icon={<CalendarDays className="h-5 w-5" />} color="text-brand-300" loading={loadingOverview} />
        <StatCard title="Midias" value={overview?.summary.totalMedia ?? '-'} icon={<Database className="h-5 w-5" />} color="text-green-300" loading={loadingOverview} />
        <StatCard title="Falhas 24h" value={overview?.summary.failedLoginAttempts24h ?? '-'} icon={<ShieldAlert className="h-5 w-5" />} color="text-red-300" loading={loadingOverview} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Cargo" value="Admin" icon={<ShieldCheck className="h-5 w-5" />} color="text-yellow-400" />
        <StatCard title="Clientes ativos" value={customers.length} icon={<UserCheck className="h-5 w-5" />} color="text-green-400" />
        <StatCard title="Videos" value={overview?.summary.totalVideos ?? '-'} icon={<Video className="h-5 w-5" />} color="text-blue-300" loading={loadingOverview} />
        <StatCard title="Logins 24h" value={overview?.summary.loginAttempts24h ?? '-'} icon={<Activity className="h-5 w-5" />} color="text-pink-300" loading={loadingOverview} />
      </div>

      <div className="rounded-2xl border border-yellow-500/20 bg-gradient-glass p-5">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-300" />
          <div>
            <p className="text-sm text-white/62">
              Administrador logado: <span className="font-medium text-white">{adminUser.name}</span>
            </p>
            <p className="mt-1 text-xs leading-relaxed text-white/38">
              MAC address nao e exposto por navegadores. Para rastreio operacional, o painel usa IP, user-agent,
              hash do dispositivo, nome/plataforma informados pelo client, horario e vinculo com UID/e-mail quando disponivel.
            </p>
          </div>
        </div>
      </div>

      <div className="hide-scrollbar flex gap-2 overflow-x-auto rounded-2xl border border-white/[0.08] bg-white/[0.025] p-2">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => setActiveSection(section.id)}
            className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition ${
              activeSection === section.id
                ? 'bg-brand-500/18 text-white ring-1 ring-brand-300/25'
                : 'text-white/45 hover:bg-white/[0.055] hover:text-white'
            }`}
          >
            {section.icon}
            <span>{section.label}</span>
            <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[11px] text-white/55">{section.count}</span>
          </button>
        ))}
      </div>

      {activeSection === 'users' && (
        <Panel title="Usuarios e dispositivos" icon={<MonitorSmartphone className="h-5 w-5" />}>
          {renderUsers()}
        </Panel>
      )}

      {activeSection === 'events' && (
        <Panel title="Eventos dos usuarios" icon={<CalendarDays className="h-5 w-5" />}>
          {renderEvents()}
        </Panel>
      )}

      {activeSection === 'media' && (
        <Panel title="Midias enviadas" icon={<FileImage className="h-5 w-5" />}>
          {renderMedia()}
        </Panel>
      )}

      {activeSection === 'logins' && (
        <Panel title="Logs de login e autenticacao" icon={<KeyRound className="h-5 w-5" />}>
          {renderLogins()}
        </Panel>
      )}

      {activeSection === 'customers' && (
        <Panel title="Clientes com acesso" icon={<UserCheck className="h-5 w-5" />}>
          {renderCustomers()}
        </Panel>
      )}

      <AdminSupportPanel />
    </div>
  );
}
