# Sistema de Músicas — SIX3

Documentação do sistema de biblioteca musical inteligente, integrado às molduras/templates e às durações de vídeo (5, 15, 25, 35, 45s).

> **Status:** Etapas 1–6 concluídas. ✅ Sistema completo.
>
> - ✅ **1** Fundação (tipos, categorias, recomendação, audioMix, seed, mensagens)
> - ✅ **2** Áudio no renderer (fade-in/out, volume música, volume/mix do áudio original, clip+loop, normalização)
> - ✅ **3** UI: hooks + componentes (`MusicSelector`, `MusicCard`, `MusicVolumeControls`, filtros, sugestão automática) e controles de áudio ligados ao editor
> - ✅ **4** Dados + Admin (`AppMusic` estendido, adapters, `musicCatalogService`, `AdminMusicPanel` montado em Templates → Músicas, schema do servidor estendido)
> - ✅ **5** Cortes físicos (5/15/25/35/45s) + waveforms no Supabase via ffmpeg (`audioProcessing.ts`), gerados no job "Gerar músicas" e via `POST /api/music/cuts/:id`
> - ✅ **6** Testes (vitest) — 16 testes cobrindo recomendação, fallback, premium, clip/loop, fades, normalização, adapters e seed (`npm --workspace=apps/web test`)

---

## 1. Visão geral

O sistema escolhe (manual ou automaticamente) uma trilha que combina com:
- a **categoria da moldura** selecionada,
- a **duração final** do vídeo,
- a **energia/clima** do template,
- as **tags** do template,
- o **plano** do usuário (premium ou não).

Tudo vive em `apps/web/src/features/music/` como camada **aditiva** — o sistema legado (`AppMusic`, rotas `/api/music/*`, Suno, libs licenciadas) continua funcionando sem alteração.

```
apps/web/src/features/music/
├── types.ts          # VideoDuration, MusicCategory, MusicTrack, AudioMixSettings...
├── categoryMap.ts    # bridge TemplateCategory -> MusicCategory + perfis
├── audioMix.ts       # corte/loop/fade/volume/normalização (puro, testável)
├── recommendation.ts # motor de recomendação automática + fallback
├── adapters.ts       # AppMusic (Firestore) <-> MusicTrack
├── seed.ts           # catálogo seed de metadados (sem arquivos reais ainda)
├── messages.ts       # mensagens de erro amigáveis (pt-BR)
├── hooks/            # useAudioMixSettings, useMusicPreview, useRecommendedMusic
├── components/       # MusicSelector, MusicCard, MusicVolumeControls, AdminMusicPanel...
├── services/         # musicCatalogService (load/create/update/activate)
└── index.ts          # barrel
```

### Áudio no render (Etapa 2)
`browserVideoRenderer` aceita `mixSettings?: AudioMixSettings`. Sem ele, mantém o
comportamento legado (só música, sem fade, sem áudio original). Com ele aplica
fade-in/out, volume da música, mixagem do áudio original (via `createMediaElementSource`),
clip que nunca passa do fim do vídeo, loop suave e normalização anti-clipping.
O default (`DEFAULT_MIX_SETTINGS`) é `music_only` para não mudar o export atual.

### UI no editor (Etapa 3)
O `OperatorPage` usa `useAudioMixSettings()` e renderiza `<MusicVolumeControls />`;
`mix.settings` é passado para `renderVideoInBrowser`. Os componentes `MusicSelector`,
`MusicCard`, `AutoMusicRecommendation` e `MusicFilters` estão prontos para compor a
biblioteca completa.

### Admin (Etapa 4)
`<AdminMusicPanel ownerId={user.uid} />` é um painel drop-in: upload, cadastro,
edição de metadados (energia, BPM, melhores durações, tags, premium, licença),
ativar/desativar e arquivar. Lê de `loadMusicCatalog()` (geradas + customizadas) e
persiste via `/api/templates/custom-music` (schema do servidor já estendido).
Ainda **não está montado** em nenhuma página — basta inserir o componente onde
preferir (ex.: nova aba na `TemplatesPage` ou `AdminPage`).

---

## 2. Como cadastrar uma nova música

Hoje (até a Etapa 4 ligar o admin), uma faixa é um objeto `MusicTrack` (`types.ts`):

