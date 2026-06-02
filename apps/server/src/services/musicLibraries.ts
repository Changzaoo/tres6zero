import { randomUUID } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

export const MUSIC_LIBRARY_PROVIDER_IDS = [
  'youtube_audio_library',
  'pixabay_music',
  'free_music_archive',
  'artlist',
  'epidemic_sound',
  'soundstripe',
  'premiumbeat',
  'envato_elements',
  'uppbeat',
  'audiio',
] as const;

export type MusicLibraryProviderId = typeof MUSIC_LIBRARY_PROVIDER_IDS[number];

export type MusicLicenseStatus =
  | 'allowed'
  | 'requires_attribution'
  | 'requires_subscription'
  | 'test_only'
  | 'manual_review'
  | 'blocked';

export type MusicLibraryProvider = {
  id: MusicLibraryProviderId;
  name: string;
  type: 'open_catalog' | 'manual_catalog' | 'subscription_catalog';
  homepageUrl: string;
  licenseUrl: string;
  docsUrl?: string;
  browseUrl?: string;
  supportsPublicApiSearch: boolean;
  supportsRemoteImport: boolean;
  requiresLicenseProof: boolean;
  defaultLicenseName: string;
  notes: string[];
};

export type MusicLicenseEvaluation = {
  providerId: MusicLibraryProviderId;
  status: MusicLicenseStatus;
  licenseName: string;
  licenseUrl?: string;
  attributionRequired: boolean;
  licenseProofRequired: boolean;
  checkedAt: string;
  warnings: string[];
};

export type DownloadedAudio = {
  buffer: Buffer;
  contentType: string;
  fileName: string;
};

const MAX_REMOTE_AUDIO_BYTES = Number(process.env.MUSIC_REMOTE_IMPORT_MAX_MB || 50) * 1024 * 1024;

