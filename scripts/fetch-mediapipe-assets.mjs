// Copia os binários WASM do MediaPipe (já instalados em node_modules) e baixa os
// modelos de IA para apps/web/public/mediapipe/, deixando o motor de efeitos
// 100% offline-first (sem depender da CDN em runtime).
//
// Uso: node scripts/fetch-mediapipe-assets.mjs
// (Em runtime, se estes arquivos não existirem, o app cai automaticamente para a
// CDN jsDelivr — então este passo é uma otimização, não um requisito.)

import { existsSync, mkdirSync, readdirSync, copyFileSync, createWriteStream } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = join(root, 'apps', 'web', 'public', 'mediapipe');
const wasmOutDir = join(publicDir, 'wasm');

const MODELS = [
  {
    file: 'selfie_segmenter.tflite',
    url: 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite',
  },
  {
    file: 'pose_landmarker_lite.task',
    url: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task',
  },
];

function resolveWasmDir() {
  const candidates = [
    join(root, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm'),
    join(root, 'apps', 'web', 'node_modules', '@mediapipe', 'tasks-vision', 'wasm'),
  ];
  return candidates.find((dir) => existsSync(dir));
}

function copyWasm() {
  const wasmDir = resolveWasmDir();
  if (!wasmDir) {
    console.warn('[mediapipe] node_modules/@mediapipe/tasks-vision/wasm não encontrado. Rode `npm install` antes.');
    return;
  }
  mkdirSync(wasmOutDir, { recursive: true });
  for (const name of readdirSync(wasmDir)) {
    copyFileSync(join(wasmDir, name), join(wasmOutDir, name));
  }
  console.log(`[mediapipe] WASM copiado para ${wasmOutDir}`);
}

async function downloadModels() {
  mkdirSync(publicDir, { recursive: true });
  for (const model of MODELS) {
    const dest = join(publicDir, model.file);
    if (existsSync(dest)) {
      console.log(`[mediapipe] ${model.file} já existe, pulando.`);
      continue;
    }
    try {
      const res = await fetch(model.url);
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
      console.log(`[mediapipe] baixado ${model.file}`);
    } catch (error) {
      console.warn(`[mediapipe] falha ao baixar ${model.file} (${error.message}). O app usará a CDN em runtime.`);
    }
  }
}

copyWasm();
await downloadModels();
console.log('[mediapipe] concluído.');
