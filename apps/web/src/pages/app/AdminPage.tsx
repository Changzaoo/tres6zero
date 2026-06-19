import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
  Activity,
  Ban,
  CalendarDays,
  CheckCircle2,
  Clock,
  Copy,
  Database,
  ExternalLink,
  FileImage,
  FileText,
  Gift,
  KeyRound,
  LifeBuoy,
  Mail,
  Phone,
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
  addAdminUserNote,
  adjustAdminUserPlanDays,
  banAdminUser,
  createSupportUser,
  getAdminOverview,
  getAdminUserDetails,
  grantAdminUserLifetime,
  grantAdminUserTrial,
  reactivateAdminUser,
  setAdminUserRole,
  suspendAdminUser,
  unbanAdminUser,
  updateAdminUserPlan,
  type AdminPlanOrigin,
} from '@/services/adminService';
import { getAdminSession } from '@/services/authService';
import { getPaidCustomers } from '@/services/billingService';
import { getTrialRequests } from '@/services/trialService';
import { useAuthStore } from '@/store/authStore';
import { LoadingState } from '@/components/ui/LoadingState';
import { toast } from '@/components/ui/Toast';
import { AdminSupportPanel } from '@/components/support/AdminSupportPanel';
import { PLAN_ENTITLEMENTS, PLANS, type PlanId } from '@/config/plans';
import type {
  AdminAuditLog,
  AdminMediaItem,
  AdminOverview,
  AdminUserOverview,
  AppEvent,
  AuthAuditLog,
  TrialRequest,
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

type AdminSection = 'users' | 'events' | 'media' | 'logins' | 'customers' | 'trials';
type AdminDrawerTab = 'summary' | 'billing' | 'usage' | 'logins' | 'devices' | 'security' | 'audit' | 'notes';
type LoginFilter = 'all' | '24h' | '7d' | '30d' | 'suspicious' | 'failed' | 'success';
type BanDuration = 'permanent' | '1d' | '7d' | '30d' | 'custom';
type UserStatusFilter = 'all' | 'active' | 'inactive' | 'expired' | 'trial' | 'lifetime' | 'banned' | 'suspended' | 'expiring';
type UserSort = 'recent' | 'oldest' | 'expiration_asc' | 'expiration_desc' | 'last_login' | 'usage_desc';
type DayAdjustMode = 'add' | 'remove' | 'set_expiration' | 'expire_now';

type PlanFormState = {
  planId: PlanId;
  startsImmediately: boolean;
  expiresAt: string;
  keepCurrentExpiration: boolean;
  lifetime: boolean;
  special: boolean;
  origin: AdminPlanOrigin;
  resetLimits: boolean;
  applyPlanLimits: boolean;
  reason: string;
};

type DaysFormState = {
  mode: DayAdjustMode;
  days: number;
  expiresAt: string;
  reason: string;
};

type TrialFormState = {
  planId: PlanId;
  days: number;
  reason: string;
};

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

const planOriginLabels: Record<string, string> = {
  payment: 'Pagamento',
  manual_admin: 'Manual pelo admin',
  affiliate: 'Afiliado',
  coupon: 'Cupom',
  trial: 'Teste grátis',
  promotion: 'Promoção',
  support: 'Suporte',
};

const planStatusLabels: Record<string, string> = {
  active: 'Ativo',
  inactive: 'Sem plano ativo',
  expired: 'Assinatura expirada',
  trial: 'Teste grátis',
  lifetime: 'Vitalício',
  banned: 'Banido',
  suspended: 'Suspenso',
};

const planFeatureLabels: Record<string, string> = {
  basic_templates: 'Templates essenciais',
  premium_templates: 'Templates premium e animados',
  custom_template_upload: 'Upload de template',
  offline_recent: 'Sessões recentes offline',
  offline_sync: 'Sincronização offline',
  public_gallery: 'Galeria pública',
  qr_code: 'QR Code',
  basic_leads: 'Leads básicos',
  csv_export: 'Exportação CSV',
  basic_effects: 'Efeitos básicos',
  popular_effects: 'Efeitos populares',
  ai_auto_edit: 'Edição com IA',
  brand_customization: 'Personalização de marca',
  advanced_analytics: 'Analytics avançado',
  priority_support: 'Suporte prioritário',
};

function safePlanId(value?: string | null): PlanId {
  return value === 'pro' || value === 'unlimited' ? value : 'starter';
}

function planName(value?: string | null) {
  return PLANS.find((plan) => plan.id === value)?.name || (value ? value : 'Sem plano');
}

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

function dateTimeInputToIso(value: string) {
  const date = parseDate(value);
  return date ? date.toISOString() : null;
}

function addDaysIso(days: number, base = new Date()) {
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

function planExpiryText(user: Pick<AdminUserOverview, 'planLifetime' | 'currentPeriodEnd' | 'planExpiresAt' | 'daysRemaining' | 'planId' | 'subscriptionStatus'>) {
  if (user.planLifetime) return 'Plano vitalício';
  if (!user.planId || user.subscriptionStatus !== 'active') return 'Sem plano ativo';
  const end = user.currentPeriodEnd || user.planExpiresAt;
  const date = parseDate(end);
  if (!date) return 'Sem expiração';
  const days = typeof user.daysRemaining === 'number'
    ? user.daysRemaining
    : Math.ceil((date.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  if (days > 1) return `Expira em ${days} dias`;
  if (days === 1) return 'Expira amanhã';
  if (days === 0) return 'Expira hoje';
  if (days === -1) return 'Expirado há 1 dia';
  return `Expirado há ${Math.abs(days)} dias`;
}

function planExpiryBadgeClass(user: Pick<AdminUserOverview, 'planLifetime' | 'daysRemaining' | 'currentPeriodEnd' | 'planExpiresAt' | 'planId' | 'subscriptionStatus'>) {
  if (user.planLifetime) return 'bg-brand-500/14 text-brand-100 ring-brand-300/25';
  if (!user.planId || user.subscriptionStatus !== 'active') return 'bg-white/[0.06] text-white/50 ring-white/10';
  const end = parseDate(user.currentPeriodEnd || user.planExpiresAt);
  if (!end) return 'bg-blue-500/12 text-blue-100 ring-blue-400/20';
  const days = typeof user.daysRemaining === 'number'
    ? user.daysRemaining
    : Math.ceil((end.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  if (days > 15) return 'bg-green-500/12 text-green-100 ring-green-400/20';
  if (days > 0) return 'bg-yellow-500/12 text-yellow-100 ring-yellow-400/20';
  return 'bg-red-500/14 text-red-100 ring-red-400/25';
}

function planStatusLabel(user: AdminUserOverview) {
  return planStatusLabels[user.planStatus || ''] || banLabel(user);
}

function defaultPlanForm(user?: AdminUserOverview | null): PlanFormState {
  return {
    planId: safePlanId(user?.planId),
    startsImmediately: true,
    expiresAt: formatDateTimeInput(user?.currentPeriodEnd || user?.planExpiresAt || addDaysIso(30)),
    keepCurrentExpiration: Boolean(user?.currentPeriodEnd || user?.planExpiresAt),
    lifetime: Boolean(user?.planLifetime),
    special: Boolean(user?.planSpecial),
    origin: (user?.planOrigin as AdminPlanOrigin) || 'manual_admin',
    resetLimits: false,
    applyPlanLimits: true,
    reason: '',
  };
}

function defaultDaysForm(user?: AdminUserOverview | null): DaysFormState {
  return {
    mode: 'add',
    days: 30,
    expiresAt: formatDateTimeInput(user?.currentPeriodEnd || user?.planExpiresAt || addDaysIso(30)),
    reason: '',
  };
}

function defaultTrialForm(user?: AdminUserOverview | null): TrialFormState {
  return {
    planId: safePlanId(user?.planId),
    days: 7,
    reason: '',
  };
}

function recalcSummaryFromUsers(summary: AdminOverview['summary'], users: AdminUserOverview[]) {
  const expiringWithin = (days: number) => users.filter((user) => {
    if (user.planLifetime || user.planStatus !== 'active' || typeof user.daysRemaining !== 'number') return false;
    return user.daysRemaining >= 0 && user.daysRemaining <= days;
  }).length;

  return {
    ...summary,
    totalUsers: users.length,
    supportUsers: users.filter((user) => user.role === 'support').length,
    disabledUsers: users.filter((user) => user.disabled).length,
    activeUsers: users.filter((user) => ['active', 'trial', 'lifetime'].includes(user.planStatus || '')).length,
    expiredUsers: users.filter((user) => user.planStatus === 'expired').length,
    trialUsers: users.filter((user) => user.planStatus === 'trial').length,
    bannedOrSuspendedUsers: users.filter((user) => user.planStatus === 'banned' || user.planStatus === 'suspended').length,
    lifetimeUsers: users.filter((user) => user.planStatus === 'lifetime').length,
    expiringIn7Days: expiringWithin(7),
    expiringIn30Days: expiringWithin(30),
    usersByPlan: PLANS.reduce((acc, plan) => {
      acc[plan.id] = users.filter((user) => user.planId === plan.id).length;
      return acc;
    }, {} as Record<string, number>),
  };
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
  if (action === 'PLAN_CHANGED') return 'Plano alterado';
  if (action === 'DAYS_ADDED') return 'Dias adicionados';
  if (action === 'DAYS_REMOVED') return 'Dias removidos';
  if (action === 'PLAN_EXPIRED') return 'Plano expirado';
  if (action === 'USER_SUSPENDED') return 'Usuário suspenso';
  if (action === 'USER_REACTIVATED') return 'Usuário reativado';
  if (action === 'TRIAL_GRANTED') return 'Teste grátis liberado';
  if (action === 'LIFETIME_GRANTED') return 'Plano vitalício liberado';
  if (action === 'MANUAL_NOTE_ADDED') return 'Nota interna adicionada';
  return action || 'Ação administrativa';
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

function AdminMetricTile({ title, value, icon, color, loading }: { title: string; value: string | number; icon: ReactNode; color: string; loading?: boolean }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/[0.08] bg-white/[0.035] px-3 py-2.5">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span className="min-w-0 truncate text-[11px] font-semibold text-white/45">{title}</span>
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] ${color}`}>
          {icon}
        </span>
      </div>
      {loading ? (
        <div className="mt-2 h-5 w-12 animate-pulse rounded-md bg-white/10" />
      ) : (
        <p className="mt-1 truncate text-xl font-black leading-tight text-white">{value}</p>
      )}
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
  const [trialRequests, setTrialRequests] = useState<TrialRequest[]>([]);
  const [loadingTrials, setLoadingTrials] = useState(true);
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
  const [userSearch, setUserSearch] = useState('');
  const [userPlanFilter, setUserPlanFilter] = useState<'all' | PlanId>('all');
  const [userStatusFilter, setUserStatusFilter] = useState<UserStatusFilter>('all');
  const [userSort, setUserSort] = useState<UserSort>('recent');
  const [planForm, setPlanForm] = useState<PlanFormState>(() => defaultPlanForm());
  const [daysForm, setDaysForm] = useState<DaysFormState>(() => defaultDaysForm());
  const [trialForm, setTrialForm] = useState<TrialFormState>(() => defaultTrialForm());
  const [noteText, setNoteText] = useState('');
  const [adminActionSubmitting, setAdminActionSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;

    getAdminSession()
      .then(async ({ user }) => {
        if (!mounted) return;
        setAdminUser(user);
        setUser(user);

        const [customersResult, overviewResult, trialsResult] = await Promise.allSettled([
          getPaidCustomers(),
          getAdminOverview(),
          getTrialRequests(),
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

        if (trialsResult.status === 'fulfilled') {
          setTrialRequests(trialsResult.value);
        } else {
          toast.error('Não foi possível carregar as solicitações de teste grátis.');
        }
      })
      .catch(() => {
        if (!mounted) return;
        toast.error('Acesso restrito ao administrador.');
        navigate('/app/billing', { replace: true });
      })
      .finally(() => {
        if (mounted) {
          setLoadingOverview(false);
          setLoadingTrials(false);
        }
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

  const usageScoreByUser = useMemo(() => {
    const map = new Map<string, number>();
    (overview?.events || []).forEach((event) => map.set(event.ownerId, (map.get(event.ownerId) || 0) + 2));
    (overview?.videos || []).forEach((video) => map.set(video.ownerId, (map.get(video.ownerId) || 0) + 3));
    (overview?.media || []).forEach((item) => map.set(item.ownerId, (map.get(item.ownerId) || 0) + 1));
    return map;
  }, [overview?.events, overview?.media, overview?.videos]);

  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    return [...(overview?.users || [])]
      .filter((user) => {
        if (query) {
          const haystack = `${user.name} ${user.email} ${user.uid} ${user.companyName || ''}`.toLowerCase();
          if (!haystack.includes(query)) return false;
        }
        if (userPlanFilter !== 'all' && user.planId !== userPlanFilter) return false;
        if (userStatusFilter === 'expiring') {
          if (user.planLifetime || user.planStatus !== 'active' || typeof user.daysRemaining !== 'number' || user.daysRemaining < 0 || user.daysRemaining > 15) return false;
        } else if (userStatusFilter !== 'all' && user.planStatus !== userStatusFilter) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (userSort === 'oldest') return Date.parse(a.createdAt || '') - Date.parse(b.createdAt || '');
        if (userSort === 'expiration_asc') return (Date.parse(a.currentPeriodEnd || a.planExpiresAt || '9999-12-31') || 0) - (Date.parse(b.currentPeriodEnd || b.planExpiresAt || '9999-12-31') || 0);
        if (userSort === 'expiration_desc') return (Date.parse(b.currentPeriodEnd || b.planExpiresAt || '') || 0) - (Date.parse(a.currentPeriodEnd || a.planExpiresAt || '') || 0);
        if (userSort === 'last_login') return (Date.parse(b.lastSignInAt || '') || 0) - (Date.parse(a.lastSignInAt || '') || 0);
        if (userSort === 'usage_desc') return (usageScoreByUser.get(b.uid) || 0) - (usageScoreByUser.get(a.uid) || 0);
        return (Date.parse(b.createdAt || b.lastSignInAt || '') || 0) - (Date.parse(a.createdAt || a.lastSignInAt || '') || 0);
      });
  }, [overview?.users, usageScoreByUser, userPlanFilter, userSearch, userSort, userStatusFilter]);

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
        summary: recalcSummaryFromUsers(current.summary, users),
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
    const user = overview?.users.find((item) => item.uid === uid) || null;
    setDrawerUid(uid);
    setDrawerTab('summary');
    setLoginFilter('all');
    setPlanForm(defaultPlanForm(user));
    setDaysForm(defaultDaysForm(user));
    setTrialForm(defaultTrialForm(user));
    setNoteText('');
    if (selectedDetails?.user.uid !== uid) {
      setSelectedDetails(null);
    }
    await refreshUserDetails(uid);
  }

  async function openUserBilling(uid: string) {
    await openUserDetails(uid);
    setDrawerTab('billing');
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

  async function submitPlanChange(event: FormEvent<HTMLFormElement>, user: AdminUserOverview) {
    event.preventDefault();
    const reason = planForm.reason.trim();
    if (reason.length < 3) {
      toast.error('Informe o motivo da alteração do plano.');
      return;
    }

    const expiresAt = planForm.lifetime || planForm.keepCurrentExpiration ? null : dateTimeInputToIso(planForm.expiresAt);
    if (!planForm.lifetime && !planForm.keepCurrentExpiration && !expiresAt) {
      toast.error('Informe uma data de expiração válida.');
      return;
    }

    const nextExpiration = planForm.lifetime
      ? 'Vitalício'
      : planForm.keepCurrentExpiration
        ? formatDateTime(user.currentPeriodEnd || user.planExpiresAt)
        : formatDateTime(expiresAt);

    const confirmed = window.confirm(
      `Alterar plano de ${user.name || user.email || user.uid}?\n\n` +
      `Atual: ${planName(user.planId)} - ${planExpiryText(user)}\n` +
      `Novo: ${planName(planForm.planId)} - ${nextExpiration}\n\n` +
      `Motivo: ${reason}`
    );
    if (!confirmed) return;

    setAdminActionSubmitting(true);
    try {
      const details = await updateAdminUserPlan(user.uid, {
        planId: planForm.planId,
        startsImmediately: planForm.startsImmediately,
        expiresAt,
        keepCurrentExpiration: planForm.keepCurrentExpiration,
        lifetime: planForm.lifetime,
        special: planForm.special,
        origin: planForm.origin,
        resetLimits: planForm.resetLimits,
        applyPlanLimits: planForm.applyPlanLimits,
        reason,
      });
      mergeUserDetails(details);
      setPlanForm(defaultPlanForm(details.user));
      toast.success('Plano atualizado.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível alterar o plano.');
    } finally {
      setAdminActionSubmitting(false);
    }
  }

  async function submitDaysAdjustment(event: FormEvent<HTMLFormElement>, user: AdminUserOverview) {
    event.preventDefault();
    const reason = daysForm.reason.trim();
    if (reason.length < 3) {
      toast.error('Informe o motivo do ajuste.');
      return;
    }

    const expiresAt = daysForm.mode === 'set_expiration' ? dateTimeInputToIso(daysForm.expiresAt) : null;
    if (daysForm.mode === 'set_expiration' && !expiresAt) {
      toast.error('Informe uma nova expiração válida.');
      return;
    }

    const currentEnd = parseDate(user.currentPeriodEnd || user.planExpiresAt);
    const base = currentEnd && currentEnd.getTime() > Date.now() ? currentEnd : new Date();
    const previewEnd = daysForm.mode === 'expire_now'
      ? new Date(Date.now() - 60 * 1000)
      : daysForm.mode === 'set_expiration'
        ? parseDate(expiresAt)
        : new Date(base.getTime() + (daysForm.mode === 'add' ? daysForm.days : -daysForm.days) * 24 * 60 * 60 * 1000);

    const confirmed = window.confirm(
      `Confirmar ajuste de dias para ${user.name || user.email || user.uid}?\n\n` +
      `Expiração atual: ${formatDateTime(user.currentPeriodEnd || user.planExpiresAt)}\n` +
      `Nova expiração: ${formatDateTime(previewEnd?.toISOString())}\n\n` +
      `Motivo: ${reason}`
    );
    if (!confirmed) return;

    setAdminActionSubmitting(true);
    try {
      const details = await adjustAdminUserPlanDays(user.uid, {
        mode: daysForm.mode,
        days: daysForm.mode === 'add' || daysForm.mode === 'remove' ? daysForm.days : undefined,
        expiresAt,
        reason,
      });
      mergeUserDetails(details);
      setDaysForm(defaultDaysForm(details.user));
      toast.success('Dias do plano ajustados.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível ajustar os dias.');
    } finally {
      setAdminActionSubmitting(false);
    }
  }

  async function submitTrialGrant(event: FormEvent<HTMLFormElement>, user: AdminUserOverview) {
    event.preventDefault();
    const reason = trialForm.reason.trim();
    if (reason.length < 3) {
      toast.error('Informe o motivo do teste grátis.');
      return;
    }

    const end = addDaysIso(trialForm.days);
    const confirmed = window.confirm(
      `Liberar teste grátis para ${user.name || user.email || user.uid}?\n\n` +
      `Plano: ${planName(trialForm.planId)}\n` +
      `Duração: ${trialForm.days} dia(s)\n` +
      `Expira em: ${formatDateTime(end)}\n\n` +
      `Motivo: ${reason}`
    );
    if (!confirmed) return;

    setAdminActionSubmitting(true);
    try {
      const details = await grantAdminUserTrial(user.uid, {
        planId: trialForm.planId,
        days: trialForm.days,
        reason,
      });
      mergeUserDetails(details);
      setTrialForm(defaultTrialForm(details.user));
      toast.success('Teste grátis liberado.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível liberar teste grátis.');
    } finally {
      setAdminActionSubmitting(false);
    }
  }

  async function submitLifetimeGrant(user: AdminUserOverview) {
    const reason = planForm.reason.trim();
    if (reason.length < 3) {
      toast.error('Informe o motivo no formulário de plano antes de tornar vitalício.');
      return;
    }

    const confirmed = window.confirm(
      `Tornar o plano de ${user.name || user.email || user.uid} vitalício?\n\n` +
      `Plano: ${planName(planForm.planId)}\n` +
      `Motivo: ${reason}`
    );
    if (!confirmed) return;

    setAdminActionSubmitting(true);
    try {
      const details = await grantAdminUserLifetime(user.uid, {
        planId: planForm.planId,
        special: planForm.special,
        reason,
      });
      mergeUserDetails(details);
      setPlanForm(defaultPlanForm(details.user));
      toast.success('Plano vitalício aplicado.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível tornar o plano vitalício.');
    } finally {
      setAdminActionSubmitting(false);
    }
  }

  async function submitSuspend(user: AdminUserOverview) {
    const reason = window.prompt(`Motivo para suspender ${user.name || user.email || user.uid}:`)?.trim();
    if (!reason) return;
    if (!window.confirm(`Suspender acesso de ${user.name || user.email || user.uid}?\n\nMotivo: ${reason}`)) return;

    setAdminActionSubmitting(true);
    try {
      const details = await suspendAdminUser(user.uid, reason);
      mergeUserDetails(details);
      toast.success('Usuário suspenso.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível suspender usuário.');
    } finally {
      setAdminActionSubmitting(false);
    }
  }

  async function submitReactivate(user: AdminUserOverview) {
    const reason = window.prompt(`Motivo para reativar ${user.name || user.email || user.uid}:`)?.trim();
    if (!reason) return;
    if (!window.confirm(`Reativar acesso de ${user.name || user.email || user.uid}?\n\nMotivo: ${reason}`)) return;

    setAdminActionSubmitting(true);
    try {
      const details = await reactivateAdminUser(user.uid, reason);
      mergeUserDetails(details);
      toast.success('Usuário reativado.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível reativar usuário.');
    } finally {
      setAdminActionSubmitting(false);
    }
  }

  async function submitInternalNote(event: FormEvent<HTMLFormElement>, user: AdminUserOverview) {
    event.preventDefault();
    const note = noteText.trim();
    if (note.length < 2) {
      toast.error('Escreva uma nota interna.');
      return;
    }

    setAdminActionSubmitting(true);
    try {
      const details = await addAdminUserNote(user.uid, note);
      mergeUserDetails(details);
      setNoteText('');
      toast.success('Nota interna salva.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar a nota.');
    } finally {
      setAdminActionSubmitting(false);
    }
  }

  function renderUserActions(user: AdminUserOverview, compact = false) {
    const buttonBase = compact
      ? 'inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-2xl border px-3 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50'
      : 'inline-flex h-9 items-center justify-center gap-1.5 rounded-full border px-3 text-[11px] font-bold transition disabled:cursor-not-allowed disabled:opacity-50';

    return (
      <div className={compact ? 'mt-3 flex flex-wrap gap-2' : 'flex flex-wrap gap-2'}>
        <button
          type="button"
          onClick={() => void openUserDetails(user.uid)}
          className={`${buttonBase} border-white/10 bg-white/[0.04] text-white/65 hover:border-brand-300/30 hover:bg-brand-500/10 hover:text-white`}
        >
          <FileText className="h-3.5 w-3.5" />
          Detalhes
        </button>
        <button
          type="button"
          onClick={() => void openUserBilling(user.uid)}
          className={`${buttonBase} border-brand-300/20 bg-brand-500/10 text-brand-100 hover:bg-brand-500/15`}
        >
          <UserCheck className="h-3.5 w-3.5" />
          Plano
        </button>
        {user.role !== 'admin' && (
          <button
            type="button"
            onClick={() => void updateSupportRole(user)}
            disabled={roleUpdatingUid === user.uid}
            className={`${buttonBase} border-cyan-300/20 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/15`}
          >
            <UserCog className="h-3.5 w-3.5" />
            {roleUpdatingUid === user.uid
              ? 'Alterando...'
              : user.role === 'support'
                ? 'Remover'
                : 'Suporte'}
          </button>
        )}
        {user.banned ? (
          <button
            type="button"
            onClick={() => void submitUnban(user)}
            disabled={banSubmitting}
            className={`${buttonBase} border-green-400/25 bg-green-500/10 text-green-100 hover:bg-green-500/15`}
          >
            <Unlock className="h-3.5 w-3.5" />
            Desbanir
          </button>
        ) : (
          <button
            type="button"
            onClick={() => openBanDialog(user)}
            disabled={banSubmitting}
            className={`${buttonBase} border-red-400/20 bg-red-500/10 text-red-100 hover:bg-red-500/15`}
          >
            <Ban className="h-3.5 w-3.5" />
            Banir
          </button>
        )}
      </div>
    );
  }

  const sections: { id: AdminSection; label: string; icon: ReactNode; count: string | number }[] = [
    { id: 'users', label: 'Usuários', icon: <Users className="h-4 w-4" />, count: overview?.summary.totalUsers ?? '-' },
    { id: 'events', label: 'Eventos', icon: <CalendarDays className="h-4 w-4" />, count: overview?.summary.totalEvents ?? '-' },
    { id: 'media', label: 'Mídias', icon: <FileImage className="h-4 w-4" />, count: overview?.summary.totalMedia ?? '-' },
    { id: 'logins', label: 'Logins', icon: <KeyRound className="h-4 w-4" />, count: overview?.loginLogs.length ?? '-' },
    { id: 'customers', label: 'Clientes', icon: <UserCheck className="h-4 w-4" />, count: customers.length },
    { id: 'trials', label: 'Testes grátis', icon: <Gift className="h-4 w-4" />, count: loadingTrials ? '-' : trialRequests.length },
  ];

  const summary = overview?.summary;
  const adminMetrics = [
    { title: 'Usuários', value: summary?.totalUsers ?? '-', icon: <Users className="h-4 w-4" />, color: 'text-cyan-300', loading: loadingOverview },
    { title: 'Ativos', value: summary?.activeUsers ?? '-', icon: <UserCheck className="h-4 w-4" />, color: 'text-green-300', loading: loadingOverview },
    { title: 'Expirados', value: summary?.expiredUsers ?? '-', icon: <Clock className="h-4 w-4" />, color: 'text-red-300', loading: loadingOverview },
    { title: '7 dias', value: summary?.expiringIn7Days ?? '-', icon: <CalendarDays className="h-4 w-4" />, color: 'text-yellow-300', loading: loadingOverview },
    { title: 'Teste grátis', value: summary?.trialUsers ?? '-', icon: <Activity className="h-4 w-4" />, color: 'text-blue-300', loading: loadingOverview },
    { title: 'Vitalícios', value: summary?.lifetimeUsers ?? '-', icon: <ShieldCheck className="h-4 w-4" />, color: 'text-brand-300', loading: loadingOverview },
    { title: 'Bloqueados', value: summary?.bannedOrSuspendedUsers ?? '-', icon: <ShieldAlert className="h-4 w-4" />, color: 'text-red-300', loading: loadingOverview },
    { title: 'Pagos', value: customers.length, icon: <UserCheck className="h-4 w-4" />, color: 'text-emerald-300', loading: loadingOverview },
  ];

  if (!adminUser) {
    return <LoadingState message="Validando acesso administrativo..." />;
  }

  const renderUserFilters = () => (
    <div className="mb-4 rounded-2xl border border-white/[0.08] bg-[#0d1017] p-3">
      <div className="grid gap-3 lg:grid-cols-[minmax(14rem,1fr)_12rem_13rem_13rem]">
        <label className="block">
          <span className="sr-only">Buscar usuário</span>
          <input
            value={userSearch}
            onChange={(event) => setUserSearch(event.target.value)}
            className="h-11 w-full rounded-2xl border border-white/10 bg-white/[0.045] px-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-brand-300/45"
            placeholder="Buscar por nome, e-mail ou UID..."
          />
        </label>
        <select
          value={userPlanFilter}
          onChange={(event) => setUserPlanFilter(event.target.value as 'all' | PlanId)}
          className="h-11 rounded-2xl border border-white/10 bg-[#11131b] px-3 text-sm text-white outline-none transition focus:border-brand-300/45"
        >
          <option value="all">Todos os planos</option>
          {PLANS.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
        </select>
        <select
          value={userStatusFilter}
          onChange={(event) => setUserStatusFilter(event.target.value as UserStatusFilter)}
          className="h-11 rounded-2xl border border-white/10 bg-[#11131b] px-3 text-sm text-white outline-none transition focus:border-brand-300/45"
        >
          <option value="all">Todos status</option>
          <option value="active">Ativos</option>
          <option value="expiring">Expirando em breve</option>
          <option value="expired">Expirados</option>
          <option value="trial">Teste grátis</option>
          <option value="lifetime">Vitalícios</option>
          <option value="banned">Banidos</option>
          <option value="suspended">Suspensos</option>
          <option value="inactive">Sem plano ativo</option>
        </select>
        <select
          value={userSort}
          onChange={(event) => setUserSort(event.target.value as UserSort)}
          className="h-11 rounded-2xl border border-white/10 bg-[#11131b] px-3 text-sm text-white outline-none transition focus:border-brand-300/45"
        >
          <option value="recent">Mais recentes</option>
          <option value="oldest">Mais antigos</option>
          <option value="expiration_asc">Expira primeiro</option>
          <option value="expiration_desc">Mais dias restantes</option>
          <option value="last_login">Último login</option>
          <option value="usage_desc">Maior uso</option>
        </select>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-white/38">
        <span>{filteredUsers.length} de {overview?.users.length || 0} usuário(s) exibido(s)</span>
        {(userSearch || userPlanFilter !== 'all' || userStatusFilter !== 'all' || userSort !== 'recent') && (
          <button
            type="button"
            onClick={() => {
              setUserSearch('');
              setUserPlanFilter('all');
              setUserStatusFilter('all');
              setUserSort('recent');
            }}
            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 font-bold text-white/55 transition hover:text-white"
          >
            Limpar filtros
          </button>
        )}
      </div>
    </div>
  );

  const renderUsers = () => {
    if (loadingOverview) {
      return <EmptyState>Carregando usuários e dispositivos...</EmptyState>;
    }

    if (!overview || overview.users.length === 0) {
      return <EmptyState>Nenhum usuário encontrado.</EmptyState>;
    }

    if (filteredUsers.length === 0) {
      return (
        <>
          {renderUserFilters()}
          <EmptyState>Nenhum usuário encontrado para os filtros atuais.</EmptyState>
        </>
      );
    }

    return (
      <div className="space-y-3">
        {renderUserFilters()}
        <div className="space-y-3 xl:hidden">
          {filteredUsers.map((user) => {
            const mainDevice = user.devices[0];
            const planText = planName(user.planId);
            return (
              <div key={user.uid} className="rounded-[24px] border border-white/[0.08] bg-[#0d1017] p-4 shadow-[0_18px_44px_rgba(0,0,0,0.18)]">
                <div className="flex items-start justify-between gap-3">
                  <button type="button" onClick={() => void openUserDetails(user.uid)} className="min-w-0 text-left">
                    <p className="truncate text-sm font-semibold text-white">{user.name || user.email || 'Usuário'}</p>
                    <p className="mt-0.5 truncate text-xs text-white/42">{user.email || 'Sem e-mail'}</p>
                    <p className="mt-1 text-[11px] text-white/28">UID {shortId(user.uid, 12)}</p>
                  </button>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <StatusBadge user={user} />
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${user.emailVerified ? 'bg-blue-500/12 text-blue-100' : 'bg-yellow-500/12 text-yellow-100'}`}>
                      {user.emailVerified ? 'E-mail ok' : 'E-mail pendente'}
                    </span>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <DetailField label="Acesso" value={accessLabel(user.role)} />
                  <DetailField label="Plano" value={planText} />
                  <DetailField label="Vencimento" value={planExpiryText(user)} />
                  <DetailField label="Origem" value={planOriginLabels[user.planOrigin || ''] || 'Não informada'} />
                  <DetailField label="Último login" value={formatDateTime(user.lastSignInAt)} />
                  <DetailField label="Criado em" value={formatDate(user.createdAt)} />
                  <DetailField
                    label="Dispositivo"
                    value={mainDevice ? mainDevice.name : 'Sem dispositivo registrado'}
                    wide
                  />
                  <DetailField
                    label="IP e local"
                    value={mainDevice ? `${mainDevice.ip || 'Sem IP'} - ${mainDevice.location || 'Sem localização'}` : 'Sem registro'}
                    wide
                    mono
                  />
                  <DetailField
                    label="Dispositivos"
                    value={mainDevice ? `${user.devices.length} dispositivo(s), último em ${formatDateTime(mainDevice.lastSeenAt)}` : '0 dispositivo'}
                    wide
                  />
                </div>

                {renderUserActions(user, true)}
              </div>
            );
          })}
        </div>
        <div className="hidden xl:block">
          <div className="grid grid-cols-[minmax(0,1.12fr)_minmax(0,0.7fr)_minmax(0,0.86fr)_minmax(0,1.32fr)_minmax(0,1.02fr)_minmax(0,1.12fr)] gap-3 border-b border-white/10 pb-3 text-[11px] font-semibold uppercase text-white/35">
            <div>Usuário</div>
            <div>Acesso</div>
            <div>Último login</div>
            <div>Dispositivos recentes</div>
            <div>Status</div>
            <div>Ações</div>
          </div>
          <div className="divide-y divide-white/[0.06]">
            {filteredUsers.map((user) => {
              const mainDevice = user.devices[0];
              const planText = planName(user.planId);
              return (
                <div
                  key={user.uid}
                  className="grid grid-cols-[minmax(0,1.12fr)_minmax(0,0.7fr)_minmax(0,0.86fr)_minmax(0,1.32fr)_minmax(0,1.02fr)_minmax(0,1.12fr)] gap-3 py-4 align-top"
                >
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => void openUserDetails(user.uid)}
                      className="group block min-w-0 text-left"
                    >
                      <span className="block truncate text-sm font-semibold text-white transition group-hover:text-brand-200">
                        {user.name || user.email || 'Usuário'}
                      </span>
                      <span className="mt-0.5 block text-[11px] font-medium text-brand-300/60 opacity-0 transition group-hover:opacity-100">
                        Ver detalhes
                      </span>
                    </button>
                    <p className="truncate text-xs text-white/42">{user.email || 'Sem e-mail'}</p>
                    <p className="mt-1 text-[11px] text-white/28">UID {shortId(user.uid, 12)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-white/70">{accessLabel(user.role)}</p>
                    <p className="truncate text-xs text-white/40">{planText}</p>
                    <p className="mt-1 truncate text-[11px] text-white/30">{planOriginLabels[user.planOrigin || ''] || 'Origem não informada'}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-white/70">{formatDateTime(user.lastSignInAt)}</p>
                    <p className="text-xs text-white/35">Criado em {formatDate(user.createdAt)}</p>
                  </div>
                  <div className="min-w-0">
                    {mainDevice ? (
                      <div className="space-y-1">
                        <p className="truncate text-sm text-white/76">{mainDevice.name}</p>
                        <p className="truncate font-mono text-[11px] text-white/42">
                          {mainDevice.ip} - {mainDevice.location || 'Sem localização'}
                        </p>
                        <p className="text-[11px] text-white/30">
                          {user.devices.length} dispositivo(s), último em {formatDateTime(mainDevice.lastSeenAt)}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-white/40">Sem dispositivo registrado</p>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge user={user} />
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${planExpiryBadgeClass(user)}`}>
                        {planExpiryText(user)}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${user.emailVerified ? 'bg-blue-500/12 text-blue-100' : 'bg-yellow-500/12 text-yellow-100'}`}>
                        {user.emailVerified ? 'E-mail verificado' : 'E-mail pendente'}
                      </span>
                      <span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[11px] font-bold text-white/45">
                        {planStatusLabel(user)}
                      </span>
                    </div>
                  </div>
                  <div className="min-w-0">
                    {renderUserActions(user)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderEvents = () => {
    if (loadingOverview) return <EmptyState>Carregando eventos...</EmptyState>;
    if (!overview || overview.events.length === 0) return <EmptyState>Nenhum evento encontrado.</EmptyState>;

    return (
      <div className="space-y-3">
        <div className="space-y-3 md:hidden">
          {overview.events.map((event) => (
            <div key={event.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{event.name}</p>
                  <p className="truncate text-xs text-white/42">{event.clientName}</p>
                  <p className="mt-1 text-[11px] text-white/28">ID {shortId(event.id, 12)}</p>
                </div>
                <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-bold uppercase text-white/60">
                  {event.status}
                </span>
              </div>
              <div className="mt-3 grid gap-2 text-xs text-white/45">
                <p>Dono: <span className="text-white/70">{ownerName(event.ownerId)}</span></p>
                <p>Data: <span className="text-white/70">{formatDate(event.date)}</span></p>
                <p>Local: <span className="text-white/70">{event.location || 'Sem local'}</span></p>
                <p>Mídias: <span className="text-white/70">{eventMediaCount(event)} arquivo(s), {videosByEvent.get(event.id) || 0} vídeo(s)</span></p>
              </div>
            </div>
          ))}
        </div>
        <div className="hidden overflow-x-auto md:block">
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
      </div>
    );
  };

  const renderMedia = () => {
    if (loadingOverview) return <EmptyState>Carregando mídias...</EmptyState>;
    if (!overview || overview.media.length === 0) return <EmptyState>Nenhuma mídia enviada encontrada.</EmptyState>;

    return (
      <div className="space-y-3">
        <div className="space-y-3 md:hidden">
          {overview.media.map((item: AdminMediaItem) => (
            <div key={item.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{item.fileName || 'Mídia'}</p>
                  <p className="mt-1 truncate text-xs text-white/35">{item.storagePath || item.url}</p>
                </div>
                <OpenMediaLink url={item.url} />
              </div>
              <div className="mt-3 grid gap-2 text-xs text-white/45">
                <p>Tipo: <span className="text-white/70">{mediaKindLabels[item.kind] || item.kind}</span></p>
                <p>Usuário: <span className="text-white/70">{ownerName(item.ownerId)}</span></p>
                <p>Origem: <span className="text-white/70">{item.sourceTitle}</span></p>
                <p>Criado: <span className="text-white/70">{formatDateTime(item.createdAt)}</span></p>
              </div>
            </div>
          ))}
        </div>
        <div className="hidden overflow-x-auto md:block">
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
      </div>
    );
  };

  const renderLogins = () => {
    if (loadingOverview) return <EmptyState>Carregando logs de login...</EmptyState>;
    if (!overview || overview.loginLogs.length === 0) return <EmptyState>Nenhum log de autenticacao registrado ainda.</EmptyState>;

    return (
      <div className="space-y-3">
        <div className="space-y-3 md:hidden">
          {overview.loginLogs.map((log) => {
            const user = logUser(log);
            const location = log.location || [log.city, log.region, log.country].filter(Boolean).join(', ') || 'Sem localização';
            return (
              <div key={log.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{formatDateTime(log.createdAt)}</p>
                    <p className="truncate text-xs text-white/42">{user?.name || log.email || 'Conta não identificada'}</p>
                  </div>
                  <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${log.success ? 'bg-green-500/12 text-green-200' : 'bg-red-500/14 text-red-200'}`}>
                    {log.success ? <CheckCircle2 className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
                    {log.success ? 'Sucesso' : 'Falha'}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-white/45">
                  <p>IP: <span className="text-white/70">{log.ip || 'Sem IP'}</span></p>
                  <p>Local: <span className="text-white/70">{location}</span></p>
                  <p>Dispositivo: <span className="text-white/70">{log.deviceName || 'Não informado'}</span></p>
                  <p>Hash: <span className="font-mono text-white/60">{shortId(log.deviceHash, 12)}</span></p>
                </div>
                {log.userAgent && <p className="mt-2 break-all font-mono text-[11px] text-white/30">{log.userAgent}</p>}
              </div>
            );
          })}
        </div>
        <div className="hidden overflow-x-auto md:block">
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

  const renderTrials = () => {
    if (loadingTrials) return <LoadingState message="Carregando solicitações de teste grátis..." />;
    if (trialRequests.length === 0) {
      return <EmptyState>Nenhuma solicitação de teste grátis recebida ainda.</EmptyState>;
    }

    const trialStatusStyles: Record<string, string> = {
      approved: 'border-emerald-300/25 bg-emerald-500/12 text-emerald-200',
      pending: 'border-amber-300/25 bg-amber-500/12 text-amber-200',
      expired: 'border-red-300/25 bg-red-500/12 text-red-200',
    };
    const trialStatusLabels: Record<string, string> = {
      approved: 'Aprovado',
      pending: 'Pendente',
      expired: 'Expirado',
    };

    return (
      <div className="space-y-3">
        {trialRequests.map((request) => {
          const status = request.status || 'approved';
          return (
            <div key={request.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-white">{request.name || 'Sem nome'}</p>
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${trialStatusStyles[status] || trialStatusStyles.approved}`}>
                      {trialStatusLabels[status] || status}
                    </span>
                    {request.businessName ? (
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] text-white/55">{request.businessName}</span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-white/40">
                    Solicitado em {formatDateTime(request.createdAt)}
                    {request.trialEndsAt ? ` · expira em ${formatDate(request.trialEndsAt)}` : ''}
                    {request.trialDays ? ` · ${request.trialDays} dia(s)` : ''}
                  </p>
                </div>
                {request.useType ? (
                  <span className="shrink-0 rounded-full border border-brand-300/20 bg-brand-500/10 px-3 py-1 text-[11px] font-semibold text-brand-100">
                    {request.useType}
                  </span>
                ) : null}
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {request.loginEmail ? (
                  <button
                    type="button"
                    onClick={() => void copyText(request.loginEmail, 'Login')}
                    className="group flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-left text-xs transition hover:bg-white/[0.06]"
                  >
                    <UserCheck className="h-3.5 w-3.5 shrink-0 text-white/40" />
                    <span className="truncate text-white/70">{request.loginEmail}</span>
                    <Copy className="ml-auto h-3.5 w-3.5 shrink-0 text-white/30 group-hover:text-white/60" />
                  </button>
                ) : null}
                {request.contactEmail ? (
                  <button
                    type="button"
                    onClick={() => void copyText(request.contactEmail, 'Email de contato')}
                    className="group flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-left text-xs transition hover:bg-white/[0.06]"
                  >
                    <Mail className="h-3.5 w-3.5 shrink-0 text-white/40" />
                    <span className="truncate text-white/70">{request.contactEmail}</span>
                    <Copy className="ml-auto h-3.5 w-3.5 shrink-0 text-white/30 group-hover:text-white/60" />
                  </button>
                ) : null}
                {request.phone ? (
                  <button
                    type="button"
                    onClick={() => void copyText(request.phone, 'Telefone')}
                    className="group flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-left text-xs transition hover:bg-white/[0.06]"
                  >
                    <Phone className="h-3.5 w-3.5 shrink-0 text-white/40" />
                    <span className="truncate text-white/70">{request.phone}</span>
                    <Copy className="ml-auto h-3.5 w-3.5 shrink-0 text-white/30 group-hover:text-white/60" />
                  </button>
                ) : null}
                {request.uid ? (
                  <button
                    type="button"
                    onClick={() => void openUserDetails(request.uid as string)}
                    className="flex items-center gap-2 rounded-xl border border-cyan-300/15 bg-cyan-500/[0.08] px-3 py-2 text-left text-xs font-semibold text-cyan-100 transition hover:bg-cyan-500/[0.14]"
                  >
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    <span>Ver usuário no painel</span>
                  </button>
                ) : null}
              </div>

              {request.description ? (
                <p className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-xs leading-relaxed text-white/55">
                  {request.description}
                </p>
              ) : null}
            </div>
          );
        })}
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
    const usage = details?.usage;
    const billingPayments = details?.billingPayments || [];
    const adminNotes = details?.adminNotes || [];
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
      { id: 'billing', label: 'Plano', icon: <UserCheck className="h-4 w-4" /> },
      { id: 'usage', label: 'Uso', icon: <Activity className="h-4 w-4" /> },
      { id: 'logins', label: 'Histórico', icon: <Clock className="h-4 w-4" /> },
      { id: 'devices', label: 'Dispositivos', icon: <Smartphone className="h-4 w-4" /> },
      { id: 'security', label: 'Segurança', icon: <ShieldAlert className="h-4 w-4" /> },
      { id: 'audit', label: 'Auditoria', icon: <Database className="h-4 w-4" /> },
      { id: 'notes', label: 'Notas', icon: <FileText className="h-4 w-4" /> },
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
                  {planName(drawerUser.planId)}
                </span>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${planExpiryBadgeClass(drawerUser)}`}>
                  {planExpiryText(drawerUser)}
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
                  <DetailField label="Plano atual" value={planName(drawerUser.planId)} />
                  <DetailField label="Status da conta" value={banLabel(drawerUser)} />
                  <DetailField label="Status do plano" value={planStatusLabel(drawerUser)} />
                  <DetailField label="Origem do plano" value={planOriginLabels[drawerUser.planOrigin || ''] || 'Não informada'} />
                  <DetailField label="Início do plano" value={formatDateTime(drawerUser.planStartedAt)} />
                  <DetailField label="Vencimento" value={drawerUser.planLifetime ? 'Vitalício' : formatDateTime(drawerUser.currentPeriodEnd || drawerUser.planExpiresAt)} />
                  <DetailField label="Dias restantes" value={planExpiryText(drawerUser)} />
                  <DetailField label="Provedor de cobrança" value={drawerUser.billingProvider || 'Não informado'} />
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
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <p className="mb-3 text-sm font-semibold text-white">Recursos liberados</p>
                  <div className="flex flex-wrap gap-2">
                    {(details?.user.entitlements?.features || PLAN_ENTITLEMENTS[safePlanId(drawerUser.planId)]).map((feature) => (
                      <span key={feature} className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-xs font-bold text-white/55">
                        {planFeatureLabels[feature] || feature}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {drawerUser && drawerTab === 'billing' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <DetailField label="Plano atual" value={planName(drawerUser.planId)} />
                  <DetailField label="Status do plano" value={planStatusLabel(drawerUser)} />
                  <DetailField label="Expiração" value={drawerUser.planLifetime ? 'Vitalício' : formatDateTime(drawerUser.currentPeriodEnd || drawerUser.planExpiresAt)} />
                  <DetailField label="Dias restantes" value={planExpiryText(drawerUser)} />
                  <DetailField label="Origem" value={planOriginLabels[drawerUser.planOrigin || ''] || 'Não informada'} />
                  <DetailField label="Última alteração" value={formatDateTime(drawerUser.lastPlanChangeAt)} />
                </div>

                <form onSubmit={(event) => void submitPlanChange(event, drawerUser)} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-white">Alterar plano manualmente</p>
                    <p className="mt-1 text-xs text-white/42">A alteração grava custom claims, documento do usuário e log administrativo.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-xs font-semibold uppercase text-white/35">Novo plano</span>
                      <select
                        value={planForm.planId}
                        onChange={(event) => setPlanForm((current) => ({ ...current, planId: event.target.value as PlanId }))}
                        className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-[#11131b] px-3 text-sm text-white outline-none"
                      >
                        {PLANS.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold uppercase text-white/35">Origem</span>
                      <select
                        value={planForm.origin}
                        onChange={(event) => setPlanForm((current) => ({ ...current, origin: event.target.value as AdminPlanOrigin }))}
                        className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-[#11131b] px-3 text-sm text-white outline-none"
                      >
                        {Object.entries(planOriginLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold uppercase text-white/35">Expiração</span>
                      <input
                        type="datetime-local"
                        value={planForm.expiresAt}
                        disabled={planForm.lifetime || planForm.keepCurrentExpiration}
                        onChange={(event) => setPlanForm((current) => ({ ...current, expiresAt: event.target.value }))}
                        className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none disabled:opacity-45"
                      />
                    </label>
                    <div className="grid gap-2 rounded-2xl border border-white/10 bg-black/15 p-3">
                      <label className="flex items-center gap-2 text-sm text-white/65">
                        <input
                          type="checkbox"
                          checked={planForm.keepCurrentExpiration}
                          onChange={(event) => setPlanForm((current) => ({ ...current, keepCurrentExpiration: event.target.checked }))}
                          className="h-4 w-4 accent-brand-400"
                        />
                        Manter expiração atual
                      </label>
                      <label className="flex items-center gap-2 text-sm text-white/65">
                        <input
                          type="checkbox"
                          checked={planForm.lifetime}
                          onChange={(event) => setPlanForm((current) => ({ ...current, lifetime: event.target.checked, keepCurrentExpiration: event.target.checked ? false : current.keepCurrentExpiration }))}
                          className="h-4 w-4 accent-brand-400"
                        />
                        Plano vitalício
                      </label>
                      <label className="flex items-center gap-2 text-sm text-white/65">
                        <input
                          type="checkbox"
                          checked={planForm.special}
                          onChange={(event) => setPlanForm((current) => ({ ...current, special: event.target.checked }))}
                          className="h-4 w-4 accent-brand-400"
                        />
                        Plano especial
                      </label>
                    </div>
                    <div className="grid gap-2 rounded-2xl border border-white/10 bg-black/15 p-3 sm:col-span-2">
                      <label className="flex items-center gap-2 text-sm text-white/65">
                        <input
                          type="checkbox"
                          checked={planForm.startsImmediately}
                          onChange={(event) => setPlanForm((current) => ({ ...current, startsImmediately: event.target.checked }))}
                          className="h-4 w-4 accent-brand-400"
                        />
                        Começar imediatamente
                      </label>
                      <label className="flex items-center gap-2 text-sm text-white/65">
                        <input
                          type="checkbox"
                          checked={planForm.applyPlanLimits}
                          onChange={(event) => setPlanForm((current) => ({ ...current, applyPlanLimits: event.target.checked }))}
                          className="h-4 w-4 accent-brand-400"
                        />
                        Aplicar limites do novo plano
                      </label>
                      <label className="flex items-center gap-2 text-sm text-white/65">
                        <input
                          type="checkbox"
                          checked={planForm.resetLimits}
                          onChange={(event) => setPlanForm((current) => ({ ...current, resetLimits: event.target.checked }))}
                          className="h-4 w-4 accent-brand-400"
                        />
                        Resetar limites usados
                      </label>
                    </div>
                    <label className="block sm:col-span-2">
                      <span className="text-xs font-semibold uppercase text-white/35">Motivo obrigatório</span>
                      <textarea
                        value={planForm.reason}
                        onChange={(event) => setPlanForm((current) => ({ ...current, reason: event.target.value }))}
                        rows={3}
                        className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none"
                        placeholder="Ex.: pagamento confirmado manualmente, benefício comercial, cupom, suporte..."
                      />
                    </label>
                  </div>
                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => void submitLifetimeGrant(drawerUser)}
                      disabled={adminActionSubmitting}
                      className="inline-flex h-10 items-center justify-center rounded-full border border-brand-300/25 bg-brand-500/10 px-4 text-xs font-bold text-brand-100 transition hover:bg-brand-500/15 disabled:opacity-50"
                    >
                      Tornar vitalício
                    </button>
                    <button
                      type="submit"
                      disabled={adminActionSubmitting}
                      className="inline-flex h-10 items-center justify-center rounded-full bg-brand-500 px-4 text-xs font-bold text-white transition hover:bg-brand-400 disabled:opacity-50"
                    >
                      {adminActionSubmitting ? 'Salvando...' : 'Salvar plano'}
                    </button>
                  </div>
                </form>

                <form onSubmit={(event) => void submitDaysAdjustment(event, drawerUser)} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-white">Adicionar ou remover dias</p>
                    <p className="mt-1 text-xs text-white/42">Atual: {formatDateTime(drawerUser.currentPeriodEnd || drawerUser.planExpiresAt)} - {planExpiryText(drawerUser)}</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
                    <select
                      value={daysForm.mode}
                      onChange={(event) => setDaysForm((current) => ({ ...current, mode: event.target.value as DayAdjustMode }))}
                      className="h-11 rounded-2xl border border-white/10 bg-[#11131b] px-3 text-sm text-white outline-none"
                    >
                      <option value="add">Adicionar dias</option>
                      <option value="remove">Remover dias</option>
                      <option value="set_expiration">Definir vencimento</option>
                      <option value="expire_now">Expirar agora</option>
                    </select>
                    {daysForm.mode === 'set_expiration' ? (
                      <input
                        type="datetime-local"
                        value={daysForm.expiresAt}
                        onChange={(event) => setDaysForm((current) => ({ ...current, expiresAt: event.target.value }))}
                        className="h-11 rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none"
                      />
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {[1, 7, 15, 30, 90, 365].map((days) => (
                          <button
                            key={days}
                            type="button"
                            onClick={() => setDaysForm((current) => ({ ...current, days }))}
                            className={`h-10 rounded-full border px-3 text-xs font-bold transition ${daysForm.days === days ? 'border-brand-300/35 bg-brand-500/15 text-white' : 'border-white/10 bg-white/[0.04] text-white/55 hover:text-white'}`}
                          >
                            {days}d
                          </button>
                        ))}
                        <input
                          type="number"
                          min={1}
                          max={3650}
                          value={daysForm.days}
                          onChange={(event) => setDaysForm((current) => ({ ...current, days: Math.max(1, Number(event.target.value) || 1) }))}
                          className="h-10 w-24 rounded-full border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none"
                        />
                      </div>
                    )}
                    <textarea
                      value={daysForm.reason}
                      onChange={(event) => setDaysForm((current) => ({ ...current, reason: event.target.value }))}
                      rows={3}
                      className="resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none sm:col-span-2"
                      placeholder="Motivo obrigatório do ajuste de dias..."
                    />
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button
                      type="submit"
                      disabled={adminActionSubmitting}
                      className="inline-flex h-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] px-4 text-xs font-bold text-white/70 transition hover:text-white disabled:opacity-50"
                    >
                      Confirmar ajuste
                    </button>
                  </div>
                </form>

                <form onSubmit={(event) => void submitTrialGrant(event, drawerUser)} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-white">Liberar teste grátis</p>
                    <p className="mt-1 text-xs text-white/42">Registra início, fim, admin responsável e motivo.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
                    <select
                      value={trialForm.planId}
                      onChange={(event) => setTrialForm((current) => ({ ...current, planId: event.target.value as PlanId }))}
                      className="h-11 rounded-2xl border border-white/10 bg-[#11131b] px-3 text-sm text-white outline-none"
                    >
                      {PLANS.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
                    </select>
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={trialForm.days}
                      onChange={(event) => setTrialForm((current) => ({ ...current, days: Math.max(1, Number(event.target.value) || 1) }))}
                      className="h-11 rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none"
                    />
                    <div className="flex flex-wrap gap-2 sm:col-span-2">
                      {[1, 3, 7, 14, 30].map((days) => (
                        <button
                          key={days}
                          type="button"
                          onClick={() => setTrialForm((current) => ({ ...current, days }))}
                          className={`h-9 rounded-full border px-3 text-xs font-bold transition ${trialForm.days === days ? 'border-blue-300/35 bg-blue-500/15 text-white' : 'border-white/10 bg-white/[0.04] text-white/55 hover:text-white'}`}
                        >
                          {days} dia(s)
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={trialForm.reason}
                      onChange={(event) => setTrialForm((current) => ({ ...current, reason: event.target.value }))}
                      rows={3}
                      className="resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none sm:col-span-2"
                      placeholder="Motivo obrigatório do teste grátis..."
                    />
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button
                      type="submit"
                      disabled={adminActionSubmitting}
                      className="inline-flex h-10 items-center justify-center rounded-full border border-blue-300/20 bg-blue-500/10 px-4 text-xs font-bold text-blue-100 transition hover:bg-blue-500/15 disabled:opacity-50"
                    >
                      Liberar teste
                    </button>
                  </div>
                </form>

                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <p className="mb-3 text-sm font-semibold text-white">Histórico de pagamentos</p>
                  {billingPayments.length === 0 ? (
                    <EmptyState>Nenhum pagamento encontrado para este usuário.</EmptyState>
                  ) : (
                    <div className="space-y-2">
                      {billingPayments.map((payment) => (
                        <div key={payment.id} className="rounded-2xl border border-white/[0.08] bg-black/18 p-3">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-white">{payment.planName || planName(payment.planId)}</p>
                              <p className="truncate text-xs text-white/40">{payment.provider} - {payment.paymentId}</p>
                            </div>
                            <span className="w-fit rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-bold text-white/55">{payment.status}</span>
                          </div>
                          <div className="mt-2 grid gap-1 text-xs text-white/42 sm:grid-cols-2">
                            <p>Valor: <span className="text-white/70">{payment.amount ? `R$ ${payment.amount.toFixed(2).replace('.', ',')}` : 'Não informado'}</span></p>
                            <p>Criado: <span className="text-white/70">{formatDateTime(payment.createdAt)}</span></p>
                            <p>Pago: <span className="text-white/70">{formatDateTime(payment.paidAt)}</span></p>
                            <p>Acesso até: <span className="text-white/70">{formatDateTime(payment.currentPeriodEnd)}</span></p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {drawerUser && drawerTab === 'usage' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {[
                    ['Eventos', usage?.events ?? 0],
                    ['Vídeos', usage?.videos ?? 0],
                    ['Uploads', usage?.uploads ?? 0],
                    ['Leads', usage?.leads ?? 0],
                    ['Downloads', usage?.downloads ?? 0],
                    ['Views', usage?.views ?? 0],
                    ['Compartilhamentos', usage?.shares ?? 0],
                    ['Publicações', usage?.publications ?? 0],
                    ['Templates usados', usage?.templatesUsed ?? 0],
                  ].map(([label, value]) => (
                    <DetailField key={label as string} label={label as string} value={value as number} />
                  ))}
                </div>
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <p className="text-sm font-semibold text-white">Limites preparados</p>
                  <p className="mt-1 text-sm leading-relaxed text-white/45">
                    O projeto controla acesso por recursos do plano. Quando limites numéricos forem adicionados ao produto, este painel já pode exibir o uso ao lado dos limites.
                  </p>
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

                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">Suspensão de acesso</p>
                      <p className="mt-1 text-xs text-white/45">
                        {drawerUser.disabled ? 'Usuário está suspenso no Firebase Auth.' : 'Usuário não está suspenso.'}
                      </p>
                    </div>
                    {drawerUser.disabled ? (
                      <button
                        type="button"
                        onClick={() => void submitReactivate(drawerUser)}
                        disabled={adminActionSubmitting}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-green-400/25 bg-green-500/10 px-4 text-xs font-bold text-green-100 transition hover:bg-green-500/15 disabled:opacity-50"
                      >
                        <Unlock className="h-4 w-4" />
                        Reativar usuário
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void submitSuspend(drawerUser)}
                        disabled={adminActionSubmitting || drawerUser.role === 'admin'}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-yellow-400/25 bg-yellow-500/10 px-4 text-xs font-bold text-yellow-100 transition hover:bg-yellow-500/15 disabled:opacity-50"
                      >
                        <ShieldAlert className="h-4 w-4" />
                        Suspender usuário
                      </button>
                    )}
                  </div>
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
                          {log.origin && <p>Origem: <span className="text-white/70">{log.origin}</span></p>}
                        </div>
                        {log.reason && <p className="mt-3 rounded-xl bg-black/20 p-3 text-sm text-white/60">Motivo: {log.reason}</p>}
                        {(log.oldValue && Object.keys(log.oldValue).length > 0 || log.newValue && Object.keys(log.newValue).length > 0) && (
                          <details className="mt-3 rounded-xl border border-white/[0.06] bg-black/20 p-3">
                            <summary className="cursor-pointer text-xs font-bold text-white/55">Valores registrados</summary>
                            <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words text-[11px] leading-relaxed text-white/42">
                              {JSON.stringify({ antigo: log.oldValue || {}, novo: log.newValue || {} }, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {drawerUser && drawerTab === 'notes' && (
              <div className="space-y-4">
                <form onSubmit={(event) => void submitInternalNote(event, drawerUser)} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <p className="text-sm font-semibold text-white">Nova observação interna</p>
                  <p className="mt-1 text-xs text-white/42">Notas internas são visíveis somente para administradores.</p>
                  <textarea
                    value={noteText}
                    onChange={(event) => setNoteText(event.target.value)}
                    rows={5}
                    className="mt-3 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none"
                    placeholder="Ex.: Cliente pediu mais 7 dias de teste, pagamento confirmado manualmente, conta suspeita..."
                  />
                  <div className="mt-3 flex justify-end">
                    <button
                      type="submit"
                      disabled={adminActionSubmitting}
                      className="inline-flex h-10 items-center justify-center rounded-full bg-brand-500 px-4 text-xs font-bold text-white transition hover:bg-brand-400 disabled:opacity-50"
                    >
                      Salvar nota
                    </button>
                  </div>
                </form>

                {adminNotes.length === 0 ? (
                  <EmptyState>Nenhuma nota interna registrada.</EmptyState>
                ) : (
                  <div className="space-y-2">
                    {adminNotes.map((note) => (
                      <div key={note.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/72">{note.note}</p>
                        <p className="mt-3 text-xs text-white/35">
                          {formatDateTime(note.createdAt)} - {note.createdByEmail || shortId(note.createdBy, 16)}
                        </p>
                      </div>
                    ))}
                  </div>
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
      <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/72 p-0 backdrop-blur-sm sm:items-center sm:p-4">
        <form onSubmit={submitBan} className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-red-400/20 bg-[#0b0c12] p-5 shadow-2xl shadow-black/60 sm:rounded-2xl">
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
      <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/72 p-0 backdrop-blur-sm sm:items-center sm:p-4">
        <form onSubmit={submitCreateSupportUser} className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-cyan-300/20 bg-[#0b0c12] p-5 shadow-2xl shadow-black/60 sm:rounded-2xl">
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
    <div className="space-y-4 sm:space-y-5">
      <section className="rounded-2xl border border-white/[0.08] bg-[#101218] p-3 shadow-[0_16px_45px_rgba(0,0,0,0.22)] sm:p-4">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-yellow-400/10 text-yellow-300 ring-1 ring-yellow-300/20">
              <Shield className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-black leading-tight text-white sm:text-2xl">Admin</h1>
              <p className="truncate text-xs text-white/40">Sessao confirmada</p>
            </div>
          </div>
          <div className="min-w-0 shrink text-right">
            <p className="text-[10px] font-bold uppercase tracking-wide text-white/28">Atualizado</p>
            <p className="truncate text-[11px] font-semibold text-white/50">{overview ? formatDateTime(overview.generatedAt) : 'agora'}</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {adminMetrics.map((metric) => (
            <AdminMetricTile
              key={metric.title}
              title={metric.title}
              value={metric.value}
              icon={metric.icon}
              color={metric.color}
              loading={metric.loading}
            />
          ))}
        </div>
      </section>

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

      {activeSection === 'trials' && (
        <Panel title="Solicitações de teste grátis" icon={<Gift className="h-5 w-5" />}>
          {renderTrials()}
        </Panel>
      )}

      <AdminSupportPanel />
      {renderUserDrawer()}
      {renderBanModal()}
      {renderSupportUserModal()}
    </div>
  );
}
