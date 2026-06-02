import { Router } from 'express';
import multer from 'multer';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { mkdir, rm } from 'node:fs/promises';
import { requireActiveSubscription, requirePlanFeature } from './auth';
import { SUPABASE_BUCKETS, uploadFileToSupabase } from '../services/supabaseStorage';

export const uploadRouter = Router();

const ALLOWED_VIDEO = ['video/mp4', 'video/webm', 'video/quicktime'];
const ALLOWED_IMAGE = ['image/png', 'image/jpeg', 'image/webp'];
const ALLOWED_TEMPLATE = ['image/png', 'image/svg+xml', 'image/webp', 'video/webm'];
const ALLOWED_MUSIC = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/aac', 'audio/mp4', 'audio/ogg', 'audio/webm'];
function envNumber(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

const MAX_VIDEO_MB = envNumber('MAX_VIDEO_UPLOAD_MB', 120);
const MAX_IMAGE_MB = 10;
const MAX_TEMPLATE_MB = 15;
const MAX_MUSIC_MB = 50;

const uploadRoot = path.join(os.tmpdir(), 'six3-uploads');
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
    if (ALLOWED_VIDEO.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Tipo de arquivo nao permitido. Use MP4, WebM ou MOV.'));
  },
});

const imageUpload = multer({
  storage,
  limits: { fileSize: MAX_IMAGE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Tipo de imagem nao permitido. Use PNG, JPEG ou WebP.'));
  },
});

const templateUpload = multer({
  storage,
  limits: { fileSize: MAX_TEMPLATE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TEMPLATE.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Tipo de template nao permitido. Use PNG, SVG, WebP ou WebM transparente.'));
  },
});

const musicUpload = multer({
  storage,
  limits: { fileSize: MAX_MUSIC_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MUSIC.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Tipo de musica nao permitido. Use MP3, WAV, AAC, OGG ou WebM.'));
  },
});

uploadRouter.post('/video', requireActiveSubscription, videoUpload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });

    const fileId = randomUUID();
    const ext = path.extname(req.file.originalname) || '.mp4';
    const userId = res.locals.user?.uid || 'unknown';
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

uploadRouter.post('/template', requirePlanFeature('custom_template_upload'), templateUpload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });

    const fileId = randomUUID();
    const ext = path.extname(req.file.originalname) || (req.file.mimetype === 'image/svg+xml' ? '.svg' : '.png');
    const userId = res.locals.user?.uid || 'unknown';
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
