import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuid } from 'uuid';

export const uploadRouter = Router();

const ALLOWED_VIDEO = ['video/mp4', 'video/webm', 'video/quicktime'];
const ALLOWED_IMAGE = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_VIDEO_MB = 500;
const MAX_IMAGE_MB = 10;

const storage = multer.memoryStorage();

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

uploadRouter.post('/video', videoUpload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });

    const fileId = uuid();
    const ext = path.extname(req.file.originalname) || '.mp4';
    const fileName = `videos/${fileId}${ext}`;

    // File is in memory (req.file.buffer). In production, upload to Firebase Storage here.
    // For now return a simulated response.
    res.json({
      id: fileId,
      fileName,
      size: req.file.size,
      mimetype: req.file.mimetype,
      originalName: req.file.originalname,
      storagePath: fileName,
      videoUrl: `${process.env.PUBLIC_BACKEND_URL}/uploads/${fileName}`,
      status: 'uploaded',
      createdAt: new Date().toISOString(),
    });
  } catch (e) { next(e); }
});

uploadRouter.post('/image', imageUpload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });

    const fileId = uuid();
    const ext = path.extname(req.file.originalname) || '.jpg';
    const fileName = `images/${fileId}${ext}`;

    res.json({
      id: fileId,
      fileName,
      size: req.file.size,
      mimetype: req.file.mimetype,
      storagePath: fileName,
      imageUrl: `${process.env.PUBLIC_BACKEND_URL}/uploads/${fileName}`,
      createdAt: new Date().toISOString(),
    });
  } catch (e) { next(e); }
});
