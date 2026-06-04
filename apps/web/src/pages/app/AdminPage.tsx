import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
  Activity,
  AlertTriangle,
  Ban,
  CalendarDays,
  CheckCircle2,
  Clock,
  Copy,
  Database,
  ExternalLink,
  FileImage,
  FileText,
  KeyRound,
  LifeBuoy,
  MonitorSmartphone,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Unlock,
  UserCheck,
  UserCog,
  UserPlus,
  Users,
  Video,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  banAdminUser,
  createSupportUser,
  getAdminOverview,
  getAdminUserDetails,
  setAdminUserRole,
  unbanAdminUser,
} from '@/services/adminService';
import { getAdminSession } from '@/services/authService';
import { getPaidCustomers } from '@/services/billingService';
import { useAuthStore } from '@/store/authStore';
import { LoadingState } from '@/components/ui/LoadingState';
import { StatCard } from '@/components/ui/StatCard';
import { toast } from '@/components/ui/Toast';
import { AdminSupportPanel } from '@/components/support/AdminSupportPanel';
import type { PlanId } from '@/config/plans';
import type {
  AdminAuditLog,
  AdminMediaItem,
  AdminOverview,
  AdminUserOverview,
  AppEvent,
  AuthAuditLog,
  UserAdminDetails,
  UserLoginEvent,
  UserProfile,
} from '@/types';

type PaidCustomer = {
  id: string;
  name: string | null;
  email: string | null;
  planId: PlanId | null;
  currentPeriodEnd: string | null;
  renewalDay: number | null;
};

type AdminSection = 'users' | 'events' | 'media' | 'logins' | 'customers';
type AdminDrawerTab = 'summary' | 'logins' | 'devices' | 'security' | 'audit';
type LoginFilter = 'all' | '24h' | '7d' | '30d' | 'suspicious' | 'failed' | 'success';
type BanDuration = 'permanent' | '1d' | '7d' | '30d' | 'custom';

