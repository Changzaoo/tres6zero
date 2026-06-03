import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { OFFLINE_DB_NAME, OFFLINE_DB_VERSION } from './offlineConfig';
import type {
  CachedResponse,
  LocalRecord,
  OfflineConflict,
  OfflineFileRecord,
  OfflineLogEntry,
  SyncQueueItem,
} from './offlineTypes';

interface Six3OfflineDb extends DBSchema {
  localRecords: {
    key: string;
    value: LocalRecord;
    indexes: {
      'by-entity': string;
      'by-owner': string;
      'by-sync-status': string;
      'by-remote-id': string;
      'by-updated-at': string;
    };
  };
  syncQueue: {
    key: string;
    value: SyncQueueItem;
    indexes: {
      'by-status': string;
      'by-entity-id': [string, string];
      'by-created-at': string;
      'by-next-at': string;
    };
  };
  files: {
    key: string;
    value: OfflineFileRecord;
    indexes: {
      'by-sync-status': string;
      'by-created-at': string;
      'by-owner': string;
    };
  };
  logs: {
    key: string;
    value: OfflineLogEntry;
    indexes: {
      'by-created-at': string;
      'by-level': string;
      'by-scope': string;
    };
  };
  responseCache: {
    key: string;
    value: CachedResponse;
    indexes: {
      'by-scope': string;
      'by-expires-at': number;
    };
  };
  conflicts: {
    key: string;
    value: OfflineConflict;
    indexes: {
      'by-status': string;
      'by-entity-id': [string, string];
      'by-created-at': string;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<Six3OfflineDb>> | null = null;

function createStores(db: IDBPDatabase<Six3OfflineDb>) {
  if (!db.objectStoreNames.contains('localRecords')) {
    const store = db.createObjectStore('localRecords', { keyPath: 'id' });
    store.createIndex('by-entity', 'entity');
    store.createIndex('by-owner', 'ownerId');
    store.createIndex('by-sync-status', 'syncStatus');
    store.createIndex('by-remote-id', 'remoteId');
    store.createIndex('by-updated-at', 'updatedAt');
  }

  if (!db.objectStoreNames.contains('syncQueue')) {
    const store = db.createObjectStore('syncQueue', { keyPath: 'id' });
    store.createIndex('by-status', 'status');
    store.createIndex('by-entity-id', ['entity', 'entityId']);
    store.createIndex('by-created-at', 'createdAt');
    store.createIndex('by-next-at', 'nextAttemptAt');
  }

  if (!db.objectStoreNames.contains('files')) {
    const store = db.createObjectStore('files', { keyPath: 'id' });
    store.createIndex('by-sync-status', 'syncStatus');
    store.createIndex('by-created-at', 'createdAt');
    store.createIndex('by-owner', 'ownerId');
  }

  if (!db.objectStoreNames.contains('logs')) {
    const store = db.createObjectStore('logs', { keyPath: 'id' });
    store.createIndex('by-created-at', 'createdAt');
    store.createIndex('by-level', 'level');
    store.createIndex('by-scope', 'scope');
  }

  if (!db.objectStoreNames.contains('responseCache')) {
    const store = db.createObjectStore('responseCache', { keyPath: 'key' });
    store.createIndex('by-scope', 'scope');
    store.createIndex('by-expires-at', 'expiresAt');
  }

  if (!db.objectStoreNames.contains('conflicts')) {
    const store = db.createObjectStore('conflicts', { keyPath: 'id' });
    store.createIndex('by-status', 'status');
    store.createIndex('by-entity-id', ['entity', 'entityId']);
    store.createIndex('by-created-at', 'createdAt');
  }
}

export function getOfflineDb() {
  if (!dbPromise) {
    dbPromise = openDB<Six3OfflineDb>(OFFLINE_DB_NAME, OFFLINE_DB_VERSION, {
      upgrade(db) {
        createStores(db);
      },
    });
  }

  return dbPromise;
}

export async function clearOfflineDatabase() {
  const db = await getOfflineDb();
  const stores = ['localRecords', 'syncQueue', 'files', 'logs', 'responseCache', 'conflicts'] as const;
  await Promise.all(stores.map((store) => db.clear(store)));
}

