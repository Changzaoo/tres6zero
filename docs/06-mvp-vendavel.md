# MVP Vendavel

## Objetivo do MVP

Vender uma plataforma simples e confiavel para operadores de experiencias 360 publicarem videos com template, efeito, trilha, QR Code e pagina de entrega.

## Produto minimo recomendado

O MVP nao deve tentar ser um CapCut completo. Ele deve ser uma esteira de entrega profissional para videos 360:

1. Criar conta.
2. Pagar plano.
3. Criar evento ou video avulso.
4. Enviar/gravar video.
5. Aplicar template, efeito, musica e duracao.
6. Publicar link com QR Code.
7. Ver metricas basicas.

## Funcao central

Gerar e publicar um video 360 finalizado com identidade visual do evento, sem o operador precisar editar manualmente fora da plataforma.

## O que precisa estar impecavel

| Area | Criterio |
|---|---|
| Cadastro/login | Rapido, sem erro e com recuperacao clara |
| Pagamento | Checkout confiavel e retorno correto ao app |
| Editor | Preview fiel ao resultado final |
| Upload | Barra de progresso e erro claro |
| Render local | Nao travar e gerar video nao preto |
| QR/link | Abrir corretamente em celular |
| Mobile | Operar em evento sem sidebar lateral |
| Suporte | Ter caminho claro para resolver problema |

## Funcionalidades essenciais para vender

| Funcionalidade | Por que vende | Status |
|---|---|---|
| Planos e bloqueio | Permite monetizacao | Existente |
| Editor local | Entrega valor central | Existente |
| Templates bonitos | Aumenta percepcao premium | Parcial |
| Galeria/video publico | Entrega final ao cliente | Existente |
| QR Code | Facilita uso em evento | Existente |
| Leads | Justifica valor para empresas | Existente |
| Dashboard | Mostra resultado | Existente |
| Suporte | Reduz churn | Existente |

## Escopo recomendado por plano

| Plano | Preco | Foco | Recursos |
|---|---:|---|---|
| Essencial | R$ 69,99/mes | Comecar | Templates essenciais, QR, galeria, leads basicos, efeitos basicos |
| Profissional | R$ 129,99/mes | Operar com frequencia | Templates premium, upload customizado, CSV, analytics, efeitos populares |
| Ilimitado | R$ 199,99/mes | Escalar | IA auto edit, tudo liberado, suporte prioritario, analytics completo |

## Telas necessarias para vender

| Tela | Status | Observacao |
|---|---|---|
| Landing page | Existente | Precisa foco em demonstracao visual real |
| Login/cadastro | Existente | Cadastro usa usuario `@six3.com` |
| Dashboard | Existente | Ja usa dados reais |
| Funcao principal `/app/gravar` | Existente | Principal tela do MVP |
| Resultado/publicacao | Existente | Link, QR e compartilhar |
| Planos | Existente | Precos atuais corretos |
| Checkout | Existente | Stripe |
| Perfil/conta | Existente | Configuracoes completas |
| Admin simples | Existente | Suporte/clientes |

## Checklist de MVP

- [x] Landing page clara
- [x] CTA principal
- [x] Login funcionando
- [x] Cadastro funcionando
- [x] Recuperacao interna de senha
- [x] Dashboard funcional
- [x] Funcao principal funcionando
- [x] Resultado gerado
- [x] Plano pago definido
- [x] Checkout configurado
- [ ] Assinatura recorrente Stripe Billing completa
- [ ] Termos de uso publicados
- [ ] Politica de privacidade publicada
- [ ] Logs e monitoramento suficientes
- [x] Deploy funcionando
- [ ] Teste mobile completo em evento real
- [ ] Teste desktop completo
- [ ] Curadoria profissional de templates
- [ ] Testes automatizados criticos

## O que deve ficar fora do MVP

- Editor de video avancado com multiplas faixas complexas.
- Biblioteca enorme de musicas com risco autoral.
- Processamento pesado no Render sem worker.
- Marketplace de templates.
- Multi-operador/funcionarios, porque o produto atual e SaaS para o usuario/empresa, nao equipe operacional.

## MVP vendavel em uma frase

SIX3° permite que operadores de 360 publiquem videos com template, efeito, musica e QR Code em poucos minutos, com uma entrega mais bonita e organizada para o cliente.

## Prioridade maxima

Garantir que o fluxo `/app/gravar` funcione 100% em celular e desktop, incluindo camera, upload, preview, render, upload final, QR Code e pagina publica.
