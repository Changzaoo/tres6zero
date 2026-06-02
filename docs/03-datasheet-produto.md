# Datasheet do Produto

## Produto

SIX3°

## Tipo

SaaS B2B/B2C para operadores de Photo Booth 360, empresas de eventos, agencias, ativacoes de marca e criadores que precisam entregar videos curtos com aparencia premium.

## Proposta de valor

Transformar a operacao de videos 360 em um fluxo digital completo: gravar, editar, publicar, compartilhar, captar leads e medir resultado em uma unica plataforma.

## Publico alvo

| Perfil | Dor | Valor entregue |
|---|---|---|
| Operador de plataforma 360 | Precisa entregar videos rapido e com marca | Editor, templates, QR e galeria |
| Empresa de eventos | Quer profissionalizar entrega ao cliente | Evento com pagina publica e metricas |
| Agencia/ativacao | Precisa coletar leads e comprovar impacto | Leads, analytics e compartilhamentos |
| Pequeno negocio | Quer vender experiencia moderna | Plano acessivel e fluxo simples |

## Funcionalidades principais

| Funcionalidade | Descricao | Status |
|---|---|---|
| Landing page | Apresenta produto, beneficios e planos | Existente |
| Cadastro | Conta com nome de usuario `@six3.com` | Existente |
| Login | Firebase Auth | Existente |
| Recuperacao de senha | Desafios internos mascarados | Existente |
| Planos | Essencial, Profissional, Ilimitado | Existente |
| Checkout | Stripe Checkout | Existente |
| Renovacao mensal | Controle por periodo no Stripe customer metadata | Parcial |
| Dashboard | Eventos, videos, leads, shares, views, downloads | Existente |
| Eventos | Criar, editar, duplicar, status e slug publico | Existente |
| Pagina publica | Galeria e video publico com QR | Existente |
| Gravacao | Camera com MediaRecorder | Existente |
| Upload de video | Upload server-side para Supabase | Existente |
| Editor | Templates, efeitos, trilha, duracao e timeline | Existente |
| Render local | Canvas + MediaRecorder | Existente |
| Templates | Catalogo gerado, filtros e preview | Existente |
| Templates animados | WebM animado no catalogo/editor | Parcial |
| Upload de template | PNG, SVG, WebP, WebM | Existente |
| Musicas | Catalogo gerado/customizado e preview | Existente |
| Upload de musica | MP3/WAV/AAC/OGG/WebM | Existente |
| Leads | Captura e listagem | Existente |
| Analytics | Relatorios e graficos | Existente |
| Suporte | Conversas app/admin e anonimo | Existente |
| Notificacoes | In-app, preferencias e broadcast | Existente |
| Admin | Clientes, suporte e controles | Existente |
| Offline | Cache de shell, assets, API GET e media | Parcial |

## Planos atuais

| Plano | Preco | Perfil | Recursos principais |
|---|---:|---|---|
| Essencial SIX3° | R$ 69,99/mes | Inicio de operacao | Templates essenciais, QR, galeria, leads basicos, offline recente, efeitos basicos |
| Profissional SIX3° | R$ 129,99/mes | Operacao frequente | Premium, upload customizado, sync offline, CSV, efeitos populares, analytics |
| Ilimitado SIX3° | R$ 199,99/mes | Escala | IA auto edit, tudo liberado, suporte prioritario, analytics completo |

## Recursos por plano

| Recurso | Essencial | Profissional | Ilimitado |
|---|---|---|---|
| Templates essenciais | Sim | Sim | Sim |
| Templates premium | Nao | Sim | Sim |
| Upload de templates/musicas | Nao | Sim | Sim |
| Galeria publica | Sim | Sim | Sim |
| QR Code | Sim | Sim | Sim |
| Leads basicos | Sim | Sim | Sim |
| Exportacao CSV | Nao | Sim | Sim |
| Efeitos basicos | Sim | Sim | Sim |
| Efeitos populares | Nao | Sim | Sim |
| IA auto edit | Nao | Nao | Sim |
| Suporte prioritario | Nao | Nao | Sim |

## Indicadores do produto

| Indicador | Fonte | Importancia |
|---|---|---|
| Total de eventos | Firestore events | Mede uso operacional |
| Total de videos | Firestore videos | Mede volume produzido |
| Leads | Firestore leads | Mede retorno comercial |
| Views | Campo `views` dos videos | Mede alcance |
| Downloads | Campo `downloads` dos videos | Mede entrega |
| Shares | Campo `shares` dos videos | Mede viralizacao |
| Eventos ativos | Status do evento | Mede operacao em andamento |
| Taxa de compartilhamento | shares/videos | Mede valor percebido |

## Diferenciais

- Editor local reduz dependencia de servidor pesado.
- Combina entrega visual com captura de leads.
- Foco em evento real, QR Code e galeria publica.
- Templates e trilhas fazem a entrega parecer mais premium.
- Suporte interno e anonimo reduz atrito de login.
- Admin consegue acompanhar suporte e clientes.

## Limitacoes atuais

- Render server-side de video precisa continuar desativado ou ser movido para worker/fila.
- Pagamento mensal ainda nao e assinatura recorrente nativa completa.
- Templates gerados por codigo precisam curadoria visual.
- Offline completo ainda nao cobre fluxos de upload e sincronizacao complexos.
- Falta suite robusta de testes automatizados.

## Requisitos nao funcionais

| Requisito | Situacao |
|---|---|
| Mobile-first | Parcialmente atendido |
| Performance inicial | Melhorada com lazy loading, mas ainda exige auditoria |
| Seguranca de secrets | Atendida por separacao Vercel/Render |
| Escalabilidade de video | Ponto critico |
| Usabilidade para usuario comum | Boa base, requer polimento |
| Observabilidade | Basica |

## Estado de mercado

O produto pode vender para operadores que hoje editam videos manualmente em ferramentas externas e compartilham de forma improvisada. O valor esta em reduzir tempo de entrega, melhorar apresentacao e criar uma camada comercial com leads e analytics.
