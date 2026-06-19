export type UserRole = 'admin' | 'support' | 'user';
export type UserBanStatus = 'active' | 'expired' | 'revoked';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  subscriptionStatus?: 'unpaid' | 'active' | 'past_due' | 'canceled';
  planId?: string | null;
  entitlements?: {
    planId: 'starter' | 'pro' | 'unlimited';
    features: string[];
    effects: string[];
  };
  currentPeriodEnd?: string | null;
  renewalDay?: number | null;
  trustedDevices?: TrustedDevice[];
  companyName?: string;
  avatarUrl?: string;
  banned?: boolean;
  banReason?: string;
  bannedAt?: string;
  bannedBy?: string;
  banExpiresAt?: string | null;
  banStatus?: UserBanStatus | string;
  banRevokedAt?: string;
  banRevokedBy?: string;
  notificationPreferences?: NotificationPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface TrustedDevice {
  id: string;
  name: string;
  ip?: string;
  location?: string;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  createdAt: string;
  lastSeenAt: string;
  isCurrent: boolean;
}

export type NotificationCategory = 'support' | 'billing' | 'video' | 'event' | 'template' | 'system' | 'admin';
export type NotificationPriority = 'low' | 'normal' | 'high';

export interface NotificationPreferences {
  inApp: boolean;
  browser: boolean;
  sound: boolean;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  categories: Record<NotificationCategory, boolean>;
}

