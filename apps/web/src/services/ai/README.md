# Arquitetura de IA para Editor de Vídeo SIX3°

## Visão Geral

Sistema de Inteligência Artificial para editor de vídeo profissional, permitindo compreensão semântica completa do vídeo e edição através de linguagem natural.

## Arquitetura de Módulos

```
apps/web/src/services/ai/
├── index.ts                          # Exportação centralizada
├── hyperframesService.ts             # Representação semântica do vídeo
├── sceneUnderstandingService.ts      # Compreensão de cena
├── videoUseService.ts                # Sistema de controle de interface
├── aiConversationalService.ts        # Interface de conversação
├── semanticSearchService.ts          # Busca semântica
├── smartMaskService.ts               # Máscaras inteligentes
├── intelligentEffectsEngine.ts       # Motor de efeitos com IA
└── aiOrchestrator.ts                  # Orquestrador de IA

apps/web/src/components/ai/
├── index.ts                          # Exportação de componentes
├── AIChat.tsx                        # Chat de IA
├── AIPanel.tsx                       # Painel de IA integrado
├── HyperframesPreview.tsx            # Visualização de análise
└── EffectLibrary.tsx                 # Biblioteca de efeitos
```

## Hyperframes

Representação semântica completa do vídeo contendo:

- **Pessoas**: Rastreamento com IDs persistentes, clothing, expressões
- **Objetos**: Categorias, cores, interações
- **Câmera**: Movimento, trajetória 3D
- **Profundidade**: Mapas de profundidade
- **Embarções**: Pose, face, mãos
- **Emções**: Detecção de emoções por pessoa
- **Audio**: Transcrição, música, batidas
- **Narrativa**: Descrição semântica, tags, ações

## Integração com VideoUse

Sistema que permite controle do editor via IA:

- Detecção semântica de elementos UI
- Execução de comandos (clique, drag, type)
- Identificação de painéis e controles
- Interpretação dinâmica de interfaces

## Motor de Efeitos

Efeitos inteligentes com suporte a:

- **Auras**: 16 tipos predefinidos (fogo, elétrico, divino, anime, etc.)
- **Física**: Gravidade, vento, turbulência, colisão
- **Oclusão**: Respeito à profundidade 3D
- **Máscaras**: Acompanhamento preciso de pessoa/objeto

## Comandos de IA

O sistema interpreta comandos em linguagem natural:

```
"Adicione uma aura azul nessa pessoa"
"Transforme em estilo anime"
"Faça parecer Dragon Ball"
"Adicione relâmpagos quando ela levantar o braço"
"Mostre cenas onde ela sorri"
```

## Uso

```typescript
import { useAIOrchestrator, AIChat, AIPanel } from '@/components/ai';
import { useAIChatStore } from '@/services/ai';

// Inicializar
await useAIOrchestrator.getState().initialize();

// Processar vídeo
await useAIOrchestrator.getState().processVideo(videoId, videoElement);

// Criar efeito via intent
const intent = useAICommandParser()("Adicione uma aura de fogo");
await useAIOrchestrator.getState().executeIntent(intent);
```

## Cache Inteligente

O sistema mantém cache de:

- Tracking de pessoas
- Máscaras de segmentação
- Embeddings semânticos
- Detecções de objetos
- Análise de áudio

## Paralelismo

Processamentos simultâneos:

- Tracking de pose
- Segmentação
- Detecção de objetos
- Análise de profundidade
- Processamento de áudio
- Geração de embeddings

## Desacoplamento

Cada módulo é independente:

- `hyperframesService`: Estado de análise
- `sceneUnderstandingService`: Detecção de cena
- `videoUseService`: Interface de controle
- `smartMaskService`: Sistema de máscaras
- `intelligentEffectsEngine`: Engine de efeitos

Falha em um módulo não afeta os demais.