export const musicLibraryProviders: MusicLibraryProvider[] = [
  {
    id: 'youtube_audio_library',
    name: 'YouTube Audio Library',
    type: 'manual_catalog',
    homepageUrl: 'https://www.youtube.com/audiolibrary',
    licenseUrl: 'https://support.google.com/youtube/answer/3376882',
    docsUrl: 'https://support.google.com/youtube/answer/3376882',
    browseUrl: 'https://www.youtube.com/audiolibrary',
    supportsPublicApiSearch: false,
    supportsRemoteImport: true,
    requiresLicenseProof: true,
    defaultLicenseName: 'YouTube Audio Library license',
    notes: [
      'O catalogo fica no YouTube Studio e nao tem API publica segura para copiar a biblioteca inteira.',
      'Faixas Creative Commons exigem atribuicao; faixas Standard podem nao exigir atribuicao.',
      'Importe somente arquivos baixados do YouTube Studio com a licenca/atribuicao correspondente.',
    ],
  },
  {
    id: 'pixabay_music',
    name: 'Pixabay Music',
    type: 'open_catalog',
    homepageUrl: 'https://pixabay.com/music/',
    licenseUrl: 'https://pixabay.com/service/license-summary/',
    docsUrl: 'https://pixabay.com/api/docs/',
    browseUrl: 'https://pixabay.com/music/',
    supportsPublicApiSearch: false,
    supportsRemoteImport: true,
    requiresLicenseProof: false,
    defaultLicenseName: 'Pixabay Content License',
    notes: [
      'A licenca de conteudo cobre audio, mas a API oficial documentada lista busca de imagens e videos.',
      'O app nao faz scraping do site; importe a faixa baixada ou um link direto autorizado.',
      'Atribuicao nao e exigida pela licenca da Pixabay, mas e recomendada.',
    ],
  },
  {
    id: 'free_music_archive',
    name: 'Free Music Archive',
    type: 'open_catalog',
    homepageUrl: 'https://freemusicarchive.org/',
    licenseUrl: 'https://freemusicarchive.org/License_Guide',
    docsUrl: 'https://freemusicarchive.org/terms_of_use',
    browseUrl: 'https://freemusicarchive.org/search/',
    supportsPublicApiSearch: false,
    supportsRemoteImport: true,
    requiresLicenseProof: false,
    defaultLicenseName: 'Creative Commons / FMA track license',
    notes: [
      'A licenca varia por faixa; o app bloqueia NC/ND e exige atribuicao quando a licenca pedir.',
      'Use a pagina da faixa como URL de licenca/comprovante.',
      'Faixas Public Domain, CC0 e CC BY sao aceitas automaticamente; outras ficam para revisao.',
    ],
  },
  {
    id: 'artlist',
    name: 'Artlist',
    type: 'subscription_catalog',
    homepageUrl: 'https://artlist.io/',
    licenseUrl: 'https://artlist.io/help-center/privacy-terms/artlist-license/',
    docsUrl: 'https://help.artlist.io/hc/en-us/articles/29490991524253-Understanding-Artlist-s-license',
    browseUrl: 'https://artlist.io/royalty-free-music',
    supportsPublicApiSearch: false,
    supportsRemoteImport: true,
    requiresLicenseProof: true,
    defaultLicenseName: 'Artlist subscription/project license',
    notes: [
      'Requer assinatura/licenca valida de acordo com o projeto e publicacao.',
      'O SIX3 exige comprovante de licenca antes de salvar a faixa.',
    ],
  },
  {
    id: 'epidemic_sound',
    name: 'Epidemic Sound',
    type: 'subscription_catalog',
    homepageUrl: 'https://www.epidemicsound.com/',
    licenseUrl: 'https://www.epidemicsound.com/our-license-model/',
    docsUrl: 'https://www.epidemicsound.com/how-it-works/license-music-legally/',
    browseUrl: 'https://www.epidemicsound.com/music/',
    supportsPublicApiSearch: false,
    supportsRemoteImport: true,
    requiresLicenseProof: true,
    defaultLicenseName: 'Epidemic Sound active subscription/project license',
    notes: [
      'Requer assinatura/licenca adequada e canal/projeto coberto.',
      'Somente importe se o conteudo final sera publicado dentro das condicoes da assinatura.',
    ],
  },
  {
    id: 'soundstripe',
    name: 'Soundstripe',
    type: 'subscription_catalog',
    homepageUrl: 'https://www.soundstripe.com/',
    licenseUrl: 'https://www.soundstripe.com/terms-of-use',
    docsUrl: 'https://www.soundstripe.com/knowledge/licensing-usage/what-can-i-do-with-license',
    browseUrl: 'https://www.soundstripe.com/library/music',
    supportsPublicApiSearch: false,
    supportsRemoteImport: true,
    requiresLicenseProof: true,
    defaultLicenseName: 'Soundstripe subscription or single-use license',
    notes: [
      'Requer assinatura ativa ou licenca single-use que cubra o projeto.',
      'O comprovante deve indicar que a faixa pode ser usada no video/projeto do cliente.',
    ],
  },
  {
    id: 'premiumbeat',
    name: 'PremiumBeat',
    type: 'subscription_catalog',
    homepageUrl: 'https://www.premiumbeat.com/',
    licenseUrl: 'https://www.premiumbeat.com/license',
    docsUrl: 'https://www.premiumbeat.com/help/en/articles/11386203-how-am-i-allowed-to-use-the-music-i-license-from-premiumbeat',
    browseUrl: 'https://www.premiumbeat.com/royalty-free-music',
    supportsPublicApiSearch: false,
    supportsRemoteImport: true,
    requiresLicenseProof: true,
    defaultLicenseName: 'PremiumBeat single-track license',
    notes: [
      'Licencas variam por faixa e uso; informe o tipo de licenca comprado.',
      'Sem comprovante de compra/licenca, a importacao fica bloqueada.',
    ],
  },
  {
    id: 'envato_elements',
    name: 'Envato Elements',
    type: 'subscription_catalog',
    homepageUrl: 'https://elements.envato.com/',
    licenseUrl: 'https://elements.envato.com/license-terms',
    docsUrl: 'https://elements.envato.com/license-terms',
    browseUrl: 'https://elements.envato.com/music',
    supportsPublicApiSearch: false,
    supportsRemoteImport: true,
    requiresLicenseProof: true,
    defaultLicenseName: 'Envato Elements registered project license',
    notes: [
      'Itens precisam ser registrados para um uso/projeto especifico.',
      'O app exige link ou ID do registro de licenca antes de salvar.',
    ],
  },
  {
    id: 'uppbeat',
    name: 'Uppbeat',
    type: 'subscription_catalog',
    homepageUrl: 'https://uppbeat.io/',
    licenseUrl: 'https://uppbeat.io/user-agreement',
    docsUrl: 'https://uppbeat.io/blog/royalty-free-and-copyright-free-music/uppbeats-music-licenses',
    browseUrl: 'https://uppbeat.io/music',
    supportsPublicApiSearch: false,
    supportsRemoteImport: true,
    requiresLicenseProof: true,
    defaultLicenseName: 'Uppbeat user agreement/download license',
    notes: [
      'Downloads sao licenciados por conta/plano; informe codigo, pagina ou comprovante.',
      'Alguns usos fora de plataformas abertas podem exigir licenca adicional.',
    ],
  },
  {
    id: 'audiio',
    name: 'Audiio',
    type: 'subscription_catalog',
    homepageUrl: 'https://audiio.com/',
    licenseUrl: 'https://audiio.com/',
    docsUrl: 'https://audiio.com/',
    browseUrl: 'https://audiio.com/music',
    supportsPublicApiSearch: false,
    supportsRemoteImport: true,
    requiresLicenseProof: true,
    defaultLicenseName: 'Audiio Pro/Lifetime project license',
    notes: [
      'Requer assinatura/licenca e comprovante do projeto/faixa.',
      'Confira limites de uso, cliente e plano antes de usar em projetos de terceiros.',
    ],
  },
];

