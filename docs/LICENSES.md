# LICENSES — inventário de dependências e dados

Regra do projeto: **nenhuma dependência entra sem uma linha aqui**, com id,
pacote, versão, licença, motivo de uso e URL de origem. A mesma informação
alimenta a página pública `/licenses` (`src/lib/legal/licenses.ts`).

## A coluna ID, e por que ela existe

Este documento é a fonte **completa**: tem versão exata e fase prevista, que a
página pública não mostra. A página é um recorte dele. Como são dois arquivos
mantidos à mão, eles já divergiram — a API de tablebase da Lichess ficou só aqui
e a página, que é o que o público lê, era a incompleta.

O portão `tests/unit/licencas-inventario.test.ts` cruza os dois e exige que cada
linha daqui esteja **ou** representada em `licenses.ts` **ou** em
`NAO_EXIBIDOS_NA_PAGINA` (`src/lib/legal/inventario-divida.ts`), com motivo
escrito.

O cruzamento é pelo **id**, não pelo nome nem pela URL: os nomes divergem de
propósito (aqui `next`, lá `Next.js`, porque a página fala com gente) e a URL não
desempata — três linhas apontam para `https://lichess.org/api`. O id é
minúsculo, sem acento, com hífen, e **não muda** depois de criado: mudá-lo é
renomear a mesma coisa nos dois lados ao mesmo tempo, e é justamente isso que o
id existe para evitar.

Toda tabela deste documento precisa da coluna `ID` — inclusive uma tabela nova.
Tabela sem `ID` seria uma tabela que o portão não confere, e o portão reprova
para que essa decisão nunca seja tomada por descuido.

## Em uso (Fases 0 e 1)

