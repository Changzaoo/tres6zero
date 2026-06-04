import { useEffect, useMemo, useState, type ChangeEvent, type Dispatch, type SetStateAction } from 'react';
import { AlertTriangle, CheckCircle2, Database, ExternalLink, FileAudio, Layers, Library, Lock, Music2, Search, ShieldCheck, SlidersHorizontal, Star, Upload, Wand2, X, Zap } from 'lucide-react';
import { getTemplates, createTemplate } from '@/services/templateService';
import { createMusic, getUserMusic } from '@/services/musicService';
import { getGeneratedMusic, seedCuratedTemplates, uploadMusicToServer, uploadTemplateToServer } from '@/services/serverMediaService';
import { buildSunoPrompt, describeSunoStatus, generateSunoMusic, waitForSunoMusic, type SunoMusicMode } from '@/services/sunoMusicService';
import { checkMusicLibraryLicense, getMusicLibraries, importMusicLibraryTrack } from '@/services/musicLibraryService';
import { favoriteSet, getMediaFavorites, isMediaFavorite, sortFavoritesFirst, subscribeMediaFavorites, toggleMediaFavorite, type MediaFavorites } from '@/services/mediaFavorites';
import { canUseTransparentMotionOverlay } from '@/services/browserVideoRenderer';
import { TemplateOverlayRenderer } from '@/components/templates/TemplateOverlayRenderer';
import { isTemplateAnimated } from '@/services/templateStorage';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { BrandWordmark } from '@/components/brand/BrandLogo';
import { toast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { hasFeature } from '@/config/plans';
import { canUseTemplateForPlan } from '@/services/templateAccess';
import type { AppMusic, AppTemplate, MusicLibraryProvider, MusicLibraryProviderId, MusicLicenseEvaluation, MusicLicenseStatus } from '@/types';

const INITIAL_TEMPLATE_COUNT = 32;
const TEMPLATE_BATCH_SIZE = 32;

const categoryOptions = [
  { value: 'all', label: 'Todas' },
  { value: 'brilhos_estrelas', label: 'Brilhos e estrelas' },
  { value: 'confetes_festa', label: 'Confetes e festa' },
  { value: 'neon_glow', label: 'Neon e glow' },
  { value: 'circulos_animados', label: 'Circulos animados' },
  { value: 'setas_chamadas', label: 'Setas e chamadas' },
  { value: 'emojis_reacoes', label: 'Emojis e reacoes' },
  { value: 'elementos_festivos', label: 'Elementos festivos' },
  { value: 'cards_faixas', label: 'Cards e faixas' },
  { value: 'tech_futurista', label: 'Tech e futurista' },
  { value: 'cubos_isometricos', label: 'Cubos e isometricos' },
  { value: 'flores_decorativos', label: 'Flores e decorativos' },
  { value: 'minimal_premium', label: 'Minimal' },
  { value: 'birthday', label: 'Aniversario' },
  { value: 'wedding', label: 'Casamento' },
  { value: 'corporate', label: 'Corporativo' },
  { value: 'gamer_neon', label: 'Gamer / neon' },
  { value: 'tropical', label: 'Tropical' },
  { value: 'booth_360', label: '360 Booth' },
  { value: 'graduation', label: 'Formatura' },
  { value: 'party', label: 'Balada / Festa' },
  { value: 'store', label: 'Loja / Inauguracao' },
  { value: 'church', label: 'Igreja' },
  { value: 'premium', label: 'Luxo' },
  { value: 'infantil', label: 'Infantil' },
  { value: 'esportivo', label: 'Esportivo' },
  { value: 'natal', label: 'Natal / Ano Novo' },
  { value: 'carnaval', label: 'Carnaval' },
  { value: 'cha_revelacao', label: 'Cha Revelacao' },
  { value: 'halloween', label: 'Halloween' },
  { value: 'viral', label: 'Viral' },
];

const aspectOptions = [
  { value: 'all', label: 'Todos formatos' },
  { value: '9:16', label: 'Retrato' },
  { value: '16:9', label: 'Paisagem' },
  { value: '1:1', label: 'Quadrado' },
];

const sourceOptions = [
  { value: 'all', label: 'Todas origens' },
  { value: 'generated', label: 'SIX3' },
  { value: 'custom', label: 'Enviados' },
  { value: 'default', label: 'Padrão' },
];

const musicCategoryOptions: { value: AppMusic['category']; label: string }[] = [
  { value: 'ambient', label: 'Ambiente' },
  { value: 'party', label: 'Festa' },
  { value: 'wedding', label: 'Casamento' },
  { value: 'corporate', label: 'Corporativo' },
  { value: 'birthday', label: 'Aniversario' },
  { value: 'graduation', label: 'Formatura' },
  { value: 'store', label: 'Loja' },
  { value: 'church', label: 'Igreja' },
  { value: 'viral', label: 'Viral' },
  { value: 'premium', label: 'Luxo' },
];

type LibrarySection = 'frames' | 'music' | 'libraries' | 'ai';

const musicCategoryFilterOptions: { value: 'all' | AppMusic['category']; label: string }[] = [
  { value: 'all', label: 'Todas' },
  ...musicCategoryOptions,
];

const licenseStatusLabels: Record<MusicLicenseStatus, string> = {
  allowed: 'Liberada',
  requires_attribution: 'Crédito obrigatório',
  requires_subscription: 'Assinatura comprovada',
  test_only: 'Somente teste',
  manual_review: 'Revisão manual',
  blocked: 'Bloqueada',
};

const licenseStatusClass: Record<MusicLicenseStatus, string> = {
  allowed: 'border-emerald-300/25 bg-emerald-500/12 text-emerald-100',
  requires_attribution: 'border-cyan-300/25 bg-cyan-500/12 text-cyan-100',
  requires_subscription: 'border-brand-300/25 bg-brand-500/12 text-brand-100',
  test_only: 'border-amber-300/25 bg-amber-500/12 text-amber-100',
  manual_review: 'border-amber-300/25 bg-amber-500/12 text-amber-100',
  blocked: 'border-red-300/25 bg-red-500/12 text-red-100',
};

function templateAspectRatio(aspectRatio: AppTemplate['aspectRatio']) {
  if (aspectRatio === '16:9') return '16 / 9';
  if (aspectRatio === '1:1') return '1 / 1';
  if (aspectRatio === 'auto') return '9 / 16';
  return '9 / 16';
}

function isLegacyGenericTemplate(template: AppTemplate) {
  return template.source === 'default' || template.id.startsWith('default-');
}

function mergeTemplates(templates: AppTemplate[]) {
  const byId = new Map<string, AppTemplate>();
  templates
    .filter((template) => !isLegacyGenericTemplate(template))
    .forEach((template) => byId.set(template.id, template));
  return Array.from(byId.values());
}

function mergeMusic(tracks: AppMusic[]) {
  const byId = new Map<string, AppMusic>();
  tracks
    .filter((track) => track.isActive !== false && Boolean(track.musicUrl))
    .forEach((track) => byId.set(track.id, track));
  return Array.from(byId.values());
}

function searchableTemplateText(template: AppTemplate) {
  return [
    template.name,
    template.category,
    template.aspectRatio,
    template.source,
    template.font,
    template.layout,
    template.variantName,
    template.designId,
    template.type,
    template.templateType,
    template.format,
    template.assetFormat,
    template.layerMode,
    ...(template.effects || []),
    ...(template.tags || []),
  ].filter(Boolean).join(' ').toLowerCase();
}

type LibraryMusicForm = {
  name: string;
  artist: string;
  category: AppMusic['category'];
  theme: string;
  bpm: string;
  duration: string;
  audioUrl: string;
  pageUrl: string;
  providerTrackId: string;
  licenseName: string;
  licenseUrl: string;
  attribution: string;
  licenseProofUrl: string;
  subscriptionConfirmed: boolean;
};

function initialLibraryMusicForm(provider?: MusicLibraryProvider): LibraryMusicForm {
  return {
    name: '',
    artist: '',
    category: 'ambient',
    theme: '',
    bpm: '',
    duration: '',
    audioUrl: '',
    pageUrl: '',
    providerTrackId: '',
    licenseName: provider?.defaultLicenseName || '',
    licenseUrl: provider?.licenseUrl || '',
    attribution: '',
    licenseProofUrl: '',
    subscriptionConfirmed: false,
  };
}

async function loadCatalog(userId?: string) {
  const [templateResult, customMusicResult, generatedMusicResult] = await Promise.allSettled([
    getTemplates(userId),
    userId ? getUserMusic(userId) : Promise.resolve([] as AppMusic[]),
    getGeneratedMusic(),
  ]);

  const customMusic = customMusicResult.status === 'fulfilled' ? customMusicResult.value : [];
  const generatedMusic = generatedMusicResult.status === 'fulfilled'
    ? generatedMusicResult.value.map((track) => ({ ...track, source: track.source || 'generated' as const }))
    : [];

  return {
    templates: templateResult.status === 'fulfilled' ? templateResult.value : [],
    music: mergeMusic([...customMusic, ...generatedMusic]),
    templateError: templateResult.status === 'rejected' ? templateResult.reason : null,
    musicError: customMusicResult.status === 'rejected' || generatedMusicResult.status === 'rejected'
      ? customMusicResult.status === 'rejected' ? customMusicResult.reason : generatedMusicResult.status === 'rejected' ? generatedMusicResult.reason : null
      : null,
  };
}

function TemplateCard({
  template,
  activeMotionId,
  setActiveMotionId,
  isFavorite,
  onToggleFavorite,
}: {
  template: AppTemplate;
  activeMotionId: string | null;
  setActiveMotionId: Dispatch<SetStateAction<string | null>>;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
}) {
  const primary = template.colors?.primary || '#7c3aed';
  const secondary = template.colors?.secondary || '#00d4ff';
  const motionVideoUrl = template.animationUrl && /\.(webm|mp4|mov)(\?|$)/i.test(template.animationUrl) ? template.animationUrl : '';
  const isMotionActive = Boolean(motionVideoUrl && activeMotionId === template.id && canUseTransparentMotionOverlay());
  const animated = isTemplateAnimated(template);

  return (
    <div
      className="group cursor-pointer animate-fade-in"
      onMouseEnter={() => template.animationUrl && setActiveMotionId(template.id)}
      onMouseLeave={() => template.animationUrl && setActiveMotionId(null)}
      onTouchStart={() => template.animationUrl && setActiveMotionId((current) => current === template.id ? null : template.id)}
    >
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] transition-all hover:border-brand-500/30">
        <div
          className="relative flex max-h-56 items-center justify-center overflow-hidden"
          style={{ aspectRatio: templateAspectRatio(template.aspectRatio), background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
        >
          <BrandWordmark className="text-3xl drop-shadow-lg" />
          {isMotionActive && motionVideoUrl ? (
            <video
              src={motionVideoUrl}
              className="absolute inset-0 h-full w-full object-contain"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
            />
          ) : (
            <TemplateOverlayRenderer template={template} preferPreview />
          )}
          <div className="absolute left-2 top-2 flex flex-wrap gap-1">
            <span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase backdrop-blur-md ${animated ? 'border-cyan-300/25 bg-cyan-500/16 text-cyan-100' : 'border-white/15 bg-black/35 text-white/75'}`}>
              {animated ? 'Animado' : 'Estático'}
            </span>
          </div>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggleFavorite(template.id);
            }}
            title={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            aria-label={isFavorite ? 'Remover template dos favoritos' : 'Favoritar template'}
            className={`absolute right-2 top-2 z-10 grid h-9 w-9 place-items-center rounded-full border backdrop-blur-md transition-all ${
              isFavorite
                ? 'border-amber-200/45 bg-amber-400/20 text-amber-100 shadow-[0_0_18px_rgba(251,191,36,0.22)]'
                : 'border-white/12 bg-black/35 text-white/45 hover:border-amber-200/35 hover:text-amber-100'
            }`}
          >
            <Star className="h-4 w-4" fill={isFavorite ? 'currentColor' : 'none'} />
          </button>
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
            <span className="rounded-full bg-black/45 px-3 py-1.5 text-xs font-medium text-white">Usar template</span>
          </div>
        </div>
        <div className="bg-surface-50 p-3">
          <p className="truncate text-sm font-semibold text-white">{template.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <Badge variant="purple">{template.category}</Badge>
            <span className="text-xs text-white/30">{template.aspectRatio}</span>
            {template.variantName && <span className="text-xs text-white/35">{template.variantName}</span>}
            {animated && <span className="text-xs text-cyan-200/80">animado</span>}
            {template.source && <span className="text-xs text-white/30">{template.source}</span>}
          </div>
          {template.layout && (
            <p className="mt-1 truncate text-xs capitalize text-white/35">{template.layout.replace(/_/g, ' ')}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-1">
            {(template.effects || []).slice(0, 2).map(effect => (
              <span key={effect} className="flex items-center gap-0.5 text-xs text-white/40">
                <Zap className="h-2.5 w-2.5" />{effect}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  const { user, isAdmin } = useAuth();
  const [templates, setTemplates] = useState<AppTemplate[]>([]);
  const [music, setMusic] = useState<AppMusic[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<LibrarySection>('frames');
  const [uploading, setUploading] = useState(false);
  const [uploadingMusic, setUploadingMusic] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedStatus, setSeedStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [musicProgress, setMusicProgress] = useState(0);
  const [visibleCount, setVisibleCount] = useState(INITIAL_TEMPLATE_COUNT);
  const [activeMotionId, setActiveMotionId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [musicCategoryFilter, setMusicCategoryFilter] = useState<'all' | AppMusic['category']>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [aspectFilter, setAspectFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState<MediaFavorites>(() => getMediaFavorites(user?.uid));
  const [motionOnly, setMotionOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sunoOpen, setSunoOpen] = useState(false);
  const [sunoMode, setSunoMode] = useState<SunoMusicMode>('instrumental');
  const [sunoPrompt, setSunoPrompt] = useState('');
  const [sunoTitle, setSunoTitle] = useState('');
  const [sunoStyle, setSunoStyle] = useState('');
  const [sunoLyrics, setSunoLyrics] = useState('');
  const [sunoPreviewPrompt, setSunoPreviewPrompt] = useState('');
  const [sunoTaskId, setSunoTaskId] = useState('');
  const [sunoStatus, setSunoStatus] = useState('');
  const [sunoGenerating, setSunoGenerating] = useState(false);
  const [librariesOpen, setLibrariesOpen] = useState(false);
  const [librariesLoading, setLibrariesLoading] = useState(false);
  const [libraryProviders, setLibraryProviders] = useState<MusicLibraryProvider[]>([]);
  const [acceptedLicenses, setAcceptedLicenses] = useState<string[]>([]);
  const [libraryTestMode, setLibraryTestMode] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState<MusicLibraryProviderId>('pixabay_music');
  const [libraryForm, setLibraryForm] = useState<LibraryMusicForm>(() => initialLibraryMusicForm());
  const [licenseEvaluation, setLicenseEvaluation] = useState<MusicLicenseEvaluation | null>(null);
  const [checkingLicense, setCheckingLicense] = useState(false);
  const [importingLibraryMusic, setImportingLibraryMusic] = useState(false);

  const canUpload = useMemo(
    () => isAdmin || hasFeature(user?.planId, 'custom_template_upload', isAdmin),
    [isAdmin, user?.planId]
  );
  const canGenerateSuno = useMemo(
    () => isAdmin || hasFeature(user?.planId, 'ai_auto_edit', isAdmin),
    [isAdmin, user?.planId]
  );
  const canUseAnimatedTemplates = useMemo(
    () => isAdmin || hasFeature(user?.planId, 'premium_templates', isAdmin),
    [isAdmin, user?.planId]
  );
  const selectedProvider = useMemo(
    () => libraryProviders.find((provider) => provider.id === selectedProviderId),
    [libraryProviders, selectedProviderId]
  );
  const favoriteTemplateIds = useMemo(() => favoriteSet(favorites.templates), [favorites.templates]);
  const favoriteMusicIds = useMemo(() => favoriteSet(favorites.music), [favorites.music]);
  const availableTemplates = useMemo(
    () => templates.filter((template) => canUseTemplateForPlan(template, user?.planId, isAdmin)),
    [isAdmin, templates, user?.planId]
  );
  const filteredTemplates = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const filtered = availableTemplates.filter((template) => {
      const animated = isTemplateAnimated(template);
      if (query && !searchableTemplateText(template).includes(query)) return false;
      if (categoryFilter !== 'all' && template.category !== categoryFilter) return false;
      if (aspectFilter !== 'all' && template.aspectRatio !== aspectFilter) return false;
      if (sourceFilter !== 'all' && (template.source || 'generated') !== sourceFilter) return false;
      if (typeFilter === 'static' && animated) return false;
      if (typeFilter === 'animated' && !animated) return false;
      if (favoritesOnly && !favoriteTemplateIds.has(template.id)) return false;
      if (motionOnly && !animated) return false;
      return true;
    });
    return sortFavoritesFirst(filtered, favoriteTemplateIds);
  }, [aspectFilter, availableTemplates, categoryFilter, favoriteTemplateIds, favoritesOnly, motionOnly, searchTerm, sourceFilter, typeFilter]);
  const sortedMusic = useMemo(
    () => sortFavoritesFirst(music, favoriteMusicIds),
    [favoriteMusicIds, music]
  );
  const filteredMusic = useMemo(
    () => sortedMusic.filter((track) => musicCategoryFilter === 'all' || track.category === musicCategoryFilter),
    [musicCategoryFilter, sortedMusic]
  );
  const visibleTemplates = useMemo(
    () => filteredTemplates.slice(0, visibleCount),
    [filteredTemplates, visibleCount]
  );
  const sectionTabs = useMemo(() => [
    { id: 'frames' as const, label: 'Molduras', count: availableTemplates.length, icon: <Layers className="h-4 w-4" /> },
    { id: 'music' as const, label: 'Músicas', count: music.length, icon: <Music2 className="h-4 w-4" /> },
    { id: 'libraries' as const, label: 'Bibliotecas', count: undefined, icon: <Library className="h-4 w-4" /> },
    { id: 'ai' as const, label: 'IA', count: undefined, icon: <Wand2 className="h-4 w-4" /> },
  ], [availableTemplates.length, music.length]);
  const hasMoreTemplates = visibleCount < filteredTemplates.length;
  const hasActiveFilters = Boolean(searchTerm.trim())
    || categoryFilter !== 'all'
    || aspectFilter !== 'all'
    || sourceFilter !== 'all'
    || typeFilter !== 'all'
    || favoritesOnly
    || motionOnly;

  useEffect(() => {
    setFavorites(getMediaFavorites(user?.uid));
    return subscribeMediaFavorites(() => {
      setFavorites(getMediaFavorites(user?.uid));
    });
  }, [user?.uid]);

  useEffect(() => {
    let active = true;
    setLoading(true);

    loadCatalog(user?.uid)
      .then(({ templates: loadedTemplates, music: loadedMusic, templateError, musicError }) => {
        if (!active) return;
        if (templateError) {
          console.warn('[templates] Catalog load failed:', templateError);
          toast.error('Não foi possível carregar o catálogo de templates.');
        }
        if (musicError) {
          console.warn('[templates] Custom music unavailable:', musicError);
        }
        setTemplates(mergeTemplates(loadedTemplates));
        setMusic(loadedMusic);
        setVisibleCount(INITIAL_TEMPLATE_COUNT);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user?.uid]);

  useEffect(() => {
    setVisibleCount(INITIAL_TEMPLATE_COUNT);
  }, [aspectFilter, categoryFilter, favoritesOnly, motionOnly, searchTerm, sourceFilter, typeFilter]);

  useEffect(() => {
    if (canUseAnimatedTemplates) return;
    if (typeFilter === 'animated') setTypeFilter('all');
    if (motionOnly) setMotionOnly(false);
  }, [canUseAnimatedTemplates, motionOnly, typeFilter]);

  useEffect(() => {
    if ((activeSection !== 'libraries' && !librariesOpen) || libraryProviders.length > 0) return;

    let active = true;
    setLibrariesLoading(true);
    getMusicLibraries()
      .then(({ providers, acceptedLicenses, testMode }) => {
        if (!active) return;
        setLibraryProviders(providers);
        setAcceptedLicenses(acceptedLicenses);
        setLibraryTestMode(testMode);
        const preferred = providers.find((provider) => provider.id === selectedProviderId) || providers[0];
        if (preferred) {
          setSelectedProviderId(preferred.id);
          setLibraryForm((current) => ({
            ...current,
            licenseName: current.licenseName || preferred.defaultLicenseName,
            licenseUrl: current.licenseUrl || preferred.licenseUrl,
          }));
        }
      })
      .catch((error) => {
        console.warn('[music libraries] load failed:', error);
        toast.error('Não foi possível carregar as bibliotecas musicais.');
      })
      .finally(() => {
        if (active) setLibrariesLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activeSection, librariesOpen, libraryProviders.length, selectedProviderId]);

  function selectLibraryProvider(provider: MusicLibraryProvider) {
    setSelectedProviderId(provider.id);
    setLibraryForm((current) => ({
      ...current,
      licenseName: provider.defaultLicenseName,
      licenseUrl: provider.licenseUrl,
      licenseProofUrl: provider.requiresLicenseProof ? current.licenseProofUrl : '',
      subscriptionConfirmed: false,
    }));
    setLicenseEvaluation(null);
  }

  function updateLibraryForm<K extends keyof LibraryMusicForm>(key: K, value: LibraryMusicForm[K]) {
    setLibraryForm((current) => ({ ...current, [key]: value }));
    setLicenseEvaluation(null);
  }

  function clearFilters() {
    setSearchTerm('');
    setCategoryFilter('all');
    setAspectFilter('all');
    setSourceFilter('all');
    setTypeFilter('all');
    setFavoritesOnly(false);
    setMotionOnly(false);
  }

  function handleToggleTemplateFavorite(id: string) {
    const next = toggleMediaFavorite('template', id, user?.uid);
    setFavorites(next);
    toast.success(isMediaFavorite('template', id, next) ? 'Template favoritado.' : 'Template removido dos favoritos.');
  }

  function handleToggleMusicFavorite(id: string) {
    const next = toggleMediaFavorite('music', id, user?.uid);
    setFavorites(next);
    toast.success(isMediaFavorite('music', id, next) ? 'Música favoritada.' : 'Música removida dos favoritos.');
  }

  async function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user) return;
    if (!canUpload) {
      toast.error('Seu plano não libera upload de template personalizado.');
      return;
    }

    setUploading(true);
    setProgress(0);
    try {
      const uploaded = await uploadTemplateToServer(file, setProgress);
      const isAnimated = uploaded.mimetype === 'video/webm' || uploaded.mimetype === 'image/gif';
      const assetFormat = uploaded.mimetype === 'video/webm'
        ? 'webm'
        : uploaded.mimetype === 'image/gif'
          ? 'gif'
          : uploaded.mimetype === 'image/webp'
            ? 'webp'
            : uploaded.mimetype === 'image/svg+xml'
              ? 'svg'
              : 'png';
      const template = await createTemplate({
        name: file.name.replace(/\.[^.]+$/, '') || 'Template personalizado',
        category: 'premium',
        colors: { primary: '#7c3aed', secondary: '#00d4ff' },
        font: 'Inter',
        overlayUrl: isAnimated ? undefined : uploaded.publicUrl || uploaded.templateUrl,
        animationUrl: isAnimated ? uploaded.publicUrl || uploaded.templateUrl : undefined,
        storagePath: uploaded.storagePath,
        animationStoragePath: isAnimated ? uploaded.storagePath : undefined,
        templateType: isAnimated ? 'animated' : 'static',
        type: isAnimated ? 'animated' : 'static',
        assetFormat,
        format: assetFormat,
        isPremium: true,
        layerMode: 'frame',
        opacityDefault: 1,
        ownerId: user.uid,
        source: 'custom',
        aspectRatio: '9:16',
        effects: isAnimated ? ['motion_overlay', 'cinematic'] : ['clean', 'cinematic'],
        isGlobal: false,
        isActive: true,
      });
      setTemplates((current) => mergeTemplates([template, ...current]));
      setVisibleCount((current) => Math.max(current, INITIAL_TEMPLATE_COUNT));
      toast.success('Template enviado com sucesso.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar template.');
    } finally {
      setUploading(false);
    }
  }

  async function handleMusicUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user) return;
    if (!canUpload) {
      toast.error('Seu plano não libera upload de música personalizada.');
      return;
    }

    setUploadingMusic(true);
    setMusicProgress(0);
    try {
      const uploaded = await uploadMusicToServer(file, setMusicProgress);
      const track = await createMusic({
        name: file.name.replace(/\.[^.]+$/, '') || 'Música personalizada',
        category: 'ambient',
        musicUrl: uploaded.publicUrl || uploaded.musicUrl,
        storagePath: uploaded.storagePath,
        ownerId: user.uid,
        source: 'custom',
        isGlobal: false,
        isActive: true,
      });
      setMusic((current) => [track, ...current]);
      toast.success('Música enviada com sucesso.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar música.');
    } finally {
      setUploadingMusic(false);
    }
  }

  function libraryLicensePayload() {
    return {
      providerId: selectedProviderId,
      licenseName: libraryForm.licenseName || selectedProvider?.defaultLicenseName,
      licenseUrl: libraryForm.licenseUrl || selectedProvider?.licenseUrl,
      attribution: libraryForm.attribution || undefined,
      licenseProofUrl: libraryForm.licenseProofUrl || undefined,
      subscriptionConfirmed: libraryForm.subscriptionConfirmed,
    };
  }

  async function handleCheckLibraryLicense() {
    if (!canUpload) {
      toast.error('Bibliotecas externas ficam liberadas nos planos Profissional e Ilimitado.');
      return;
    }

    setCheckingLicense(true);
    try {
      const evaluation = await checkMusicLibraryLicense(libraryLicensePayload());
      setLicenseEvaluation(evaluation);
      if (evaluation.status === 'test_only') {
        toast.success('Modo teste ativo: a trilha pode ser importada como rascunho interno.');
      } else if (evaluation.status === 'blocked') {
        toast.error('Licença bloqueada para uso seguro no SIX3.');
      } else if (evaluation.status === 'manual_review') {
        toast.error('Essa licença precisa de revisão manual antes de importar.');
      } else {
        toast.success('Licença conferida.');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível conferir a licença.');
    } finally {
      setCheckingLicense(false);
    }
  }

  async function handleImportLibraryMusic() {
    if (!canUpload) {
      toast.error('Bibliotecas externas ficam liberadas nos planos Profissional e Ilimitado.');
      return;
    }
    if (!libraryForm.name.trim()) {
      toast.error('Informe o nome da faixa.');
      return;
    }
    if (!libraryForm.audioUrl.trim()) {
      toast.error('Informe uma URL direta do arquivo de áudio.');
      return;
    }

    setImportingLibraryMusic(true);
    try {
      const { music: track, evaluation } = await importMusicLibraryTrack({
        ...libraryLicensePayload(),
        name: libraryForm.name.trim(),
        artist: libraryForm.artist.trim() || undefined,
        category: libraryForm.category,
        theme: libraryForm.theme.trim() || undefined,
        bpm: libraryForm.bpm ? Number(libraryForm.bpm) : undefined,
        duration: libraryForm.duration ? Number(libraryForm.duration) : undefined,
        audioUrl: libraryForm.audioUrl.trim(),
        pageUrl: libraryForm.pageUrl.trim() || undefined,
        providerTrackId: libraryForm.providerTrackId.trim() || undefined,
      });
      setLicenseEvaluation(evaluation);
      setMusic((current) => [track, ...current.filter((item) => item.id !== track.id)]);
      setLibraryForm(initialLibraryMusicForm(selectedProvider));
      toast.success('Música licenciada importada.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao importar música licenciada.');
    } finally {
      setImportingLibraryMusic(false);
    }
  }

  async function handleSeedSupabase() {
    if (!isAdmin) return;
    setSeeding(true);
    setSeedStatus('Publicando biblioteca 360 no Supabase...');
    try {
      const curated = await seedCuratedTemplates();
      const { templates: loadedTemplates, music: loadedMusic } = await loadCatalog(user?.uid);
      setTemplates(mergeTemplates([...curated, ...loadedTemplates]));
      setMusic(loadedMusic);
      setVisibleCount(INITIAL_TEMPLATE_COUNT);
      setSeedStatus(`${curated.length} templates 360 salvos no Supabase.`);
      toast.success('Biblioteca 360 salva no Supabase.');
    } catch (error) {
      setSeedStatus('');
      toast.error(error instanceof Error ? error.message : 'Erro ao publicar biblioteca 360.');
    } finally {
      setSeeding(false);
    }
  }

  function sunoInput() {
    return {
      prompt: sunoPrompt,
      mode: sunoMode,
      source: 'user_prompt' as const,
      title: sunoTitle || undefined,
      style: sunoStyle || undefined,
      lyrics: sunoMode === 'vocal' ? sunoLyrics || undefined : undefined,
      durationSeconds: 45,
      language: 'pt-BR',
    };
  }

  async function handlePreviewSunoPrompt() {
    if (!canGenerateSuno) {
      toast.error('Geração de música IA fica liberada no plano Ilimitado.');
      return;
    }
    if (sunoPrompt.trim().length < 3) {
      toast.error('Descreva a música que você quer gerar.');
      return;
    }

    try {
      const preview = await buildSunoPrompt(sunoInput());
      setSunoPreviewPrompt(preview.sunoPrompt);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível criar o prompt.');
    }
  }

  async function handleGenerateSunoMusic() {
    if (!canGenerateSuno) {
      toast.error('Geração de música IA fica liberada no plano Ilimitado.');
      return;
    }
    if (sunoPrompt.trim().length < 3) {
      toast.error('Descreva a música que você quer gerar.');
      return;
    }

    setSunoGenerating(true);
    setSunoStatus('Criando prompt original...');
    try {
      const input = sunoInput();
      const preview = await buildSunoPrompt(input);
      setSunoPreviewPrompt(preview.sunoPrompt);

      setSunoStatus('Enviando para a Suno...');
      const started = await generateSunoMusic(input);
      const taskId = started.taskId || started.generation.taskId;
      setSunoTaskId(taskId);

      setSunoStatus('Gerando música original...');
      const result = await waitForSunoMusic(taskId, (status) => {
        setSunoStatus(describeSunoStatus(status));
      });
      const newTracks = result.music || [];
      if (!newTracks.length) throw new Error('SUNO_MUSIC_NOT_READY');

      setMusic((current) => [
        ...newTracks,
        ...current.filter((track) => !newTracks.some((created) => created.id === track.id)),
      ]);
      setSunoStatus('Música salva na biblioteca.');
      toast.success('Música IA gerada e salva nas suas trilhas.');
      setSunoOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao gerar música IA.';
      setSunoStatus(message === 'SUNO_GENERATION_STILL_PROCESSING'
        ? 'A Suno ainda está processando. Tente novamente em alguns minutos.'
        : message);
      toast.error(message === 'SUNO_GENERATION_STILL_PROCESSING'
        ? 'A Suno ainda está processando. A tarefa ficou salva para consulta.'
        : message);
    } finally {
      setSunoGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 animate-pulse md:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => <div key={i} className="h-40 rounded-2xl bg-white/5" />)}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Biblioteca</h1>
            <p className="text-sm text-white/40">
              {activeSection === 'frames' && `${filteredTemplates.length} de ${availableTemplates.length} molduras`}
              {activeSection === 'music' && `${filteredMusic.length} de ${music.length} músicas`}
              {activeSection === 'libraries' && 'Importe músicas licenciadas de forma rápida'}
              {activeSection === 'ai' && 'Crie músicas originais com IA'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
            {isAdmin && (
              <Button
                variant="secondary"
                size="sm"
                loading={seeding}
                onClick={handleSeedSupabase}
                icon={<Database className="h-4 w-4" />}
                className="col-span-2 sm:col-span-1"
              >
                Salvar biblioteca 360
              </Button>
            )}
            <label className={`hidden min-h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-bold transition-all sm:px-5 ${canUpload ? 'cursor-pointer bg-gradient-brand text-white shadow-glow' : 'cursor-not-allowed border border-white/10 bg-white/[0.055] text-white/40'}`}>
              {canUpload ? <Upload className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              <span className="truncate">{uploading ? `${progress}%` : 'Template'}</span>
              <input type="file" accept="image/png,image/svg+xml,image/webp,image/gif,video/webm" className="hidden" disabled={!canUpload || uploading} onChange={handleUpload} />
            </label>
            <label className={`hidden min-h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-bold transition-all sm:px-5 ${canUpload ? 'cursor-pointer border border-white/10 bg-white/[0.07] text-white hover:bg-white/[0.1]' : 'cursor-not-allowed border border-white/10 bg-white/[0.055] text-white/40'}`}>
              {canUpload ? <Music2 className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              <span className="truncate">{uploadingMusic ? `${musicProgress}%` : 'Música'}</span>
              <input type="file" accept="audio/mpeg,audio/wav,audio/aac,audio/mp4,audio/ogg,audio/webm" className="hidden" disabled={!canUpload || uploadingMusic} onChange={handleMusicUpload} />
            </label>
            <Button
              variant="secondary"
              size="sm"
              disabled={!canUpload}
              onClick={() => setActiveSection('libraries')}
              icon={canUpload ? <Library className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              className="hidden"
              title={canUpload ? 'Importar trilha licenciada' : 'Liberado nos planos Profissional e Ilimitado'}
            >
              Bibliotecas
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={!canGenerateSuno}
              onClick={() => setActiveSection('ai')}
              icon={canGenerateSuno ? <Wand2 className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              className="hidden"
              title={canGenerateSuno ? 'Gerar música original pela Suno' : 'Liberado no plano Ilimitado'}
            >
              Gerar IA
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {sectionTabs.map((tab) => {
            const active = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSection(tab.id)}
                className={`flex min-h-[64px] items-center gap-3 rounded-2xl border px-4 text-left transition-all ${
                  active
                    ? 'border-brand-300/60 bg-brand-500/20 text-white shadow-glow'
                    : 'border-white/10 bg-white/[0.045] text-white/62 hover:bg-white/[0.07] hover:text-white'
                }`}
              >
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${active ? 'bg-brand-400/22 text-brand-100' : 'bg-white/[0.06] text-white/45'}`}>
                  {tab.icon}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">{tab.label}</span>
                  {typeof tab.count === 'number' && <span className="mt-0.5 block text-xs text-white/38">{tab.count} item(s)</span>}
                </span>
              </button>
            );
          })}
        </div>

        {activeSection === 'frames' && (
        <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.035] p-2.5">
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar por nome, tema, efeito..."
                className="h-11 w-full rounded-[18px] border border-white/10 bg-white/[0.055] pl-9 pr-10 text-sm font-medium text-white placeholder-white/30 outline-none transition-all focus:border-brand-400/60 focus:ring-2 focus:ring-brand-500/15"
              />
              {searchTerm && (
                <button
                  type="button"
                  aria-label="Limpar busca"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-white/45 hover:bg-white/[0.08] hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setFiltersOpen((open) => !open)}
              className={`flex h-11 shrink-0 items-center gap-2 rounded-[18px] border px-3 text-sm font-bold transition-all md:hidden ${
                filtersOpen || hasActiveFilters
                  ? 'border-brand-400/45 bg-brand-500/15 text-brand-100'
                  : 'border-white/10 bg-white/[0.055] text-white/68'
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filtros
            </button>
          </div>

          <div className={`${filtersOpen ? 'grid' : 'hidden'} mt-2 gap-2 md:grid md:grid-cols-[1fr_1fr_1fr_1fr_auto_auto_auto]`}>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="h-10 rounded-[16px] border border-white/10 bg-white/[0.055] px-3 text-sm font-medium text-white outline-none"
            >
              {categoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select
              value={aspectFilter}
              onChange={(event) => setAspectFilter(event.target.value)}
              className="h-10 rounded-[16px] border border-white/10 bg-white/[0.055] px-3 text-sm font-medium text-white outline-none"
            >
              {aspectOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select
              value={sourceFilter}
              onChange={(event) => setSourceFilter(event.target.value)}
              className="h-10 rounded-[16px] border border-white/10 bg-white/[0.055] px-3 text-sm font-medium text-white outline-none"
            >
              {sourceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select
              value={typeFilter}
              onChange={(event) => {
                setTypeFilter(event.target.value);
                if (event.target.value !== 'all') setMotionOnly(false);
              }}
              className="h-10 rounded-[16px] border border-white/10 bg-white/[0.055] px-3 text-sm font-medium text-white outline-none"
            >
              <option value="all">{canUseAnimatedTemplates ? 'Estáticos e animados' : 'Estáticos'}</option>
              <option value="static">Estáticos</option>
              {canUseAnimatedTemplates && <option value="animated">Animados</option>}
            </select>
            <button
              type="button"
              onClick={() => setFavoritesOnly((current) => !current)}
              className={`h-10 rounded-[16px] border px-3 text-sm font-bold transition-all ${
                favoritesOnly
                  ? 'border-amber-300/50 bg-amber-400/15 text-amber-100'
                  : 'border-white/10 bg-white/[0.055] text-white/60 hover:text-white'
              }`}
            >
              Favoritos
            </button>
            {canUseAnimatedTemplates && (
              <button
                type="button"
                onClick={() => {
                  setMotionOnly((current) => !current);
                  setTypeFilter('all');
                }}
                className={`h-10 rounded-[16px] border px-3 text-sm font-bold transition-all ${
                  motionOnly ? 'border-cyan-300/50 bg-cyan-400/15 text-cyan-100' : 'border-white/10 bg-white/[0.055] text-white/60 hover:text-white'
                }`}
              >
                Animados
              </button>
            )}
            <button
              type="button"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              className="h-10 rounded-[16px] border border-white/10 bg-white/[0.045] px-3 text-sm font-bold text-white/58 transition-all hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Limpar
            </button>
          </div>
        </div>
        )}
      </div>

      {activeSection === 'frames' && !canUpload && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/55">
          Upload de templates personalizados fica liberado nos planos Profissional e Ilimitado.
        </div>
      )}

      {activeSection === 'frames' && !canUseAnimatedTemplates && (
        <div className="rounded-2xl border border-cyan-300/15 bg-cyan-400/[0.06] p-4 text-sm text-cyan-50/72">
          O plano Essencial exibe apenas molduras estáticas. Molduras animadas e com movimento ficam liberadas nos planos Profissional e Ilimitado.
        </div>
      )}

      {seedStatus && (
        <div className="rounded-2xl border border-brand-300/20 bg-brand-500/10 p-4 text-sm text-brand-100">
          {seedStatus}
        </div>
      )}

      {activeSection === 'music' && sortedMusic.length > 0 && (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Music2 className="h-4 w-4 text-brand-300" />
              <h2 className="text-sm font-bold text-white">Músicas e trilhas</h2>
            </div>
            {favorites.music.length > 0 && (
              <span className="rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-100">
                {favorites.music.length} favorita(s)
              </span>
            )}
          </div>
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {musicCategoryFilterOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setMusicCategoryFilter(option.value)}
                className={`h-9 shrink-0 rounded-full border px-3 text-xs font-bold transition-all ${
                  musicCategoryFilter === option.value
                    ? 'border-brand-300/60 bg-brand-500/22 text-white'
                    : 'border-white/10 bg-white/[0.045] text-white/55 hover:text-white'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredMusic.map((track) => {
              const trackFavorite = favoriteMusicIds.has(track.id);
              return (
              <div key={track.id} className={`rounded-xl border p-3 transition-all ${trackFavorite ? 'border-amber-300/20 bg-amber-400/[0.07]' : 'border-white/[0.08] bg-black/20'}`}>
                <div className="mb-1 flex items-start gap-2">
                  <p className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{track.name}</p>
                  <button
                    type="button"
                    onClick={() => handleToggleMusicFavorite(track.id)}
                    title={trackFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                    aria-label={trackFavorite ? 'Remover música dos favoritos' : 'Favoritar música'}
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border transition-all ${
                      trackFavorite
                        ? 'border-amber-200/45 bg-amber-400/18 text-amber-100'
                        : 'border-white/10 bg-white/[0.045] text-white/42 hover:border-amber-200/30 hover:text-amber-100'
                    }`}
                  >
                    <Star className="h-4 w-4" fill={trackFavorite ? 'currentColor' : 'none'} />
                  </button>
                </div>
                <p className="mb-2 text-xs text-white/35">
                  {track.library || track.source || 'custom'} - {track.category}
                  {track.providerArtist ? ` - ${track.providerArtist}` : ''}
                </p>
                {track.licenseStatus && (
                  <span className={`mb-2 inline-flex rounded-full border px-2 py-1 text-[11px] font-bold ${licenseStatusClass[track.licenseStatus]}`}>
                    {licenseStatusLabels[track.licenseStatus]}
                  </span>
                )}
                {track.licenseName && (
                  <p className="mb-2 line-clamp-2 text-[11px] leading-relaxed text-white/30">
                    {track.licenseUrl ? (
                      <a href={track.licenseUrl} target="_blank" rel="noreferrer" className="text-brand-200 hover:text-white">
                        {track.licenseName}
                      </a>
                    ) : track.licenseName}
                  </p>
                )}
                {track.musicUrl && <audio src={track.musicUrl} controls preload="none" className="h-9 w-full" />}
              </div>
            );
            })}
          </div>
        </div>
      )}

      {activeSection === 'music' && sortedMusic.length === 0 && (
        <EmptyState icon={<Music2 className="h-8 w-8" />} title="Nenhuma música" description="Envie uma trilha, importe de uma biblioteca ou gere uma música com IA." />
      )}

      {activeSection === 'music' && sortedMusic.length > 0 && filteredMusic.length === 0 && (
        <EmptyState icon={<Search className="h-8 w-8" />} title="Nenhuma música nessa categoria" description="Escolha outra categoria de música para continuar." />
      )}

      {activeSection === 'libraries' && (
        <div className="space-y-4">
          {!canUpload && (
            <div className="rounded-2xl border border-amber-300/20 bg-amber-500/10 p-4 text-sm text-amber-50/75">
              Importar músicas de bibliotecas externas fica liberado nos planos Profissional e Ilimitado.
            </div>
          )}

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.045] p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Importar música licenciada</h2>
                <p className="mt-1 text-sm text-white/45">Escolha a biblioteca, copie a URL direta do áudio e salve na sua conta.</p>
              </div>
              {selectedProvider?.browseUrl && (
                <a href={selectedProvider.browseUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-4 text-sm font-bold text-white/70 hover:text-white">
                  Abrir catálogo <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {librariesLoading ? (
                Array.from({ length: 3 }, (_, index) => <div key={index} className="h-16 animate-pulse rounded-2xl bg-white/[0.06]" />)
              ) : libraryProviders.map((provider) => (
                <button
                  key={provider.id}
                  type="button"
                  onClick={() => selectLibraryProvider(provider)}
                  className={`rounded-2xl border p-3 text-left transition-all ${
                    selectedProviderId === provider.id
                      ? 'border-brand-300/70 bg-brand-500/18'
                      : 'border-white/10 bg-black/20 hover:border-white/18 hover:bg-white/[0.06]'
                  }`}
                >
                  <p className="truncate text-sm font-bold text-white">{provider.name}</p>
                  <p className="mt-1 text-xs text-white/38">{provider.requiresLicenseProof ? 'Pede comprovante' : 'Uso direto com licença'}</p>
                </button>
              ))}
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-white/70">Nome da música</span>
                <input value={libraryForm.name} onChange={(event) => updateLibraryForm('name', event.target.value)} placeholder="Ex: Festa Neon 360" className="h-11 w-full rounded-[18px] border border-white/10 bg-[#171922] px-4 text-sm text-white placeholder-white/30 outline-none" />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-white/70">Categoria</span>
                <select value={libraryForm.category} onChange={(event) => updateLibraryForm('category', event.target.value as AppMusic['category'])} className="h-11 w-full rounded-[18px] border border-white/10 bg-[#171922] px-4 text-sm text-white outline-none">
                  {musicCategoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="block space-y-2 lg:col-span-2">
                <span className="text-sm font-semibold text-white/70">URL direta do áudio</span>
                <input value={libraryForm.audioUrl} onChange={(event) => updateLibraryForm('audioUrl', event.target.value)} placeholder="https://.../musica.mp3" className="h-11 w-full rounded-[18px] border border-white/10 bg-[#171922] px-4 text-sm text-white placeholder-white/30 outline-none" />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-white/70">Artista ou fonte</span>
                <input value={libraryForm.artist} onChange={(event) => updateLibraryForm('artist', event.target.value)} placeholder="Opcional" className="h-11 w-full rounded-[18px] border border-white/10 bg-[#171922] px-4 text-sm text-white placeholder-white/30 outline-none" />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-white/70">Comprovante ou página da faixa</span>
                <input value={libraryForm.licenseProofUrl || libraryForm.pageUrl} onChange={(event) => {
                  updateLibraryForm('licenseProofUrl', event.target.value);
                  updateLibraryForm('pageUrl', event.target.value);
                }} placeholder="Link da página, licença ou invoice" className="h-11 w-full rounded-[18px] border border-white/10 bg-[#171922] px-4 text-sm text-white placeholder-white/30 outline-none" />
              </label>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/60">
                <input type="checkbox" checked={libraryForm.subscriptionConfirmed} onChange={(event) => updateLibraryForm('subscriptionConfirmed', event.target.checked)} className="h-4 w-4 accent-brand-500" />
                Tenho direito de usar esta música neste projeto
              </label>
              <Button loading={importingLibraryMusic} disabled={!canUpload} onClick={handleImportLibraryMusic} icon={<FileAudio className="h-4 w-4" />}>
                Importar música
              </Button>
            </div>
          </div>
        </div>
      )}

      {activeSection === 'ai' && (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.045] p-5">
          {!canGenerateSuno ? (
            <div className="rounded-2xl border border-amber-300/20 bg-amber-500/10 p-4 text-sm text-amber-50/75">
              Geração de música com IA fica liberada no plano Ilimitado.
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-white">Gerar música com IA</h2>
                <p className="mt-1 text-sm text-white/45">Descreva a trilha desejada e salve o resultado diretamente em Músicas.</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['instrumental', 'Instrumental'],
                  ['vocal', 'Cantada'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSunoMode(value as SunoMusicMode)}
                    className={`h-11 rounded-2xl border text-sm font-bold transition-all ${
                      sunoMode === value
                        ? 'border-brand-300/70 bg-brand-500/22 text-white shadow-glow'
                        : 'border-white/10 bg-black/20 text-white/60 hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-white/70">Ideia da música</span>
                <textarea value={sunoPrompt} onChange={(event) => setSunoPrompt(event.target.value)} rows={4} placeholder="Ex: trilha animada para aniversário neon, com batida moderna e energia de festa..." className="w-full resize-none rounded-[18px] border border-white/10 bg-[#171922] px-4 py-3 text-sm text-white placeholder-white/30 outline-none" />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <input value={sunoTitle} onChange={(event) => setSunoTitle(event.target.value)} placeholder="Título opcional" className="h-11 rounded-[18px] border border-white/10 bg-[#171922] px-4 text-sm text-white placeholder-white/30 outline-none" />
                <input value={sunoStyle} onChange={(event) => setSunoStyle(event.target.value)} placeholder="Estilo opcional" className="h-11 rounded-[18px] border border-white/10 bg-[#171922] px-4 text-sm text-white placeholder-white/30 outline-none" />
              </div>
              {sunoMode === 'vocal' && (
                <textarea value={sunoLyrics} onChange={(event) => setSunoLyrics(event.target.value)} rows={3} placeholder="Letra opcional" className="w-full resize-none rounded-[18px] border border-white/10 bg-[#171922] px-4 py-3 text-sm text-white placeholder-white/30 outline-none" />
              )}
              {sunoPreviewPrompt && (
                <div className="rounded-2xl border border-white/10 bg-[#171922] p-3">
                  <p className="mb-2 text-xs font-bold uppercase tracking-normal text-white/35">Prompt enviado para Suno</p>
                  <p className="text-sm leading-relaxed text-white/62">{sunoPreviewPrompt}</p>
                </div>
              )}
              {sunoStatus && (
                <div className="rounded-2xl border border-brand-300/20 bg-brand-500/10 p-3 text-sm text-brand-100">
                  {sunoStatus}
                  {sunoTaskId && <span className="mt-1 block text-xs text-white/35">Task: {sunoTaskId}</span>}
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <Button variant="secondary" onClick={handlePreviewSunoPrompt} disabled={sunoGenerating}>
                  Ver prompt
                </Button>
                <Button loading={sunoGenerating} onClick={handleGenerateSunoMusic} icon={<Wand2 className="h-4 w-4" />}>
                  Gerar música
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeSection === 'frames' && (templates.length === 0 ? (
        <EmptyState icon={<Layers className="h-8 w-8" />} title="Nenhum template" description="Os templates do catálogo serão exibidos assim que o backend responder." />
      ) : filteredTemplates.length === 0 ? (
        <EmptyState
          icon={<Search className="h-8 w-8" />}
          title="Nenhum resultado"
          description="Tente outro termo, formato ou categoria."
          action={{ label: 'Limpar filtros', onClick: clearFilters }}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {visibleTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                activeMotionId={activeMotionId}
                setActiveMotionId={setActiveMotionId}
                isFavorite={favoriteTemplateIds.has(template.id)}
                onToggleFavorite={handleToggleTemplateFavorite}
              />
            ))}
          </div>
          {hasMoreTemplates && (
            <div className="flex flex-col items-center gap-2 pt-2">
              <p className="text-xs text-white/35">
                Mostrando {visibleTemplates.length} de {filteredTemplates.length}
              </p>
              <Button
                variant="secondary"
                onClick={() => setVisibleCount((current) => Math.min(current + TEMPLATE_BATCH_SIZE, filteredTemplates.length))}
              >
                Carregar mais templates
              </Button>
            </div>
          )}
        </>
      ))}

      <Modal open={librariesOpen} onClose={() => !importingLibraryMusic && setLibrariesOpen(false)} title="Bibliotecas de músicas" size="xl">
        <div className="max-h-[74vh] space-y-4 overflow-y-auto pr-1">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-200" />
              <p className="text-sm font-bold text-white">
                {libraryTestMode ? 'Modo teste de importação musical' : 'Importação com licença conferida'}
              </p>
            </div>
            <p className="text-sm leading-relaxed text-white/55">
              {libraryTestMode
                ? 'O backend está aceitando trilhas como rascunho interno de teste e marcando tudo como somente teste.'
                : 'O SIX3 salva a trilha somente quando a licença é aceita pelo backend. Bibliotecas pagas exigem comprovante de assinatura/licença do projeto.'}
            </p>
            {acceptedLicenses.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {acceptedLicenses.map((item) => (
                  <span key={item} className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/55">
                    {item}
                  </span>
                ))}
              </div>
            )}
          </div>

          {librariesLoading ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {Array.from({ length: 6 }, (_, index) => (
                <div key={index} className="h-20 animate-pulse rounded-2xl bg-white/[0.05]" />
              ))}
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {libraryProviders.map((provider) => (
                <button
                  key={provider.id}
                  type="button"
                  onClick={() => selectLibraryProvider(provider)}
                  className={`rounded-2xl border p-3 text-left transition-all ${
                    selectedProviderId === provider.id
                      ? 'border-brand-300/70 bg-brand-500/18 shadow-glow'
                      : 'border-white/10 bg-white/[0.045] hover:border-white/18 hover:bg-white/[0.07]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">{provider.name}</p>
                      <p className="mt-1 text-xs text-white/38">
                        {provider.type === 'subscription_catalog' ? 'Assinatura/licença' : 'Biblioteca aberta/manual'}
                      </p>
                    </div>
                    {provider.requiresLicenseProof ? (
                      <Lock className="h-4 w-4 shrink-0 text-amber-200" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-200" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {selectedProvider && (
            <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-base font-bold text-white">{selectedProvider.name}</p>
                  <p className="mt-1 text-sm text-white/45">{selectedProvider.defaultLicenseName}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedProvider.browseUrl && (
                    <a href={selectedProvider.browseUrl} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-3 text-xs font-bold text-white/70 hover:text-white">
                      Abrir catálogo <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                  <a href={selectedProvider.licenseUrl} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-3 text-xs font-bold text-white/70 hover:text-white">
                    Licença <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                {selectedProvider.notes.map((note) => (
                  <p key={note} className="flex gap-2 text-xs leading-relaxed text-white/45">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-300/70" />
                    {note}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-white/70">Nome da faixa</span>
              <input
                value={libraryForm.name}
                onChange={(event) => updateLibraryForm('name', event.target.value)}
                placeholder="Ex: Neon Birthday Intro"
                className="h-11 w-full rounded-[18px] border border-white/10 bg-white/[0.055] px-4 text-sm text-white placeholder-white/30 outline-none"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-white/70">Artista</span>
              <input
                value={libraryForm.artist}
                onChange={(event) => updateLibraryForm('artist', event.target.value)}
                placeholder="Nome do artista"
                className="h-11 w-full rounded-[18px] border border-white/10 bg-white/[0.055] px-4 text-sm text-white placeholder-white/30 outline-none"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-white/70">Categoria</span>
              <select
                value={libraryForm.category}
                onChange={(event) => updateLibraryForm('category', event.target.value as AppMusic['category'])}
                className="h-11 w-full rounded-[18px] border border-white/10 bg-white/[0.055] px-4 text-sm text-white outline-none"
              >
                {musicCategoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-white/70">Tema</span>
              <input
                value={libraryForm.theme}
                onChange={(event) => updateLibraryForm('theme', event.target.value)}
                placeholder="Ex: aniversário, casamento, luxo"
                className="h-11 w-full rounded-[18px] border border-white/10 bg-white/[0.055] px-4 text-sm text-white placeholder-white/30 outline-none"
              />
            </label>
            <label className="block space-y-2 sm:col-span-2">
              <span className="text-sm font-semibold text-white/70">URL direta do arquivo de áudio</span>
              <input
                value={libraryForm.audioUrl}
                onChange={(event) => updateLibraryForm('audioUrl', event.target.value)}
                placeholder="https://.../musica.mp3"
                className="h-11 w-full rounded-[18px] border border-white/10 bg-white/[0.055] px-4 text-sm text-white placeholder-white/30 outline-none"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-white/70">Página da faixa</span>
              <input
                value={libraryForm.pageUrl}
                onChange={(event) => updateLibraryForm('pageUrl', event.target.value)}
                placeholder="URL pública da faixa"
                className="h-11 w-full rounded-[18px] border border-white/10 bg-white/[0.055] px-4 text-sm text-white placeholder-white/30 outline-none"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-white/70">ID/código da faixa</span>
              <input
                value={libraryForm.providerTrackId}
                onChange={(event) => updateLibraryForm('providerTrackId', event.target.value)}
                placeholder="Opcional"
                className="h-11 w-full rounded-[18px] border border-white/10 bg-white/[0.055] px-4 text-sm text-white placeholder-white/30 outline-none"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-white/70">Licença</span>
              <input
                value={libraryForm.licenseName}
                onChange={(event) => updateLibraryForm('licenseName', event.target.value)}
                placeholder="Ex: CC BY 4.0"
                className="h-11 w-full rounded-[18px] border border-white/10 bg-white/[0.055] px-4 text-sm text-white placeholder-white/30 outline-none"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-white/70">URL da licença</span>
              <input
                value={libraryForm.licenseUrl}
                onChange={(event) => updateLibraryForm('licenseUrl', event.target.value)}
                placeholder="Link da licença"
                className="h-11 w-full rounded-[18px] border border-white/10 bg-white/[0.055] px-4 text-sm text-white placeholder-white/30 outline-none"
              />
            </label>
            <label className="block space-y-2 sm:col-span-2">
              <span className="text-sm font-semibold text-white/70">Comprovante de licença/assinatura</span>
              <input
                value={libraryForm.licenseProofUrl}
                onChange={(event) => updateLibraryForm('licenseProofUrl', event.target.value)}
                placeholder="Link, número de licença, invoice ou identificador do projeto"
                className="h-11 w-full rounded-[18px] border border-white/10 bg-white/[0.055] px-4 text-sm text-white placeholder-white/30 outline-none"
              />
            </label>
            <label className="block space-y-2 sm:col-span-2">
              <span className="text-sm font-semibold text-white/70">Atribuição/crédito</span>
              <textarea
                value={libraryForm.attribution}
                onChange={(event) => updateLibraryForm('attribution', event.target.value)}
                rows={3}
                placeholder="Preencha quando a licença pedir crédito do artista."
                className="w-full resize-none rounded-[18px] border border-white/10 bg-white/[0.055] px-4 py-3 text-sm text-white placeholder-white/30 outline-none"
              />
            </label>
            <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
              <label className="flex min-h-11 items-center gap-3 rounded-[18px] border border-white/10 bg-white/[0.045] px-4 text-sm text-white/65">
                <input
                  type="checkbox"
                  checked={libraryForm.subscriptionConfirmed}
                  onChange={(event) => updateLibraryForm('subscriptionConfirmed', event.target.checked)}
                  className="h-4 w-4 accent-brand-500"
                />
                Assinatura/licença ativa para esta faixa e projeto
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-white/45">BPM</span>
                  <input
                    value={libraryForm.bpm}
                    onChange={(event) => updateLibraryForm('bpm', event.target.value)}
                    inputMode="numeric"
                    placeholder="120"
                    className="h-11 w-full rounded-[18px] border border-white/10 bg-white/[0.055] px-4 text-sm text-white placeholder-white/30 outline-none"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-white/45">Duração (s)</span>
                  <input
                    value={libraryForm.duration}
                    onChange={(event) => updateLibraryForm('duration', event.target.value)}
                    inputMode="numeric"
                    placeholder="45"
                    className="h-11 w-full rounded-[18px] border border-white/10 bg-white/[0.055] px-4 text-sm text-white placeholder-white/30 outline-none"
                  />
                </label>
              </div>
            </div>
          </div>

          {licenseEvaluation && (
            <div className={`rounded-2xl border p-4 ${licenseStatusClass[licenseEvaluation.status]}`}>
              <div className="flex items-center gap-2 text-sm font-bold">
                {licenseEvaluation.status === 'blocked' || licenseEvaluation.status === 'manual_review' || licenseEvaluation.status === 'test_only'
                  ? <AlertTriangle className="h-4 w-4" />
                  : <ShieldCheck className="h-4 w-4" />}
                {licenseStatusLabels[licenseEvaluation.status]}
              </div>
              {licenseEvaluation.warnings.length > 0 && (
                <div className="mt-2 space-y-1">
                  {licenseEvaluation.warnings.map((warning) => (
                    <p key={warning} className="text-xs leading-relaxed opacity-80">{warning}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              variant="secondary"
              loading={checkingLicense}
              disabled={!canUpload}
              onClick={handleCheckLibraryLicense}
              icon={<ShieldCheck className="h-4 w-4" />}
            >
              Conferir licença
            </Button>
            <Button
              loading={importingLibraryMusic}
              disabled={!canUpload}
              onClick={handleImportLibraryMusic}
              icon={<FileAudio className="h-4 w-4" />}
            >
              Importar trilha
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={sunoOpen} onClose={() => !sunoGenerating && setSunoOpen(false)} title="Gerar música com IA" size="xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {[
              ['instrumental', 'Instrumental'],
              ['vocal', 'Cantada'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setSunoMode(value as SunoMusicMode)}
                className={`h-11 rounded-2xl border text-sm font-bold transition-all ${
                  sunoMode === value
                    ? 'border-brand-300/70 bg-brand-500/22 text-white shadow-glow'
                    : 'border-white/10 bg-white/[0.045] text-white/60 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-semibold text-white/70">Ideia da música</span>
            <textarea
              value={sunoPrompt}
              onChange={(event) => setSunoPrompt(event.target.value)}
              rows={4}
              placeholder="Ex: trilha animada para aniversario neon, com batida moderna, energia de festa e final suave para vídeo 360..."
              className="w-full resize-none rounded-[18px] border border-white/10 bg-white/[0.055] px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition focus:border-brand-400/70 focus:ring-2 focus:ring-brand-500/20"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-white/70">Título opcional</span>
              <input
                value={sunoTitle}
                onChange={(event) => setSunoTitle(event.target.value)}
                placeholder="Ex: Neon Birthday 360"
                className="h-11 w-full rounded-[18px] border border-white/10 bg-white/[0.055] px-4 text-sm text-white placeholder-white/30 outline-none"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-white/70">Estilo opcional</span>
              <input
                value={sunoStyle}
                onChange={(event) => setSunoStyle(event.target.value)}
                placeholder="Ex: pop eletronico, club, cinematic"
                className="h-11 w-full rounded-[18px] border border-white/10 bg-white/[0.055] px-4 text-sm text-white placeholder-white/30 outline-none"
              />
            </label>
          </div>

          {sunoMode === 'vocal' && (
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-white/70">Letra opcional</span>
              <textarea
                value={sunoLyrics}
                onChange={(event) => setSunoLyrics(event.target.value)}
                rows={4}
                placeholder="Deixe vazio para a Suno criar a letra original a partir da ideia."
                className="w-full resize-none rounded-[18px] border border-white/10 bg-white/[0.055] px-4 py-3 text-sm text-white placeholder-white/30 outline-none"
              />
            </label>
          )}

          {sunoPreviewPrompt && (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-white/35">Prompt enviado para Suno</p>
              <p className="text-sm leading-relaxed text-white/62">{sunoPreviewPrompt}</p>
            </div>
          )}

          {sunoStatus && (
            <div className="rounded-2xl border border-brand-300/20 bg-brand-500/10 p-3 text-sm text-brand-100">
              {sunoStatus}
              {sunoTaskId && <span className="mt-1 block text-xs text-white/35">Task: {sunoTaskId}</span>}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Button variant="secondary" onClick={handlePreviewSunoPrompt} disabled={sunoGenerating}>
              Ver prompt
            </Button>
            <Button loading={sunoGenerating} onClick={handleGenerateSunoMusic} icon={<Wand2 className="h-4 w-4" />}>
              Gerar na Suno
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
