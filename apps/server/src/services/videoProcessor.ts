import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import ffmpegPath from 'ffmpeg-static';
import sharp from 'sharp';
import { downloadToTempFile, uploadBufferToSupabase } from './supabaseStorage';
import { BASIC_EFFECTS, POPULAR_EFFECTS, AI_EFFECTS } from './planEntitlements';
import { getAIVideoDirection } from './openaiVideoDirector';

export type ProcessingConfig = {
  videoId: string;
  userId?: string;
  inputUrl?: string;
  storagePath?: string;
  templateId?: string;
  overlayUrl?: string;
  animationUrl?: string;
  effect?: string;
  effectSegments?: { effect: string; start: number; end: number }[];
  musicTheme?: string;
  musicUrl?: string;
  eventType?: string;
  durationSeconds?: number;
};

export type ProcessingResult = {
  videoId: string;
  status: 'processed' | 'failed';
  outputUrl?: string;
  storagePath?: string;
  thumbnailUrl?: string;
  effect?: string;
  musicTheme?: string;
  aiRationale?: string;
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

function runBinary(command: string, args: string[]) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true });
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

      const err = new Error(stderr.trim() || `COMMAND_FAILED_${code}`);
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

function fallbackExtFromUrl(url?: string) {
  if (!url) return '.bin';
  if (url.startsWith('data:image/svg+xml')) return '.svg';
  if (url.startsWith('data:image/png')) return '.png';
  if (url.startsWith('data:image/webp')) return '.webp';

  try {
    const pathname = new URL(url).pathname.toLowerCase();
    const ext = path.extname(pathname);
    if (['.png', '.webp', '.svg', '.webm', '.mp4', '.mov', '.gif'].includes(ext)) return ext;
  } catch {
    // Fall back to binary when the URL is not parseable.
  }

  return '.bin';
}

async function rasterOverlayIfNeeded(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (['.webm', '.mp4', '.mov', '.gif'].includes(ext)) return filePath;

  const buffer = await readFile(filePath);
  const looksLikeSvg = ext === '.svg' || buffer.subarray(0, 200).toString('utf8').includes('<svg');

  if (!looksLikeSvg) {
    if (ext === '.webp') {
      const outputPath = path.join(path.dirname(filePath), 'overlay.png');
      await sharp(buffer).png().toFile(outputPath);
      return outputPath;
    }
    return filePath;
  }

  const outputPath = path.join(path.dirname(filePath), 'overlay.png');
  await sharp(buffer, { density: 180 }).png().toFile(outputPath);
  return outputPath;
}

async function extractAnalysisFrame(inputPath: string, dir: string) {
  const outputPath = path.join(dir, 'ai-frame.jpg');
  await runBinary(ffmpegPath || 'ffmpeg', [
    '-y',
    '-i', inputPath,
    '-vf', 'scale=512:-2',
    '-frames:v', '1',
    '-q:v', '3',
    outputPath,
  ]);
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
  let musicTemp: Awaited<ReturnType<typeof downloadToTempFile>> | null = null;

  try {
    inputTemp = await downloadToTempFile(config.inputUrl, '.mp4');
    const overlaySourceUrl = config.animationUrl || config.overlayUrl;
    if (overlaySourceUrl) {
      overlayTemp = await downloadToTempFile(overlaySourceUrl, fallbackExtFromUrl(overlaySourceUrl));
    }
    if (config.musicUrl) {
      musicTemp = await downloadToTempFile(config.musicUrl, '.wav');
    }

    const script = resolvePythonScript();
    const outputPath = path.join(inputTemp.dir, `${config.videoId}-processed.mp4`);
    let selectedEffect = config.effect || 'clean';
    let selectedMusicTheme = config.musicTheme || 'none';
    let aiRationale: string | undefined;

    if (config.effect === 'ai_auto') {
      const framePath = await extractAnalysisFrame(inputTemp.filePath, inputTemp.dir);
      const direction = await getAIVideoDirection({
        framePath,
        eventType: config.eventType,
        requestedMusicTheme: config.musicTheme,
        hasOverlay: Boolean(config.overlayUrl),
      });
      selectedEffect = direction.effect;
      selectedMusicTheme = direction.musicTheme;
      aiRationale = direction.rationale;
    }

    const args = [
      script,
      '--input', inputTemp.filePath,
      '--output', outputPath,
      '--effect', selectedEffect,
      '--music-theme', selectedMusicTheme,
      '--event-type', config.eventType || '',
      '--ffmpeg', ffmpegPath || 'ffmpeg',
    ];

    if (overlayTemp) args.push('--overlay', await rasterOverlayIfNeeded(overlayTemp.filePath));
    if (musicTemp) args.push('--music-file', musicTemp.filePath);
    if (config.durationSeconds) args.push('--duration-seconds', String(config.durationSeconds));
    if (config.effectSegments?.length) args.push('--effect-segments', JSON.stringify(config.effectSegments));

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
      effect: parseEditorEffect(editor.stdout, selectedEffect),
      musicTheme: selectedMusicTheme,
      aiRationale,
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
    await musicTemp?.cleanup().catch(() => undefined);
  }
}

export function getAvailableEffects() {
  return [
    ...BASIC_EFFECTS.map((id) => ({ id, tier: 'starter' })),
    ...POPULAR_EFFECTS.map((id) => ({ id, tier: 'pro' })),
    ...AI_EFFECTS.map((id) => ({ id, tier: 'unlimited' })),
  ];
}
