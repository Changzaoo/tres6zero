# Tres6Zero – Plataforma 360 Photo Booth

Sistema completo para empresas de plataforma 360 photo booth: gravação, upload, galeria pública, QR Code, leads, templates, dashboard e muito mais.

## Stack

- **Frontend**: React + Vite + TypeScript + Tailwind + Framer Motion
- **Backend**: Node.js + Express + TypeScript
- **Database**: Firebase Firestore + Realtime Database
- **Storage**: Firebase Storage
- **Auth**: Firebase Auth (Email/Password)

## Estrutura

```
tres6zero/
├── apps/
│   ├── web/         # Frontend React
│   └── server/      # Backend Express
├── packages/
│   └── shared/      # Tipos compartilhados
├── scripts/         # Scripts utilitários
├── .env             # Variáveis (não commitar)
├── .env.example     # Modelo de variáveis
└── firebase.rules.example
```

## Instalação

```bash
cd D:\tres6zero
npm install
```

## Configurar .env

Copie `.env.example` para `.env` e preencha:

```
PORT=3333
FRONTEND_URL=http://localhost:5173
PUBLIC_BACKEND_URL=https://seu-tunel.ngrok-free.dev
NGROK_AUTHTOKEN=seu_token_aqui
VITE_API_URL=https://seu-tunel.ngrok-free.dev
VITE_FIREBASE_API_KEY=...
# (demais variáveis do Firebase)
```

## Rodar em desenvolvimento

```bash
# Rodar frontend (porta 5173)
npm run dev:web

# Rodar backend (porta 3333)
npm run dev:server

# Rodar ambos
npm run dev
```

## Build

```bash
npm run build
```

## Firebase – Configuração obrigatória

1. Acesse https://console.firebase.google.com
2. Projeto: `forge-d690c`
3. Ative **Authentication** → Sign-in methods → **Email/Password**
4. Ative **Firestore Database** → Modo de produção
5. Ative **Storage**
6. Aplique as regras de `firebase.rules.example` no console

## Ngrok

1. Crie conta em https://ngrok.com
2. Copie o authtoken
3. Defina `NGROK_AUTHTOKEN=seu_token` no `.env`
4. Para iniciar com ngrok: `node scripts/start-local-backend.js`

## URLs

| URL | Descrição |
|-----|-----------|
| http://localhost:5173 | Frontend |
| http://localhost:3333 | Backend local |
| http://localhost:5173/app/dashboard | Dashboard |
| http://localhost:5173/app/operator | Modo Operador |
| http://localhost:5173/g/:slug | Galeria pública |
| http://localhost:3333/health | Saúde do backend |

## Primeiro usuário admin

O primeiro usuário cadastrado vira **admin** automaticamente (sem nenhum admin existente no banco).

## Fluxo completo de uso

1. Acesse `/register` e crie sua conta
2. Vá em **Eventos** → **Novo evento**
3. Configure nome, data, local, tipo
4. Ative o evento (status = Ativo)
5. Acesse **Modo Operador**
6. Selecione o evento, grave ou envie o vídeo
7. Salve → QR Code gerado automaticamente
8. Convidado escaneia o QR → acessa galeria → baixa/compartilha
9. Acompanhe tudo no **Dashboard**

## Deploy

### Frontend (Vercel)
```bash
cd apps/web
npx vercel --prod
```

### Backend
O backend roda localmente. Use ngrok para expor publicamente.
Para deploy em nuvem: Railway, Render, Fly.io.

## Push no GitHub

```bash
git init
git add .
git commit -m "feat: build complete Tres6Zero 360 event platform"
git branch -M main
git remote add origin https://github.com/Changzaoo/tres6zero.git
git push -u origin main
```

## Roadmap Futuro

- [ ] Processamento real com FFmpeg
- [ ] IA para seleção automática de melhores momentos
- [ ] Integração WhatsApp Business API
- [ ] Pagamentos e assinatura
- [ ] App mobile nativo
- [ ] Remoção de fundo com IA
- [ ] Marketplace de templates
- [ ] Multi-empresa / multi-operador
