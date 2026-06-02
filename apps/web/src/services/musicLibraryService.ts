import { apiRequest } from '@/services/authService';
import type {
  AppMusic,
  MusicLibraryImportInput,
  MusicLibraryProvider,
  MusicLicenseEvaluation,
  MusicLibraryProviderId,
} from '@/types';

export type MusicLicenseCheckInput = {
  providerId: MusicLibraryProviderId;
  licenseName?: string;
  licenseUrl?: string;
  attribution?: string;
  licenseProofUrl?: string;
  subscriptionConfirmed?: boolean;
};

export async function getMusicLibraries() {
  return apiRequest<{ providers: MusicLibraryProvider[]; acceptedLicenses: string[]; testMode: boolean }>('/api/music/libraries');
}

export async function checkMusicLibraryLicense(input: MusicLicenseCheckInput) {
  const { evaluation } = await apiRequest<{ evaluation: MusicLicenseEvaluation }>('/api/music/libraries/check', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return evaluation;
}

export async function importMusicLibraryTrack(input: MusicLibraryImportInput) {
  const { music, evaluation } = await apiRequest<{ music: AppMusic; evaluation: MusicLicenseEvaluation }>('/api/music/libraries/import', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return { music, evaluation };
}
