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

## O segundo portão: o que está instalado tem de aparecer aqui

O portão do `ID` cruza duas listas escritas à mão uma contra a outra. Ele nunca
acusa a dependência que não entrou em **nenhuma** das duas — e é assim que uma
dependência nova entra sem ninguém reparar (issue #59).

O portão `tests/unit/licencas-instaladas.test.ts` troca o ponto de partida:
começa no `pnpm-lock.yaml`, que é a fonte do que está realmente instalado, e
exige o caminho de volta até este documento.

**Critério de corte: dependência direta.** No lockfile de hoje há 537 pacotes
resolvidos, cerca de 113 nomes só no fecho transitivo das dependências de
produção, e **25 diretas**. Uma lista de dívida com centenas de nomes
transitivos não seria portão, seria formulário. A dependência direta é a que
alguém escolheu — a que muda quando se roda `pnpm add`, que é justamente o
evento que o portão existe para pegar. A transitiva entra porque uma direta a
puxou, e a obrigação sobre ela nasce da licença da direta.

O critério "chega ao bundle do cliente" foi considerado e recusado: além dos
113 nomes, ele não é derivável do lockfile — exigiria rodar o build.

A ligação entre lockfile e documento é o **nome npm**, lido da coluna `Pacote`.
Não existe segunda tabela de-para: o nome já está escrito aqui, e derivar é
melhor que duplicar. Célula que não é nome npm (`Lichess puzzle database`,
`Inter (preferência tipográfica do sistema)`) não contribui nome nenhum — este portão fala
sobre pacotes npm, e dado aberto ou serviço de terceiro está fora do alcance
dele por construção.

A coluna `Versão` é conferida contra a versão **resolvida** no lockfile, não
contra a faixa pedida no `package.json`. Por isso cada pacote npm tem linha
própria com versão exata: uma linha que cobrisse vários pacotes teria de deixar
a versão em branco, e versão em branco não se confere.

A exceção, quando existir, mora em `DEPENDENCIAS_FORA_DO_INVENTARIO`
(`src/lib/legal/inventario-divida.ts`), com motivo escrito. Hoje ela está vazia.

## O terceiro portão: a licença escrita aqui é a que o pacote afirma

Os dois portões acima cruzam fontes do próprio projeto. Se todas elas disserem
"MIT" para algo que é GPL, as duas ficam verdes.

`tests/unit/licencas-metadado.test.ts` abre o pacote: compara a coluna `Licença`
com o campo `license` do `package.json` de cada dependência direta. É o único
portão do projeto que lê o `node_modules`, e lê porque não há alternativa — o
lockfile guarda integridade e versão, nunca licença.

Ele não julga compatibilidade, só divergência: decidir se uma licença serve ao
LanceZero é decisão humana e mora em ADR. Pacote que não está no disco reprova
com a mensagem de rodar `pnpm install`, em vez de se calar. O `pnpm` está fora
do alcance dele porque se instala fora do `node_modules` do projeto, e isso está
nomeado em `GRUPOS_FORA_DO_NODE_MODULES`.

**O que nenhum dos três portões prova:** nada sobre dependências transitivas
(critério de corte), nada sobre as linhas de dado aberto e de API de terceiro
(não são pacotes npm e não têm `package.json` para conferir), e nada sobre
compatibilidade entre licenças.

## Em uso (Fases 0 e 1)

| ID                           | Pacote                         | Versão                    | Licença                 | Motivo                                                                                                              | Fonte                                                    |
| ---------------------------- | ------------------------------ | ------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `next`                       | `next`                         | 16.3.4                    | MIT                     | Framework, roteamento, build                                                                                        | https://github.com/vercel/next.js                        |
| `react`                      | `react`                        | 19.2.8                    | MIT                     | UI                                                                                                                  | https://github.com/facebook/react                        |
| `react-dom`                  | `react-dom`                    | 19.2.8                    | MIT                     | UI                                                                                                                  | https://github.com/facebook/react                        |
| `typescript`                 | `typescript`                   | 5.9.3                     | Apache-2.0              | Tipagem estática                                                                                                    | https://github.com/microsoft/TypeScript                  |
| `eslint`                     | `eslint`                       | 9.39.5                    | MIT                     | Análise estática                                                                                                    | https://github.com/eslint/eslint                         |
| `eslint-config-next`         | `eslint-config-next`           | 16.3.4                    | MIT                     | Regras Next/React/a11y                                                                                              | https://github.com/vercel/next.js                        |
| `prettier`                   | `prettier`                     | 3.9.6                     | MIT                     | Formatação                                                                                                          | https://github.com/prettier/prettier                     |
| `vitest`                     | `vitest`                       | 5.0.0                     | MIT                     | Testes unitários                                                                                                    | https://github.com/vitest-dev/vitest                     |
| `vitejs-plugin-react`        | `@vitejs/plugin-react`         | 6.1.1                     | MIT                     | Transform JSX nos testes                                                                                            | https://github.com/vitejs/vite-plugin-react              |
| `jsdom`                      | `jsdom`                        | 30.0.1                    | MIT                     | Ambiente DOM nos testes                                                                                             | https://github.com/jsdom/jsdom                           |
| `testing-library-react`      | `@testing-library/react`       | 16.3.3                    | MIT                     | Testes de componente por papel acessível                                                                            | https://github.com/testing-library/react-testing-library |
| `testing-library-jest-dom`   | `@testing-library/jest-dom`    | 7.0.1                     | MIT                     | Matchers de DOM                                                                                                     | https://github.com/testing-library/jest-dom              |
| `types-node`                 | `@types/node`                  | 20.19.43                  | MIT                     | Tipos do Node                                                                                                       | https://github.com/DefinitelyTyped/DefinitelyTyped       |
| `types-react`                | `@types/react`                 | 19.2.18                   | MIT                     | Tipos do React                                                                                                      | https://github.com/DefinitelyTyped/DefinitelyTyped       |
| `types-react-dom`            | `@types/react-dom`             | 19.2.7                    | MIT                     | Tipos do React DOM                                                                                                  | https://github.com/DefinitelyTyped/DefinitelyTyped       |
| `pnpm`                       | `pnpm`                         | 12.3.4                    | MIT                     | Gerenciador de pacotes, fixado pelo campo `packageManager` e travado no `pnpm-lock.yaml`                            | https://github.com/pnpm/pnpm                             |
| `chess-js`                   | `chess.js`                     | 1.4.0                     | BSD-2-Clause            | Regras, lances legais, FEN e PGN                                                                                    | https://github.com/jhlywa/chess.js                       |
| `react-chessboard`           | `react-chessboard`             | 5.12.1                    | MIT                     | Tabuleiro; escolhido no lugar do Chessground para não herdar GPL                                                    | https://github.com/Clariity/react-chessboard             |
| `stockfish-js`               | `stockfish` (stockfish.js)     | 18.0.8 lite single-thread | **GPL-3.0**             | Engine WASM, distribuída sem modificação e isolada em public/engine/stockfish/                                      | https://github.com/nmrugg/stockfish.js                   |
| `ts-fsrs`                    | `ts-fsrs`                      | 5.4.2                     | MIT                     | Revisão espaçada                                                                                                    | https://github.com/open-spaced-repetition/ts-fsrs        |
| `playwright`                 | `@playwright/test`             | 1.63.0                    | Apache-2.0              | Testes end-to-end em desktop e mobile                                                                               | https://github.com/microsoft/playwright                  |
| `testing-library-user-event` | `@testing-library/user-event`  | 14.6.7                    | MIT                     | Interação de usuário nos testes de componente                                                                       | https://github.com/testing-library/user-event            |
| `fake-indexeddb`             | `fake-indexeddb`               | 6.2.5                     | Apache-2.0              | IndexedDB em memória nos testes de repositório                                                                      | https://github.com/dumbmatter/fakeIndexedDB              |
| `lichess-puzzle-db`          | Lichess puzzle database        | dump de 2026              | CC0-1.0                 | Base de puzzles. Consumida pelo pipeline `scripts/puzzles/build-dataset.mjs`; o dump NÃO é versionado aqui          | https://database.lichess.org/#puzzles                    |
| `lichess-api-partidas`       | Lichess API (partidas)         | —                         | Termos da API Lichess   | Importação de partidas do usuário, via `src/lib/importers/lichess.ts`                                               | https://lichess.org/api                                  |
| `lichess-api-tablebase`      | API de tablebase da Lichess    | —                         | Termos da API Lichess   | Defesa perfeita em finais de até 7 peças, via `src/lib/tablebase/provider.ts`. Serviço em `tablebase.lichess.ovh`   | https://lichess.org/api                                  |
| `chesscom-pubapi`            | Chess.com Published-Data API   | —                         | Termos de uso Chess.com | Importação de partidas do usuário, via `src/lib/importers/chesscom.ts`                                              | https://www.chess.com/news/view/published-data-api       |
| `zod`                        | `zod`                          | 4.5.4                     | MIT                     | Validação de entrada em tempo de execução                                                                           | https://github.com/colinhacks/zod                        |
| `supabase-js`                | `@supabase/supabase-js`        | 2.116.0                   | MIT                     | Cliente do Supabase; a autorização fica no Postgres, via RLS                                                        | https://github.com/supabase/supabase-js                  |
| `server-only`                | `server-only`                  | 0.0.1                     | MIT                     | Quebra o build se um módulo de servidor for importado no cliente                                                    | https://www.npmjs.com/package/server-only                |
| `supabase-agent-skills`      | `supabase/agent-skills`        | ver `skills-lock.json`    | MIT                     | Instruções de agente para trabalhar com Supabase. Conteúdo vendorizado NÃO é versionado; o lockfile guarda o hash   | https://github.com/supabase/agent-skills                 |
| `inter`                      | Inter (preferência do sistema) | —                         | SIL OFL 1.1             | Referência tipográfica do guia; o app usa fontes locais e fallback de sistema, sem download no build                | https://github.com/rsms/inter                            |
| `chess-openings`             | `lichess-org/chess-openings`   | recorte de 2026-09-09     | CC0-1.0                 | Nomes e códigos ECO. Recorte curado em `src/content/openings/eco-fixture.ts`; o dump completo NÃO é versionado aqui | https://github.com/lichess-org/chess-openings            |

## Previstos (entram junto com a fase que os exige)

| ID                             | Pacote / dado                | Licença               | Motivo                                                                                                                                                                         | Fase | Fonte                   |
| ------------------------------ | ---------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---- | ----------------------- |
| `lichess-api-opening-explorer` | Lichess Opening Explorer API | Termos da API Lichess | Estatísticas de abertura. O adapter existe (`src/lib/openings/explorer.ts`), mas nenhuma tela consulta o serviço ainda — passa para "Em uso" quando a tela de aberturas entrar | 9    | https://lichess.org/api |

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
