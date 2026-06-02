export type UserRole = 'admin' | 'user';

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

export interface SupportConversation {
  id: string;
  ownerUid: string;
  userName: string;
  userEmail: string;
  subject: string;
  status: 'open' | 'answered' | 'closed';
  lastMessagePreview: string;
  lastMessageAt: string;
  unreadForAdmin: number;
  unreadForUser: number;
  createdAt: string;
  updatedAt: string;
}

export interface SupportMessage {
  id: string;
  conversationId: string;
  senderUid: string;
  senderRole: 'admin' | 'user';
  senderName: string;
  body: string;
  createdAt: string;
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
  duration?: number;
  size?: number;
  format?: string;
  templateId?: string;
  effect?: string;
  musicTheme?: string;
  musicUrl?: string;
  views: number;
  downloads: number;
  shares: number;
  createdAt: string;
  updatedAt: string;
}

export interface Lead {
  id: string;
  eventId: string;
  videoId?: string;
  name: string;
  phone?: string;
  email?: string;
  instagram?: string;
  acceptedTerms: boolean;
  source: string;
  createdAt: string;
}

export type TemplateCategory = 'party' | 'wedding' | 'corporate' | 'birthday' | 'viral' | 'premium';

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
  frameUrl?: string;
  musicUrl?: string;
  storagePath?: string;
  ownerId?: string;
  source?: 'generated' | 'custom' | 'default';
  aspectRatio: '9:16' | '1:1' | '16:9';
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
  isGlobal: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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
