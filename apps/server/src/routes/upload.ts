import { Request, Router } from 'express';
import multer from 'multer';
import path from 'path';
import { randomUUID } from 'node:crypto';
import { requireActiveSubscription } from './auth';

export const uploadRouter = Router();

const ALLOWED_VIDEO = ['video/mp4', 'video/webm', 'video/quicktime'];
const ALLOWED_IMAGE = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_VIDEO_MB = 500;
const MAX_IMAGE_MB = 10;
const DEFAULT_PUBLIC_BACKEND_URL = 'https://tres6zero.onrender.com';

const storage = multer.memoryStorage();

function getPublicBackendUrl(req: Request) {
  const host = req.get('host');
  const requestUrl = host ? `${req.protocol}://${host}` : undefined;
  return (process.env.PUBLIC_BACKEND_URL || requestUrl || DEFAULT_PUBLIC_BACKEND_URL).replace(/\/+$/, '');
}

const videoUpload = multer({
  storage,
  limits: { fileSize: MAX_VIDEO_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_VIDEO.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Tipo de arquivo não permitido. Use MP4, WebM ou MOV.'));
  },
});

const imageUpload = multer({
  storage,
  limits: { fileSize: MAX_IMAGE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Tipo de arquivo não permitido. Use PNG, JPEG ou WebP.'));
  },
});

uploadRouter.post('/video', requireActiveSubscription, videoUpload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });

    const fileId = randomUUID();
    const ext = path.extname(req.file.originalname) || '.mp4';
    const fileName = `videos/${fileId}${ext}`;
    const publicBackendUrl = getPublicBackendUrl(req);

    // File is in memory (req.file.buffer). In production, upload to Firebase Storage here.
    // For now return a simulated response.
    res.json({
      id: fileId,
      fileName,
      size: req.file.size,
      mimetype: req.file.mimetype,
      originalName: req.file.originalname,
      storagePath: fileName,
      videoUrl: `${publicBackendUrl}/uploads/${fileName}`,
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
    const fileName = `images/${fileId}${ext}`;
    const publicBackendUrl = getPublicBackendUrl(req);

    res.json({
      id: fileId,
      fileName,
      size: req.file.size,
      mimetype: req.file.mimetype,
      storagePath: fileName,
      imageUrl: `${publicBackendUrl}/uploads/${fileName}`,
      createdAt: new Date().toISOString(),
    });
  } catch (e) { next(e); }
});
