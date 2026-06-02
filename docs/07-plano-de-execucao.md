# Plano de Execucao

## Etapa 1 - Organizacao

- Revisar estrutura do monorepo.
- Remover codigo morto e assets antigos sem uso.
- Corrigir textos com encoding quebrado.
- Padronizar nomes entre "Gravar", "Operador" e rotas.
- Garantir que `npm run build:web` e `npm run build:server` passem sempre.
- Criar checklist de variaveis por ambiente.

## Etapa 2 - Experiencia do Usuario

- Melhorar landing page com demonstracao visual real do fluxo.
- Polir mobile do app, principalmente `/app/gravar` e `/app/templates`.
- Deixar CTA principal claro: "Comecar a jornada".
- Simplificar navegacao para usuario iniciante.
- Criar estados vazios guiando o primeiro video.
- Revisar textos de erro e loading.

## Etapa 3 - Funcionalidade Principal

- Testar gravacao em Chrome/Android, iOS/Safari e desktop.
- Garantir que video final nunca fique preto.
- Validar overlay transparente no resultado final.
- Validar musicas, efeitos e duracoes 5/15/25/35/45.
- Melhorar preview para refletir o resultado.
- Criar fallback claro quando browser nao suporta render local.

## Etapa 4 - Monetizacao

- Revisar copy de planos.
- Garantir bloqueio por plano no client e no backend.
- Migrar para Stripe Billing recorrente se a renovacao mensal precisar ser automatica.
- Criar painel de assinatura mais claro.
- Criar mensagens de upgrade contextuais nos cadeados.

## Etapa 5 - Seguranca e Producao

- Conferir Firebase Rules e Supabase policies.
- Manter service role e OpenAI key somente no Render.
- Configurar logs de erro.
- Adicionar testes para auth, billing, recovery e upload.
- Monitorar memoria do Render.
- Evitar processamento server-side sem fila.
- Revisar CORS e headers.

## Etapa 6 - Lancamento

- Criar beta com poucos operadores reais.
- Coletar feedback em eventos reais.
- Medir tempo medio ate publicar primeiro video.
- Ajustar templates com base em uso real.
- Ajustar preco se necessario.
- Lançar para primeiros clientes pagantes.

## Tabela de execucao

| Etapa | Prioridade | Impacto | Dificuldade | Status |
|---|---|---|---|---|
| Corrigir fluxo principal de video | Alta | Muito alto | Alta | Em andamento |
| Polir mobile | Alta | Alto | Media | Parcial |
| Curar templates profissionais | Alta | Alto | Media | Parcial |
| Recorrencia Stripe Billing | Alta | Alto | Media | Planejado |
| Termos e privacidade | Alta | Medio | Baixa | Planejado |
| Testes automatizados | Alta | Alto | Media | Planejado |
| Monitoramento de erros | Media | Alto | Media | Planejado |
| Landing com demonstracao real | Media | Alto | Media | Parcial |
| Fila/worker de video | Media | Alto | Alta | Planejado |
| Biblioteca musical segura | Media | Medio | Media | Parcial |

## Ordem recomendada para os proximos 10 dias

1. Testar fluxo de video ponta a ponta em mobile e desktop.
2. Corrigir qualquer bug de render/overlay/audio.
3. Publicar termos e politica.
4. Melhorar landing com video/demo real.
5. Ajustar checkout/assinatura.
6. Rodar beta com 3 a 5 usuarios.
7. Medir erros e feedback.
8. Curar templates de maior impacto.
9. Revisar precos/planos.
10. Preparar lancamento pago.

## Resultado esperado

Ao final dessa execucao, o produto deve estar pronto para vender para operadores que aceitam uma versao beta estavel, com suporte proximo e foco em entrega rapida.