const mediaKindLabels: Record<string, string> = {
  event_cover: 'Capa do evento',
  event_avatar: 'Avatar',
  event_logo: 'Logo',
  event_media: 'Mídia do evento',
  video: 'Vídeo final',
  raw_video: 'Vídeo original',
  thumbnail: 'Miniatura',
  music: 'Música',
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

function formatDateTimeInput(value?: string | null) {
  const date = parseDate(value);
  if (!date) return '';
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function shortId(value?: string | null, size = 8) {
  if (!value) return '-';
  return value.length <= size ? value : `${value.slice(0, size)}...`;
}

function banLabel(user: Pick<AdminUserOverview, 'banned' | 'disabled' | 'banStatus'>) {
  if (user.banned) return 'Banido';
  if (user.disabled) return 'Suspenso';
  if (user.banStatus === 'expired') return 'Ban expirado';
  return 'Ativo';
}

function banBadgeClass(user: Pick<AdminUserOverview, 'banned' | 'disabled' | 'banStatus'>) {
  if (user.banned) return 'bg-red-500/15 text-red-100 ring-red-400/25';
  if (user.disabled) return 'bg-yellow-500/12 text-yellow-100 ring-yellow-400/20';
  if (user.banStatus === 'expired') return 'bg-white/[0.06] text-white/55 ring-white/10';
  return 'bg-green-500/12 text-green-100 ring-green-400/20';
}

function formatLoginLocation(login: UserLoginEvent) {
  return login.location || [login.city, login.region, login.country].filter(Boolean).join(', ') || 'Sem localização';
}

function filterLoginEvents(events: UserLoginEvent[], filter: LoginFilter) {
  const now = Date.now();
  const windows: Partial<Record<LoginFilter, number>> = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  };

  return events.filter((event) => {
    const loginAt = Date.parse(event.loginAt || event.createdAt || '');
    if (filter in windows) {
      const windowMs = windows[filter];
      return Boolean(windowMs && Number.isFinite(loginAt) && now - loginAt <= windowMs);
    }
    if (filter === 'suspicious') return Boolean(event.suspicious);
    if (filter === 'failed') return !event.success;
    if (filter === 'success') return event.success;
    return true;
  });
}

function auditActionLabel(action: string) {
  if (action === 'USER_BANNED') return 'Usuário banido';
  if (action === 'USER_UNBANNED') return 'Usuário desbanido';
  if (action === 'USER_ROLE_UPDATED') return 'Cargo alterado';
  if (action === 'SUPPORT_USER_CREATED') return 'Conta de suporte criada';
  return action || 'Acao administrativa';
}

function accessLabel(role?: AdminUserOverview['role']) {
  if (role === 'admin') return 'Admin';
  if (role === 'support') return 'Suporte';
  return 'Usuário';
}

function accessBadgeClass(role?: AdminUserOverview['role']) {
  if (role === 'admin') return 'bg-yellow-500/12 text-yellow-100 ring-yellow-400/20';
  if (role === 'support') return 'bg-cyan-500/12 text-cyan-100 ring-cyan-400/20';
  return 'bg-white/[0.05] text-white/55 ring-white/10';
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

function DetailField({ label, value, mono, wide }: { label: string; value: ReactNode; mono?: boolean; wide?: boolean }) {
  return (
    <div className={`rounded-xl border border-white/[0.08] bg-white/[0.035] p-3 ${wide ? 'sm:col-span-2' : ''}`}>
      <p className="text-[11px] font-semibold uppercase text-white/32">{label}</p>
      <div className={`mt-1 break-words text-sm text-white/78 ${mono ? 'font-mono text-xs' : ''}`}>
        {value ?? '-'}
      </div>
    </div>
  );
}

function StatusBadge({ user }: { user: Pick<AdminUserOverview, 'banned' | 'disabled' | 'banStatus'> }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${banBadgeClass(user)}`}>
      {banLabel(user)}
    </span>
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
  const [drawerUid, setDrawerUid] = useState<string | null>(null);
  const [selectedDetails, setSelectedDetails] = useState<UserAdminDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [drawerTab, setDrawerTab] = useState<AdminDrawerTab>('summary');
  const [loginFilter, setLoginFilter] = useState<LoginFilter>('all');
  const [banTarget, setBanTarget] = useState<AdminUserOverview | null>(null);
  const [banReason, setBanReason] = useState('');
  const [banDuration, setBanDuration] = useState<BanDuration>('permanent');
  const [customBanDate, setCustomBanDate] = useState('');
  const [confirmSelfBan, setConfirmSelfBan] = useState(false);
  const [banSubmitting, setBanSubmitting] = useState(false);
  const [roleUpdatingUid, setRoleUpdatingUid] = useState<string | null>(null);
  const [supportFormOpen, setSupportFormOpen] = useState(false);
  const [supportForm, setSupportForm] = useState({ name: '', email: '', password: '' });
  const [supportSubmitting, setSupportSubmitting] = useState(false);

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
          toast.error('Não foi possível carregar clientes pagos.');
        }

        if (overviewResult.status === 'fulfilled') {
          setOverview(overviewResult.value);
        } else {
          toast.error('Não foi possível carregar auditoria administrativa.');
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

  function mergeUserDetails(details: UserAdminDetails) {
    const updatedUser: AdminUserOverview = {
      ...details.user,
      devices: details.devices.slice(0, 5),
    };

    setSelectedDetails({ ...details, user: updatedUser });
    setOverview((current) => {
      if (!current) return current;
      const exists = current.users.some((user) => user.uid === updatedUser.uid);
      const users = exists
        ? current.users.map((user) => (user.uid === updatedUser.uid ? { ...user, ...updatedUser } : user))
        : [updatedUser, ...current.users];
      return {
        ...current,
        summary: {
          ...current.summary,
          totalUsers: users.length,
          supportUsers: users.filter((user) => user.role === 'support').length,
        },
        users,
      };
    });
  }

  async function refreshUserDetails(uid = drawerUid, notify = false) {
    if (!uid) return;
    setDetailsLoading(true);
    try {
      const details = await getAdminUserDetails(uid);
      mergeUserDetails(details);
      if (notify) toast.success('Dados atualizados.');
    } catch {
      toast.error('Não foi possível carregar detalhes do usuário.');
    } finally {
      setDetailsLoading(false);
    }
  }

  async function openUserDetails(uid: string) {
    setDrawerUid(uid);
    setDrawerTab('summary');
    setLoginFilter('all');
    if (selectedDetails?.user.uid !== uid) {
      setSelectedDetails(null);
    }
    await refreshUserDetails(uid);
  }

  async function copyText(value: string | null | undefined, label: string) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copiado.`);
    } catch {
      toast.error(`Não foi possível copiar ${label.toLowerCase()}.`);
    }
  }

  function openBanDialog(user: AdminUserOverview) {
    setBanTarget({ ...user, devices: user.devices || [] });
    setBanReason('');
    setBanDuration('permanent');
    setCustomBanDate('');
    setConfirmSelfBan(false);
  }

  async function submitBan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!banTarget) return;

    if (banDuration === 'custom') {
      const customDate = parseDate(customBanDate);
      if (!customDate || customDate.getTime() <= Date.now()) {
        toast.error('Informe uma data futura para o banimento personalizado.');
        return;
      }
    }

    if (banTarget.uid === adminUser?.uid && !confirmSelfBan) {
      toast.error('Confirme explicitamente para banir sua própria conta.');
      return;
    }

    setBanSubmitting(true);
    try {
      const details = await banAdminUser(banTarget.uid, {
        reason: banReason.trim(),
        duration: banDuration,
        banExpiresAt: banDuration === 'custom' ? new Date(customBanDate).toISOString() : null,
        confirmSelfBan,
      });
      mergeUserDetails(details);
      setBanTarget(null);
      toast.success('Usuário banido com sucesso.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível banir usuário.';
      toast.error(message);
    } finally {
      setBanSubmitting(false);
    }
  }

  async function submitUnban(user: AdminUserOverview) {
    if (!window.confirm(`Desbanir ${user.name || user.email || user.uid}?`)) return;
    setBanSubmitting(true);
    try {
      const details = await unbanAdminUser(user.uid);
      mergeUserDetails(details);
      toast.success('Usuário desbanido com sucesso.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível desbanir usuário.';
      toast.error(message);
    } finally {
      setBanSubmitting(false);
    }
  }

  function openSupportForm() {
    setSupportForm({ name: '', email: '', password: '' });
    setSupportFormOpen(true);
  }

  async function updateSupportRole(user: AdminUserOverview) {
    if (user.role === 'admin') {
      toast.error('O cargo de administrador não pode ser alterado por aqui.');
      return;
    }

    const nextRole = user.role === 'support' ? 'user' : 'support';
    if (nextRole === 'user' && !window.confirm(`Remover cargo de suporte de ${user.name || user.email || user.uid}?`)) {
      return;
    }

    setRoleUpdatingUid(user.uid);
    try {
      const details = await setAdminUserRole(user.uid, nextRole);
      mergeUserDetails(details);
      toast.success(nextRole === 'support' ? 'Cargo de suporte aplicado.' : 'Cargo de suporte removido.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível alterar o cargo.';
      toast.error(message);
    } finally {
      setRoleUpdatingUid(null);
    }
  }

  async function submitCreateSupportUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = supportForm.name.trim();
    const email = supportForm.email.trim().toLowerCase();
    const password = supportForm.password;

    if (!name || !email || password.length < 8) {
      toast.error('Informe nome, e-mail e senha com pelo menos 8 caracteres.');
      return;
    }

    setSupportSubmitting(true);
    try {
      const details = await createSupportUser({ name, email, password });
      mergeUserDetails(details);
      setSupportFormOpen(false);
      setDrawerUid(details.user.uid);
      setDrawerTab('summary');
      toast.success('Conta de suporte criada.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível criar a conta de suporte.';
      toast.error(message);
    } finally {
      setSupportSubmitting(false);
    }
  }

  const sections: { id: AdminSection; label: string; icon: ReactNode; count: string | number }[] = [
    { id: 'users', label: 'Usuários', icon: <Users className="h-4 w-4" />, count: overview?.summary.totalUsers ?? '-' },
    { id: 'events', label: 'Eventos', icon: <CalendarDays className="h-4 w-4" />, count: overview?.summary.totalEvents ?? '-' },
    { id: 'media', label: 'Mídias', icon: <FileImage className="h-4 w-4" />, count: overview?.summary.totalMedia ?? '-' },
    { id: 'logins', label: 'Logins', icon: <KeyRound className="h-4 w-4" />, count: overview?.loginLogs.length ?? '-' },
    { id: 'customers', label: 'Clientes', icon: <UserCheck className="h-4 w-4" />, count: customers.length },
  ];

  if (!adminUser) {
    return <LoadingState message="Validando acesso administrativo..." />;
  }

  const renderUsers = () => {
    if (loadingOverview) {
      return <EmptyState>Carregando usuários e dispositivos...</EmptyState>;
    }

    if (!overview || overview.users.length === 0) {
      return <EmptyState>Nenhum usuário encontrado.</EmptyState>;
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-[86rem] w-full text-left">
          <thead className="border-b border-white/10 text-xs uppercase text-white/35">
            <tr>
              <th className="pb-3 pr-4 font-semibold">Usuário</th>
              <th className="pb-3 pr-4 font-semibold">Acesso</th>
              <th className="pb-3 pr-4 font-semibold">Último login</th>
              <th className="pb-3 pr-4 font-semibold">Dispositivos recentes</th>
              <th className="pb-3 pr-4 font-semibold">Status</th>
              <th className="pb-3 font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {overview.users.map((user) => {
              const mainDevice = user.devices[0];
              return (
                <tr key={user.uid} className="align-top">
                  <td className="py-4 pr-4">
                    <button
                      type="button"
                      onClick={() => void openUserDetails(user.uid)}
                      className="group block max-w-[16rem] text-left"
                    >
                      <span className="block truncate text-sm font-semibold text-white transition group-hover:text-brand-200">
                        {user.name || user.email || 'Usuário'}
                      </span>
                      <span className="mt-0.5 block text-[11px] font-medium text-brand-300/60 opacity-0 transition group-hover:opacity-100">
                        Ver detalhes
                      </span>
                    </button>
                    <p className="max-w-[16rem] truncate text-xs text-white/42">{user.email || 'Sem e-mail'}</p>
                    <p className="mt-1 text-[11px] text-white/28">UID {shortId(user.uid, 12)}</p>
                  </td>
                  <td className="py-4 pr-4">
                    <p className="text-sm text-white/70">{accessLabel(user.role)}</p>
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
                          {mainDevice.ip} - {mainDevice.location || 'Sem localização'}
                        </p>
                        <p className="text-[11px] text-white/30">
                          {user.devices.length} dispositivo(s), último em {formatDateTime(mainDevice.lastSeenAt)}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-white/40">Sem dispositivo registrado</p>
                    )}
                  </td>
                  <td className="py-4 pr-4">
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge user={user} />
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${user.emailVerified ? 'bg-blue-500/12 text-blue-100' : 'bg-yellow-500/12 text-yellow-100'}`}>
                        {user.emailVerified ? 'E-mail verificado' : 'E-mail pendente'}
                      </span>
                      {!user.planId && (
                        <span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[11px] font-bold text-white/45">
                          Sem plano
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void openUserDetails(user.uid)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 text-xs font-bold text-white/65 transition hover:border-brand-300/30 hover:bg-brand-500/10 hover:text-white"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Detalhes
                      </button>
                      {user.role !== 'admin' && (
                        <button
                          type="button"
                          onClick={() => void updateSupportRole(user)}
                          disabled={roleUpdatingUid === user.uid}
                          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-cyan-300/20 bg-cyan-500/10 px-3 text-xs font-bold text-cyan-100 transition hover:bg-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <UserCog className="h-3.5 w-3.5" />
                          {roleUpdatingUid === user.uid
                            ? 'Alterando...'
                            : user.role === 'support'
                              ? 'Remover suporte'
                              : 'Tornar suporte'}
                        </button>
                      )}
                      {user.banned ? (
                        <button
                          type="button"
                          onClick={() => void submitUnban(user)}
                          disabled={banSubmitting}
                          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-green-400/25 bg-green-500/10 px-3 text-xs font-bold text-green-100 transition hover:bg-green-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Unlock className="h-3.5 w-3.5" />
                          Desbanir
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openBanDialog(user)}
                          disabled={banSubmitting}
                          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-red-400/20 bg-red-500/10 px-3 text-xs font-bold text-red-100 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Ban className="h-3.5 w-3.5" />
                          Banir
                        </button>
                      )}
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
              <th className="pb-3 pr-4 font-semibold">Mídias</th>
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
                  <p className="text-xs text-white/40">{videosByEvent.get(event.id) || 0} vídeo(s)</p>
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
    if (loadingOverview) return <EmptyState>Carregando mídias...</EmptyState>;
    if (!overview || overview.media.length === 0) return <EmptyState>Nenhuma mídia enviada encontrada.</EmptyState>;

    return (
      <div className="overflow-x-auto">
        <table className="min-w-[76rem] w-full text-left">
          <thead className="border-b border-white/10 text-xs uppercase text-white/35">
            <tr>
              <th className="pb-3 pr-4 font-semibold">Arquivo</th>
              <th className="pb-3 pr-4 font-semibold">Tipo</th>
              <th className="pb-3 pr-4 font-semibold">Usuário</th>
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
                  <p className="text-xs text-white/38">{item.source === 'event' ? 'Evento' : 'Vídeo'}</p>
                </td>
                <td className="py-4 pr-4">
                  <p className="max-w-[16rem] truncate text-sm text-white/72">{ownerName(item.ownerId)}</p>
                  <p className="max-w-[16rem] truncate text-xs text-white/35">{ownerFor(item.ownerId)?.email || shortId(item.ownerId, 12)}</p>
                </td>
                <td className="py-4 pr-4">
                  <p className="max-w-[16rem] truncate text-sm text-white/72">{item.sourceTitle}</p>
                  <p className="text-xs text-white/35">{item.eventId ? `Evento ${shortId(item.eventId, 10)}` : `Vídeo ${shortId(item.videoId, 10)}`}</p>
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
              <th className="pb-3 pr-4 font-semibold">Horário</th>
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
              const location = log.location || [log.city, log.region, log.country].filter(Boolean).join(', ') || 'Sem localização';
              return (
                <tr key={log.id} className="align-top">
                  <td className="py-4 pr-4">
                    <p className="text-sm text-white/72">{formatDateTime(log.createdAt)}</p>
                    <p className="text-xs text-white/35">{authTypeLabels[log.type] || log.type}</p>
                  </td>
                  <td className="py-4 pr-4">
                    <p className="max-w-[16rem] truncate text-sm font-semibold text-white">{user?.name || log.email || 'Conta não identificada'}</p>
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
                    <p className="max-w-[18rem] truncate text-sm text-white/72">{log.deviceName || 'Dispositivo não informado'}</p>
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
                <p>Até {formatDate(customer.currentPeriodEnd)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderUserDrawer = () => {
    if (!drawerUid) return null;

    const details = selectedDetails?.user.uid === drawerUid ? selectedDetails : null;
    const drawerUser = details?.user || overview?.users.find((user) => user.uid === drawerUid) || null;
    const loginEvents = details?.loginEvents || [];
    const devices = details?.devices || drawerUser?.devices || [];
    const auditLogs = details?.auditLogs || [];
    const filteredLogins = filterLoginEvents(loginEvents, loginFilter);
    const successfulLogins = loginEvents.filter((event) => event.success);
    const failedLogins = loginEvents.filter((event) => !event.success);
    const suspicious7d = details?.user.suspiciousEvents7d ?? filterLoginEvents(loginEvents, '7d').filter((event) => event.suspicious).length;
    const loginTabs: { id: LoginFilter; label: string }[] = [
      { id: 'all', label: 'Todos' },
      { id: '24h', label: '24h' },
      { id: '7d', label: '7 dias' },
      { id: '30d', label: '30 dias' },
      { id: 'suspicious', label: 'Suspeitos' },
      { id: 'failed', label: 'Falhas' },
      { id: 'success', label: 'Sucessos' },
    ];
    const drawerTabs: { id: AdminDrawerTab; label: string; icon: ReactNode }[] = [
      { id: 'summary', label: 'Resumo', icon: <FileText className="h-4 w-4" /> },
      { id: 'logins', label: 'Histórico', icon: <Clock className="h-4 w-4" /> },
      { id: 'devices', label: 'Dispositivos', icon: <Smartphone className="h-4 w-4" /> },
      { id: 'security', label: 'Segurança', icon: <ShieldAlert className="h-4 w-4" /> },
      { id: 'audit', label: 'Auditoria', icon: <Database className="h-4 w-4" /> },
    ];

    return (
      <div className="fixed inset-0 z-[80] flex justify-end">
        <button
          type="button"
          aria-label="Fechar detalhes"
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={() => setDrawerUid(null)}
        />
        <aside className="relative flex h-full w-full max-w-3xl flex-col border-l border-white/10 bg-[#090a0f] shadow-2xl shadow-black/60">
          <div className="border-b border-white/[0.08] bg-white/[0.025] p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-300/70">Detalhes do usuário</p>
                <h2 className="mt-1 truncate text-xl font-bold text-white">
                  {drawerUser?.name || drawerUser?.email || 'Carregando usuário...'}
                </h2>
                <p className="truncate text-sm text-white/42">{drawerUser?.email || drawerUid}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => void refreshUserDetails(drawerUid, true)}
                  disabled={detailsLoading}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/62 transition hover:text-white disabled:opacity-45"
                  title="Atualizar dados"
                >
                  <RefreshCw className={`h-4 w-4 ${detailsLoading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerUid(null)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/62 transition hover:text-white"
                  title="Fechar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {drawerUser && (
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusBadge user={drawerUser} />
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${drawerUser.emailVerified ? 'bg-blue-500/12 text-blue-100' : 'bg-yellow-500/12 text-yellow-100'}`}>
                  {drawerUser.emailVerified ? 'E-mail verificado' : 'E-mail pendente'}
                </span>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${accessBadgeClass(drawerUser.role)}`}>
                  {accessLabel(drawerUser.role)}
                </span>
                <span className="rounded-full bg-brand-500/12 px-2.5 py-1 text-[11px] font-bold text-brand-100">
                  {drawerUser.planId || drawerUser.subscriptionStatus || 'Sem plano'}
                </span>
              </div>
            )}

            {drawerUser && (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void copyText(drawerUser.uid, 'UID')}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 text-xs font-bold text-white/65 transition hover:bg-white/[0.07] hover:text-white"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copiar UID
                </button>
                <button
                  type="button"
                  onClick={() => void copyText(drawerUser.email, 'E-mail')}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 text-xs font-bold text-white/65 transition hover:bg-white/[0.07] hover:text-white"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copiar e-mail
                </button>
                {drawerUser.role !== 'admin' && (
                  <button
                    type="button"
                    onClick={() => void updateSupportRole(drawerUser)}
                    disabled={roleUpdatingUid === drawerUser.uid}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full border border-cyan-300/20 bg-cyan-500/10 px-3 text-xs font-bold text-cyan-100 transition hover:bg-cyan-500/15 disabled:opacity-50"
                  >
                    <UserCog className="h-3.5 w-3.5" />
                    {roleUpdatingUid === drawerUser.uid
                      ? 'Alterando...'
                      : drawerUser.role === 'support'
                        ? 'Remover suporte'
                        : 'Tornar suporte'}
                  </button>
                )}
                {drawerUser.banned ? (
                  <button
                    type="button"
                    onClick={() => void submitUnban(drawerUser)}
                    disabled={banSubmitting}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full border border-green-400/25 bg-green-500/10 px-3 text-xs font-bold text-green-100 transition hover:bg-green-500/15 disabled:opacity-50"
                  >
                    <Unlock className="h-3.5 w-3.5" />
                    Desbanir
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => openBanDialog(drawerUser)}
                    disabled={banSubmitting}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full border border-red-400/20 bg-red-500/10 px-3 text-xs font-bold text-red-100 transition hover:bg-red-500/15 disabled:opacity-50"
                  >
                    <Ban className="h-3.5 w-3.5" />
                    Banir
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="hide-scrollbar flex gap-2 overflow-x-auto border-b border-white/[0.08] bg-white/[0.015] p-3">
            {drawerTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setDrawerTab(tab.id)}
                className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-xs font-bold transition ${
                  drawerTab === tab.id
                    ? 'bg-brand-500/18 text-white ring-1 ring-brand-300/25'
                    : 'text-white/45 hover:bg-white/[0.055] hover:text-white'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <div className="hide-scrollbar flex-1 overflow-y-auto p-4 sm:p-5">
            {!drawerUser && detailsLoading && <LoadingState message="Carregando detalhes..." />}

            {drawerUser && drawerTab === 'summary' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <DetailField label="Nome" value={drawerUser.name || 'Usuário'} />
                  <DetailField label="E-mail" value={drawerUser.email || 'Sem e-mail'} />
                  <DetailField label="UID completo" value={drawerUser.uid} mono wide />
                  <DetailField label="Tipo de acesso" value={accessLabel(drawerUser.role)} />
                  <DetailField label="Plano atual" value={drawerUser.planId || drawerUser.subscriptionStatus || 'Sem plano'} />
                  <DetailField label="Status" value={banLabel(drawerUser)} />
                  <DetailField label="Criado em" value={formatDateTime(drawerUser.createdAt)} />
                  <DetailField label="Último login" value={formatDateTime(details?.user.lastLoginAt || drawerUser.lastSignInAt)} />
                  <DetailField label="Último IP conhecido" value={details?.user.lastIp || devices[0]?.ip || 'Sem IP'} />
                  <DetailField label="Total de logins" value={details?.user.loginCount ?? successfulLogins.length} />
                  <DetailField label="Total de dispositivos" value={details?.user.deviceCount ?? devices.length} />
                  <DetailField label="Primeiro login registrado" value={formatDateTime(details?.user.firstLoginAt)} />
                  <DetailField label="Último login registrado" value={formatDateTime(details?.user.lastLoginAt || drawerUser.lastSignInAt)} />
                  <DetailField label="Origem do cadastro" value={details?.user.signupSource || 'Não informada'} />
                  <DetailField label="Provedor de login" value={details?.user.loginMethod || drawerUser.provider || 'password'} />
                  <DetailField label="Verificacao de e-mail" value={drawerUser.emailVerified ? 'Verificado' : 'Não verificado'} />
                  <DetailField label="Último user-agent" value={details?.user.lastUserAgent || devices[0]?.userAgent || 'Sem user-agent'} mono wide />
                </div>
              </div>
            )}

            {drawerUser && drawerTab === 'logins' && (
              <div className="space-y-4">
                <div className="hide-scrollbar flex gap-2 overflow-x-auto">
                  {loginTabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setLoginFilter(tab.id)}
                      className={`h-9 shrink-0 rounded-full px-3 text-xs font-bold transition ${
                        loginFilter === tab.id
                          ? 'bg-brand-500/20 text-white ring-1 ring-brand-300/25'
                          : 'bg-white/[0.04] text-white/45 hover:bg-white/[0.07] hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <DetailField label="Eventos carregados" value={loginEvents.length} />
                  <DetailField label="Sucessos" value={successfulLogins.length} />
                  <DetailField label="Falhas" value={failedLogins.length} />
                </div>

                {detailsLoading && loginEvents.length === 0 ? (
                  <LoadingState message="Carregando histórico..." />
                ) : filteredLogins.length === 0 ? (
                  <EmptyState>Nenhum histórico registrado para este filtro.</EmptyState>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-white/35">Mostrando {Math.min(filteredLogins.length, 120)} de {filteredLogins.length} evento(s).</p>
                    {filteredLogins.slice(0, 120).map((login) => (
                      <div key={login.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white">{formatDateTime(login.loginAt || login.createdAt)}</p>
                            <p className="mt-1 truncate text-xs text-white/45">
                              {login.browser || 'Navegador'} - {login.os || 'Sistema'} - {login.deviceType || 'unknown'}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${login.success ? 'bg-green-500/12 text-green-100' : 'bg-red-500/14 text-red-100'}`}>
                              {login.success ? 'Sucesso' : 'Falha'}
                            </span>
                            {login.suspicious && (
                              <span className="rounded-full bg-yellow-500/12 px-2.5 py-1 text-[11px] font-bold text-yellow-100">
                                Suspeito
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-white/45 sm:grid-cols-2">
                          <p>IP: <span className="text-white/70">{login.ip || 'Sem IP'}</span></p>
                          <p>Local: <span className="text-white/70">{formatLoginLocation(login)}</span></p>
                          <p>Método: <span className="text-white/70">{login.loginMethod || 'unknown'}</span></p>
                          <p>Sessao: <span className="font-mono text-white/60">{shortId(login.sessionId || login.deviceHash, 16)}</span></p>
                        </div>
                        {login.failureReason && <p className="mt-2 text-xs text-red-100/75">Motivo: {login.failureReason}</p>}
                        {login.userAgent && <p className="mt-2 break-all font-mono text-[11px] text-white/30">{login.userAgent}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {drawerUser && drawerTab === 'devices' && (
              <div className="space-y-3">
                {detailsLoading && devices.length === 0 ? (
                  <LoadingState message="Carregando dispositivos..." />
                ) : devices.length === 0 ? (
                  <EmptyState>Nenhum dispositivo registrado ainda.</EmptyState>
                ) : (
                  devices.map((device) => (
                    <div key={device.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">{device.name || 'Dispositivo'}</p>
                          <p className="mt-1 text-xs text-white/45">
                            {device.browser || 'Navegador'} - {device.os || 'Sistema'} - {device.deviceType || 'unknown'}
                          </p>
                        </div>
                        <span className={`w-fit rounded-full px-2.5 py-1 text-[11px] font-bold ${device.suspicious ? 'bg-yellow-500/12 text-yellow-100' : 'bg-green-500/12 text-green-100'}`}>
                          {device.suspicious ? 'Suspeito' : device.trusted === false ? 'Novo' : 'Confiavel'}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-white/45 sm:grid-cols-2">
                        <p>Primeiro acesso: <span className="text-white/70">{formatDateTime(device.createdAt)}</span></p>
                        <p>Último acesso: <span className="text-white/70">{formatDateTime(device.lastSeenAt)}</span></p>
                        <p>Logins: <span className="text-white/70">{device.loginCount ?? 0}</span></p>
                        <p>IP atual: <span className="text-white/70">{device.ip || 'Sem IP'}</span></p>
                        <p className="sm:col-span-2">IPs recentes: <span className="text-white/70">{(device.recentIps || []).join(', ') || device.ip || 'Sem IP'}</span></p>
                      </div>
                      {device.userAgent && (
                        <details className="mt-3 rounded-xl border border-white/[0.06] bg-black/20 p-3">
                          <summary className="cursor-pointer text-xs font-bold text-white/55">User-agent completo</summary>
                          <p className="mt-2 break-all font-mono text-[11px] leading-relaxed text-white/35">{device.userAgent}</p>
                        </details>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {drawerUser && drawerTab === 'security' && (
              <div className="space-y-4">
                <div className={`rounded-2xl border p-4 ${suspicious7d > 0 ? 'border-yellow-400/20 bg-yellow-500/10' : 'border-green-400/15 bg-green-500/10'}`}>
                  <div className="flex items-start gap-3">
                    {suspicious7d > 0 ? <ShieldAlert className="mt-0.5 h-5 w-5 text-yellow-200" /> : <ShieldCheck className="mt-0.5 h-5 w-5 text-green-200" />}
                    <div>
                      <p className="font-semibold text-white">
                        {suspicious7d > 0 ? `${suspicious7d} evento(s) suspeito(s) nos ultimos 7 dias` : 'Nenhuma atividade suspeita recente'}
                      </p>
                      <p className="mt-1 text-sm text-white/50">Eventos suspeitos são apenas sinalizados para revisão. O sistema não bloqueia automaticamente por suspeita.</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <DetailField label="Status da conta" value={banLabel(drawerUser)} />
                  <DetailField label="Falhas de login" value={failedLogins.length} />
                  <DetailField label="Último IP" value={details?.user.lastIp || devices[0]?.ip || 'Sem IP'} />
                  <DetailField label="Dispositivos suspeitos" value={devices.filter((device) => device.suspicious).length} />
                </div>

                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">Banimento</p>
                      <p className="mt-1 text-xs text-white/45">
                        {drawerUser.banned
                          ? `Ativo${drawerUser.banExpiresAt ? ` até ${formatDateTime(drawerUser.banExpiresAt)}` : ' permanentemente'}`
                          : 'Conta sem banimento ativo'}
                      </p>
                    </div>
                    {drawerUser.banned ? (
                      <button
                        type="button"
                        onClick={() => void submitUnban(drawerUser)}
                        disabled={banSubmitting}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-green-400/25 bg-green-500/10 px-4 text-xs font-bold text-green-100 transition hover:bg-green-500/15 disabled:opacity-50"
                      >
                        <Unlock className="h-4 w-4" />
                        Desbanir usuário
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openBanDialog(drawerUser)}
                        disabled={banSubmitting}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-red-400/20 bg-red-500/10 px-4 text-xs font-bold text-red-100 transition hover:bg-red-500/15 disabled:opacity-50"
                      >
                        <Ban className="h-4 w-4" />
                        Banir usuário
                      </button>
                    )}
                  </div>
                  {drawerUser.banReason && <p className="mt-3 rounded-xl bg-black/20 p-3 text-sm text-white/60">Motivo: {drawerUser.banReason}</p>}
                  {drawerUser.bannedBy && <p className="mt-2 text-xs text-white/35">Banido por UID {shortId(drawerUser.bannedBy, 16)}</p>}
                </div>
              </div>
            )}

            {drawerUser && drawerTab === 'audit' && (
              <div className="space-y-3">
                {detailsLoading && auditLogs.length === 0 ? (
                  <LoadingState message="Carregando auditoria..." />
                ) : auditLogs.length === 0 ? (
                  <EmptyState>Nenhum registro administrativo para este usuário.</EmptyState>
                ) : (
                  auditLogs.map((log: AdminAuditLog) => {
                    const expiresAt = typeof log.metadata?.banExpiresAt === 'string' ? log.metadata.banExpiresAt : null;
                    const newStatus = typeof log.metadata?.newStatus === 'string' ? log.metadata.newStatus : null;
                    const newRole = typeof log.metadata?.newRole === 'string' ? log.metadata.newRole : null;
                    return (
                      <div key={log.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-white">{auditActionLabel(log.action)}</p>
                            <p className="mt-1 text-xs text-white/42">{formatDateTime(log.createdAt)}</p>
                          </div>
                          {(newStatus || newRole) && (
                            <span className="w-fit rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-bold text-white/55">
                              {newStatus || accessLabel(newRole as AdminUserOverview['role'])}
                            </span>
                          )}
                        </div>
                        <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-white/45 sm:grid-cols-2">
                          <p>Admin: <span className="text-white/70">{log.performedByEmail || shortId(log.performedBy, 16)}</span></p>
                          <p>Alvo: <span className="text-white/70">{log.targetEmail || shortId(log.targetUserId, 16)}</span></p>
                          {expiresAt && <p className="sm:col-span-2">Expira em: <span className="text-white/70">{formatDateTime(expiresAt)}</span></p>}
                        </div>
                        {log.reason && <p className="mt-3 rounded-xl bg-black/20 p-3 text-sm text-white/60">Motivo: {log.reason}</p>}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    );
  };

  const renderBanModal = () => {
    if (!banTarget) return null;
    const isSelfBan = banTarget.uid === adminUser?.uid;

    return (
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/72 p-4 backdrop-blur-sm">
        <form onSubmit={submitBan} className="w-full max-w-lg rounded-2xl border border-red-400/20 bg-[#0b0c12] p-5 shadow-2xl shadow-black/60">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-200/70">Confirmar banimento</p>
              <h2 className="mt-1 text-xl font-bold text-white">{banTarget.name || banTarget.email || 'Usuário'}</h2>
              <p className="mt-1 text-sm text-white/42">{banTarget.email || banTarget.uid}</p>
            </div>
            <button
              type="button"
              onClick={() => setBanTarget(null)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/62 transition hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="text-xs font-semibold uppercase text-white/40">Motivo opcional</span>
              <textarea
                value={banReason}
                onChange={(event) => setBanReason(event.target.value)}
                maxLength={320}
                rows={4}
                className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-red-300/40"
                placeholder="Ex.: uso indevido da plataforma"
              />
              <span className="mt-1 block text-right text-[11px] text-white/30">{banReason.length}/320</span>
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase text-white/40">Duração</span>
              <select
                value={banDuration}
                onChange={(event) => {
                  const value = event.target.value as BanDuration;
                  setBanDuration(value);
                  if (value === 'custom' && !customBanDate) {
                    setCustomBanDate(formatDateTimeInput(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()));
                  }
                }}
                className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-[#11131b] px-4 text-sm text-white outline-none transition focus:border-red-300/40"
              >
                <option value="permanent">Permanente</option>
                <option value="1d">1 dia</option>
                <option value="7d">7 dias</option>
                <option value="30d">30 dias</option>
                <option value="custom">Personalizado</option>
              </select>
            </label>

            {banDuration === 'custom' && (
              <label className="block">
                <span className="text-xs font-semibold uppercase text-white/40">Expira em</span>
                <input
                  type="datetime-local"
                  value={customBanDate}
                  min={formatDateTimeInput(new Date(Date.now() + 60 * 1000).toISOString())}
                  onChange={(event) => setCustomBanDate(event.target.value)}
                  className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition focus:border-red-300/40"
                />
              </label>
            )}

            {isSelfBan && (
              <label className="flex items-start gap-3 rounded-2xl border border-yellow-400/20 bg-yellow-500/10 p-3">
                <input
                  type="checkbox"
                  checked={confirmSelfBan}
                  onChange={(event) => setConfirmSelfBan(event.target.checked)}
                  className="mt-1 h-4 w-4 accent-yellow-300"
                />
                <span className="text-sm text-yellow-50/80">
                  Confirmo que estou tentando banir minha própria conta administrativa.
                </span>
              </label>
            )}
          </div>

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setBanTarget(null)}
              className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-5 text-sm font-bold text-white/65 transition hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={banSubmitting}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-red-500 px-5 text-sm font-bold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-55"
            >
              <Ban className="h-4 w-4" />
              {banSubmitting ? 'Banindo...' : 'Banir usuário'}
            </button>
          </div>
        </form>
      </div>
    );
  };

  const renderSupportUserModal = () => {
    if (!supportFormOpen) return null;

    return (
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/72 p-4 backdrop-blur-sm">
        <form onSubmit={submitCreateSupportUser} className="w-full max-w-lg rounded-2xl border border-cyan-300/20 bg-[#0b0c12] p-5 shadow-2xl shadow-black/60">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/70">Nova conta</p>
              <h2 className="mt-1 text-xl font-bold text-white">Criar suporte</h2>
              <p className="mt-1 text-sm text-white/42">A conta criada vera somente o painel de suporte.</p>
            </div>
            <button
              type="button"
              onClick={() => setSupportFormOpen(false)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/62 transition hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="text-xs font-semibold uppercase text-white/40">Nome</span>
              <input
                type="text"
                value={supportForm.name}
                onChange={(event) => setSupportForm((current) => ({ ...current, name: event.target.value }))}
                className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-cyan-300/40"
                placeholder="Nome do atendente"
                autoComplete="name"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase text-white/40">E-mail</span>
              <input
                type="email"
                value={supportForm.email}
                onChange={(event) => setSupportForm((current) => ({ ...current, email: event.target.value }))}
                className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-cyan-300/40"
                placeholder="suporte@six3.com"
                autoComplete="email"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase text-white/40">Senha temporaria</span>
              <input
                type="password"
                value={supportForm.password}
                onChange={(event) => setSupportForm((current) => ({ ...current, password: event.target.value }))}
                className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-cyan-300/40"
                placeholder="Mínimo de 8 caracteres"
                autoComplete="new-password"
              />
            </label>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setSupportFormOpen(false)}
              className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-5 text-sm font-bold text-white/65 transition hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={supportSubmitting}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-cyan-500 px-5 text-sm font-bold text-white transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-55"
            >
              <UserPlus className="h-4 w-4" />
              {supportSubmitting ? 'Criando...' : 'Criar suporte'}
            </button>
          </div>
        </form>
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
        <StatCard title="Usuários" value={overview?.summary.totalUsers ?? '-'} icon={<Users className="h-5 w-5" />} color="text-cyan-300" loading={loadingOverview} />
        <StatCard title="Eventos" value={overview?.summary.totalEvents ?? '-'} icon={<CalendarDays className="h-5 w-5" />} color="text-brand-300" loading={loadingOverview} />
        <StatCard title="Mídias" value={overview?.summary.totalMedia ?? '-'} icon={<Database className="h-5 w-5" />} color="text-green-300" loading={loadingOverview} />
        <StatCard title="Falhas 24h" value={overview?.summary.failedLoginAttempts24h ?? '-'} icon={<ShieldAlert className="h-5 w-5" />} color="text-red-300" loading={loadingOverview} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Suporte" value={overview?.summary.supportUsers ?? '-'} icon={<LifeBuoy className="h-5 w-5" />} color="text-cyan-300" loading={loadingOverview} />
        <StatCard title="Clientes ativos" value={customers.length} icon={<UserCheck className="h-5 w-5" />} color="text-green-400" />
        <StatCard title="Vídeos" value={overview?.summary.totalVideos ?? '-'} icon={<Video className="h-5 w-5" />} color="text-blue-300" loading={loadingOverview} />
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
              MAC address não é exposto por navegadores. Para rastreio operacional, o painel usa IP, user-agent,
              hash do dispositivo, nome/plataforma informados pelo client, horário e vínculo com UID/e-mail quando disponível.
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
        <Panel
          title="Usuários e dispositivos"
          icon={<MonitorSmartphone className="h-5 w-5" />}
          action={(
            <button
              type="button"
              onClick={openSupportForm}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-500/10 px-4 text-xs font-bold text-cyan-100 transition hover:bg-cyan-500/15"
            >
              <UserPlus className="h-4 w-4" />
              Criar suporte
            </button>
          )}
        >
          {renderUsers()}
        </Panel>
      )}

      {activeSection === 'events' && (
        <Panel title="Eventos dos usuários" icon={<CalendarDays className="h-5 w-5" />}>
          {renderEvents()}
        </Panel>
      )}

      {activeSection === 'media' && (
        <Panel title="Mídias enviadas" icon={<FileImage className="h-5 w-5" />}>
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
      {renderUserDrawer()}
      {renderBanModal()}
      {renderSupportUserModal()}
    </div>
  );
}
