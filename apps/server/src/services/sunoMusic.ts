const DEFAULT_SUNO_API_BASE_URL = 'https://api.sunoapi.org';
const DEFAULT_SUNO_MODEL = 'V4_5ALL';
const DEFAULT_CALLBACK_BASE_URL = 'https://tres6zero.onrender.com';
const MAX_AUDIO_BYTES = 50 * 1024 * 1024;

export type SunoPromptInput = {
  prompt?: string;
  mode: 'instrumental' | 'vocal';
  source?: 'user_prompt' | 'ai_auto_edit';
  eventType?: string;
  templateName?: string;
  effect?: string;
  mood?: string;
  durationSeconds?: number;
  language?: string;
  title?: string;
  style?: string;
  lyrics?: string;
};

export type SunoGeneratePayload = {
  customMode: boolean;
  instrumental: boolean;
  model: string;
  callBackUrl: string;
  prompt: string;
  style?: string;
  title?: string;
  negativeTags?: string;
  styleWeight?: number;
  weirdnessConstraint?: number;
};

export type SunoTrack = {
  id?: string;
  audioUrl?: string;
  streamAudioUrl?: string;
  imageUrl?: string;
  prompt?: string;
  modelName?: string;
  title?: string;
  tags?: string;
  createTime?: string;
  duration?: number;
};

export type SunoRecordInfo = {
  taskId?: string;
  param?: string;
  response?: {
    taskId?: string;
    sunoData?: SunoTrack[];
  };
  status?: string;
  type?: string;
  errorCode?: string | null;
  errorMessage?: string | null;
};

function env(name: string) {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : '';
}

function getSunoApiKey() {
  const key = env('SUNO_API_KEY');
  if (!key) {
    const err = new Error('SUNO_API_KEY_NOT_CONFIGURED');
    (err as any).status = 500;
    throw err;
  }
  return key;
}

function getSunoBaseUrl() {
  return (env('SUNO_API_BASE_URL') || DEFAULT_SUNO_API_BASE_URL).replace(/\/+$/, '');
}

function getSunoModel() {
  return env('SUNO_MODEL') || DEFAULT_SUNO_MODEL;
}

function callbackUrl() {
  const explicit = env('SUNO_CALLBACK_URL');
  if (explicit) return explicit;

  const base = (env('PUBLIC_BACKEND_URL') || DEFAULT_CALLBACK_BASE_URL).replace(/\/+$/, '');
  return `${base}/api/music/suno/callback`;
}

function clampText(value: string, max: number) {
  return value.replace(/\s+/g, ' ').trim().slice(0, max);
}

function titleFromInput(input: SunoPromptInput) {
  const fallback = input.eventType
    ? `SIX3 ${input.eventType}`
    : input.mode === 'vocal'
      ? 'SIX3 Original Vocal'
      : 'SIX3 Original Track';
  return clampText(input.title || fallback, 80);
}

function styleFromInput(input: SunoPromptInput) {
  const base = input.style || [
    input.mood,
    input.eventType,
    input.effect,
    input.mode === 'vocal' ? 'modern Brazilian pop vocals' : 'modern instrumental electronic soundtrack',
    'clean mix',
    'short-form video energy',
  ].filter(Boolean).join(', ');

  return clampText(base || 'Modern electronic, clean, cinematic, short-form video soundtrack', 900);
}

function defaultPromptSubject(input: SunoPromptInput) {
  if (input.source === 'ai_auto_edit') {
    return [
      'A soundtrack automatically directed for a 360 photo booth video',
      input.eventType ? `event type: ${input.eventType}` : '',
      input.templateName ? `template visual identity: ${input.templateName}` : '',
      input.effect ? `video effect: ${input.effect}` : '',
      input.mood ? `desired mood: ${input.mood}` : '',
    ].filter(Boolean).join('. ');
  }

  return 'A custom soundtrack for a 360 photo booth video based on the user idea.';
}