| ID                           | Pacote                                            | Versão                    | Licença                 | Motivo                                                                                                            | Fonte                                                    |
| ---------------------------- | ------------------------------------------------- | ------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `next`                       | `next`                                            | 16.3.4                    | MIT                     | Framework, roteamento, build                                                                                      | https://github.com/vercel/next.js                        |
| `react`                      | `react`                                           | 19.2.8                    | MIT                     | UI                                                                                                                | https://github.com/facebook/react                        |
| `react-dom`                  | `react-dom`                                       | 19.2.8                    | MIT                     | UI                                                                                                                | https://github.com/facebook/react                        |
| `typescript`                 | `typescript`                                      | 5.9.3                     | Apache-2.0              | Tipagem estática                                                                                                  | https://github.com/microsoft/TypeScript                  |
| `eslint`                     | `eslint`                                          | 9.39.5                    | MIT                     | Análise estática                                                                                                  | https://github.com/eslint/eslint                         |
| `eslint-config-next`         | `eslint-config-next`                              | 16.3.4                    | MIT                     | Regras Next/React/a11y                                                                                            | https://github.com/vercel/next.js                        |
| `prettier`                   | `prettier`                                        | 3.9.6                     | MIT                     | Formatação                                                                                                        | https://github.com/prettier/prettier                     |
| `vitest`                     | `vitest`                                          | 5.0.0                     | MIT                     | Testes unitários                                                                                                  | https://github.com/vitest-dev/vitest                     |
| `vitejs-plugin-react`        | `@vitejs/plugin-react`                            | 6.1.1                     | MIT                     | Transform JSX nos testes                                                                                          | https://github.com/vitejs/vite-plugin-react              |
| `jsdom`                      | `jsdom`                                           | 30.0.1                    | MIT                     | Ambiente DOM nos testes                                                                                           | https://github.com/jsdom/jsdom                           |
| `testing-library-react`      | `@testing-library/react`                          | 16.3.3                    | MIT                     | Testes de componente por papel acessível                                                                          | https://github.com/testing-library/react-testing-library |
| `testing-library-jest-dom`   | `@testing-library/jest-dom`                       | 7.0.1                     | MIT                     | Matchers de DOM                                                                                                   | https://github.com/testing-library/jest-dom              |
| `tipos-definitelytyped`      | `@types/node`, `@types/react`, `@types/react-dom` | —                         | MIT                     | Tipos                                                                                                             | https://github.com/DefinitelyTyped/DefinitelyTyped       |
| `chess-js`                   | `chess.js`                                        | 1.4.0                     | BSD-2-Clause            | Regras, lances legais, FEN e PGN                                                                                  | https://github.com/jhlywa/chess.js                       |
| `react-chessboard`           | `react-chessboard`                                | 5.12.1                    | MIT                     | Tabuleiro; escolhido no lugar do Chessground para não herdar GPL                                                  | https://github.com/Clariity/react-chessboard             |
| `stockfish-js`               | `stockfish` (stockfish.js)                        | 18.0.8 lite single-thread | **GPL-3.0**             | Engine WASM, distribuída sem modificação e isolada em public/engine/stockfish/                                    | https://github.com/nmrugg/stockfish.js                   |
| `ts-fsrs`                    | `ts-fsrs`                                         | 5.4.2                     | MIT                     | Revisão espaçada                                                                                                  | https://github.com/open-spaced-repetition/ts-fsrs        |
| `playwright`                 | `@playwright/test`                                | 1.63.0                    | Apache-2.0              | Testes end-to-end em desktop e mobile                                                                             | https://github.com/microsoft/playwright                  |
| `testing-library-user-event` | `@testing-library/user-event`                     | 14.6.7                    | MIT                     | Interação de usuário nos testes de componente                                                                     | https://github.com/testing-library/user-event            |
| `fake-indexeddb`             | `fake-indexeddb`                                  | 6.2.5                     | Apache-2.0              | IndexedDB em memória nos testes de repositório                                                                    | https://github.com/dumbmatter/fakeIndexedDB              |
| `lichess-puzzle-db`          | Lichess puzzle database                           | dump de 2026              | CC0-1.0                 | Base de puzzles. Consumida pelo pipeline `scripts/puzzles/build-dataset.mjs`; o dump NÃO é versionado aqui        | https://database.lichess.org/#puzzles                    |
| `lichess-api-partidas`       | Lichess API (partidas)                            | —                         | Termos da API Lichess   | Importação de partidas do usuário, via `src/lib/importers/lichess.ts`                                             | https://lichess.org/api                                  |
| `lichess-api-tablebase`      | API de tablebase da Lichess                       | —                         | Termos da API Lichess   | Defesa perfeita em finais de até 7 peças, via `src/lib/tablebase/provider.ts`. Serviço em `tablebase.lichess.ovh` | https://lichess.org/api                                  |
| `chesscom-pubapi`            | Chess.com Published-Data API                      | —                         | Termos de uso Chess.com | Importação de partidas do usuário, via `src/lib/importers/chesscom.ts`                                            | https://www.chess.com/news/view/published-data-api       |
| `zod`                        | `zod`                                             | 4.5.4                     | MIT                     | Validação de entrada em tempo de execução                                                                         | https://github.com/colinhacks/zod                        |
| `supabase-js`                | `@supabase/supabase-js`                           | 2.116.0                   | MIT                     | Cliente do Supabase; a autorização fica no Postgres, via RLS                                                      | https://github.com/supabase/supabase-js                  |
| `server-only`                | `server-only`                                     | 0.0.1                     | MIT                     | Quebra o build se um módulo de servidor for importado no cliente                                                  | https://www.npmjs.com/package/server-only                |
| `supabase-agent-skills`      | `supabase/agent-skills`                           | ver `skills-lock.json`    | MIT                     | Instruções de agente para trabalhar com Supabase. Conteúdo vendorizado NÃO é versionado; o lockfile guarda o hash | https://github.com/supabase/agent-skills                 |
| `inter`                      | Inter (via `next/font/google`)                    | —                         | SIL OFL 1.1             | Tipografia de interface, servida localmente                                                                       | https://github.com/rsms/inter                            |

## Previstos (entram junto com a fase que os exige)

| ID                             | Pacote / dado                | Licença               | Motivo                   | Fase | Fonte                                         |
| ------------------------------ | ---------------------------- | --------------------- | ------------------------ | ---- | --------------------------------------------- |
| `chess-openings`               | `lichess-org/chess-openings` | CC0-1.0               | Nomes e códigos ECO      | 9    | https://github.com/lichess-org/chess-openings |
| `lichess-api-opening-explorer` | Lichess Opening Explorer API | Termos da API Lichess | Estatísticas de abertura | 9    | https://lichess.org/api                       |

## Stockfish e GPL-3.0 — a restrição que molda a arquitetura

O Stockfish é GPL-3.0. Para não contaminar a licença do restante do projeto, os
artefatos distribuídos ficam **isolados**:

```
public/engine/stockfish/
├── stockfish-18-lite-single.js
├── stockfish-18-lite-single.wasm
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
