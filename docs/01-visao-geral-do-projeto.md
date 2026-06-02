# Visao Geral do Projeto

## Nome da aplicacao

SIX3°

## Categoria

SaaS para operacao de experiencias 360, edicao de videos no navegador, galerias publicas, captura de leads, templates visuais, trilhas sonoras, QR Code, pagamentos e suporte.

## Descricao curta

SIX3° ajuda operadores de experiencias 360 a gravar, editar, publicar e vender entregas digitais com aparencia profissional, direto pelo navegador.

## Descricao completa

O projeto e uma plataforma SaaS focada em eventos e ativacoes com videos 360. O usuario cria uma conta, escolhe um plano, cria eventos ou videos avulsos, grava ou envia videos, aplica templates transparentes, efeitos, trilhas, duracao final e publica um link com QR Code para compartilhar com o cliente.

A aplicacao tambem tem area de templates, upload de templates e musicas customizadas, dashboard com metricas reais, suporte por mensagens, painel admin, sistema de notificacoes, controle de dispositivos, recuperacao interna de senha e regras por plano.

O frontend roda em Vercel com React, Vite, TypeScript e Tailwind. O backend roda no Render com Node.js, Express e TypeScript. Firebase e usado para autenticacao, perfil, Firestore e admin SDK. Supabase Storage guarda videos, templates e musicas. Stripe Checkout processa pagamento mensal. A edicao de video pesada foi movida para o navegador sempre que possivel para reduzir risco de estouro de memoria no Render.

## Stack utilizada

| Area | Tecnologia | Status |
|---|---|---|
| Frontend | React, Vite, TypeScript, Tailwind, Framer Motion | Existente |
| Backend | Node.js, Express, TypeScript | Existente |
| Autenticacao | Firebase Auth + Firebase Admin | Existente |
| Banco operacional | Firestore | Existente |
| Storage | Supabase Storage | Existente |
| Pagamentos | Stripe Checkout | Existente |
| Video | Canvas, MediaRecorder, FFmpeg/Python opcional | Parcial |
| IA | OpenAI no backend, automacao local no editor | Parcial |
| Deploy frontend | Vercel | Existente |
| Deploy backend | Render | Existente |
| PWA/offline | Service Worker e cache local | Parcial |

## Estrutura principal

```text
/
├── apps/
│   ├── web/       # React/Vite, paginas, componentes e servicos client
│   └── server/    # Express, rotas, Firebase Admin, Stripe, Supabase
├── packages/
│   └── shared/    # Tipos compartilhados
├── docs/          # Documentacao do produto e blueprint
├── scripts/       # Scripts auxiliares
├── render.yaml    # Deploy do backend no Render
└── vercel.json    # Deploy do frontend no Vercel
```

## Paginas existentes

| Rota | Funcao | Status |
|---|---|---|
| `/` | Landing page | Existente |
| `/plans` | Planos publicos | Existente |
| `/login` | Login | Existente |
| `/register` | Cadastro com usuario `@six3.com` | Existente |
| `/forgot-password` | Recuperacao interna por verificacoes mascaradas | Existente |
| `/app/dashboard` | Resumo real de eventos, videos, leads e graficos | Existente |
| `/app/events` | Lista e gestao de eventos | Existente |
| `/app/events/new` | Criacao de evento | Existente |
| `/app/gravar` | Gravacao, upload, editor, timeline e publicacao | Existente |
| `/app/videos` | Biblioteca de videos | Existente |
| `/app/templates` | Catalogo, filtros, upload de templates e musicas | Existente |
| `/app/leads` | Leads capturados | Existente |
| `/app/analytics` | Relatorios | Existente |
| `/app/billing` | Planos, checkout e status de acesso | Existente |
| `/app/settings` | Perfil, senha, tema, dispositivos e notificacoes | Existente |
| `/app/support` | Suporte por mensagens | Existente |
| `/app/admin` | Painel administrativo | Existente |
| `/g/:eventSlug` | Galeria publica de evento | Existente |
| `/v/:videoId` | Video publico | Existente |

