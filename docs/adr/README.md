# Architecture Decision Records

Registro leve de decisões arquiteturais, no formato de Michael Nygard.

Um ADR é criado quando uma decisão é cara de reverter: escolha de biblioteca com
implicação de licença, fronteira de camada, formato de dado persistido,
dependência externa. Correções e refatorações comuns não precisam de ADR.

Estados: `proposto`, `aceito`, `substituído por ADR-XXXX`, `descontinuado`.

| ADR                                      | Título                                                    | Estado |
| ---------------------------------------- | --------------------------------------------------------- | ------ |
| [0001](./0001-usar-adrs.md)              | Usar ADRs para decisões arquiteturais                     | aceito |
| [0002](./0002-stack-inicial.md)          | Stack inicial: Next.js, TypeScript, pnpm, CSS Modules     | aceito |
| [0003](./0003-local-first.md)            | MVP local-first, sem backend obrigatório                  | aceito |
| [0004](./0004-engine-em-web-worker.md)   | Stockfish em Web Worker atrás de EngineProvider           | aceito |
| [0005](./0005-isolamento-gpl.md)         | Isolar artefatos GPL e não usar Chessground               | aceito |
| [0006](./0006-camadas-e-repositorios.md) | Domínio puro, persistência e serviços atrás de interfaces | aceito |
