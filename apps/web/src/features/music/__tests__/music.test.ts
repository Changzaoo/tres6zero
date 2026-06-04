import { describe, expect, it } from 'vitest';
import { recommendMusic, rankTracks, scoreTrack } from '../recommendation';
import { planMusicClip, musicGainAt, normalizationFactor, applyMixMode, DEFAULT_MIX_SETTINGS } from '../audioMix';
import { appMusicToTrack, trackToAppMusicFields } from '../adapters';
import { musicCategoryForTemplate } from '../categoryMap';
import { MUSIC_SEED } from '../seed';
import type { MusicTrack, RecommendationContext } from '../types';
import type { AppMusic } from '@/types';

function track(partial: Partial<MusicTrack>): MusicTrack {
  return {
    id: 'id', title: 'Faixa', slug: 'faixa', category: 'aniversario', mood: ['alegre'],
    energyLevel: 8, durationOriginal: 30, availableCuts: [5, 15, 25, 35, 45],
    bestForDurations: [15, 25], fileUrl: 'https://x/a.mp3', licenseType: 'royalty_free_or_owned',
    source: 'internal_library', allowedCommercialUse: true, attributionRequired: false,
    tags: ['birthday'], isPremium: false, isActive: true, createdAt: '', updatedAt: '',
    ...partial,
  };
}

const baseCtx: RecommendationContext = { category: 'aniversario', duration: 15 };

describe('recommendMusic', () => {
  it('recomenda faixa da mesma categoria', () => {
    const tracks = [track({ id: 'a', category: 'casamento' }), track({ id: 'b', category: 'aniversario' })];
    const result = recommendMusic(tracks, baseCtx);
    expect(result?.track.id).toBe('b');
    expect(result?.isFallback).toBe(false);
  });

  it('prioriza faixa ideal para a duração', () => {
    const tracks = [
      track({ id: 'curta', bestForDurations: [5] }),
      track({ id: 'ideal', bestForDurations: [15] }),
    ];
    const result = recommendMusic(tracks, baseCtx);
    expect(result?.track.id).toBe('ideal');
  });

  it('cai em fallback universal quando a categoria não tem música', () => {
    const tracks = [track({ id: 'u', category: 'universal', tags: ['universal'] })];
    const result = recommendMusic(tracks, { category: 'gamer', duration: 15 });
    expect(result?.track.id).toBe('u');
    expect(result?.isFallback).toBe(true);
  });

  it('retorna null quando não há nenhuma faixa usável', () => {
    expect(recommendMusic([], baseCtx)).toBeNull();
  });
});

describe('rankTracks / filtros de elegibilidade', () => {
  it('esconde faixas inativas do usuário final', () => {
    const tracks = [track({ id: 'on' }), track({ id: 'off', isActive: false })];
    const ids = rankTracks(tracks, baseCtx).map((r) => r.track.id);
    expect(ids).toContain('on');
    expect(ids).not.toContain('off');
  });

  it('bloqueia faixa premium para usuário sem plano', () => {
    const tracks = [track({ id: 'free' }), track({ id: 'prem', isPremium: true })];
    const free = rankTracks(tracks, { ...baseCtx, userHasPremium: false }).map((r) => r.track.id);
    expect(free).not.toContain('prem');
    const paid = rankTracks(tracks, { ...baseCtx, userHasPremium: true }).map((r) => r.track.id);
    expect(paid).toContain('prem');
  });

  it('score soma categoria + duração', () => {
    const { score } = scoreTrack(track({}), baseCtx);
    expect(score).toBeGreaterThanOrEqual(50 + 30);
  });
});

describe('planMusicClip', () => {
  it('nunca toca além da duração do vídeo', () => {
    const plan = planMusicClip({ durationOriginal: 60, targetDuration: 15 });
    expect(plan.playDuration).toBe(15);
    expect(plan.sourceEnd - plan.sourceStart).toBeLessThanOrEqual(15 + 0.001);
    expect(plan.loop).toBe(false);
  });

  it('faz loop quando a faixa é menor que o vídeo', () => {
    const plan = planMusicClip({ durationOriginal: 12, targetDuration: 45 });
    expect(plan.loop).toBe(true);
    expect(plan.playDuration).toBe(45);
  });

  it('fade-out nunca passa de metade do vídeo', () => {
    const plan = planMusicClip({ durationOriginal: 60, targetDuration: 5, fadeOutSeconds: 999 });
    expect(plan.fadeOutSeconds).toBeLessThanOrEqual(2.5);
  });
});

describe('mixagem de áudio', () => {
  it('respeita o volume base no meio da faixa', () => {
    const plan = planMusicClip({ durationOriginal: 30, targetDuration: 15, fadeInSeconds: 1, fadeOutSeconds: 1 });
    expect(musicGainAt(7.5, plan, 0.8)).toBeCloseTo(0.8, 2);
    expect(musicGainAt(0, plan, 0.8)).toBe(0);
  });

  it('normaliza para evitar clipping quando soma passa de 1', () => {
    expect(normalizationFactor(0.8, 0.8)).toBeCloseTo(1 / 1.6, 5);
    expect(normalizationFactor(0.3, 0.3)).toBe(1);
  });

  it('applyMixMode troca os volumes pelo preset', () => {
    const muted = applyMixMode(DEFAULT_MIX_SETTINGS, 'music_only');
    expect(muted.originalVolume).toBe(0);
  });
});

describe('adapters AppMusic <-> MusicTrack', () => {
  const appMusic: AppMusic = {
    id: 'm1', name: 'Trilha Teste', category: 'birthday', musicUrl: 'https://x/m.mp3',
    isGlobal: true, isActive: true, createdAt: '', updatedAt: '', energyLevel: 7,
    bestForDurations: [15, 25], tags: ['birthday'], isPremium: false,
  };

  it('converte e infere categoria musical', () => {
    const t = appMusicToTrack(appMusic);
    expect(t.fileUrl).toBe('https://x/m.mp3');
    expect(t.category).toBe(musicCategoryForTemplate('birthday'));
    expect(t.energyLevel).toBe(7);
  });

  it('round-trip preserva campos chave', () => {
    const t = appMusicToTrack(appMusic);
    const fields = trackToAppMusicFields(t);
    expect(fields.musicUrl).toBe('https://x/m.mp3');
    expect(fields.energyLevel).toBe(7);
    expect(fields.bestForDurations).toEqual([15, 25]);
  });
});

describe('seed', () => {
  it('cobre todas as categorias com faixas ativas', () => {
    expect(MUSIC_SEED.length).toBeGreaterThan(100);
    expect(MUSIC_SEED.every((t) => t.isActive)).toBe(true);
    expect(MUSIC_SEED.some((t) => t.category === 'universal')).toBe(true);
  });
});
