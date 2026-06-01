# SIX3° - Plataforma SaaS 360

Sistema para operação de experiências 360: cadastro, pagamento, acesso por assinatura, upload, galeria pública, QR Code, leads, templates, modo offline e dashboard.

## Stack

- Frontend: React + Vite + TypeScript + Tailwind
- Backend: Node.js + Express + TypeScript
- Dados/auth/storage: Firebase client SDK
- Pagamento: Stripe Checkout com Pix
- Deploy frontend: Vercel
- Deploy backend: Render (`https://tres6zero.onrender.com`)

## Estrutura

```text
six3/
  apps/
    web/       # Frontend React/Vite
    server/    # Backend Express para Render
  packages/
    shared/    # Tipos compartilhados
  scripts/
  vercel.json
  render.yaml
```

## Desenvolvimento

```bash
npm install
npm run dev:web
npm run dev:server
```

Copie `.env.example` para `.env` e preencha os valores locais. Não coloque secrets em variáveis `VITE_*`, porque tudo que começa com `VITE_` entra no bundle público do navegador.

## Build local

```bash
npm run build:web
npm run build:server
npm run typecheck
```

## Deploy na Vercel

Use a raiz do repositório como Root Directory do projeto Vercel.

Configuração esperada:

- Install Command: `npm install --workspace=@six3/web --include-workspace-root=false`
- Build Command: `npm run build:web`
- Output Directory: `apps/web/dist`
- Framework Preset: Vite

Variáveis na Vercel:

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

Somente variáveis públicas devem ir para a Vercel. Service accounts, private keys, Stripe secret keys e tokens ficam fora do client.

## Deploy no Render

O backend deve ser publicado no Render usando `render.yaml` ou os comandos:

```bash
npm install --workspace=@six3/server --include-workspace-root=false
npm run build:server
npm run start --workspace=@six3/server
```

Variáveis no Render:

```text
PUBLIC_BACKEND_URL=https://tres6zero.onrender.com
FRONTEND_URL=https://six3.vercel.app
CORS_ORIGINS=https://six3.vercel.app
ALLOW_VERCEL_PREVIEWS=true
ADMIN_EMAIL=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
```

## URLs úteis

- Frontend local: `http://localhost:5173`
- Backend local: `http://localhost:3333`
- Health backend: `http://localhost:3333/health`
- Backend Render: `https://tres6zero.onrender.com`