export function buildSunoMusicPrompt(input: SunoPromptInput) {
  const duration = input.durationSeconds || 15;
  const language = input.language || 'pt-BR';
  const userIdea = clampText(input.prompt || defaultPromptSubject(input), 700);

  const commonRules = [
    'Create a fully original composition.',
    'Do not imitate any artist, existing song, copyrighted melody, sample, hook, or lyrics.',
    `Make it work as a ${duration}-second edit for a SIX3 360 video, with a clean beginning, strong middle, and smooth ending.`,
    'Make it polished, modern, social-media friendly, and easy to cut under a short video.',
  ];

  if (input.mode === 'vocal') {
    return clampText([
      userIdea,
      `Language preference: ${language}.`,
      'Generate original sung lyrics if no exact lyrics are provided.',
      'Use a memorable chorus, positive event energy, and clear phrasing.',
      ...commonRules,
    ].join(' '), 500);
  }

  return clampText([
    userIdea,
    'Instrumental only. No vocals, no spoken words, no crowd chants.',
    'Use a tasteful beat, melodic accents, and a loop-friendly structure.',
    ...commonRules,
  ].join(' '), 1200);
}

export function buildSunoGeneratePayload(input: SunoPromptInput): SunoGeneratePayload {
  const instrumental = input.mode === 'instrumental';
  const lyrics = clampText(input.lyrics || '', 3000);
  const hasExactLyrics = !instrumental && lyrics.length > 0;
  const sunoPrompt = hasExactLyrics ? lyrics : buildSunoMusicPrompt(input);
  const customMode = instrumental || hasExactLyrics;

  const payload: SunoGeneratePayload = {
    customMode,
    instrumental,
    model: getSunoModel(),
    callBackUrl: callbackUrl(),
    prompt: customMode ? clampText(sunoPrompt, 5000) : clampText(sunoPrompt, 500),
    negativeTags: 'copyrighted melody, existing song, artist imitation, uncleared sample, low quality, distorted audio',
  };

  if (customMode) {
    payload.title = titleFromInput(input);
    payload.style = styleFromInput(input);
    payload.styleWeight = 0.68;
    payload.weirdnessConstraint = 0.38;
  }

  return payload;
}

async function sunoRequest<T>(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${getSunoApiKey()}`);
  headers.set('Content-Type', 'application/json');

  const response = await fetch(`${getSunoBaseUrl()}${path}`, {
    ...options,
    headers,
  });
  const payload = await response.json().catch(() => ({})) as any;

  if (!response.ok || (typeof payload.code === 'number' && payload.code !== 200)) {
    const message = payload?.msg || payload?.message || `SUNO_REQUEST_FAILED_${response.status}`;
    const err = new Error(message);
    (err as any).status = response.status >= 400 ? response.status : 502;
    (err as any).code = payload?.code || message;
    throw err;
  }

  return payload as T;
}

export async function createSunoGeneration(input: SunoPromptInput) {
  const requestPayload = buildSunoGeneratePayload(input);
  const response = await sunoRequest<{ data?: { taskId?: string }; taskId?: string; message?: string }>('/api/v1/generate', {
    method: 'POST',
    body: JSON.stringify(requestPayload),
  });
  const taskId = response.data?.taskId || response.taskId;

  if (!taskId) {
    const err = new Error('SUNO_TASK_ID_MISSING');
    (err as any).status = 502;
    throw err;
  }

  return {
    taskId,
    requestPayload,
    sunoPrompt: requestPayload.prompt,
  };
}

export async function getSunoGenerationDetails(taskId: string) {
  const query = new URLSearchParams({ taskId });
  const response = await sunoRequest<{ data?: SunoRecordInfo }>(`/api/v1/generate/record-info?${query}`);
  return response.data || {};
}

export function extractSunoTracks(record: SunoRecordInfo) {
  return Array.isArray(record.response?.sunoData)
    ? record.response.sunoData.filter((track) => track.audioUrl || track.streamAudioUrl)
    : [];
}

export function isSunoSuccess(record: SunoRecordInfo) {
  return record.status === 'SUCCESS';
}

export function isSunoFailure(record: SunoRecordInfo) {
  return [
    'CREATE_TASK_FAILED',
    'GENERATE_AUDIO_FAILED',
    'CALLBACK_EXCEPTION',
    'SENSITIVE_WORD_ERROR',
  ].includes(record.status || '');
}

export async function downloadSunoAudio(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    const err = new Error(`SUNO_AUDIO_DOWNLOAD_FAILED_${response.status}`);
    (err as any).status = 502;
    throw err;
  }

  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > MAX_AUDIO_BYTES) {
    const err = new Error('SUNO_AUDIO_TOO_LARGE');
    (err as any).status = 413;
    throw err;
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength > MAX_AUDIO_BYTES) {
    const err = new Error('SUNO_AUDIO_TOO_LARGE');
    (err as any).status = 413;
    throw err;
  }

  return {
    buffer,
    contentType: response.headers.get('content-type') || 'audio/mpeg',
  };
}
