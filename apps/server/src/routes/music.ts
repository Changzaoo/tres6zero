import { Router } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { requireActiveSubscription, requirePlanFeature } from './auth';
import { getFirebaseAdminFirestore } from '../services/firebaseAdmin';
import { createNotification } from '../services/notifications';
import { SUPABASE_BUCKETS, ensurePublicBucket, uploadBufferToSupabase } from '../services/supabaseStorage';
import {
  MUSIC_LIBRARY_PROVIDER_IDS,
  downloadLicensedAudio,
  evaluateMusicLicense,
  isMusicLicenseTestMode,
  listMusicLibraryProviders,
  type MusicLibraryProviderId,
} from '../services/musicLibraries';
import {
  buildSunoGeneratePayload,
  buildSunoMusicPrompt,
  createSunoGeneration,
  downloadSunoAudio,
  extractSunoTracks,
  getSunoGenerationDetails,
  isSunoFailure,
  isSunoSuccess,
  type SunoPromptInput,
  type SunoRecordInfo,
  type SunoTrack,
} from '../services/sunoMusic';

export const musicRouter = Router();

const musicCategories = ['party', 'wedding', 'corporate', 'birthday', 'viral', 'premium', 'graduation', 'store', 'church', 'ambient'] as const;
const sunoModes = ['instrumental', 'vocal'] as const;
const sunoSources = ['user_prompt', 'ai_auto_edit'] as const;
const libraryProviderIds = MUSIC_LIBRARY_PROVIDER_IDS as unknown as [MusicLibraryProviderId, ...MusicLibraryProviderId[]];

const sunoInputSchema = z.object({
  prompt: z.string().max(800).optional().default(''),
  mode: z.enum(sunoModes).optional().default('instrumental'),
  source: z.enum(sunoSources).optional().default('user_prompt'),
  eventType: z.string().max(80).optional(),
  templateName: z.string().max(160).optional(),
  effect: z.string().max(80).optional(),
  mood: z.string().max(120).optional(),
  durationSeconds: z.number().int().min(5).max(45).optional().default(15),
  language: z.string().max(20).optional().default('pt-BR'),
  title: z.string().max(80).optional(),
  style: z.string().max(300).optional(),
  lyrics: z.string().max(3000).optional(),
}).refine((data) => data.prompt.trim().length >= 3 || data.source === 'ai_auto_edit', {
  message: 'PROMPT_REQUIRED',
  path: ['prompt'],
});

const musicLibraryLicenseSchema = z.object({
  providerId: z.enum(libraryProviderIds),
  licenseName: z.string().max(160).optional(),
  licenseUrl: z.string().url().optional(),
  attribution: z.string().max(800).optional(),
  licenseProofUrl: z.string().max(800).optional(),
  subscriptionConfirmed: z.boolean().optional().default(false),
});

const musicLibraryImportSchema = musicLibraryLicenseSchema.extend({
  name: z.string().min(1).max(120),
  artist: z.string().max(120).optional(),
  category: z.enum(musicCategories).optional().default('ambient'),
  theme: z.string().max(80).optional(),
  bpm: z.number().min(40).max(240).optional(),
  duration: z.number().min(1).max(3600).optional(),
  audioUrl: z.string().url(),
  pageUrl: z.string().url().optional(),
  providerTrackId: z.string().max(120).optional(),
});

type UserProfile = {
  uid: string;
  role: 'admin' | 'user';
};

type MusicGenerationRecord = {
  ownerId: string;
  taskId: string;
  status: string;
  source: 'user_prompt' | 'ai_auto_edit';
  mode: 'instrumental' | 'vocal';
  prompt: string;
  sunoPrompt: string;
  title?: string;
  style?: string;
  eventType?: string;
  templateName?: string;
  effect?: string;
  mood?: string;
  durationSeconds?: number;
  requestPayload?: Record<string, unknown>;
  response?: SunoRecordInfo;
  savedMusicIds?: string[];
  createdAt: string;
  updatedAt: string;
};

function getDb() {
  const db = getFirebaseAdminFirestore();
  if (!db) {
    const err = new Error('FIREBASE_ADMIN_FIRESTORE_NOT_CONFIGURED');
    (err as any).status = 500;
    throw err;
  }
  return db;
}

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(stripUndefined) as T;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, stripUndefined(item)])
    ) as T;
  }

  return value;
}

function fileSafeName(value: string, fallback = 'licensed-track') {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 64) || fallback;
}

