export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export type OfflineEntity =
  | 'user'
  | 'session'
  | 'event'
  | 'video'
  | 'template'
  | 'music'
  | 'settings'
  | 'upload'
  | 'lead'
  | 'support'
  | 'cache'
  | 'custom';

export type LocalSyncStatus =
  | 'synced'
  | 'pending_create'
  | 'pending_update'
  | 'pending_delete'
  | 'failed'
  | 'conflict';

export type SyncActionType =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'UPLOAD'
  | 'DOWNLOAD_CACHE'
  | 'LOGIN_REFRESH'
  | 'CUSTOM';

export type SyncQueueStatus = 'pending' | 'running' | 'synced' | 'failed' | 'conflict' | 'canceled';

export type OfflineLogLevel = 'info' | 'warn' | 'error';

export type ConflictResolutionChoice = 'local' | 'remote' | 'duplicate' | 'later';

export interface LocalRecord<TPayload = unknown> {
  id: string;
  remoteId?: string;
  entity: OfflineEntity;
  ownerId?: string;
  payload: TPayload;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  syncStatus: LocalSyncStatus;
  version: number;
  lastSyncedAt?: string;
  source: 'local' | 'remote';
}

export interface SyncQueueItem<TPayload = unknown> {
  id: string;
  type: SyncActionType;
  entity: OfflineEntity;
  entityId: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  endpoint: string;
  payload?: TPayload;
  fileRef?: string;
  createdAt: string;
  updatedAt: string;
  attempts: number;
  maxAttempts: number;
  status: SyncQueueStatus;
  error?: string;
  priority: number;
  nextAttemptAt?: string;
  lastAttemptAt?: string;
  clientMutationId: string;
}

export interface OfflineFileRecord {
  id: string;
  ownerId?: string;
  name: string;
  type: string;
  size: number;
  blob: Blob;
  previewUrl?: string;
  remoteUrl?: string;
  storagePath?: string;
  syncStatus: LocalSyncStatus;
  createdAt: string;
  updatedAt: string;
  uploadAttempts: number;
  error?: string;
  endpoint: string;
}

export interface OfflineLogEntry {
  id: string;
  level: OfflineLogLevel;
  scope: string;
  message: string;
  data?: unknown;
  createdAt: string;
}

export interface CachedResponse<TValue = unknown> {
  key: string;
  scope: string;
  value: TValue;
  savedAt: number;
  expiresAt: number;
  path?: string;
}

export interface OfflineConflict<TLocal = unknown, TRemote = unknown> {
  id: string;
  entity: OfflineEntity;
  entityId: string;
  localValue: TLocal;
  remoteValue?: TRemote;
  reason: string;
  status: 'open' | 'resolved' | 'dismissed';
  createdAt: string;
  resolvedAt?: string;
  resolution?: ConflictResolutionChoice;
}

export interface NetworkStatusSnapshot {
  isOnline: boolean;
  wasOffline: boolean;
  connectionType?: string;
  lastOnlineAt?: string;
  lastOfflineAt?: string;
  isReconnecting: boolean;
}

export interface SyncSummary {
  pending: number;
  running: number;
  failed: number;
  conflict: number;
  canceled: number;
  isSyncing: boolean;
  lastSyncedAt?: string;
  lastError?: string;
}

