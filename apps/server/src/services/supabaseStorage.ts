import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const DEFAULT_SUPABASE_URL = 'https://xmuawzcpydmbcqackgoz.supabase.co';

export type SupabaseBucket = 'videos' | 'templates';

let client: SupabaseClient | null = null;

function getSupabaseConfig() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!key) {
    const err = new Error('SUPABASE_KEY_NOT_CONFIGURED');
    (err as any).status = 500;
    throw err;
  }

  return {
    url: process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL,
    key,
  };
}

export function getSupabaseUrl() {
  return getSupabaseConfig().url;
}

export function getSupabase() {
  if (!client) {
    const { url, key } = getSupabaseConfig();
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}

function safeExt(originalName: string, fallback: string) {
  const ext = path.extname(originalName).toLowerCase();
  return ext && ext.length <= 8 ? ext : fallback;
}

export function publicUrl(bucket: SupabaseBucket, objectPath: string) {
  const { data } = getSupabase().storage.from(bucket).getPublicUrl(objectPath);
  return data.publicUrl;
}

export async function uploadBufferToSupabase(params: {
  bucket: SupabaseBucket;
  prefix: string;
  fileName: string;
  fallbackExt: string;
  buffer: Buffer;
  contentType: string;
}) {
  const ext = safeExt(params.fileName, params.fallbackExt);
  const objectPath = `${params.prefix}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}${ext}`;

  const { data, error } = await getSupabase()
    .storage
    .from(params.bucket)
    .upload(objectPath, params.buffer, {
      contentType: params.contentType,
      upsert: false,
    });

  if (error) {
    const err = new Error(`SUPABASE_UPLOAD_FAILED: ${error.message}`);
    (err as any).status = 502;
    throw err;
  }

  return {
    bucket: params.bucket,
    path: data.path,
    publicUrl: publicUrl(params.bucket, data.path),
  };
}

export async function downloadToTempFile(url: string, fallbackExt = '.bin') {
  const response = await fetch(url);
  if (!response.ok) {
    const err = new Error(`DOWNLOAD_FAILED: ${response.status}`);
    (err as any).status = 502;
    throw err;
  }

  const dir = path.join(os.tmpdir(), `six3-${randomUUID()}`);
  await mkdir(dir, { recursive: true });
  const contentType = response.headers.get('content-type') || '';
  const ext = contentType.includes('png') ? '.png'
    : contentType.includes('svg') ? '.svg'
    : contentType.includes('webm') ? '.webm'
      : contentType.includes('quicktime') ? '.mov'
        : contentType.includes('mp4') ? '.mp4'
          : fallbackExt;
  const filePath = path.join(dir, `input${ext}`);
  await writeFile(filePath, Buffer.from(await response.arrayBuffer()));

  return {
    dir,
    filePath,
    cleanup: () => rm(dir, { recursive: true, force: true }),
  };
}