## Servicos externos

| Servico | Uso | Observacao |
|---|---|---|
| Firebase Auth | Login, cadastro, sessao e senha | Identificador interno usa `@six3.com` |
| Firebase Admin/Firestore | Perfis, eventos, videos, leads, suporte, notificacoes | Deve ficar somente no backend |
| Supabase Storage | Videos, templates, musicas, assets customizados | Chave service role somente no Render |
| Stripe | Checkout e renovacao mensal manual por acesso | Webhook confirma pagamento |
| OpenAI | Direcao de IA opcional no backend | Chave nunca deve ir ao client |
| Vercel | Frontend | Apenas variaveis publicas |
| Render | Backend | Segredos ficam aqui |

## Fluxos principais do usuario

1. Visitante entra na landing page.
2. Clica em CTA e cria conta.
3. Escolhe um plano.
4. Faz pagamento no Stripe.
5. A assinatura ativa libera recursos.
6. Usuario cria evento ou grava video avulso.
7. Escolhe template, efeito, trilha e duracao.
8. Renderiza no navegador e envia ao Supabase.
9. Publica video com link e QR Code.
10. Cliente acessa galeria/video e pode gerar leads, visualizacoes e compartilhamentos.

## Fluxo de permissao

- Usuario sem login: acessa landing, planos, login, cadastro, suporte anonimo e galerias publicas.
- Usuario logado sem pagamento: acessa planos, configuracoes, suporte e videos ja publicados.
- Usuario pagante: acessa recursos conforme plano.
- Admin: acesso ilimitado, painel admin, clientes pagantes, suporte e seed de templates.

## Principais funcionalidades

| Funcionalidade | Descricao | Status |
|---|---|---|
| Login/cadastro | Autenticacao via Firebase | Existente |
| Recuperacao de senha | 5 verificacoes mascaradas e reset interno | Existente |
| Controle de dispositivos | Registra IP, localizacao e permite desconectar | Existente |
| Assinatura | Stripe Checkout e webhook | Existente |
| Planos | Starter, Pro e Unlimited | Existente |
| Dashboard | Cards e graficos reais | Existente |
| Eventos | Perfil estilo pagina publica com capa, avatar, midias, slug | Existente |
| Gravacao | Camera, upload e preview | Existente |
| Editor | Template, efeito, trilha, duracao e timeline | Existente |
| Render local | Canvas + MediaRecorder | Existente |
| Render server | Python/FFmpeg opcional | Parcial/desativavel |
| Templates | Gerados, animados, customizados e filtros | Existente |
| Musicas | Geradas/customizadas e preview | Existente |
| Leads | Captura e listagem | Existente |
| Suporte | Chat admin/usuario e anonimo | Existente |
| Notificacoes | In-app, preferencias e broadcast admin | Existente |
| Offline/PWA | Cache, service worker e fallback | Parcial |

## Problemas e riscos encontrados

- O backend no Render pode estourar memoria se processamento server-side de video for ativado sem fila/worker.
- O fluxo de pagamento usa `mode: payment` e metadata para acesso mensal; nao e uma assinatura Stripe Billing recorrente completa.
- Alguns textos aparecem com codificacao quebrada em arquivos existentes, indicando risco de encoding em PT-BR.
- O PWA ajuda offline, mas ainda nao garante operacao completa offline para todos os fluxos com upload/sync.
- Templates gerados por codigo podem nao ter nivel visual comparavel a bibliotecas profissionais se nao houver curadoria.
- O envio de musicas com direitos autorais precisa de cuidado juridico para uso comercial ou publicacao publica.

## Conclusao da visao geral

O projeto ja tem uma base funcional de SaaS, com frontend, backend, autenticacao, pagamento, storage, editor, suporte e planos. Para ficar vendavel com menor risco, o MVP deve focar em um fluxo principal impecavel: criar conta, pagar, gravar/enviar video, aplicar template/efeito/trilha, publicar link/QR e acompanhar metricas basicas.
