# Mapa Visual Ilustrado

## Mapa geral do produto

```mermaid
flowchart TB
  L[Landing Page] --> A[Cadastro/Login]
  A --> P[Planos e pagamento]
  P --> D[Dashboard]
  D --> E[Eventos]
  D --> G[Gravar]
  D --> T[Templates]
  D --> S[Suporte]
  E --> GP[Galeria publica]
  G --> ED[Editor de video]
  T --> ED
  ED --> V[Video publicado]
  V --> QR[QR Code]
  GP --> LE[Leads e metricas]
  LE --> D
```

## Jornada do operador

```mermaid
journey
  title Jornada do operador SIX3°
  section Entrada
    Acessa landing: 4: Operador
    Cria conta: 4: Operador
    Escolhe plano: 3: Operador
  section Operacao
    Cria evento: 4: Operador
    Grava video: 5: Operador
    Escolhe template/efeito/musica: 5: Operador
    Publica QR Code: 5: Operador
  section Resultado
    Cliente acessa video: 5: Cliente
    Leads e metricas aparecem: 4: Operador
```

## Mapa das telas

```mermaid
flowchart LR
  subgraph Publico
    Home[/]
    Plans[/plans]
    Login[/login]
    Register[/register]
    Forgot[/forgot-password]
    Gallery[/g/:slug]
    Video[/v/:id]
  end

  subgraph Aplicativo
    Dashboard[/app/dashboard]
    Events[/app/events]
    Record[/app/gravar]
    Videos[/app/videos]
    Templates[/app/templates]
    Leads[/app/leads]
    Analytics[/app/analytics]
    Billing[/app/billing]
    Settings[/app/settings]
    Support[/app/support]
    Admin[/app/admin]
  end

  Home --> Plans --> Register
  Login --> Dashboard
  Register --> Billing
  Billing --> Dashboard
  Dashboard --> Events
  Dashboard --> Record
  Record --> Video
  Events --> Gallery
```

## Fluxo de dados

```mermaid
flowchart TD
  WEB[React/Vite] --> API[Express API]
  API --> AUTH[Firebase Auth]
  API --> FIRE[Firestore]
  API --> SUPA[Supabase Storage]
  API --> STRIPE[Stripe]
  WEB --> CACHE[Service Worker Cache]
  WEB --> CANVAS[Canvas/MediaRecorder]
  CANVAS --> SUPA
```

## Fluxo do editor

```mermaid
flowchart TD
  A[Selecionar evento ou avulso] --> B[Gravar ou enviar video]
  B --> C[Preview]
  C --> D[Selecionar template]
  D --> E[Selecionar efeito]
  E --> F[Selecionar trilha]
  F --> G[Selecionar duracao 5/15/25/35/45]
  G --> H[Timeline]
  H --> I[Render local]
  I --> J[Upload Supabase]
  J --> K[Registro Firestore]
  K --> L[Link + QR Code]
```

## Fluxo de recuperacao de senha

```mermaid
flowchart TD
  A[Usuario informa identificador] --> B[Backend gera 5 verificacoes mascaradas]
  B --> C[Usuario escolhe opcoes]
  C --> D{Todas corretas?}
  D -->|Nao| E[Incrementa tentativa]
  D -->|Sim| F{Conta existe?}
  F -->|Sim| G[Token interno temporario]
  G --> H[Nova senha via Firebase Admin]
  F -->|Nao| I[Fluxo neutro para suporte]
```

## Fluxo de suporte

```mermaid
flowchart LR
  U[Usuario autenticado] --> S[Conversa de suporte]
  A[Anonimo no login] --> S
  S --> DB[Firestore messages]
  DB --> ADM[Painel admin]
  ADM --> DB
  DB --> N[Notificacoes]
```

## Fluxo de planos e bloqueio

```mermaid
flowchart TD
  U[Usuario logado] --> C{Assinatura ativa?}
  C -->|Nao| B[Planos/Billing]
  C -->|Sim| R[Rotas pagas]
  R --> F{Feature liberada pelo plano?}
  F -->|Sim| OK[Usa recurso]
  F -->|Nao| LOCK[Cadeado/Upgrade]
  ADM[Admin] --> OK
```

## Visao mobile

```mermaid
flowchart TD
  M[Mobile] --> BN[Bottom navigation]
  BN --> Record[Gravar central]
  BN --> Events[Eventos]
  BN --> Videos[Videos]
  BN --> Templates[Templates]
  BN --> Plans[Planos]
  BN --> More[Mais/Conta]
```

## Visao de arquitetura de deploy

```mermaid
flowchart LR
  GH[GitHub] --> V[Vercel Frontend]
  GH --> R[Render Backend]
  V --> Browser[Navegador]
  Browser --> R
  R --> Firebase
  R --> Supabase
  R --> Stripe
```

## Leitura rapida do mapa

O produto funciona como uma esteira: entrada pelo plano, operacao por evento/video, edicao local, publicacao e medicao. O maior cuidado tecnico esta no video, porque processamento pesado precisa continuar local ou ir para worker dedicado.
