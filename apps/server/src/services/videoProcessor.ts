import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import ffmpegPath from 'ffmpeg-static';
import sharp from 'sharp';
import { downloadToTempFile, ensurePublicBucket, publicUrl, SUPABASE_BUCKETS, uploadFileToSupabase } from './supabaseStorage';
import { BASIC_EFFECTS, POPULAR_EFFECTS, AI_EFFECTS } from './planEntitlements';
import { getAIVideoDirection, getFallbackAIVideoDirection } from './openaiVideoDirector';
import { buildMusicCatalog } from './musicCatalog';
import { GENERATED_TEMPLATE_CATALOG_SIZE, buildGeneratedTemplates, renderTemplatePng } from './generatedTemplates';

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

type QueueTask<T> = () => Promise<T>;

let activeProcessing = 0;
const processingQueue: Array<() => void> = [];

function processingConcurrency() {
  const configured = Number(process.env.VIDEO_PROCESS_CONCURRENCY || 1);
  if (!Number.isFinite(configured)) return 1;
  return Math.min(2, Math.max(1, Math.round(configured)));
}

async function withProcessingSlot<T>(task: QueueTask<T>) {
  if (activeProcessing >= processingConcurrency()) {
    await new Promise<void>((resolve) => processingQueue.push(resolve));
  }

  activeProcessing += 1;
  try {
    return await task();
  } finally {
    activeProcessing = Math.max(0, activeProcessing - 1);
    processingQueue.shift()?.();
  }
}