export interface AppNotification {
  id: string;
  recipientUid: string;
  category: NotificationCategory;
  title: string;
  body: string;
  link?: string;
  priority: NotificationPriority;
  metadata?: Record<string, unknown>;
  readAt?: string | null;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SupportConversation {
  id: string;
  ownerUid: string;
  visitorId?: string;
  accessLevel?: 'authenticated' | 'anonymous';
  source?: 'app' | 'login';
  userName: string;
  userEmail: string;
  contactEmail?: string;
  subject: string;
  status: 'open' | 'answered' | 'closed';
  lastMessagePreview: string;
  lastMessageAt: string;
  unreadForAdmin: number;
  unreadForUser: number;
  createdAt: string;
  updatedAt: string;
}

export interface SupportUserSummary {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  disabled: boolean;
  emailVerified: boolean;
  subscriptionStatus?: string | null;
  planId?: string | null;
  companyName?: string;
  avatarUrl?: string;
  currentPeriodEnd?: string | null;
  createdAt: string;
  lastSignInAt?: string | null;
}

export interface SupportMessage {
  id: string;
  conversationId: string;
  senderUid: string;
  senderRole: 'admin' | 'support' | 'user' | 'anonymous' | 'system';
  senderName: string;
  body: string;
  createdAt: string;
  localId?: string;
  pending?: boolean;
}

export type EventStatus = 'draft' | 'active' | 'closed' | 'archived';
export type EventType = 'wedding' | 'birthday' | 'graduation' | 'corporate' | 'club' | 'inauguration' | 'church' | 'store' | 'other';

export interface EventBranding {
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string;
}

export interface AppEvent {
  id: string;
  ownerId: string;
  name: string;
  clientName: string;
  date: string;
  location: string;
  type: EventType;
  description?: string;
  status: EventStatus;
  coverUrl?: string;
  avatarUrl?: string;
  logoUrl?: string;
  mediaUrls?: string[];
  profileHeadline?: string;
  slug: string;
  passwordEnabled: boolean;
  branding: EventBranding;
  defaultTemplateId?: string;
  leadCaptureEnabled: boolean;
  leadCaptureRequired: boolean;
  shareMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export type VideoStatus = 'uploaded' | 'processing' | 'processed' | 'failed' | 'published';
export type VideoVisibility = 'public' | 'private';

export interface AppVideo {
  id: string;
  eventId: string;
  ownerId: string;
  operatorId: string;
  title: string;
  storagePath: string;
  videoUrl: string;
  rawVideoUrl?: string;
  thumbnailUrl?: string;
  status: VideoStatus;
  visibility?: VideoVisibility;
  duration?: number;
  size?: number;
  format?: string;
  templateId?: string;
  templateStoragePath?: string;
  templateType?: 'static' | 'animated';
  templateOpacity?: number;
  effect?: string;
  musicTheme?: string;
  musicUrl?: string;
  views: number;
  downloads: number;
  shares: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserDevice extends TrustedDevice {
  browser?: string;
  os?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet' | 'unknown' | string;
  userAgent?: string | null;
  loginCount?: number;
  recentIps?: string[];
  trusted?: boolean;
  suspicious?: boolean;
  revokedAt?: string | null;
}

export interface AdminUserOverview {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  disabled: boolean;
  emailVerified: boolean;
  subscriptionStatus?: string | null;
  planId?: string | null;
  billingProvider?: string | null;
  currentPeriodEnd?: string | null;
  planExpiresAt?: string | null;
  planStartedAt?: string | null;
  planOrigin?: 'payment' | 'manual_admin' | 'affiliate' | 'coupon' | 'trial' | 'promotion' | 'support' | string | null;
  planLifetime?: boolean;
  planSpecial?: boolean;
  trialStartedAt?: string | null;
  trialEndsAt?: string | null;
  renewalDay?: number | null;
  daysRemaining?: number | null;
  planStatus?: 'active' | 'inactive' | 'expired' | 'trial' | 'lifetime' | 'banned' | 'suspended' | string | null;
  lastPlanChangeAt?: string | null;
  manualPlanReason?: string | null;
  companyName?: string;
  avatarUrl?: string;
  provider?: string;
  banned?: boolean;
  banReason?: string;
  bannedAt?: string | null;
  bannedBy?: string | null;
  banExpiresAt?: string | null;
  banStatus?: UserBanStatus | string;
  banRevokedAt?: string | null;
  banRevokedBy?: string | null;
  createdAt: string;
  lastSignInAt?: string | null;
  lastRefreshAt?: string | null;
  devices: AdminUserDevice[];
}

export interface UserLoginEvent {
  id: string;
  userId?: string | null;
  email?: string | null;
  loginAt: string;
  createdAt?: string;
  ip?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  location?: string | null;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown' | string;
  os: string;
  browser: string;
  userAgent?: string | null;
  sessionId?: string | null;
  deviceHash?: string | null;
  deviceName?: string | null;
  loginMethod: 'email' | 'google' | 'unknown' | string;
  success: boolean;
  failureReason?: string | null;
  suspicious?: boolean;
}

export interface AdminAuditLog {
  id: string;
  action:
    | 'USER_BANNED'
    | 'USER_UNBANNED'
    | 'USER_ROLE_UPDATED'
    | 'SUPPORT_USER_CREATED'
    | 'PLAN_CHANGED'
    | 'DAYS_ADDED'
    | 'DAYS_REMOVED'
    | 'PLAN_EXPIRED'
    | 'USER_SUSPENDED'
    | 'USER_REACTIVATED'
    | 'TRIAL_GRANTED'
    | 'LIFETIME_GRANTED'
    | 'MANUAL_NOTE_ADDED'
    | string;
  targetUserId?: string | null;
  targetEmail?: string | null;
  reason?: string;
  performedBy?: string | null;
  performedByEmail?: string | null;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  origin?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AdminUserUsage {
  uploads: number;
  videos: number;
  events: number;
  templatesUsed: number;
  storageBytes: number;
  leads: number;
  downloads: number;
  views: number;
  shares: number;
  publications: number;
}

export interface AdminBillingPayment {
  id: string;
  provider: string;
  paymentId: string;
  externalId?: string;
  planId?: string | null;
  planName?: string;
  amount?: number;
  amountCents?: number;
  status: string;
  paidAt?: string | null;
  expiresAt?: string | null;
  currentPeriodEnd?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface AdminInternalNote {
  id: string;
  note: string;
  createdAt: string;
  createdBy?: string | null;
  createdByEmail?: string | null;
}

export interface UserAdminDetails {
  user: AdminUserOverview & {
    loginCount?: number;
    deviceCount?: number;
    firstLoginAt?: string | null;
    lastLoginAt?: string | null;
    lastIp?: string | null;
    lastUserAgent?: string | null;
    signupSource?: string | null;
    loginMethod?: string | null;
    suspiciousEvents7d?: number;
    entitlements?: {
      planId: 'starter' | 'pro' | 'unlimited';
      features: string[];
      effects: string[];
    };
  };
  loginEvents: UserLoginEvent[];
  devices: AdminUserDevice[];
  auditLogs: AdminAuditLog[];
  usage?: AdminUserUsage;
  billingPayments?: AdminBillingPayment[];
  adminNotes?: AdminInternalNote[];
}

export type AdminMediaKind =
  | 'event_cover'
  | 'event_avatar'
  | 'event_logo'
  | 'event_media'
  | 'video'
  | 'raw_video'
  | 'thumbnail'
  | 'music';

export interface AdminMediaItem {
  id: string;
  kind: AdminMediaKind | string;
  url: string;
  fileName: string;
  ownerId: string;
  source: 'event' | 'video';
  sourceId: string;
  sourceTitle: string;
  eventId?: string | null;
  videoId?: string | null;
  storagePath?: string | null;
  createdAt: string;
}

export interface AuthAuditLog {
  id: string;
  category: 'auth' | string;
  type: 'register' | 'login' | 'password_reset' | 'logout' | string;
  uid?: string | null;
  email?: string | null;
  success: boolean;
  reason?: string | null;
  ip: string;
  userAgent?: string | null;
  deviceHash?: string | null;
  deviceName?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  location?: string | null;
  method?: string | null;
  path?: string | null;
  origin?: string | null;
  referer?: string | null;
  createdAt: string;
}

export interface AdminOverviewSummary {
  totalUsers: number;
  totalEvents: number;
  totalVideos: number;
  totalMedia: number;
  loginAttempts24h: number;
  failedLoginAttempts24h: number;
  disabledUsers: number;
  supportUsers?: number;
  activeUsers?: number;
  expiredUsers?: number;
  trialUsers?: number;
  bannedOrSuspendedUsers?: number;
  lifetimeUsers?: number;
  expiringIn7Days?: number;
  expiringIn30Days?: number;
  usersByPlan?: Record<string, number>;
}

export interface AdminOverview {
  generatedAt: string;
  summary: AdminOverviewSummary;
  users: AdminUserOverview[];
  events: AppEvent[];
  videos: AppVideo[];
  media: AdminMediaItem[];
  loginLogs: AuthAuditLog[];
}

export interface Lead {
  id: string;
  eventId: string;
  videoId?: string;
  name: string;
  phone?: string;
  email?: string;
  instagram?: string;
  feedback?: string;
  visitorId?: string | null;
  acceptedTerms: boolean;
  source: string;
  createdAt: string;
}

export interface TrialRequest {
  id: string;
  uid?: string;
  name: string;
  username?: string;
  loginEmail?: string;
  contactEmail?: string;
  phone?: string;
  businessName?: string;
  useType?: string;
  description?: string;
  status: 'approved' | 'pending' | 'expired';
  planId?: string;
  trialDays?: number;
  trialStartedAt?: string | null;
  trialEndsAt?: string | null;
  source?: string;
  createdAt: string;
}

export type EngagementEventType = 'view' | 'download' | 'share' | 'whatsapp' | 'copy_link' | 'qr_code' | 'feedback';

export interface EngagementEvent {
  id: string;
  type: EngagementEventType;
  eventId?: string | null;
  videoId?: string | null;
  visitorId?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export type TemplateCategory =
  | 'party'
  | 'wedding'
  | 'corporate'
  | 'birthday'
  | 'viral'
  | 'premium'
  | 'graduation'
  | 'store'
  | 'church'
  | 'infantil'
  | 'esportivo'
  | 'natal'
  | 'carnaval'
  | 'cha_revelacao'
  | 'halloween'
  | 'brilhos_estrelas'
  | 'confetes_festa'
  | 'neon_glow'
  | 'circulos_animados'
  | 'setas_chamadas'
  | 'emojis_reacoes'
  | 'elementos_festivos'
  | 'cards_faixas'
  | 'tech_futurista'
  | 'cubos_isometricos'
  | 'flores_decorativos'
  | 'minimal_premium'
  | 'gamer_neon'
  | 'tropical'
  | 'booth_360'
  | 'fogo'
  | 'gelo'
  | 'oceano'
  | 'galaxia';

export interface AppTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  colors: { primary: string; secondary: string };
  font: string;
  designId?: string;
  layout?: string;
  variantKey?: string;
  variantName?: string;
  previewUrl?: string;
  overlayUrl?: string;
  animationUrl?: string;
  animationStoragePath?: string;
  tags?: string[];
  type?: 'static' | 'animated';
  format?: 'png' | 'webp' | 'svg' | 'lottie' | 'webm' | 'gif';
  templateType?: 'static' | 'animated';
  assetFormat?: 'png' | 'webp' | 'svg' | 'lottie' | 'webm' | 'gif';
  previewPath?: string;
  thumbnailPath?: string;
  isPremium?: boolean;
  layerMode?: 'frame' | 'sticker' | 'full-overlay' | 'corner-decoration';
  opacityDefault?: number;
  safeArea?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  frameUrl?: string;
  musicUrl?: string;
  storagePath?: string;
  ownerId?: string;
  source?: 'generated' | 'custom' | 'default';
  aspectRatio: '9:16' | '1:1' | '16:9' | 'auto';
  effects: string[];
  isGlobal: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppMusic {
  id: string;
  ownerId?: string;
  name: string;
  category: TemplateCategory | 'ambient';
  theme?: string;
  bpm?: number;
  duration?: number;
  musicUrl?: string;
  storagePath?: string;
  source?: 'generated' | 'custom' | 'default';
  library?: string;
  providerId?: MusicLibraryProviderId;
  providerTrackId?: string;
  providerArtist?: string;
  pageUrl?: string;
  originalAudioUrl?: string;
  licenseName?: string;
  licenseUrl?: string;
  licenseStatus?: MusicLicenseStatus;
  licenseCheckedAt?: string;
  licenseProofUrl?: string;
  attribution?: string;
  isGlobal: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // --- Metadados estendidos (sistema de música v2; todos opcionais p/ retrocompatibilidade) ---
  slug?: string;
  subcategory?: string;
  /** Categoria musical normalizada (ver features/music). Mantém `category` legado. */
  musicCategory?: string;
  mood?: string[];
  /** Energia 1..10. */
  energyLevel?: number;
  durationOriginal?: number;
  /** Cortes disponíveis/possíveis (5|15|25|35|45). */
  availableCuts?: number[];
  bestForDurations?: number[];
  previewUrl?: string;
  waveformUrl?: string;
  /** URLs de cortes prontos por duração: { "15": url }. */
  cuts?: Record<string, string>;
  licenseType?: string;
  allowedCommercialUse?: boolean;
  attributionRequired?: boolean;
  tags?: string[];
  isPremium?: boolean;
}

export type MusicLibraryProviderId =
  | 'youtube_audio_library'
  | 'pixabay_music'
  | 'free_music_archive'
  | 'artlist'
  | 'epidemic_sound'
  | 'soundstripe'
  | 'premiumbeat'
  | 'envato_elements'
  | 'uppbeat'
  | 'audiio';

export type MusicLicenseStatus =
  | 'allowed'
  | 'requires_attribution'
  | 'requires_subscription'
  | 'test_only'
  | 'manual_review'
  | 'blocked';

export interface MusicLibraryProvider {
  id: MusicLibraryProviderId;
  name: string;
  type: 'open_catalog' | 'manual_catalog' | 'subscription_catalog';
  homepageUrl: string;
  licenseUrl: string;
  docsUrl?: string;
  browseUrl?: string;
  supportsPublicApiSearch: boolean;
  supportsRemoteImport: boolean;
  requiresLicenseProof: boolean;
  defaultLicenseName: string;
  notes: string[];
}

export interface MusicLicenseEvaluation {
  providerId: MusicLibraryProviderId;
  status: MusicLicenseStatus;
  licenseName: string;
  licenseUrl?: string;
  attributionRequired: boolean;
  licenseProofRequired: boolean;
  checkedAt: string;
  warnings: string[];
}

export interface MusicLibraryImportInput {
  providerId: MusicLibraryProviderId;
  name: string;
  artist?: string;
  category?: TemplateCategory | 'ambient';
  theme?: string;
  bpm?: number;
  duration?: number;
  audioUrl: string;
  pageUrl?: string;
  providerTrackId?: string;
  licenseName?: string;
  licenseUrl?: string;
  attribution?: string;
  licenseProofUrl?: string;
  subscriptionConfirmed?: boolean;
}

export interface DashboardStats {
  totalEvents: number;
  totalVideos: number;
  totalShares: number;
  totalLeads: number;
  totalDownloads: number;
  totalViews: number;
  activeEvents: number;
  shareRate: number;
}

export interface DashboardChartPoint {
  name: string;
  date: string;
  videos: number;
  leads: number;
  cumulativeVideos: number;
  cumulativeLeads: number;
}
