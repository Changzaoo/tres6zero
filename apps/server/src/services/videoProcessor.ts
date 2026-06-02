import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import ffmpegPath from 'ffmpeg-static';
import sharp from 'sharp';
import { downloadToTempFile, uploadBufferToSupabase } from './supabaseStorage';
import { BASIC_EFFECTS, POPULAR_EFFECTS, AI_EFFECTS } from './planEntitlements';

export type ProcessingConfig = {
  videoId: string;
  userId?: string;
  inputUrl?: string;
  storagePath?: string;
  templateId?: string;
  overlayUrl?: string;
  effect?: string;
  musicTheme?: string;
  eventType?: string;
};

export type ProcessingResult = {
  videoId: string;
  status: 'processed' | 'failed';
  outputUrl?: string;
  storagePath?: string;
  thumbnailUrl?: string;
  effect?: string;
  error?: string;
  processedAt: string;
};

function resolvePythonScript() {
  const candidates = [
    path.resolve(process.cwd(), 'apps/server/src/python/video_editor.py'),
    path.resolve(process.cwd(), 'src/python/video_editor.py'),
    path.resolve(__dirname, '..', 'python', 'video_editor.py'),
  ];

  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    const err = new Error('VIDEO_EDITOR_SCRIPT_NOT_FOUND');
    (err as any).status = 500;
    throw err;
  }
  return found;
}

function runPythonEditor(args: string[]) {
  const python = process.env.PYTHON_BIN || (process.platform === 'win32' ? 'python' : 'python3');

  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(python, args, { windowsHide: true });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      const err = new Error(stderr.trim() || `VIDEO_PROCESSING_FAILED_${code}`);
      (err as any).status = 500;
      reject(err);
    });
  });
}

function parseEditorEffect(stdout: string, fallback?: string) {
  try {
    const payload = JSON.parse(stdout.trim());
    return typeof payload.effect === 'string' ? payload.effect : fallback;
  } catch {
    return fallback;
  }
}

async function rasterOverlayIfNeeded(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  const buffer = await readFile(filePath);
  const looksLikeSvg = ext === '.svg' || buffer.subarray(0, 200).toString('utf8').includes('<svg');

  if (!looksLikeSvg) return filePath;

  const outputPath = path.join(path.dirname(filePath), 'overlay.png');
  await sharp(buffer, { density: 180 }).png().toFile(outputPath);
  return outputPath;
}

export async function processVideo(config: ProcessingConfig): Promise<ProcessingResult> {
  const processedAt = new Date().toISOString();
  if (!config.inputUrl) {
    return {
      videoId: config.videoId,
      status: 'failed',
      processedAt,
      error: 'INPUT_URL_REQUIRED',
    };
  }

  let inputTemp: Awaited<ReturnType<typeof downloadToTempFile>> | null = null;
  let overlayTemp: Awaited<ReturnType<typeof downloadToTempFile>> | null = null;

  try {
    inputTemp = await downloadToTempFile(config.inputUrl, '.mp4');
    if (config.overlayUrl) {
      overlayTemp = await downloadToTempFile(config.overlayUrl, '.png');
    }

    const script = resolvePythonScript();
    const outputPath = path.join(inputTemp.dir, `${config.videoId}-processed.mp4`);
    const args = [
      script,
      '--input', inputTemp.filePath,
      '--output', outputPath,
      '--effect', config.effect || 'clean',
      '--music-theme', config.musicTheme || 'none',
      '--event-type', config.eventType || '',
      '--ffmpeg', ffmpegPath || 'ffmpeg',
    ];

    if (overlayTemp) args.push('--overlay', await rasterOverlayIfNeeded(overlayTemp.filePath));

    const editor = await runPythonEditor(args);
    const output = await readFile(outputPath);
    const uploaded = await uploadBufferToSupabase({
      bucket: 'videos',
      prefix: `processed/${config.userId || 'unknown'}`,
      fileName: `${config.videoId}.mp4`,
      fallbackExt: '.mp4',
      buffer: output,
      contentType: 'video/mp4',
    });

    return {
      videoId: config.videoId,
      status: 'processed',
      outputUrl: uploaded.publicUrl,
      storagePath: uploaded.path,
      effect: parseEditorEffect(editor.stdout, config.effect),
      processedAt,
    };
  } catch (error) {
    console.error('[videoProcessor] Failed:', error instanceof Error ? error.message : error);
    return {
      videoId: config.videoId,
      status: 'failed',
      processedAt,
      error: error instanceof Error ? error.message : 'VIDEO_PROCESSING_FAILED',
    };
  } finally {
    await inputTemp?.cleanup().catch(() => undefined);
    await overlayTemp?.cleanup().catch(() => undefined);
  }
}

export function getAvailableEffects() {
  return [
    ...BASIC_EFFECTS.map((id) => ({ id, tier: 'starter' })),
    ...POPULAR_EFFECTS.map((id) => ({ id, tier: 'pro' })),
    ...AI_EFFECTS.map((id) => ({ id, tier: 'unlimited' })),
  ];
}
