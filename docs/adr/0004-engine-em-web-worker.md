# ADR-0004 — Stockfish em Web Worker atrás de EngineProvider

- **Estado:** aceito
- **Data:** 2026-09-09

## Contexto

Análise de xadrez é longa e limitada por CPU. Rodando na main thread, congela a
interface. Além disso, a UI muda de posição o tempo todo, porque o usuário navega
no histórico. Respostas de análises antigas chegam depois e, se aplicadas,
mostram avaliação errada na posição errada.

## Decisão

Toda comunicação com a engine passa por um Web Worker e por uma interface:

```ts
export interface EngineProvider {
  init(): Promise<void>
  analyzePosition(
    fen: string,
    options: { nodes?: number; depth?: number; multiPv?: number; showWdl?: boolean },
  ): Promise<EngineAnalysis>
  stop(): Promise<void>
  dispose(): Promise<void>
}
```

Comportamento obrigatório: handshake UCI, fila serializada de comandos, ID por
análise, **rejeição de resposta obsoleta**, cancelamento, timeout com restart do
worker e descarte limpo.

Build inicial: **lite single-threaded**, cerca de 7 MB, recomendada pelo próprio
`stockfish.js` para uso web. Orçamento de análise por **nodes**, não apenas por
profundidade fixa.

## Consequências

- Nenhum componente conhece UCI. Os testes de contrato exercitam a interface, não
  o protocolo.
- A engine nunca carrega na landing, apenas no primeiro uso que a exige.
- Trocar de build (multi-thread, NNUE maior) vira mudança de implementação do
  provider, não do produto.
