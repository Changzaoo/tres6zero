/**
 * Mensagens amigáveis (pt-BR) para estados de erro do sistema de música.
 * Nunca expor termos técnicos ao usuário final.
 */
export type MusicErrorCode =
  | 'MUSIC_UNAVAILABLE'
  | 'FILE_NOT_FOUND'
  | 'PREVIEW_FAILED'
  | 'APPLY_FAILED'
  | 'CUT_FAILED'
  | 'PREMIUM_REQUIRED'
  | 'CATEGORY_EMPTY'
  | 'DURATION_UNAVAILABLE'
  | 'STORAGE_DOWN'
  | 'RENDER_NO_AUDIO'
  | 'FALLBACK_APPLIED';

export const MUSIC_ERROR_MESSAGES: Record<MusicErrorCode, string> = {
  MUSIC_UNAVAILABLE: 'Esta música não está disponível agora. Escolha outra opção.',
  FILE_NOT_FOUND: 'Não encontramos o arquivo desta música. Tente outra.',
  PREVIEW_FAILED: 'Não foi possível carregar a prévia agora. Tente outra música.',
  APPLY_FAILED: 'Não conseguimos aplicar a música. Tente novamente em instantes.',
  CUT_FAILED: 'Não foi possível preparar a música nesta duração. Use outra opção.',
  PREMIUM_REQUIRED: 'Esta música é premium. Escolha outra ou atualize seu plano.',
  CATEGORY_EMPTY: 'Não encontramos uma música ideal para esta moldura. Aplicamos uma opção universal.',
  DURATION_UNAVAILABLE: 'Esta duração ainda não tem corte pronto. Vamos ajustar a música automaticamente.',
  STORAGE_DOWN: 'Nossa biblioteca de músicas está indisponível no momento. Tente novamente em breve.',
  RENDER_NO_AUDIO: 'Seu vídeo foi criado sem música porque o arquivo não estava disponível.',
  FALLBACK_APPLIED: 'Aplicamos uma música universal que combina com seu vídeo.',
};

export function musicErrorMessage(code: MusicErrorCode): string {
  return MUSIC_ERROR_MESSAGES[code] ?? 'Algo deu errado com a música. Tente novamente.';
}