function resolvePythonScript() {
  const candidates = [
    path.resolve(process.cwd(), 'apps/server/src/python/video_editor.py'),
    path.resolve(process.cwd(), 'src/python/video_editor.py'),
    path.resolve(__dirname, '..', 'python', 'vídeo_editor.py'),
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

const RETRY_DELAYS_MS = [400, 1200, 2500];

async function withRetries<T>(label: string, task: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      console.warn(`[videoProcessor] ${label} (tentativa ${attempt + 1}) falhou:`, error instanceof Error ? error.message : error);
      if (attempt < RETRY_DELAYS_MS.length) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`${label.toUpperCase()}_FAILED`);
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

const FALLBACK_EFFECT_FILTERS: Record<string, string> = {
  clean: 'eq=contrast=1.05:saturation=1.08:brightness=0.01',
  slow_motion: 'setpts=1.35*PTS,eq=contrast=1.04:saturation=1.08',
  speed_ramp: 'setpts=0.82*PTS,eq=contrast=1.1:saturation=1.18',
  boomerang: 'eq=contrast=1.08:saturation=1.12',
  cinematic: 'eq=contrast=1.12:saturation=0.95:brightness=-0.02,unsharp=5:5:0.6',
  neon: 'eq=contrast=1.18:saturation=1.55,hue=s=1.15',
  party: 'eq=contrast=1.12:saturation=1.35,vignette=PI/5',
  luxury: 'eq=contrast=1.08:saturation=1.05:gamma=0.95,unsharp=3:3:0.35',
  glitch_flash: 'tblend=all_mode=lighten:all_opacity=0.16,eq=contrast=1.25:saturation=1.35',
  wedding_soft: 'eq=contrast=0.98:saturation=1.05:brightness=0.03,gblur=sigma=0.25',
  corporate_sharp: 'eq=contrast=1.08:saturation=0.92,unsharp=5:5:0.9',
  ai_auto: 'eq=contrast=1.12:saturation=0.95:brightness=-0.02,unsharp=5:5:0.6',
  // Novos efeitos com IA (aproximação color-grade no fallback ffmpeg, sem segmentação ML).
  aura_energy: 'eq=contrast=1.16:saturation=1.5:brightness=0.03,gblur=sigma=0.4',
  rim_neon: 'eq=contrast=1.16:saturation=1.5:brightness=0.03,gblur=sigma=0.4',
  speed_clones: 'tblend=all_mode=average:all_opacity=0.5,eq=contrast=1.1:saturation=1.2',
  ghost_echo: 'tblend=all_mode=average:all_opacity=0.5,eq=contrast=1.1:saturation=1.2',
  light_trails: 'tblend=all_mode=average:all_opacity=0.5,eq=contrast=1.1:saturation=1.2',
  freeze_background: 'eq=contrast=1.06:saturation=1.05',
  background_focus: 'eq=contrast=1.08:saturation=1.05,vignette=PI/4',
  background_replace: 'eq=contrast=1.14:saturation=1.4:brightness=-0.02',
  particle_dissolve: 'eq=contrast=1.1:saturation=0.85:brightness=0.02',
  portal: 'eq=contrast=1.14:saturation=1.4:brightness=-0.02',
  // Novos efeitos sem ML (ambiente/câmera).
  ambient_particles: 'eq=contrast=1.06:saturation=1.15',
  light_leaks: 'eq=contrast=1.05:saturation=1.18:brightness=0.04',
  god_rays: 'eq=contrast=1.08:saturation=1.12:brightness=0.05',
  glitch_vhs: 'eq=contrast=1.22:saturation=1.3,hue=s=1.1',
  beat_pulse: 'eq=contrast=1.16:saturation=1.3',
};

// Regenera a moldura localmente a partir do catálogo quando o download falha:
// garante que o vídeo nunca sai sem a moldura escolhida.
async function renderLocalTemplateOverlay(templateId: string | undefined, dir: string) {
  if (!templateId) return undefined;
  const normalized = templateId.replace(/\.(png|webm)$/i, '').replace(/^animated-/, '');
  const match = /^(?:generated|idea)-(\d+)$/.exec(normalized);
  if (!match) return undefined;

  const index = Number(match[1]);
  if (!Number.isInteger(index) || index < 1 || index > GENERATED_TEMPLATE_CATALOG_SIZE) return undefined;

  const template = buildGeneratedTemplates(1, index - 1, { includeSvg: true, includeDataUrl: false })[0];
  if (!template?.svg) return undefined;

  const filePath = path.join(dir, 'local-overlay.png');
  await writeFile(filePath, await renderTemplatePng(template.svg));
  return filePath;
}

async function resolveOverlayFile(config: ProcessingConfig, fallbackDir: string) {
  const sources = [config.animationUrl, config.overlayUrl]
    .filter((url, index, list): url is string => Boolean(url) && list.indexOf(url) === index);

  for (const source of sources) {
    try {
      const temp = await withRetries('download da moldura', () => downloadToTempFile(source, fallbackExtFromUrl(source)));
      return { filePath: await rasterOverlayIfNeeded(temp.filePath), cleanup: temp.cleanup };
    } catch (error) {
      console.warn('[videoProcessor] Moldura indisponível na URL, tentando próxima fonte:', error instanceof Error ? error.message : error);
    }
  }

  try {
    const localPath = await renderLocalTemplateOverlay(config.templateId, fallbackDir);
    if (localPath) {
      console.warn('[videoProcessor] Moldura regenerada localmente a partir do catálogo:', config.templateId);
      return { filePath: localPath, cleanup: async () => undefined };
    }
  } catch (error) {
    console.warn('[videoProcessor] Falha ao regenerar moldura local:', error instanceof Error ? error.message : error);
  }

  return undefined;
}

async function runFfmpegFallback(params: {
  inputPath: string;
  outputPath: string;
  effect: string;
  overlayPath?: string;
  musicPath?: string;
  durationSeconds?: number;
}) {
  const filter = FALLBACK_EFFECT_FILTERS[params.effect] || FALLBACK_EFFECT_FILTERS.clean;
  let graph = `[0:v]${filter},scale=trunc(iw/2)*2:trunc(ih/2)*2,fps=30,format=yuv420p[base]`;
  const args = ['-y', '-i', params.inputPath];

  if (params.overlayPath) {
    const overlayExt = path.extname(params.overlayPath).toLowerCase();
    const animatedOverlay = ['.webm', '.mp4', '.mov', '.gif'].includes(overlayExt);
    if (animatedOverlay) args.push('-stream_loop', '-1');
    if (overlayExt === '.webm') args.push('-c:v', 'libvpx-vp9');
    args.push('-i', params.overlayPath);
    graph += ';[1:v]format=rgba[overlay_src];'
      + '[overlay_src][base]scale2ref=w=main_w:h=main_h:flags=lanczos[ov][video];'
      + `[video][ov]overlay=0:0:format=auto:eof_action=repeat${animatedOverlay ? ':shortest=1' : ''}[v]`;
  } else {
    graph += ';[base]null[v]';
  }

  let audioIndex: number | null = null;
  if (params.musicPath) {
    audioIndex = params.overlayPath ? 2 : 1;
    args.push('-stream_loop', '-1', '-i', params.musicPath);
  }

  args.push('-filter_complex', graph, '-map', '[v]');
  if (audioIndex !== null) {
    args.push('-map', `${audioIndex}:a`, '-shortest', '-c:a', 'aac', '-b:a', '128k');
  } else {
    args.push('-an');
  }
  if (params.durationSeconds) args.push('-t', params.durationSeconds.toFixed(3));
  args.push('-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-movflags', '+faststart', params.outputPath);

  await runBinary(ffmpegPath || 'ffmpeg', args);
}

function publicLibraryMusicUrlForTheme(theme?: string) {
  if (!theme || theme === 'none') return undefined;
  const tracks = buildMusicCatalog();
  const normalized = theme.toLowerCase();
  const track = tracks.find((item) => item.musicCategory === normalized)
    || tracks.find((item) => item.tags.includes(normalized))
    || tracks.find((item) => item.subcategory.toLowerCase().includes(normalized))
    || tracks.find((item) => item.musicCategory === 'universal');
  return track ? publicUrl(SUPABASE_BUCKETS.projectMusic, track.storagePath) : undefined;
}

export async function processVideo(config: ProcessingConfig): Promise<ProcessingResult> {
  return withProcessingSlot(() => processVideoInSlot(config));
}

async function processVideoInSlot(config: ProcessingConfig): Promise<ProcessingResult> {
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
  let overlayFile: { filePath: string; cleanup: () => Promise<unknown> } | undefined;
  let musicTemp: Awaited<ReturnType<typeof downloadToTempFile>> | null = null;

  try {
    inputTemp = await withRetries('download do vídeo de entrada', () => downloadToTempFile(config.inputUrl!, '.mp4'));
    overlayFile = await resolveOverlayFile(config, inputTemp.dir);
    if (config.musicUrl) {
      musicTemp = await withRetries('download da música', () => downloadToTempFile(config.musicUrl!, '.wav')).catch((error) => {
        console.warn('[videoProcessor] Música explícita indisponível, usando trilha do tema:', error instanceof Error ? error.message : error);
        return null;
      });
    }

    const script = resolvePythonScript();
    const outputPath = path.join(inputTemp.dir, `${config.videoId}-processed.mp4`);
    let selectedEffect = config.effect || 'clean';
    let selectedMusicTheme = config.musicTheme || 'none';
    let aiRationale: string | undefined;

    if (config.effect === 'ai_auto') {
      const framePath = await extractAnalysisFrame(inputTemp.filePath, inputTemp.dir);
      const directionParams = {
        framePath,
        eventType: config.eventType,
        requestedMusicTheme: config.musicTheme,
        hasOverlay: Boolean(config.overlayUrl),
      };
      const direction = await getAIVideoDirection(directionParams).catch((error) => {
        console.warn('[videoProcessor] OpenAI direction fallback:', error instanceof Error ? error.message : error);
        return getFallbackAIVideoDirection(directionParams);
      });
      selectedEffect = direction.effect;
      selectedMusicTheme = direction.musicTheme;
      aiRationale = direction.rationale;
    }

    if (!musicTemp && selectedMusicTheme !== 'none') {
      const autoMusicUrl = publicLibraryMusicUrlForTheme(selectedMusicTheme);
      if (autoMusicUrl) {
        musicTemp = await downloadToTempFile(autoMusicUrl, '.mp3').catch((error) => {
          console.warn('[videoProcessor] Public music fallback:', error instanceof Error ? error.message : error);
          return null;
        });
      }
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

    if (overlayFile) args.push('--overlay', overlayFile.filePath);
    if (musicTemp) args.push('--music-file', musicTemp.filePath);
    if (config.durationSeconds) args.push('--duration-seconds', String(config.durationSeconds));
    if (config.effectSegments?.length) args.push('--effect-segments', JSON.stringify(config.effectSegments));

    let editorStdout = '';
    try {
      const editor = await runPythonEditor(args);
      editorStdout = editor.stdout;
    } catch (pythonError) {
      // Plano B: o editor Python falhou (ou Python indisponível); aplica o mesmo
      // pipeline (efeito + moldura + música) direto com ffmpeg, sem segmentos.
      console.warn('[videoProcessor] Editor Python falhou, usando pipeline ffmpeg direto:', pythonError instanceof Error ? pythonError.message : pythonError);
      await runFfmpegFallback({
        inputPath: inputTemp.filePath,
        outputPath,
        effect: selectedEffect,
        overlayPath: overlayFile?.filePath,
        musicPath: musicTemp?.filePath,
        durationSeconds: config.durationSeconds,
      });
    }

    await ensurePublicBucket(SUPABASE_BUCKETS.videos).catch((error) => {
      console.warn('[videoProcessor] ensurePublicBucket:', error instanceof Error ? error.message : error);
    });
    const uploaded = await withRetries('upload do vídeo processado', () => uploadFileToSupabase({
      bucket: 'videos',
      prefix: `processed/${config.userId || 'unknown'}`,
      fileName: `${config.videoId}.mp4`,
      fallbackExt: '.mp4',
      filePath: outputPath,
      contentType: 'video/mp4',
    }));

    return {
      videoId: config.videoId,
      status: 'processed',
      outputUrl: uploaded.publicUrl,
      storagePath: uploaded.path,
      effect: parseEditorEffect(editorStdout, selectedEffect),
      musicTheme: selectedMusicTheme,
      aiRationale,
      processedAt,
    };
  } catch (error) {
    console.error('[videoProcessor] Failed:', error instanceof Error ? error.message : error);

    // Último recurso: entrega o vídeo original sem reprocessar, para o usuário
    // nunca ficar sem o arquivo (melhor um vídeo sem pós-produção do que erro).
    if (inputTemp) {
      try {
        await ensurePublicBucket(SUPABASE_BUCKETS.videos).catch(() => undefined);
        const uploadedOriginal = await withRetries('upload do vídeo original (último recurso)', () => uploadFileToSupabase({
          bucket: 'videos',
          prefix: `processed/${config.userId || 'unknown'}`,
          fileName: `${config.videoId}.mp4`,
          fallbackExt: '.mp4',
          filePath: inputTemp!.filePath,
          contentType: 'video/mp4',
        }));

        return {
          videoId: config.videoId,
          status: 'processed',
          outputUrl: uploadedOriginal.publicUrl,
          storagePath: uploadedOriginal.path,
          effect: 'clean',
          musicTheme: config.musicTheme || 'none',
          aiRationale: undefined,
          processedAt,
        };
      } catch (lastResortError) {
        console.error('[videoProcessor] Último recurso falhou:', lastResortError instanceof Error ? lastResortError.message : lastResortError);
      }
    }

    return {
      videoId: config.videoId,
      status: 'failed',
      processedAt,
      error: error instanceof Error ? error.message : 'VIDEO_PROCESSING_FAILED',
    };
  } finally {
    await inputTemp?.cleanup().catch(() => undefined);
    await overlayFile?.cleanup().catch(() => undefined);
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
