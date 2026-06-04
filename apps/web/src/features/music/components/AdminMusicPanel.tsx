import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2, Music2, Pencil, RefreshCw, Upload } from 'lucide-react';
import { uploadMusicToServer } from '@/services/serverMediaService';
import { MUSIC_CATEGORY_PROFILES, categoryProfile } from '../categoryMap';
import { energyLabel } from '../audioMix';
import { VIDEO_DURATIONS } from '../types';
import { MusicPreviewButton } from './MusicPreviewButton';
import { useMusicPreview } from '../hooks/useMusicPreview';
import {
  archiveMusic,
  createMusicTrack,
  loadMusicCatalog,
  setMusicActive,
  updateMusicTrack,
  type MusicCatalogEntry,
} from '../services/musicCatalogService';
import type { MusicCategory, MusicTrack, VideoDuration } from '../types';

const COPYRIGHT_WARNING =
  'Use apenas músicas próprias, licenciadas, royalty-free ou geradas com autorização para uso comercial.';

const CATEGORY_OPTIONS = Object.values(MUSIC_CATEGORY_PROFILES);

function blankTrack(): MusicTrack {
  const now = new Date().toISOString();
  return {
    id: '', title: '', slug: '', category: 'universal',
    mood: [], energyLevel: 5, bpm: undefined, durationOriginal: 30,
    availableCuts: [...VIDEO_DURATIONS], bestForDurations: [15, 25, 35],
    fileUrl: '', previewUrl: '', cuts: {}, licenseType: 'royalty_free_or_owned',
    source: 'internal_library', allowedCommercialUse: true, attributionRequired: false,
    tags: [], isPremium: false, isActive: true, createdAt: now, updatedAt: now,
  };
}

