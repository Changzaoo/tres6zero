import { Router } from 'express';
import multer from 'multer';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { requireActiveSubscription, requirePlanFeature } from './auth';
import { SUPABASE_BUCKETS, ensurePublicBucket, uploadFileToSupabase } from '../services/supabaseStorage';

export const uploadRouter = Router();

const ALLOWED_VIDEO = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'];
const ALLOWED_IMAGE = ['image/png', 'image/jpeg', 'image/webp'];
const ALLOWED_TEMPLATE = ['image/png', 'image/svg+xml', 'image/webp', 'video/webm', 'image/gif'];
const ALLOWED_MUSIC = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/aac', 'audio/mp4', 'audio/ogg', 'audio/webm'];
function envNumber(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

const MAX_VIDEO_MB = envNumber('MAX_VIDEO_UPLOAD_MB', 48);
const MAX_IMAGE_MB = 10;
const MAX_TEMPLATE_MB = 15;
const MAX_MUSIC_MB = 50;

const uploadRoot = path.join(os.tmpdir(), 'six3-uploads');

function uploadError(message: string, status = 415) {
  const err = new Error(message);
  (err as any).status = status;
  return err;
}

function baseMime(mimetype = '') {
  return mimetype.toLowerCase().split(';')[0].trim();
}

function isAllowedByMime(mimetype: string, allowed: string[]) {
  return allowed.includes(baseMime(mimetype));
}

async function sanitizeSvgFile(file: Express.Multer.File) {
  if (baseMime(file.mimetype) !== 'image/svg+xml') return;

  const raw = await readFile(file.path, 'utf8');
  if (raw.length > MAX_TEMPLATE_MB * 1024 * 1024) {
    throw uploadError('SVG maior que o limite permitido.', 413);
  }

  if (/<\s*(script|iframe|object|embed|foreignObject)\b/i.test(raw) || /javascript\s*:/i.test(raw)) {
    throw uploadError('SVG bloqueado por conter script ou embed inseguro.', 415);
  }

  const sanitized = raw
    .replace(/\s+on[a-z]+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\s+(href|xlink:href)\s*=\s*(['"])\s*(https?:|data:text\/html|javascript:).*?\2/gi, '')
    .replace(/<\s*metadata\b[\s\S]*?<\s*\/\s*metadata\s*>/gi, '');

  await writeFile(file.path, sanitized, 'utf8');
}
const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    try {
      await mkdir(uploadRoot, { recursive: true });
      cb(null, uploadRoot);
    } catch (error) {
      cb(error as Error, uploadRoot);
    }
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.bin';
    cb(null, `${Date.now()}-${randomUUID()}${ext}`);
  },
});

async function cleanupUpload(file?: Express.Multer.File) {
  if (file?.path) {
    await rm(file.path, { force: true }).catch(() => undefined);
  }
}

const videoUpload = multer({
  storage,
  limits: { fileSize: MAX_VIDEO_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (isAllowedByMime(file.mimetype, ALLOWED_VIDEO)) cb(null, true);
    else cb(uploadError('Tipo de arquivo não permitido. Use MP4, WebM ou MOV.'));
  },
});

const imageUpload = multer({
  storage,
  limits: { fileSize: MAX_IMAGE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (isAllowedByMime(file.mimetype, ALLOWED_IMAGE)) cb(null, true);
    else cb(uploadError('Tipo de imagem não permitido. Use PNG, JPEG ou WebP.'));
  },
});

const templateUpload = multer({
  storage,
  limits: { fileSize: MAX_TEMPLATE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (isAllowedByMime(file.mimetype, ALLOWED_TEMPLATE)) cb(null, true);
    else cb(uploadError('Tipo de template não permitido. Use PNG, SVG, WebP ou WebM transparente.'));
  },
});

const musicUpload = multer({
  storage,
  limits: { fileSize: MAX_MUSIC_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (isAllowedByMime(file.mimetype, ALLOWED_MUSIC)) cb(null, true);
    else cb(uploadError('Tipo de música não permitido. Use MP3, WAV, AAC, OGG ou WebM.'));
  },
});

uploadRouter.post('/video', requireActiveSubscription, videoUpload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });

    const fileId = randomUUID();
    const ext = path.extname(req.file.originalname) || '.mp4';
    const userId = res.locals.user?.uid || 'unknown';
    await ensurePublicBucket(SUPABASE_BUCKETS.videos);
    const uploaded = await uploadFileToSupabase({
      bucket: SUPABASE_BUCKETS.videos,
      prefix: `raw/${userId}`,
      fileName: req.file.originalname,
      fallbackExt: ext,
      filePath: req.file.path,
      contentType: req.file.mimetype,
    });

    res.json({
      id: fileId,
      fileName: uploaded.path,
      size: req.file.size,
      mimetype: req.file.mimetype,
      originalName: req.file.originalname,
      bucket: uploaded.bucket,
      storagePath: uploaded.path,
      videoUrl: uploaded.publicUrl,
      status: 'uploaded',
      createdAt: new Date().toISOString(),
    });
  } catch (e) { next(e); }
  finally { await cleanupUpload(req.file); }
});

