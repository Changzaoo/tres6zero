# SIX3° - Plataforma SaaS 360

Sistema para operacao de experiencias 360: cadastro, assinatura, acesso por plano, upload server-side, processamento de videos com Python/FFmpeg, galeria publica, QR Code, leads, templates, modo offline e dashboard.

## Stack

- Frontend: React + Vite + TypeScript + Tailwind
- Backend: Node.js + Express + TypeScript no Render
- Edicao de video: Python + FFmpeg + Sharp para overlays transparentes
- IA de direcao de video: OpenAI Responses API no backend Render
- Auth e dados operacionais: Firebase
- Storage de midia: Supabase Storage (`videos` e `templates`)
- Pagamento: Stripe Checkout com Pix
- Deploy frontend: Vercel
- Deploy backend: Render (`https://tres6zero.onrender.com`)

## Desenvolvimento

```bash
npm install
npm run dev:web
npm run dev:server
```

Copie `.env.example` para `.env` e preencha os valores locais. Nao coloque secrets em variaveis `VITE_*`, porque tudo que comeca com `VITE_` entra no bundle publico do navegador.

## Build local

```bash
npm run build:web
npm run build:server
npm run typecheck
```

## Deploy na Vercel

Use a raiz do repositorio como Root Directory do projeto Vercel.

Configuracao esperada:

- Install Command: `npm install --workspace=@six3/web --include-workspace-root=false`
- Build Command: `npm run build:web`
- Output Directory: `apps/web/dist`
- Framework Preset: Vite

Variaveis na Vercel:

```text
VITE_API_URL=https://tres6zero.onrender.com
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_DATABASE_URL=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
```

Somente variaveis publicas devem ir para a Vercel. Service accounts, private keys, Stripe secret keys, Supabase service role e tokens ficam fora do client.

## Deploy no Render

O backend deve ser publicado no Render usando `render.yaml` ou os comandos:

```bash
npm install --workspace=@six3/server --include-workspace-root=false
npm run build:server
npm run start --workspace=@six3/server
```

Variaveis no Render:

```text
PUBLIC_BACKEND_URL=https://tres6zero.onrender.com
FRONTEND_URL=https://six3.vercel.app
CORS_ORIGINS=https://six3.vercel.app
ALLOW_VERCEL_PREVIEWS=true
ADMIN_EMAIL=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
SUPABASE_URL=https://xmuawzcpydmbcqackgoz.supabase.co
SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
OPENAI_API_KEY=...
OPENAI_MODEL=chat-latest
SIX3_SEED_SECRET=...
PYTHON_BIN=python3
```

`SUPABASE_SERVICE_ROLE_KEY` e recomendado no Render para uploads server-side sem depender de policies publicas de insert. Nunca coloque essa chave na Vercel nem em `VITE_*`.
`OPENAI_API_KEY` tambem deve ficar somente no Render. O frontend nunca chama a OpenAI diretamente.
`SIX3_SEED_SECRET` protege a rota interna que cria buckets e semeia templates/musicas no Supabase.

## URLs uteis

- Frontend local: `http://localhost:5173`
- Backend local: `http://localhost:3333`
- Health backend: `http://localhost:3333/health`
- Backend Render: `https://tres6zero.onrender.com`