export function AdminMusicPanel({ ownerId }: { ownerId?: string }) {
  const [entries, setEntries] = useState<MusicCatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<MusicTrack | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const preview = useMusicPreview();

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setEntries(await loadMusicCatalog(ownerId));
    } catch {
      setError('Não foi possível carregar a biblioteca de músicas agora.');
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const onUpload = useCallback(async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const uploaded = await uploadMusicToServer(file);
      const track = blankTrack();
      track.title = file.name.replace(/\.[^.]+$/, '');
      track.fileUrl = uploaded.musicUrl || uploaded.publicUrl || '';
      track.previewUrl = track.fileUrl;
      setDraft(track);
    } catch {
      setError('Falha ao enviar o arquivo de música. Tente novamente.');
    } finally {
      setUploading(false);
    }
  }, []);

  const onSave = useCallback(async () => {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      if (draft.id) {
        await updateMusicTrack(draft.id, draft);
      } else {
        await createMusicTrack(draft);
      }
      setDraft(null);
      await refresh();
    } catch {
      setError('Não foi possível salvar os metadados da música.');
    } finally {
      setSaving(false);
    }
  }, [draft, refresh]);

  const onToggleActive = useCallback(async (entry: MusicCatalogEntry) => {
    try {
      await setMusicActive(entry.raw.id, !entry.track.isActive);
      await refresh();
    } catch {
      setError('Não foi possível atualizar o status da música.');
    }
  }, [refresh]);

  const onArchive = useCallback(async (entry: MusicCatalogEntry) => {
    try {
      await archiveMusic(entry.raw.id);
      await refresh();
    } catch {
      setError('Não foi possível arquivar a música.');
    }
  }, [refresh]);

  const sorted = useMemo(
    () => [...entries].sort((a, b) => a.track.title.localeCompare(b.track.title)),
    [entries],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-amber-300/25 bg-amber-500/[0.07] p-3 text-[12px] text-amber-100/90">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>{COPYRIGHT_WARNING}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/12 bg-white/[0.06] px-3 py-2 text-xs font-bold text-white/80 transition hover:bg-white/[0.1]">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Enviar música
          <input
            type="file"
            accept="audio/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onUpload(file);
              e.target.value = '';
            }}
          />
        </label>
        <button type="button" onClick={() => setDraft(blankTrack())} className="rounded-xl border border-white/12 bg-white/[0.06] px-3 py-2 text-xs font-bold text-white/80 transition hover:bg-white/[0.1]">
          Cadastrar sem arquivo
        </button>
        <button type="button" onClick={() => void refresh()} className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.06] px-3 py-2 text-xs font-bold text-white/70 transition hover:bg-white/[0.1]">
          <RefreshCw className="h-3.5 w-3.5" /> Atualizar
        </button>
      </div>

      {error && (
        <p className="rounded-xl border border-rose-300/25 bg-rose-500/[0.08] px-3 py-2 text-xs text-rose-100">{error}</p>
      )}

      {draft && <MusicEditor draft={draft} setDraft={setDraft} saving={saving} onSave={onSave} onCancel={() => setDraft(null)} />}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-white/50">
          <Loader2 className="h-5 w-5 animate-spin" /> Carregando biblioteca...
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-10 text-center text-white/50">
          <Music2 className="h-6 w-6" />
          <p className="text-sm font-semibold">Nenhuma música cadastrada ainda.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((entry) => (
            <div key={entry.raw.id} className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-3">
              <MusicPreviewButton track={entry.track} preview={preview} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white/90">{entry.track.title}</p>
                <p className="truncate text-[11px] text-white/45">
                  {categoryProfile(entry.track.category).label} · {energyLabel(entry.track.energyLevel)}
                  {entry.track.bpm ? ` · ${entry.track.bpm} BPM` : ''}
                  {' · '}{(entry.track.bestForDurations || []).join('/')}s
                </p>
              </div>
              {entry.track.isPremium && <span className="rounded-full border border-amber-300/25 bg-amber-500/12 px-2 py-0.5 text-[10px] font-bold text-amber-100">Premium</span>}
              <button
                type="button"
                onClick={() => void onToggleActive(entry)}
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${entry.track.isActive ? 'border border-emerald-300/25 bg-emerald-500/12 text-emerald-100' : 'border border-white/10 bg-white/[0.05] text-white/45'}`}
              >
                {entry.track.isActive ? 'Ativa' : 'Inativa'}
              </button>
              {entry.editable ? (
                <button type="button" onClick={() => setDraft(entry.track)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/12 bg-white/[0.06] text-white/70 hover:bg-white/[0.1]" aria-label="Editar">
                  <Pencil className="h-4 w-4" />
                </button>
              ) : (
                <span className="text-[10px] text-white/30">somente leitura</span>
              )}
              {entry.editable && (
                <button type="button" onClick={() => void onArchive(entry)} className="text-[10px] font-bold text-white/40 hover:text-rose-200">Arquivar</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MusicEditor({
  draft, setDraft, saving, onSave, onCancel,
}: {
  draft: MusicTrack;
  setDraft: (t: MusicTrack) => void;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  const set = (patch: Partial<MusicTrack>) => setDraft({ ...draft, ...patch });
  const inputClass = 'min-h-[40px] w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 text-sm text-white/85 focus:border-brand-300/40 focus:outline-none';
  const labelClass = 'block space-y-1 text-[11px] font-semibold text-white/55';

  const toggleDuration = (list: VideoDuration[], d: VideoDuration): VideoDuration[] =>
    list.includes(d) ? list.filter((x) => x !== d) : [...list, d].sort((a, b) => a - b);

  return (
    <div className="space-y-3 rounded-2xl border border-brand-300/25 bg-brand-500/[0.06] p-4">
      <p className="text-sm font-bold text-white/85">{draft.id ? 'Editar música' : 'Nova música'}</p>

      <label className={labelClass}>Nome
        <input className={inputClass} value={draft.title} onChange={(e) => set({ title: e.target.value })} />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className={labelClass}>Categoria
          <select className={inputClass} value={draft.category} onChange={(e) => set({ category: e.target.value as MusicCategory })}>
            {CATEGORY_OPTIONS.map((c) => <option key={c.category} value={c.category}>{c.label}</option>)}
          </select>
        </label>
        <label className={labelClass}>Subcategoria
          <input className={inputClass} value={draft.subcategory || ''} onChange={(e) => set({ subcategory: e.target.value })} />
        </label>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <label className={labelClass}>Energia (1-10)
          <input type="number" min={1} max={10} className={inputClass} value={draft.energyLevel} onChange={(e) => set({ energyLevel: Math.min(10, Math.max(1, Number(e.target.value))) })} />
        </label>
        <label className={labelClass}>Ritmo (BPM)
          <input type="number" className={inputClass} value={draft.bpm ?? ''} onChange={(e) => set({ bpm: e.target.value ? Number(e.target.value) : undefined })} />
        </label>
        <label className={labelClass}>Duração original (s)
          <input type="number" className={inputClass} value={draft.durationOriginal} onChange={(e) => set({ durationOriginal: Number(e.target.value) })} />
        </label>
      </div>

      <label className={labelClass}>URL do arquivo
        <input className={inputClass} value={draft.fileUrl} placeholder="https://.../music/originals/..." onChange={(e) => set({ fileUrl: e.target.value, previewUrl: draft.previewUrl || e.target.value })} />
      </label>

      <div className="space-y-1">
        <p className="text-[11px] font-semibold text-white/55">Melhores durações</p>
        <div className="flex flex-wrap gap-1.5">
          {VIDEO_DURATIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => set({ bestForDurations: toggleDuration(draft.bestForDurations, d) })}
              className={`min-h-[36px] rounded-full px-3 text-xs font-bold ${draft.bestForDurations.includes(d) ? 'border border-brand-300/40 bg-brand-500/20 text-brand-100' : 'border border-white/10 bg-white/[0.04] text-white/50'}`}
            >
              {d}s
            </button>
          ))}
        </div>
      </div>

      <label className={labelClass}>Tags (separadas por vírgula)
        <input className={inputClass} value={(draft.tags || []).join(', ')} onChange={(e) => set({ tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })} />
      </label>

      <label className={labelClass}>Tipo de licença
        <input className={inputClass} value={draft.licenseType} onChange={(e) => set({ licenseType: e.target.value as MusicTrack['licenseType'] })} />
      </label>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-xs font-semibold text-white/70">
          <input type="checkbox" checked={draft.isPremium} onChange={(e) => set({ isPremium: e.target.checked })} /> Premium
        </label>
        <label className="flex items-center gap-2 text-xs font-semibold text-white/70">
          <input type="checkbox" checked={draft.isActive} onChange={(e) => set({ isActive: e.target.checked })} /> Ativa
        </label>
        <label className="flex items-center gap-2 text-xs font-semibold text-white/70">
          <input type="checkbox" checked={draft.allowedCommercialUse} onChange={(e) => set({ allowedCommercialUse: e.target.checked })} /> Uso comercial
        </label>
      </div>

      <div className="flex gap-2 pt-1">
        <button type="button" disabled={saving || !draft.title.trim()} onClick={onSave} className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500/90 px-4 py-2 text-xs font-bold text-white transition hover:bg-brand-500 disabled:opacity-40">
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Salvar
        </button>
        <button type="button" onClick={onCancel} className="rounded-xl border border-white/12 bg-white/[0.06] px-4 py-2 text-xs font-bold text-white/70 hover:bg-white/[0.1]">Cancelar</button>
      </div>
    </div>
  );
}
