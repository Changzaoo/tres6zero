import { apiRequest } from '@/services/authService';
import type { AppMusic } from '@/types';

export type SunoMusicMode = 'instrumental' | 'vocal';
export type SunoMusicSource = 'user_prompt' | 'ai_auto_edit';

export type SunoMusicInput = {
  prompt?: string;
  mode?: SunoMusicMode;
  source?: SunoMusicSource;
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

export type SunoPromptPreview = {
  prompt: string;
  sunoPrompt: string;
  title?: string;
  style?: string;
  instrumental: boolean;
  customMode: boolean;
  model: string;
};

export type SunoGeneration = {
  id: string;
  taskId: string;
  status: string;
  source: SunoMusicSource;
  mode: SunoMusicMode;
  prompt: string;
  sunoPrompt: string;
  title?: string;
  style?: string;
  eventType?: string;
  templateName?: string;
  effect?: string;
  mood?: string;
  durationSeconds?: number;
  createdAt: string;
  updatedAt: string;
};

export type SunoGenerationResponse = {
  taskId?: string;
  prompt?: string;
  status?: string;
  generation: SunoGeneration;
  music?: AppMusic[];
  error?: string;
};

export async function buildSunoPrompt(input: SunoMusicInput) {
  return apiRequest<SunoPromptPreview>('/api/music/suno/prompt', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function generateSunoMusic(input: SunoMusicInput) {
  return apiRequest<SunoGenerationResponse>('/api/music/suno/generate', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getSunoMusicGeneration(taskId: string) {
  return apiRequest<SunoGenerationResponse>(`/api/music/suno/${encodeURIComponent(taskId)}?t=${Date.now()}`);
}

export function describeSunoStatus(status: string) {
  const normalized = status.toUpperCase();
  const labels: Record<string, string> = {
    PENDING: 'Suno preparando a musica...',
    TEXT_SUCCESS: 'Ideia musical criada, gerando audio...',
    FIRST_SUCCESS: 'Primeira faixa pronta, salvando...',
    SUCCESS: 'Musica pronta, salvando...',
    CREATE_TASK_FAILED: 'A Suno nao conseguiu criar a tarefa.',
    GENERATE_AUDIO_FAILED: 'A Suno nao conseguiu gerar o audio.',
    CALLBACK_EXCEPTION: 'A Suno falhou ao chamar o servidor.',
    SENSITIVE_WORD_ERROR: 'A Suno bloqueou algum termo do prompt.',
  };

  return labels[normalized] || `Suno: ${status}`;
}

export async function waitForSunoMusic(
  taskId: string,
  onStatus?: (status: string) => void,
  options: { maxAttempts?: number; intervalMs?: number } = {}
) {
  const maxAttempts = options.maxAttempts ?? 90;
  const intervalMs = options.intervalMs ?? 6000;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const result = await getSunoMusicGeneration(taskId);
    const status = result.status || result.generation?.status || 'PENDING';
    onStatus?.(status);

    if (result.music?.length) return result;
    if (result.error || ['CREATE_TASK_FAILED', 'GENERATE_AUDIO_FAILED', 'CALLBACK_EXCEPTION', 'SENSITIVE_WORD_ERROR'].includes(status)) {
      throw new Error(result.error || status);
    }

    await new Promise((resolve) => window.setTimeout(resolve, intervalMs));
  }

  throw new Error('SUNO_GENERATION_STILL_PROCESSING');
}
