# Blueprint Tecnico

## Visao tecnica

SIX3° e um monorepo com frontend React/Vite e backend Express. O frontend e responsavel pela interface, edicao local de video e chamadas autenticadas. O backend centraliza autenticacao com Firebase, regras de permissao, Stripe, Firestore, Supabase Storage, suporte, notificacoes, eventos, videos e templates.

## Arquitetura em alto nivel

```mermaid
flowchart LR
  U[Usuario no navegador] --> W[Frontend React/Vite na Vercel]
  W -->|API JSON + token Firebase| B[Backend Express no Render]
  W -->|Assets publicos| S[Supabase Storage]
  B --> F[Firebase Auth/Admin]
  B --> DB[Firestore]
  B --> S
  B --> STR[Stripe Checkout/Webhook]
  B --> OAI[OpenAI opcional]
  W --> SW[Service Worker / Cache]
```

## Componentes principais

| Camada | Arquivo/Pasta | Responsabilidade |
|---|---|---|
| Rotas React | `apps/web/src/App.tsx` | Define rotas publicas, privadas, pagas e admin |
| Layout app | `apps/web/src/components/layout` | Sidebar, header, bottom nav mobile |
| Auth client | `apps/web/src/services/authService.ts` | Sessao, cookies locais, refresh, device headers |
| Editor local | `apps/web/src/services/browserVideoRenderer.ts` | Canvas, MediaRecorder, efeitos, overlays e audio |
| API Express | `apps/server/src/index.ts` | CORS, Helmet, rate limit, rotas |
| Auth server | `apps/server/src/routes/auth.ts` | Login, cadastro, perfil, dispositivos, senha, roles |
| Billing | `apps/server/src/routes/billing.ts` | Checkout, webhook e clientes ativos |
| Videos | `apps/server/src/routes/video.ts` | CRUD, stats, process opcional |
| Templates | `apps/server/src/routes/templates.ts` | Catalogo, seed, custom templates e musicas |
| Upload | `apps/server/src/routes/upload.ts` | Upload para Supabase |
| Eventos | `apps/server/src/routes/events.ts` | CRUD de eventos e galerias |
| Suporte | `apps/server/src/routes/support.ts` | Conversas usuario/admin/anonimo |
| Notificacoes | `apps/server/src/routes/notifications.ts` | Lista, preferencias, leitura, broadcast |

## Fluxo de autenticacao

```mermaid
sequenceDiagram
  actor User
  participant Web as Frontend
  participant API as Backend Render
  participant FA as Firebase Auth
  participant FS as Firestore

  User->>Web: Login/cadastro
  Web->>API: POST /api/auth/login ou /register
  API->>FA: signInWithPassword/signUp
  FA-->>API: idToken + refreshToken + uid
  API->>FS: registra dispositivo e carrega perfil
  API-->>Web: session + user + entitlements
  Web->>Web: salva token em localStorage/cookies
```

## Fluxo de pagamento

```mermaid
sequenceDiagram
  actor User
  participant Web
  participant API
  participant Stripe
  participant FS as Firestore/Notifications

  User->>Web: Escolhe plano
  Web->>API: POST /api/billing/checkout
  API->>Stripe: Cria Checkout Session
  Stripe-->>Web: URL de pagamento
  User->>Stripe: Paga
  Stripe->>API: Webhook checkout.session.completed
  API->>Stripe: Atualiza metadata de acesso
  API->>FS: Notifica usuario
```

## Fluxo de video

```mermaid
flowchart TD
  A[Gravar ou enviar video] --> B[Preview no navegador]
  B --> C[Escolher template, efeito, trilha e duracao]
  C --> D[Render local com Canvas + MediaRecorder]
  D --> E[Upload do arquivo final ao Supabase]
  E --> F[Criar registro em Firestore via /api/video]
  F --> G[Publicar link /v/:videoId]
  G --> H[Compartilhar QR Code]
```

## Fluxo de eventos e galerias

```mermaid
flowchart LR
  A[Usuario cria evento] --> B[Firestore events]
  B --> C[Slug publico /g/:slug]
  A --> D[Grava videos vinculados]
  D --> E[Firestore videos]
  E --> C
  C --> F[Cliente ve galeria]
  F --> G[Leads, views, downloads, shares]
```