function generationFromDoc(doc: FirebaseFirestore.DocumentSnapshot) {
  if (!doc.exists) return null;
  const { _ts, ...data } = doc.data() as Record<string, unknown>;
  return { id: doc.id, ...data } as MusicGenerationRecord & { id: string };
}

function musicFromDoc(doc: FirebaseFirestore.DocumentSnapshot) {
  if (!doc.exists) return null;
  const { _ts, ...data } = doc.data() as Record<string, unknown>;
  return { id: doc.id, ...data };
}

function canAccessGeneration(user: UserProfile, generation: MusicGenerationRecord | null) {
  return Boolean(generation && (user.role === 'admin' || generation.ownerId === user.uid));
}

function categoryFromInput(input: SunoPromptInput): typeof musicCategories[number] {
  const text = `${input.eventType || ''} ${input.mood || ''} ${input.templateName || ''}`.toLowerCase();
  if (/wedding|casamento|noiva|noivo/.test(text)) return 'wedding';
  if (/birthday|anivers/.test(text)) return 'birthday';
  if (/corporate|empresa|brand|marca|business/.test(text)) return 'corporate';
  if (/party|festa|club|balada|neon/.test(text)) return 'party';
  if (/viral|tiktok|reels|short/.test(text)) return 'viral';
  if (/luxury|premium|luxo/.test(text)) return 'premium';
  return 'ambient';
}

function trackTitle(track: SunoTrack, generation: MusicGenerationRecord, index: number) {
  return (track.title || generation.title || `Musica IA SIX3 ${index + 1}`)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 90);
}

function fileNameForTrack(track: SunoTrack, generation: MusicGenerationRecord, index: number) {
  const title = trackTitle(track, generation, index)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 60) || `suno-track-${index + 1}`;
  return `${title}.mp3`;
}

async function loadSavedMusic(ids: string[]) {
  if (!ids.length) return [];
  const snaps = await Promise.all(ids.map((id) => getDb().collection('music').doc(id).get()));
  return snaps.map(musicFromDoc).filter(Boolean);
}

async function saveSunoTracks(params: {
  user: UserProfile;
  generation: MusicGenerationRecord & { id: string };
  record: SunoRecordInfo;
}) {
  const savedIds = params.generation.savedMusicIds || [];
  if (savedIds.length) {
    return loadSavedMusic(savedIds);
  }

  const tracks = extractSunoTracks(params.record);
  if (!tracks.length) return [];

  await ensurePublicBucket(SUPABASE_BUCKETS.userMusic);
  const now = new Date().toISOString();
  const category = categoryFromInput(params.generation);
  const createdMusic = [];

  for (let index = 0; index < tracks.length; index += 1) {
    const track = tracks[index];
    const audioUrl = track.audioUrl || track.streamAudioUrl;
    if (!audioUrl) continue;

    const audio = await downloadSunoAudio(audioUrl);
    const uploaded = await uploadBufferToSupabase({
      bucket: SUPABASE_BUCKETS.userMusic,
      prefix: `suno/${params.user.uid}`,
      fileName: fileNameForTrack(track, params.generation, index),
      fallbackExt: '.mp3',
      buffer: audio.buffer,
      contentType: audio.contentType,
    });

    const music = stripUndefined({
      ownerId: params.user.uid,
      name: trackTitle(track, params.generation, index),
      category,
      theme: params.generation.mood || params.generation.eventType || category,
      duration: track.duration,
      musicUrl: uploaded.publicUrl,
      storagePath: uploaded.path,
      source: 'custom',
      library: 'Suno API',
      licenseName: 'Musica original gerada por IA via prompt no SIX3',
      attribution: 'Gerada no SIX3 com Suno API',
      isGlobal: false,
      isActive: true,
      sunoTaskId: params.generation.taskId,
      sunoTrackId: track.id,
      sunoPrompt: params.generation.sunoPrompt,
      createdAt: now,
      updatedAt: now,
      _ts: FieldValue.serverTimestamp(),
    });

    const ref = await getDb().collection('music').add(music);
    const { _ts, ...publicMusic } = music;
    createdMusic.push({ id: ref.id, ...publicMusic });
  }

  if (createdMusic.length) {
    await getDb().collection('musicGenerations').doc(params.generation.taskId).set({
      savedMusicIds: createdMusic.map((track) => track.id),
      updatedAt: new Date().toISOString(),
      _ts: FieldValue.serverTimestamp(),
    }, { merge: true });

    await createNotification({
      recipientUid: params.user.uid,
      category: 'template',
      title: 'Musica IA pronta',
      body: `${createdMusic[0].name} foi salva nas suas trilhas.`,
      link: '/app/templates',
      priority: 'normal',
      metadata: { taskId: params.generation.taskId, musicIds: createdMusic.map((track) => track.id) },
    }).catch((error) => console.warn('[notifications] suno music skipped:', error instanceof Error ? error.message : error));
  }

  return createdMusic;
}

