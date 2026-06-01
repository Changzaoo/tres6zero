export type UserRole = 'admin' | 'operator' | 'viewer';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  companyName?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type EventStatus = 'draft' | 'active' | 'closed' | 'archived';
export type EventType = 'wedding' | 'birthday' | 'graduation' | 'corporate' | 'club' | 'inauguration' | 'church' | 'store' | 'other';

export interface EventBranding {
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string;
  watermarkUrl?: string;
}

export interface Event {
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
  logoUrl?: string;
  slug: string;
  passwordEnabled: boolean;
  passwordHash?: string;
  branding: EventBranding;
  defaultTemplateId?: string;
  leadCaptureEnabled: boolean;
  leadCaptureRequired: boolean;
  shareMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export type VideoStatus = 'uploaded' | 'processing' | 'processed' | 'failed' | 'published';

export interface VideoEffects {
  type: 'slowmotion' | 'boomerang' | 'cinematic' | 'party' | 'neon' | 'luxury' | 'clean' | 'corporate' | 'wedding' | 'birthday';
}

export interface Video {
  id: string;
  eventId: string;
  ownerId: string;
  operatorId: string;
  title: string;
  storagePath: string;
  videoUrl: string;
  thumbnailUrl?: string;
  status: VideoStatus;
  duration?: number;
  size?: number;
  format?: string;
  templateId?: string;
  effects?: VideoEffects;
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
export type AspectRatio = '9:16' | '1:1' | '16:9';

export interface Template {
  id: string;
  name: string;
  category: TemplateCategory;
  colors: { primary: string; secondary: string };
  font: string;
  overlayUrl?: string;
  frameUrl?: string;
  musicUrl?: string;
  previewUrl?: string;
  aspectRatio: AspectRatio;
  effects: string[];
  isGlobal: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type MetricEventType = 'view' | 'download' | 'share' | 'lead';

export interface MetricEvent {
  id: string;
  type: MetricEventType;
  eventId?: string;
  videoId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
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