```ts
{
  id: 'music_aniversario_009',
  title: 'Golden Birthday Glow',
  slug: 'golden-birthday-glow',
  category: 'aniversario',
  subcategory: 'Pop festivo',
  mood: ['alegre', 'energetico'],
  energyLevel: 8,
  bpm: 124,
  durationOriginal: 60,
  availableCuts: [5, 15, 25, 35, 45],
  bestForDurations: [15, 25, 35],
  fileUrl: 'https://.../music/originals/aniversario/golden-birthday-glow.mp3',
  previewUrl: 'https://.../music/previews/aniversario/golden-birthday-glow-preview.mp3',
  licenseType: 'royalty_free_or_owned',
  source: 'internal_library',
  allowedCommercialUse: true,
  attributionRequired: false,
  tags: ['birthday', 'party', 'neon'],
  isPremium: false,
  isActive: true,
  createdAt, updatedAt,
}
```

A partir da Etapa 4, o admin faz upload + preenche metadados pela UI e isso é persistido no Firestore (coleção `music`, estendida com os novos campos).

---

## 3. Como associar música a uma categoria

As **30 categorias de molduras** (`TemplateCategory` em `apps/web/src/types/index.ts`) são traduzidas para **22 categorias musicais** em `categoryMap.ts`:

```ts
import { musicCategoryForTemplate } from '@/features/music';

const musicCategory = musicCategoryForTemplate(template.category); // ex.: 'neon_glow' -> 'balada_neon'
```

Cada `MusicCategory` tem um **perfil** (`MUSIC_CATEGORY_PROFILES`) com estilos, clima, energia padrão, melhores durações e tags. Para adicionar uma categoria de moldura nova, basta incluir a entrada em `TEMPLATE_TO_MUSIC_CATEGORY`; sem mapeamento, cai em `universal` (fallback seguro).

---

## 4. Cortes de 5/15/25/35/45s

O corte é **puro e determinístico** via `planMusicClip` (`audioMix.ts`):

```ts
import { planMusicClip } from '@/features/music';

const plan = planMusicClip({ durationOriginal: 60, targetDuration: 15 });
// -> { sourceStart, sourceEnd, playDuration: 15, loop: false, fadeInSeconds, fadeOutSeconds }
```

Regras já implementadas:
- A música **nunca** fica maior que o vídeo (`playDuration === targetDuration`).
- Faixa **menor** que o vídeo → `loop: true` (loop suave).
- Cortes curtos (5/15s) pulam a introdução e pegam a parte marcante.
- Fades recomendados por duração (`recommendedFades`): 5s tem impacto imediato (fade-in 0).
- `fadeOut` nunca passa de metade do vídeo.

`musicGainAt(t, plan, volume)` devolve o ganho em qualquer instante (para o renderer agendar `gain.gain` na Etapa 2).

A **geração física** dos cortes acontece no servidor (`apps/server/src/services/audioProcessing.ts`,
ffmpeg via `ffmpeg-static`): cada corte tem fade-in/out e `loudnorm` (anti-clipping),
e faixas curtas viram loop (`-stream_loop`). Os cortes do catálogo são gerados no
job "Gerar músicas" e salvos em `/music/cuts/...`; para faixas do Firestore use
`POST /api/music/cuts/:id`. Independentemente disso, o renderer também corta em
tempo real a partir do original via `planMusicClip` (fallback se não houver corte/ffmpeg).

---

## 5. Recomendação automática

`recommendMusic(tracks, context)` (`recommendation.ts`) aplica o score:

| Critério | Pontos |
|----------|--------|
| Mesma categoria | +50 |
| Duração em `bestForDurations` | +30 |
| Tags em comum com o template | +20 (máx) |
| Energia compatível | +15 |
| Premium liberado p/ usuário premium | +10 |
| Faixa universal | +12 |

```ts
import { recommendMusic, musicCategoryForTemplate, MUSIC_SEED } from '@/features/music';

const result = recommendMusic(MUSIC_SEED, {
  category: musicCategoryForTemplate(template.category),
  duration: 15,
  templateTags: template.tags,
  templateIsPremium: template.isPremium,
  userHasPremium: user.entitlements?.planId !== 'starter',
});
// result.track, result.score, result.reasons, result.isFallback
```

---

## 6. Fallback

Cadeia em `recommendMusic`:
1. Melhor faixa da **categoria** (score ≥ 50).
2. Faixa **universal** de energia parecida (`isFallback: true`).
3. Qualquer faixa da **categoria** com score baixo.
4. Qualquer faixa da **duração** correta.
5. `null` → o app aplica universal e mostra aviso amigável; o admin vê "categoria sem música".

Mensagens em `messages.ts` (`CATEGORY_EMPTY`, `FALLBACK_APPLIED`, etc.).

---

## 7. Músicas premium