uploadRouter.post('/image', requireActiveSubscription, imageUpload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });

    const fileId = randomUUID();
    const ext = path.extname(req.file.originalname) || '.jpg';
    const userId = res.locals.user?.uid || 'unknown';
    await ensurePublicBucket(SUPABASE_BUCKETS.legacyTemplates);
    const uploaded = await uploadFileToSupabase({
      bucket: SUPABASE_BUCKETS.legacyTemplates,
      prefix: `events/${userId}`,
      fileName: req.file.originalname,
      fallbackExt: ext,
      filePath: req.file.path,
      contentType: req.file.mimetype,
    });

    res.json({
      id: fileId,
      fileName: uploaded.path,
      size: req.file.size,
      mimetype: req.file.mimetype,
      originalName: req.file.originalname,
      bucket: uploaded.bucket,
      storagePath: uploaded.path,
      imageUrl: uploaded.publicUrl,
      publicUrl: uploaded.publicUrl,
      createdAt: new Date().toISOString(),
    });
  } catch (e) { next(e); }
  finally { await cleanupUpload(req.file); }
});

uploadRouter.post('/avatar', requireActiveSubscription, imageUpload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });

    const fileId = randomUUID();
    const ext = path.extname(req.file.originalname) || '.jpg';
    const userId = res.locals.user?.uid || 'unknown';
    await ensurePublicBucket(SUPABASE_BUCKETS.profileAvatars);
    const uploaded = await uploadFileToSupabase({
      bucket: SUPABASE_BUCKETS.profileAvatars,
      prefix: `profiles/${userId}`,
      fileName: req.file.originalname,
      fallbackExt: ext,
      filePath: req.file.path,
      contentType: req.file.mimetype,
    });

    res.json({
      id: fileId,
      fileName: uploaded.path,
      size: req.file.size,
      mimetype: req.file.mimetype,
      originalName: req.file.originalname,
      bucket: uploaded.bucket,
      storagePath: uploaded.path,
      avatarUrl: uploaded.publicUrl,
      publicUrl: uploaded.publicUrl,
      createdAt: new Date().toISOString(),
    });
  } catch (e) { next(e); }
  finally { await cleanupUpload(req.file); }
});

uploadRouter.post('/template', requirePlanFeature('custom_template_upload'), templateUpload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });

    const fileId = randomUUID();
    const ext = path.extname(req.file.originalname) || (req.file.mimetype === 'image/svg+xml' ? '.svg' : '.png');
    const userId = res.locals.user?.uid || 'unknown';
    await sanitizeSvgFile(req.file);
    await ensurePublicBucket(SUPABASE_BUCKETS.userTemplates);
    const uploaded = await uploadFileToSupabase({
      bucket: SUPABASE_BUCKETS.userTemplates,
      prefix: `custom/${userId}`,
      fileName: req.file.originalname,
      fallbackExt: ext,
      filePath: req.file.path,
      contentType: req.file.mimetype,
    });

    res.json({
      id: fileId,
      fileName: uploaded.path,
      size: req.file.size,
      mimetype: req.file.mimetype,
      originalName: req.file.originalname,
      bucket: uploaded.bucket,
      storagePath: uploaded.path,
      templateUrl: uploaded.publicUrl,
      publicUrl: uploaded.publicUrl,
      createdAt: new Date().toISOString(),
    });
  } catch (e) { next(e); }
  finally { await cleanupUpload(req.file); }
});

uploadRouter.post('/music', requirePlanFeature('custom_template_upload'), musicUpload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });

    const fileId = randomUUID();
    const ext = path.extname(req.file.originalname) || '.mp3';
    const userId = res.locals.user?.uid || 'unknown';
    await ensurePublicBucket(SUPABASE_BUCKETS.userMusic);
    const uploaded = await uploadFileToSupabase({
      bucket: SUPABASE_BUCKETS.userMusic,
      prefix: `custom/${userId}`,
      fileName: req.file.originalname,
      fallbackExt: ext,
      filePath: req.file.path,
      contentType: req.file.mimetype,
    });

    res.json({
      id: fileId,
      fileName: uploaded.path,
      size: req.file.size,
      mimetype: req.file.mimetype,
      originalName: req.file.originalname,
      bucket: uploaded.bucket,
      storagePath: uploaded.path,
      musicUrl: uploaded.publicUrl,
      publicUrl: uploaded.publicUrl,
      createdAt: new Date().toISOString(),
    });
  } catch (e) { next(e); }
  finally { await cleanupUpload(req.file); }
});
