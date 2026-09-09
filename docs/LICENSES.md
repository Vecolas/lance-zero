# LICENSES — inventário de dependências e dados

Regra do projeto: **nenhuma dependência entra sem uma linha aqui**, com pacote,
versão, licença, motivo de uso e URL de origem. A mesma informação alimenta a
página pública `/licenses` (`src/lib/legal/licenses.ts`).

## Em uso (Fase 0)

| Pacote                                            | Versão | Licença     | Motivo                                      | Fonte                                                    |
| ------------------------------------------------- | ------ | ----------- | ------------------------------------------- | -------------------------------------------------------- |
| `next`                                            | 16.3.4 | MIT         | Framework, roteamento, build                | https://github.com/vercel/next.js                        |
| `react`                                           | 19.2.8 | MIT         | UI                                          | https://github.com/facebook/react                        |
| `react-dom`                                       | 19.2.8 | MIT         | UI                                          | https://github.com/facebook/react                        |
| `typescript`                                      | 5.9.3  | Apache-2.0  | Tipagem estática                            | https://github.com/microsoft/TypeScript                  |
| `eslint`                                          | 9.39.5 | MIT         | Análise estática                            | https://github.com/eslint/eslint                         |
| `eslint-config-next`                              | 16.3.4 | MIT         | Regras Next/React/a11y                      | https://github.com/vercel/next.js                        |
| `prettier`                                        | 3.9.6  | MIT         | Formatação                                  | https://github.com/prettier/prettier                     |
| `vitest`                                          | 5.0.0  | MIT         | Testes unitários                            | https://github.com/vitest-dev/vitest                     |
| `@vitejs/plugin-react`                            | 6.1.1  | MIT         | Transform JSX nos testes                    | https://github.com/vitejs/vite-plugin-react              |
| `jsdom`                                           | 30.0.1 | MIT         | Ambiente DOM nos testes                     | https://github.com/jsdom/jsdom                           |
| `@testing-library/react`                          | 16.3.3 | MIT         | Testes de componente por papel acessível    | https://github.com/testing-library/react-testing-library |
| `@testing-library/jest-dom`                       | 7.0.1  | MIT         | Matchers de DOM                             | https://github.com/testing-library/jest-dom              |
| `@types/node`, `@types/react`, `@types/react-dom` | —      | MIT         | Tipos                                       | https://github.com/DefinitelyTyped/DefinitelyTyped       |
| Inter (via `next/font/google`)                    | —      | SIL OFL 1.1 | Tipografia de interface, servida localmente | https://github.com/rsms/inter                            |

## Previstos (entram junto com a fase que os exige)

| Pacote / dado                 | Licença                 | Motivo                   | Fase | Fonte                                              |
| ----------------------------- | ----------------------- | ------------------------ | ---- | -------------------------------------------------- |
| `chess.js`                    | BSD-2-Clause            | Regras, FEN, PGN         | 1    | https://github.com/jhlywa/chess.js                 |
| `react-chessboard`            | MIT                     | Componente de tabuleiro  | 1    | https://github.com/Clariity/react-chessboard       |
| `@playwright/test`            | Apache-2.0              | E2E                      | 1    | https://github.com/microsoft/playwright            |
| `stockfish.js` (Stockfish 18) | **GPL-3.0**             | Engine WASM              | 2    | https://github.com/nmrugg/stockfish.js             |
| `ts-fsrs`                     | MIT                     | Revisão espaçada         | 4    | https://github.com/open-spaced-repetition/ts-fsrs  |
| Lichess puzzle database       | CC0-1.0                 | Puzzles táticos          | 3    | https://database.lichess.org/#puzzles              |
| `lichess-org/chess-openings`  | CC0-1.0                 | Nomes e códigos ECO      | 9    | https://github.com/lichess-org/chess-openings      |
| Lichess Opening Explorer API  | Termos da API Lichess   | Estatísticas de abertura | 9    | https://lichess.org/api                            |
| Lichess Tablebase API         | Termos da API Lichess   | Finais perfeitos         | 8    | https://lichess.org/api                            |
| Chess.com Published-Data API  | Termos de uso Chess.com | Importação de partidas   | 6    | https://www.chess.com/news/view/published-data-api |

## Stockfish e GPL-3.0 — a restrição que molda a arquitetura

O Stockfish é GPL-3.0. Para não contaminar a licença do restante do projeto, os
artefatos distribuídos ficam **isolados**:

```
public/engine/stockfish/
├── stockfish-lite-single.js
├── stockfish-lite-single.wasm
├── COPYING.txt        # texto integral da GPL-3.0
└── SOURCE.txt         # versão, tag, commit e URL exatos de origem
```

Regras:

- não modificar o código da engine no MVP;
- não fazer bundling da engine dentro do bundle da aplicação;
- carregar apenas via Web Worker, a partir de `public/`;
- registrar versão e hash do artefato.

## Por que não Chessground

O Chessground (biblioteca de tabuleiro do Lichess) é GPL-3.0 e o próprio projeto
afirma que o site combinado deve ser distribuído sob GPL. Para preservar
liberdade sobre a licença do LanceZero, o núcleo usa `react-chessboard` (MIT).

## Dados abertos

O banco de puzzles do Lichess e o `chess-openings` são CC0-1.0 — domínio público,
sem exigência de atribuição. O LanceZero credita mesmo assim, na página
`/licenses`, por honestidade com a origem dos dados.

## Uso das APIs

- **Lichess**: uma requisição por vez; em HTTP 429, aguardar um minuto inteiro
  antes de retomar; cachear; nunca raspar HTML.
- **Chess.com**: apenas a PubAPI oficial de leitura, com User-Agent descritivo;
  respeitar ETag/Last-Modified; cachear e deduplicar; nunca raspar HTML.
