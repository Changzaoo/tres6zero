# Tres6Zero - Plataforma 360 Photo Booth

Sistema para operacao de eventos com plataforma 360: cadastro, upload, galeria publica, QR Code, leads, templates e dashboard.

## Stack

- Frontend: React + Vite + TypeScript + Tailwind
- Backend: Node.js + Express + TypeScript
- Dados/auth/storage: Firebase client SDK
- Deploy frontend: Vercel
- Deploy backend: Render (`https://tres6zero.onrender.com`)

## Estrutura

```text
tres6zero/
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

Copie `.env.example` para `.env` e preencha os valores locais. Nao coloque secrets em variaveis `VITE_*`, porque tudo que começa com `VITE_` entra no bundle publico do navegador.

## Build local

```bash
npm run build:web
npm run build:server
npm run typecheck
```

## Deploy na Vercel

Use a raiz do repositorio como Root Directory do projeto Vercel.

Configuracao esperada:

- Install Command: `npm install --workspace=@tres6zero/web --include-workspace-root=false`
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

Somente variaveis publicas devem ir para a Vercel. Service accounts, private keys e tokens ficam fora do client.

## Deploy no Render

O backend deve ser publicado no Render usando `render.yaml` ou os comandos:

```bash
npm install --workspace=@tres6zero/server --include-workspace-root=false
npm run build:server
npm run start --workspace=@tres6zero/server
```

Variaveis no Render:

```text
PUBLIC_BACKEND_URL=https://tres6zero.onrender.com
FRONTEND_URL=https://seu-frontend.vercel.app
CORS_ORIGINS=https://seu-frontend.vercel.app
ALLOW_VERCEL_PREVIEWS=true
```

## URLs uteis

- Frontend local: `http://localhost:5173`
- Backend local: `http://localhost:3333`
- Health backend: `http://localhost:3333/health`
- Backend Render: `https://tres6zero.onrender.com`