function normalizeText(value?: string) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function providerById(providerId: string) {
  return musicLibraryProviders.find((provider) => provider.id === providerId);
}

function isSubscriptionProvider(provider: MusicLibraryProvider) {
  return provider.type === 'subscription_catalog';
}

function ccLicenseStatus(licenseName: string): MusicLicenseStatus {
  const value = normalizeText(licenseName);
  if (!value) return 'manual_review';
  if (/(cc0|public domain|dominio publico|pdm|pixabay content|pixabay license|standard youtube audio library)/i.test(value)) {
    return 'allowed';
  }
  if (/(cc[- ]?by|creative commons attribution|atribuicao)/i.test(value) && !/(nc|non[- ]?commercial|nd|no derivatives|sem derivados)/i.test(value)) {
    return 'requires_attribution';
  }
  if (/(nc|non[- ]?commercial|nao comercial|nd|no derivatives|sem derivados)/i.test(value)) {
    return 'blocked';
  }
  if (/(sharealike|sa|compartilha)/i.test(value)) {
    return 'manual_review';
  }
  return 'manual_review';
}

export function listMusicLibraryProviders() {
  return musicLibraryProviders;
}

export function isMusicLicenseTestMode() {
  return process.env.MUSIC_LICENSE_TEST_MODE === 'true';
}

export function evaluateMusicLicense(params: {
  providerId: MusicLibraryProviderId;
  licenseName?: string;
  licenseUrl?: string;
  attribution?: string;
  licenseProofUrl?: string;
  subscriptionConfirmed?: boolean;
  allowTestMode?: boolean;
}): MusicLicenseEvaluation {
  const provider = providerById(params.providerId);
  if (!provider) {
    return {
      providerId: params.providerId,
      status: 'blocked',
      licenseName: params.licenseName || 'Unknown license',
      licenseUrl: params.licenseUrl,
      attributionRequired: false,
      licenseProofRequired: false,
      checkedAt: new Date().toISOString(),
      warnings: ['Biblioteca musical desconhecida.'],
    };
  }

  const licenseName = (params.licenseName || provider.defaultLicenseName).trim();
  const warnings: string[] = [];
  let status: MusicLicenseStatus;

  if (isSubscriptionProvider(provider)) {
    status = params.subscriptionConfirmed && params.licenseProofUrl ? 'requires_subscription' : 'blocked';
    if (!params.subscriptionConfirmed) warnings.push('Confirme que existe assinatura/licenca ativa para esta faixa e projeto.');
    if (!params.licenseProofUrl) warnings.push('Informe o link, ID ou comprovante da licenca do provedor.');
  } else {
    status = ccLicenseStatus(licenseName);
  }

  if (provider.id === 'youtube_audio_library' && !params.licenseProofUrl) {
    warnings.push('Use a coluna de tipo de licenca/atribuicao do YouTube Studio como comprovante.');
  }

  if (status === 'requires_attribution' && !params.attribution?.trim()) {
    warnings.push('Esta licenca exige atribuicao; preencha o texto de credito antes de publicar.');
  }

  if (status === 'manual_review') {
    warnings.push('A licenca nao e claramente livre para uso em video editado; revise manualmente antes de importar.');
  }

  if (status === 'blocked') {
    warnings.push('A licenca informada nao libera uso seguro no SIX3.');
  }

  if (params.allowTestMode && ['blocked', 'manual_review'].includes(status)) {
    status = 'test_only';
    warnings.push('MODO TESTE: importacao liberada apenas para validacao interna de edicao de videos.');
  }

  return {
    providerId: provider.id,
    status,
    licenseName,
    licenseUrl: params.licenseUrl || provider.licenseUrl,
    attributionRequired: status === 'requires_attribution',
    licenseProofRequired: provider.requiresLicenseProof || status === 'requires_subscription',
    checkedAt: new Date().toISOString(),
    warnings: Array.from(new Set(warnings)),
  };
}