musicRouter.get('/libraries', requireActiveSubscription, (_req, res) => {
  res.json({
    providers: listMusicLibraryProviders(),
    testMode: isMusicLicenseTestMode(),
    acceptedLicenses: [
      'Pixabay Content License',
      'Public Domain / CC0',
      'Creative Commons Attribution (CC BY) com credito',
      'YouTube Audio Library Standard ou Creative Commons com atribuicao',
      'Licencas pagas com assinatura/comprovante valido por projeto',
      'Modo teste server-side para rascunhos internos, quando MUSIC_LICENSE_TEST_MODE=true',
    ],
  });
});

musicRouter.post('/libraries/check', requireActiveSubscription, (req, res, next) => {
  try {
    const input = musicLibraryLicenseSchema.parse(req.body || {});
    const evaluation = evaluateMusicLicense({ ...input, allowTestMode: isMusicLicenseTestMode() });
    res.json({ evaluation });
  } catch (e) { next(e); }
});

musicRouter.post('/libraries/import', requirePlanFeature('custom_template_upload'), async (req, res, next) => {
  try {
    const user = res.locals.user as UserProfile;
    const input = musicLibraryImportSchema.parse(req.body || {});
    const evaluation = evaluateMusicLicense({ ...input, allowTestMode: isMusicLicenseTestMode() });

    if (evaluation.status === 'blocked') {
      const err = new Error('MUSIC_LICENSE_BLOCKED');
      (err as any).status = 400;
      (err as any).details = evaluation;
      throw err;
    }

    if (evaluation.status === 'manual_review') {
      const err = new Error('MUSIC_LICENSE_REQUIRES_MANUAL_REVIEW');
      (err as any).status = 400;
      (err as any).details = evaluation;
      throw err;
    }

    if (evaluation.status !== 'test_only' && evaluation.status === 'requires_attribution' && !input.attribution?.trim()) {
      const err = new Error('MUSIC_ATTRIBUTION_REQUIRED');
      (err as any).status = 400;
      (err as any).details = evaluation;
      throw err;
    }

    if (evaluation.status !== 'test_only' && evaluation.licenseProofRequired && !input.licenseProofUrl?.trim()) {
      const err = new Error('MUSIC_LICENSE_PROOF_REQUIRED');
      (err as any).status = 400;
      (err as any).details = evaluation;
      throw err;
    }

    await ensurePublicBucket(SUPABASE_BUCKETS.userMusic);
    const audio = await downloadLicensedAudio(input.audioUrl);
    const uploaded = await uploadBufferToSupabase({
      bucket: SUPABASE_BUCKETS.userMusic,
      prefix: `licensed/${user.uid}/${input.providerId}`,
      fileName: `${fileSafeName(input.name)}-${audio.fileName}`,
      fallbackExt: '.mp3',
      buffer: audio.buffer,
      contentType: audio.contentType,
    });
    const now = new Date().toISOString();
    const music = stripUndefined({
      ownerId: user.uid,
      name: input.name,
      providerArtist: input.artist,
      category: input.category,
      theme: input.theme || input.category,
      bpm: input.bpm,
      duration: input.duration,
      musicUrl: uploaded.publicUrl,
      storagePath: uploaded.path,
      source: 'custom',
      library: listMusicLibraryProviders().find((provider) => provider.id === input.providerId)?.name || input.providerId,
      providerId: input.providerId,
      providerTrackId: input.providerTrackId,
      pageUrl: input.pageUrl,
      originalAudioUrl: input.audioUrl,
      licenseName: evaluation.licenseName,
      licenseUrl: evaluation.licenseUrl,
      licenseStatus: evaluation.status,
      licenseCheckedAt: evaluation.checkedAt,
      licenseProofUrl: input.licenseProofUrl,
      attribution: input.attribution,
      isGlobal: false,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      _ts: FieldValue.serverTimestamp(),
    });

    const ref = await getDb().collection('music').add(music);
    const { _ts, ...publicMusic } = music;

    await createNotification({
      recipientUid: user.uid,
      category: 'template',
      title: 'Musica licenciada importada',
      body: `${input.name} foi salva nas suas trilhas com licenca conferida.`,
      link: '/app/templates',
      priority: 'normal',
      metadata: { musicId: ref.id, providerId: input.providerId, licenseStatus: evaluation.status },
    }).catch((error) => console.warn('[notifications] licensed music skipped:', error instanceof Error ? error.message : error));

    res.status(201).json({ music: { id: ref.id, ...publicMusic }, evaluation });
  } catch (e) { next(e); }
});