## Modelo de dados principal

```mermaid
erDiagram
  USERS ||--o{ EVENTS : owns
  USERS ||--o{ VIDEOS : owns
  USERS ||--o{ TEMPLATES : uploads
  USERS ||--o{ MUSIC : uploads
  USERS ||--o{ SUPPORT_CONVERSATIONS : opens
  EVENTS ||--o{ VIDEOS : contains
  EVENTS ||--o{ LEADS : captures
  VIDEOS ||--o{ LEADS : may_capture
  USERS ||--o{ NOTIFICATIONS : receives
  USERS ||--o{ DEVICES : registers
```

## Principais colecoes Firestore

| Colecao | Uso |
|---|---|
| `users` | Perfil, preferencias, notificationPreferences |
| `users/{uid}/devices` | Dispositivos conectados, IP, localizacao, revokedAt |
| `events` | Eventos, pagina publica, branding e lead capture |
| `videos` | Videos, status, storagePath, stats, efeito e template |
| `templates` | Templates customizados |
| `music` | Musicas customizadas |
| `supportConversations` | Conversas de suporte |
| `supportConversations/{id}/messages` | Mensagens |
| `notifications` | Notificacoes in-app |
| `passwordRecoveryChallenges` | Desafios temporarios de recuperacao |

## Buckets Supabase

| Bucket | Uso | Status |
|---|---|---|
| `videos` | Videos brutos e finais | Existente |
| `templates` | Assets legados e imagens de evento | Existente |
| `six3-project-templates` | Templates oficiais gerados/animados | Planejado/existente via seed |
| `six3-project-music` | Musicas oficiais geradas/publicas | Planejado/existente via seed |
| `six3-user-templates` | Templates enviados pelo usuario | Existente via seed/uso |
| `six3-user-music` | Musicas enviadas pelo usuario | Existente via seed/uso |

## Regras de permissao

- `PrivateRoute`: exige usuario logado.
- `PaidRoute`: exige assinatura ativa.
- `AdminRoute`: exige role admin.
- Backend valida token em `getAuthenticatedUser`.
- Backend valida plano em `requireActiveSubscription` e `requirePlanFeature`.
- Admin e definido por variaveis `ADMIN_UID` e/ou `ADMIN_EMAIL`, nao por hardcode.

## Endpoints principais

| Grupo | Rotas |
|---|---|
| Auth | `/api/auth/register`, `/login`, `/me`, `/profile`, `/password`, `/devices`, `/recovery/*` |
| Billing | `/api/billing/checkout`, `/api/billing/webhook`, `/api/billing/admin/customers` |
| Upload | `/api/upload/video`, `/image`, `/template`, `/music` |
| Video | `/api/video`, `/api/video/process`, `/api/video/effects`, `/api/video/:id/stats` |
| Templates | `/api/templates/generated`, `/custom`, `/generated-music`, `/seed-assets` |
| Eventos | `/api/events`, `/api/events/:id`, `/api/events/slug/:slug` |
| Leads | `/api/leads` |
| Suporte | `/api/support/conversations`, `/anonymous/conversations`, `/admin/conversations` |
| Notificacoes | `/api/notifications`, `/preferences`, `/admin/broadcast` |

## Segurança tecnica

| Controle | Status |
|---|---|
| Secrets fora do client | Existente por arquitetura |
| CORS restrito a Vercel/local/previews | Existente |
| Helmet | Existente |
| Rate limit global | Existente |
| Validacao Zod | Existente |
| Device registry | Existente |
| Recuperacao sem revelar dados | Existente |
| Admin por env | Existente |
| Upload com tipo e tamanho limitados | Existente |
| URLs de midia processadas restritas ao Supabase | Existente |

## Pontos tecnicos de atencao

1. Criar fila de jobs se o processamento server-side voltar a ser habilitado.
2. Migrar pagamento para assinatura recorrente Stripe Billing se a renovacao mensal precisar ser automatica real.
3. Revisar regras Firestore/Supabase antes de escala.
4. Adicionar testes automatizados para auth, billing, upload e editor.
5. Corrigir textos com encoding quebrado.
6. Consolidar logging e monitoramento.
