import { readFile } from 'node:fs/promises';
import { BASIC_EFFECTS, POPULAR_EFFECTS } from './planEntitlements';

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_OPENAI_MODEL = 'gpt-5-mini';
const MUSIC_THEMES = ['none', 'ambient', 'party', 'luxury', 'wedding', 'corporate', 'birthday', 'viral'] as const;
const AI_EFFECTS = [...BASIC_EFFECTS, ...POPULAR_EFFECTS].filter((effect) => effect !== 'boomerang');

export type AIVideoDirection = {
  effect: string;
  musicTheme: string;
  rationale?: string;
};

type ResponsesPayload = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

function getOpenAIKey() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    const err = new Error('OPENAI_API_KEY_NOT_CONFIGURED');
    (err as any).status = 500;
    throw err;
  }
  return key;
}

function extractOutputText(payload: ResponsesPayload) {
  if (payload.output_text) return payload.output_text;
  return payload.output
    ?.flatMap((item) => item.content || [])
    .find((content) => content.type === 'output_text' && content.text)
    ?.text;
}

function normalizeDirection(value: unknown, fallbackEventType?: string, fallbackMusicTheme?: string): AIVideoDirection {
  const body = typeof value === 'object' && value ? value as Record<string, unknown> : {};
  const effect = typeof body.effect === 'string' && AI_EFFECTS.includes(body.effect)
    ? body.effect
    : fallbackEffect(fallbackEventType);
  const musicTheme = typeof body.musicTheme === 'string' && MUSIC_THEMES.includes(body.musicTheme as any)
    ? body.musicTheme
    : fallbackMusicTheme || fallbackMusic(fallbackEventType);
  const rationale = typeof body.rationale === 'string' ? body.rationale.slice(0, 220) : undefined;

  return { effect, musicTheme, rationale };
}

function fallbackEffect(eventType?: string) {
  const effects: Record<string, string> = {
    wedding: 'wedding_soft',
    corporate: 'corporate_sharp',
    inauguration: 'corporate_sharp',
    store: 'corporate_sharp',
    birthday: 'party',
    viral: 'party',
    club: 'neon',
    graduation: 'cinematic',
    church: 'wedding_soft',
  };
  return effects[eventType || ''] || 'cinematic';
}

function fallbackMusic(eventType?: string) {
  const themes: Record<string, string> = {
    wedding: 'wedding',
    corporate: 'corporate',
    inauguration: 'corporate',
    store: 'corporate',
    birthday: 'birthday',
    club: 'party',
    viral: 'viral',
    graduation: 'ambient',
    church: 'wedding',
  };
  return themes[eventType || ''] || 'ambient';
}

export function getFallbackAIVideoDirection(params: {
  eventType?: string;
  requestedMusicTheme?: string;
}): AIVideoDirection {
  const requestedMusicTheme = params.requestedMusicTheme;
  const musicTheme = typeof requestedMusicTheme === 'string' && MUSIC_THEMES.includes(requestedMusicTheme as any) && requestedMusicTheme !== 'none'
    ? requestedMusicTheme
    : fallbackMusic(params.eventType);

  return {
    effect: fallbackEffect(params.eventType),
    musicTheme,
    rationale: 'IA indisponivel no momento; direcao automatica aplicada pelo servidor.',
  };
}

export async function getAIVideoDirection(params: {
  framePath: string;
  eventType?: string;
  requestedMusicTheme?: string;
  hasOverlay: boolean;
}) {
  const frame = await readFile(params.framePath);
  const imageUrl = `data:image/jpeg;base64,${frame.toString('base64')}`;
  const model = process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getOpenAIKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      store: false,
      max_output_tokens: 260,
      instructions: [
        'You are the SIX3 video director for a 360 photo booth SaaS.',
        'Analyze the frame and event context, then choose the best visual preset and music theme.',
        'Return only valid JSON. Do not include markdown.',
        `Allowed effects: ${AI_EFFECTS.join(', ')}.`,
        `Allowed musicTheme values: ${MUSIC_THEMES.join(', ')}.`,
      ].join('\n'),
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: JSON.stringify({
                eventType: params.eventType || 'other',
                requestedMusicTheme: params.requestedMusicTheme || 'none',
                hasOverlay: params.hasOverlay,
                outputShape: {
                  effect: 'one allowed effect',
                  musicTheme: 'one allowed musicTheme',
                  rationale: 'short Portuguese reason',
                },
              }),
            },
            {
              type: 'input_image',
              image_url: imageUrl,
              detail: 'low',
            },
          ],
        },
      ],
    }),
  });

  const payload = await response.json().catch(() => ({})) as any;
  if (!response.ok) {
    const err = new Error(payload?.error?.message || 'OPENAI_RESPONSE_FAILED');
    (err as any).status = 502;
    throw err;
  }

  const text = extractOutputText(payload as ResponsesPayload) || '{}';
  try {
    return normalizeDirection(JSON.parse(text), params.eventType, params.requestedMusicTheme);
  } catch {
    return normalizeDirection({}, params.eventType, params.requestedMusicTheme);
  }
}