musicRouter.post('/suno/prompt', requirePlanFeature('ai_auto_edit'), async (req, res, next) => {
  try {
    const input = sunoInputSchema.parse(req.body || {});
    const payload = buildSunoGeneratePayload(input);
    res.json({
      prompt: buildSunoMusicPrompt(input),
      sunoPrompt: payload.prompt,
      title: payload.title,
      style: payload.style,
      instrumental: payload.instrumental,
      customMode: payload.customMode,
      model: payload.model,
    });
  } catch (e) { next(e); }
});

musicRouter.post('/suno/generate', requirePlanFeature('ai_auto_edit'), async (req, res, next) => {
  try {
    const user = res.locals.user as UserProfile;
    const input = sunoInputSchema.parse(req.body || {});
    const generation = await createSunoGeneration(input);
    const now = new Date().toISOString();
    const record = stripUndefined({
      ownerId: user.uid,
      taskId: generation.taskId,
      status: 'PENDING',
      source: input.source,
      mode: input.mode,
      prompt: input.prompt,
      sunoPrompt: generation.sunoPrompt,
      title: generation.requestPayload.title,
      style: generation.requestPayload.style,
      eventType: input.eventType,
      templateName: input.templateName,
      effect: input.effect,
      mood: input.mood,
      durationSeconds: input.durationSeconds,
      requestPayload: generation.requestPayload,
      createdAt: now,
      updatedAt: now,
      _ts: FieldValue.serverTimestamp(),
    });

    await getDb().collection('musicGenerations').doc(generation.taskId).set(record);
    const { _ts, ...publicRecord } = record;

    res.status(202).json({
      generation: { id: generation.taskId, ...publicRecord },
      taskId: generation.taskId,
      prompt: generation.sunoPrompt,
    });
  } catch (e) { next(e); }
});

musicRouter.get('/suno/:taskId', requirePlanFeature('ai_auto_edit'), async (req, res, next) => {
  try {
    const user = res.locals.user as UserProfile;
    const snap = await getDb().collection('musicGenerations').doc(req.params.taskId).get();
    const generation = generationFromDoc(snap);

    if (!canAccessGeneration(user, generation)) {
      res.status(404).json({ error: 'SUNO_GENERATION_NOT_FOUND' });
      return;
    }

    const details = await getSunoGenerationDetails(req.params.taskId);
    const status = details.status || generation!.status || 'PENDING';
    await getDb().collection('musicGenerations').doc(req.params.taskId).set({
      status,
      response: details,
      errorCode: details.errorCode || null,
      errorMessage: details.errorMessage || null,
      updatedAt: new Date().toISOString(),
      _ts: FieldValue.serverTimestamp(),
    }, { merge: true });

    let music: unknown[] = [];
    if (isSunoSuccess(details)) {
      music = await saveSunoTracks({ user, generation: generation!, record: details });
    }

    if (isSunoFailure(details)) {
      res.status(502).json({
        generation: { ...generation, status, response: details },
        status,
        music,
        error: details.errorMessage || status,
      });
      return;
    }

    res.json({
      generation: { ...generation, status, response: details },
      status,
      music,
    });
  } catch (e) { next(e); }
});

musicRouter.post('/suno/callback', async (req, res, next) => {
  try {
    const payload = req.body || {};
    const taskId = String(payload.taskId || payload.data?.taskId || payload.response?.taskId || '');
    if (taskId) {
      await getDb().collection('musicGenerations').doc(taskId).set({
        status: payload.status || payload.data?.status || 'CALLBACK_RECEIVED',
        callback: payload,
        updatedAt: new Date().toISOString(),
        _ts: FieldValue.serverTimestamp(),
      }, { merge: true });
    }

    res.json({ ok: true });
  } catch (e) { next(e); }
});