- `track.isPremium` + `context.userHasPremium`: faixas premium são **filtradas** para quem não tem direito (`isUsable` em `recommendation.ts`).
- Na UI (Etapa 3), faixa premium bloqueada mostra: _"Esta música é premium. Escolha outra ou atualize seu plano."_ (`PREMIUM_REQUIRED`).

---

## 8. Evitar problemas de copyright

Campos de licença no `MusicTrack`: `licenseType`, `licenseDocumentUrl`, `source`, `allowedCommercialUse`, `attributionRequired`, `attributionText`.

O fluxo de **import licenciado** já existente (`apps/server/src/services/musicLibraries.ts` + `/api/music/libraries/*`) avalia licença por provedor (Pixabay, FMA, YouTube, Artlist, Epidemic, etc.), bloqueia NC/ND e exige comprovante/atribuição. **Não** usar hits famosos, vocais reconhecíveis ou áudio baixado de redes sociais sem licença. Use apenas músicas próprias, royalty-free, CC compatível ou geradas por IA (Suno) com uso comercial autorizado.

---

## 8.1. Biblioteca gerada (substitui a antiga)

A biblioteca "gerada" servida em `/api/templates/generated-music` agora é o
**catálogo por categoria** (`apps/server/src/services/musicCatalog.ts`): ~178
faixas (21 categorias × durações + universais), cada uma com áudio procedural
(loop WAV de 12s, variando por categoria/energia/BPM). Substitui as 72 faixas
procedurais antigas + 10 do Citizen DJ (o `generatedMusic.ts` antigo ficou
inativo, sem ser apagado).

**Como enviar os arquivos ao Supabase:** na página **Templates → Músicas**, o
admin clica em **"Gerar músicas"**. Isso dispara o job que renderiza e faz upload
de todas as faixas para `six3-project-music/originals/{categoria}/{slug}.wav`
(upsert, não apaga nada existente) e recarrega a biblioteca.

> Requer `SIX3_HEAVY_ASSET_JOBS_ENABLED=true` no servidor. Enquanto o upload não
> roda, as URLs novas ainda não existem no Storage (as faixas aparecem no app,
> mas o áudio só toca após o "Gerar músicas").

## 9. Onde ficam os arquivos no Supabase

Padrão alvo (Etapa 5), compatível com o `supabaseStorage.ts` atual:

```
/music/originals/{category}/{slug}.mp3
/music/previews/{category}/{slug}-preview.mp3
/music/cuts/{category}/{slug}/{5|15|25|35|45}s.mp3
/music/waveforms/{category}/{slug}.json
```

Hoje as faixas geradas/Suno usam o bucket `userMusic` (`SUPABASE_BUCKETS`). A reorganização será aditiva, sem apagar buckets existentes.

---

## 10. Como testar se a música está sendo aplicada

1. **Recomendação** (já testável):
   ```ts
   import { recommendMusic, MUSIC_SEED } from '@/features/music';
   recommendMusic(MUSIC_SEED, { category: 'casamento', duration: 45 });
   ```
2. **Corte/fade** (já testável): `planMusicClip` / `musicGainAt`.
3. **No editor** (após Etapa 2/3): selecionar moldura → ver sugestão → preview → aplicar → exportar e conferir que o áudio respeita volume/fade e não passa do fim do vídeo.

Rode: `npm --workspace=apps/web test` (vitest).

---

## Histórico de implementação (concluído)

| Etapa | Escopo | Arquivos principais |
|-------|--------|---------------------|
| **1** | Fundação: tipos, categorias, recomendação, audioMix, seed, mensagens | `features/music/*` |
| **2** | Fade-in/out, volume da música, volume/mix do áudio original e clip+loop no renderer | `browserVideoRenderer.ts` (`attachAudioTrack`) |
| **3** | Componentes/hooks de UI + controles de áudio no editor | `features/music/components/`, `hooks/`, `OperatorPage.tsx` |
| **4** | `AppMusic` estendido, adapters, `musicCatalogService`, `AdminMusicPanel` (Templates → Músicas), schema do servidor | `types/index.ts`, `routes/templates.ts`, `TemplatesPage.tsx` |
| **5** | Catálogo gerado por categoria + cortes/waveforms no Supabase via ffmpeg | `services/musicCatalog.ts`, `services/audioProcessing.ts`, `routes/templates.ts`, `routes/music.ts` |
| **6** | Testes vitest | `features/music/__tests__/music.test.ts` |

### Garantias
- ✅ `tsc --noEmit` e `eslint` limpos em apps/web e apps/server.
- ✅ 16 testes vitest passando.
- ✅ Mudanças aditivas/retrocompatíveis — nenhuma funcionalidade existente removida; nenhum bucket/arquivo apagado.
