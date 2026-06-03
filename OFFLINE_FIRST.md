# SIX3 Offline-First

## Como Funciona

O SIX3 agora tem uma camada offline no frontend em `apps/web/src/offline`. Ela usa IndexedDB para manter dados locais, fila de sincronizacao, arquivos pendentes, cache de respostas, conflitos e logs.

Quando o usuario esta online, o app segue usando o backend, Supabase e Firebase normalmente, mas tambem guarda copias locais dos dados importantes. Quando esta offline, eventos, videos e uploads podem continuar sendo criados ou alterados no dispositivo. Ao voltar a internet, a fila tenta enviar tudo automaticamente.

## O Que Funciona Offline

- Abrir o app depois do primeiro carregamento online.
- Navegar pelas rotas principais ja carregadas.
- Usar a sessao local do ultimo login conhecido.
- Ver eventos e videos ja carregados antes.
- Criar, editar, arquivar e excluir eventos localmente.
- Criar, atualizar e excluir registros de videos localmente.
- Guardar uploads de imagem, video, template, avatar e musica como arquivos pendentes.
- Ver status de sincronizacao e itens aguardando envio.
- Exportar logs locais para suporte.

## O Que Precisa De Internet

- Primeiro login em um dispositivo novo.
- Confirmacao real de pagamento, plano e permissoes no servidor.
- Envio final de arquivos para Supabase.
- Publicacao real de eventos/videos no Firestore.
- Recursos externos que nao foram carregados/cacheados antes.
- Operacoes administrativas sensiveis.

## Sincronizacao

Os itens pendentes ficam em `syncQueue` no IndexedDB. Cada item guarda metodo, endpoint, entidade, payload, prioridade, tentativas e erro resumido. Tokens e senhas nao sao salvos na fila.

A sincronizacao roda:

- quando a internet volta;
- em intervalos enquanto o app esta aberto;
- quando o navegador dispara Background Sync e existe uma aba aberta;
- manualmente pelo painel de pendencias.

Uploads ficam com prioridade maior para que URLs locais sejam substituidas antes do envio dos metadados de eventos/videos.

## Conflitos

Respostas `409`, `412` ou erros com indicacao de versao/conflito criam um registro em `conflicts`. A UI mostra um modal com opcoes:

- usar versao deste dispositivo;
- usar versao online;
- duplicar item;
- resolver depois.

O app nao apaga dados locais silenciosamente.

## Logs

Logs locais ficam em `logs` no IndexedDB. Eles registram abertura offline, retorno online, itens criados offline, inicio/falha/sucesso de sync, conflito e upload pendente. Dados sensiveis como token, senha e authorization sao mascarados.

O painel de pendencias tem botao `Logs`, que baixa um JSON para suporte.

## Como Testar

1. Abra o app online e acesse dashboard, eventos, videos, templates e gravar.
2. Desative a internet no navegador ou no sistema.
3. Recarregue a pagina. O shell deve abrir.
4. Crie um evento offline. Ele deve aparecer na lista e indicar envio pendente.
5. Edite ou arquive o evento offline.
6. Grave ou selecione um arquivo enquanto offline. O upload deve ficar pendente.
7. Feche o navegador, abra novamente ainda offline e confira se os dados continuam.
8. Volte online. O banner deve mostrar sincronizacao e depois `Tudo sincronizado`.
9. Simule erro de API. O item deve permanecer pendente ou falho, com opcao de tentar novamente.
10. No mobile, instale o PWA e repita o fluxo offline.

## Como Limpar Dados Locais

Pelo DevTools:

1. Application.
2. IndexedDB.
3. Remova o banco `six3-offline`.
4. Em Cache Storage, remova caches com prefixo `six3-`.
5. Recarregue o app online.

Tambem existe a funcao `clearOfflineDatabase()` em `apps/web/src/offline/db.ts` para uso tecnico/controlado.

## Arquivos Principais

- `apps/web/public/sw.js`: service worker, cache de shell/assets/API e fallback offline.
- `apps/web/public/manifest.webmanifest`: manifest instalavel.
- `apps/web/public/offline.html`: fallback amigavel quando nao houver shell cacheado.
- `apps/web/src/offline/db.ts`: IndexedDB.
- `apps/web/src/offline/syncQueue.ts`: fila persistente.
- `apps/web/src/offline/syncEngine.ts`: processamento da fila.
- `apps/web/src/offline/fileOfflineStore.ts`: blobs e uploads pendentes.
- `apps/web/src/offline/localDataStore.ts`: eventos/videos e outros registros locais.
- `apps/web/src/offline/cacheManager.ts`: cache de respostas importantes.
- `apps/web/src/offline/networkStatus.ts`: estado online/offline.
- `apps/web/src/components/offline`: banner, badge, painel, toast e modal.
- `apps/web/src/hooks/useNetworkStatus.ts`: status de conexao.
- `apps/web/src/hooks/useOfflineSync.ts`: resumo e acoes de sync.
- `apps/web/src/services/eventService.ts`: eventos offline-first.
- `apps/web/src/services/videoService.ts`: videos offline-first.
- `apps/web/src/services/serverMediaService.ts`: uploads offline-first.

## Limites Atuais

O servidor continua sendo a autoridade de permissoes, plano e dados finais. O modo offline usa o ultimo estado confiavel conhecido apenas para manter o trabalho local do usuario. Se uma permissao tiver mudado enquanto o usuario estava offline, o backend valida novamente na sincronizacao.

