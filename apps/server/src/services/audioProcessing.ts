/**
 * Geração de cortes (5/15/25/35/45s) e waveforms de áudio via ffmpeg.
 * - Cada corte tem fade-in/out e normalização (loudnorm) para evitar clipping.
 * - Faixas menores que a duração viram loop (-stream_loop).
 * - Se o ffmpeg não estiver disponível, as funções sinalizam e o chamador faz
 *   fallback (o player do app já corta/loopa em tempo real).
 */
import { spawn } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import ffmpegPath from 'ffmpeg-static';

const FFMPEG = (ffmpegPath as string | null) || 'ffmpeg';

export type CutDuration = 5 | 15 | 25 | 35 | 45;

export interface CutSpec {
  duration: CutDuration;
  /** Início do trecho dentro do arquivo original (s). */
  sourceStart: number;
  fadeIn: number;
  fadeOut: number;
}

export function ffmpegAvailable() {
  return Boolean(ffmpegPath);
}

function runCapture(args: string[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn(FFMPEG, args, { windowsHide: true });
    const chunks: Buffer[] = [];
    let stderr = '';
    child.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve(Buffer.concat(chunks));
      else reject(new Error(stderr.trim() || `FFMPEG_FAILED_${code}`));
    });
  });
}

function runFile(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(FFMPEG, args, { windowsHide: true });
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.trim() || `FFMPEG_FAILED_${code}`));
    });
  });
}

function buildAudioFilter(spec: CutSpec) {
  const parts: string[] = [];
  if (spec.fadeIn > 0) parts.push(`afade=t=in:st=0:d=${spec.fadeIn.toFixed(2)}`);
  if (spec.fadeOut > 0) {
    const start = Math.max(0, spec.duration - spec.fadeOut).toFixed(2);
    parts.push(`afade=t=out:st=${start}:d=${spec.fadeOut.toFixed(2)}`);
  }
  // Normaliza volume e segura o pico (anti-clipping).
  parts.push('loudnorm=I=-16:TP=-1.5:LRA=11');
  return parts.join(',');
}

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = path.join(os.tmpdir(), `six3-audio-${randomUUID()}`);
  await mkdir(dir, { recursive: true });
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

/** Gera um corte MP3 a partir de um arquivo de áudio de origem. */
export async function renderCutFromFile(sourceFile: string, spec: CutSpec, outFile: string) {
  const args = [
    '-y',
    '-stream_loop', '-1', // loopa se a faixa for menor que o corte
    '-i', sourceFile,
    '-ss', String(Math.max(0, spec.sourceStart)),
    '-t', String(spec.duration),
    '-af', buildAudioFilter(spec),
    '-ac', '2',
    '-ar', '44100',
    '-c:a', 'libmp3lame',
    '-q:a', '4',
    outFile,
  ];
  await runFile(args);
}

/**
 * Gera todos os cortes pedidos a partir de um buffer de áudio (ex.: WAV gerado).
 * Retorna um mapa duração -> buffer MP3. Lança se o ffmpeg não estiver disponível.
 */
export async function generateCutsFromBuffer(sourceBuffer: Buffer, specs: CutSpec[]): Promise<Map<CutDuration, Buffer>> {
  if (!ffmpegAvailable()) throw new Error('FFMPEG_UNAVAILABLE');
  return withTempDir(async (dir) => {
    const sourceFile = path.join(dir, 'source.wav');
    await writeFile(sourceFile, sourceBuffer);
    const result = new Map<CutDuration, Buffer>();
    for (const spec of specs) {
      const outFile = path.join(dir, `cut-${spec.duration}.mp3`);
      await renderCutFromFile(sourceFile, spec, outFile);
      result.set(spec.duration, await readFile(outFile));
    }
    return result;
  });
}

/** Calcula um array de picos (0..1) para desenhar a waveform. */
export async function computeWaveformFromBuffer(sourceBuffer: Buffer, buckets = 96): Promise<number[]> {
  if (!ffmpegAvailable()) throw new Error('FFMPEG_UNAVAILABLE');
  return withTempDir(async (dir) => {
    const sourceFile = path.join(dir, 'source.wav');
    await writeFile(sourceFile, sourceBuffer);
    const pcm = await runCapture([
      '-i', sourceFile,
      '-ac', '1',
      '-ar', '8000',
      '-f', 's16le',
      '-',
    ]);
    return pcmToPeaks(pcm, buckets);
  });
}

function pcmToPeaks(pcm: Buffer, buckets: number): number[] {
  const sampleCount = Math.floor(pcm.length / 2);
  if (sampleCount === 0) return new Array(buckets).fill(0);
  const perBucket = Math.max(1, Math.floor(sampleCount / buckets));
  const peaks: number[] = [];
  for (let b = 0; b < buckets; b++) {
    let peak = 0;
    const startSample = b * perBucket;
    for (let i = 0; i < perBucket && startSample + i < sampleCount; i++) {
      const value = Math.abs(pcm.readInt16LE((startSample + i) * 2)) / 32768;
      if (value > peak) peak = value;
    }
    peaks.push(Number(peak.toFixed(3)));
  }
  return peaks;
}