function isPrivateIp(ip: string) {
  if (ip.includes(':')) {
    const normalized = ip.toLowerCase();
    return normalized === '::1'
      || normalized.startsWith('fc')
      || normalized.startsWith('fd')
      || normalized.startsWith('fe80')
      || normalized === '::';
  }

  const parts = ip.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return true;
  const [a, b] = parts;

  return a === 10
    || a === 127
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a === 169 && b === 254)
    || a === 0
    || a >= 224;
}

export async function assertRemoteAudioUrlIsSafe(rawUrl: string) {
  const url = new URL(rawUrl);
  if (!['https:', 'http:'].includes(url.protocol)) {
    throw Object.assign(new Error('AUDIO_URL_PROTOCOL_NOT_ALLOWED'), { status: 400 });
  }

  if (!url.hostname || url.username || url.password) {
    throw Object.assign(new Error('AUDIO_URL_NOT_ALLOWED'), { status: 400 });
  }

  if (['localhost', '127.0.0.1', '0.0.0.0'].includes(url.hostname.toLowerCase())) {
    throw Object.assign(new Error('AUDIO_URL_NOT_ALLOWED'), { status: 400 });
  }

  if (isIP(url.hostname) && isPrivateIp(url.hostname)) {
    throw Object.assign(new Error('AUDIO_URL_NOT_ALLOWED'), { status: 400 });
  }

  const records = await lookup(url.hostname, { all: true, verbatim: true });
  if (!records.length || records.some((record) => isPrivateIp(record.address))) {
    throw Object.assign(new Error('AUDIO_URL_NOT_ALLOWED'), { status: 400 });
  }

  return url;
}

function isSupportedAudioContentType(contentType: string) {
  return /^audio\/(mpeg|mp3|wav|wave|x-wav|aac|mp4|m4a|ogg|webm)/i.test(contentType)
    || /^application\/octet-stream/i.test(contentType);
}

function extensionForContentType(contentType: string) {
  if (/wav|wave/i.test(contentType)) return '.wav';
  if (/aac|mp4|m4a/i.test(contentType)) return '.m4a';
  if (/ogg/i.test(contentType)) return '.ogg';
  if (/webm/i.test(contentType)) return '.webm';
  return '.mp3';
}

export async function downloadLicensedAudio(rawUrl: string): Promise<DownloadedAudio> {
  const url = await assertRemoteAudioUrlIsSafe(rawUrl);
  const response = await fetch(url, {
    redirect: 'follow',
    headers: {
      'User-Agent': 'SIX3 music license importer',
    },
  });

  if (!response.ok) {
    throw Object.assign(new Error(`REMOTE_AUDIO_DOWNLOAD_FAILED_${response.status}`), { status: 400 });
  }

  const contentType = response.headers.get('content-type')?.split(';')[0]?.trim() || 'audio/mpeg';
  if (!isSupportedAudioContentType(contentType)) {
    throw Object.assign(new Error('REMOTE_AUDIO_TYPE_NOT_ALLOWED'), { status: 400 });
  }

  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > MAX_REMOTE_AUDIO_BYTES) {
    throw Object.assign(new Error('REMOTE_AUDIO_TOO_LARGE'), { status: 413 });
  }

  const body = response.body;
  if (!body) {
    throw Object.assign(new Error('REMOTE_AUDIO_EMPTY'), { status: 400 });
  }

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > MAX_REMOTE_AUDIO_BYTES) {
      await reader.cancel().catch(() => undefined);
      throw Object.assign(new Error('REMOTE_AUDIO_TOO_LARGE'), { status: 413 });
    }
    chunks.push(value);
  }

  if (!total) {
    throw Object.assign(new Error('REMOTE_AUDIO_EMPTY'), { status: 400 });
  }

  return {
    buffer: Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)), total),
    contentType,
    fileName: `${randomUUID()}${extensionForContentType(contentType)}`,
  };
}
