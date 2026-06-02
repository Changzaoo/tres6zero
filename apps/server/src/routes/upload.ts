import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { requireActiveSubscription, requirePlanFeature } from './auth';
import { uploadBufferToSupabase } from '../services/supabaseStorage';

export const uploadRouter = Router();

const ALLOWED_VIDEO = ['video/mp4', 'video/webm', 'video/quicktime'];
const ALLOWED_IMAGE = ['image/png', 'image/jpeg', 'image/webp'];
const ALLOWED_TEMPLATE = ['image/png', 'image/svg+xml', 'image/webp'];
const MAX_VIDEO_MB = 500;
const MAX_IMAGE_MB = 10;
const MAX_TEMPLATE_MB = 15;

const storage = multer.memoryStorage();

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
    else cb(new Error('Tipo de template nao permitido. Use PNG, SVG ou WebP transparente.'));
  },
});

uploadRouter.post('/video', requireActiveSubscription, videoUpload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });

    const fileId = randomUUID();
    const ext = path.extname(req.file.originalname) || '.mp4';
    const userId = res.locals.user?.uid || 'unknown';
    const uploaded = await uploadBufferToSupabase({
      bucket: 'videos',
      prefix: `raw/${userId}`,
      fileName: req.file.originalname,
      fallbackExt: ext,
      buffer: req.file.buffer,
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
});

uploadRouter.post('/image', requireActiveSubscription, imageUpload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });

    const fileId = randomUUID();
    const ext = path.extname(req.file.originalname) || '.jpg';
    const userId = res.locals.user?.uid || 'unknown';
    const uploaded = await uploadBufferToSupabase({
      bucket: 'templates',
      prefix: `events/${userId}`,
      fileName: req.file.originalname,
      fallbackExt: ext,
      buffer: req.file.buffer,
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
});

uploadRouter.post('/template', requirePlanFeature('custom_template_upload'), templateUpload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });

    const fileId = randomUUID();
    const ext = path.extname(req.file.originalname) || (req.file.mimetype === 'image/svg+xml' ? '.svg' : '.png');
    const userId = res.locals.user?.uid || 'unknown';
    const uploaded = await uploadBufferToSupabase({
      bucket: 'templates',
      prefix: `custom/${userId}`,
      fileName: req.file.originalname,
      fallbackExt: ext,
      buffer: req.file.buffer,
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
});
