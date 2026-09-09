# LanceZero

> **Treine o que perde suas partidas.**
> Do próximo lance ao próximo nível.

App de treino de xadrez em PT-BR para jogadores de aproximadamente **800–1600**,
com onboarding e currículo calibrados para **~1100**.

A diferença não está em ter puzzles e engine — o Lichess já dá isso de graça. A
diferença está no ciclo fechado:

```
você joga → o LanceZero encontra por que você perdeu → transforma em habilidade
→ gera exercício → reapresenta no momento certo → verifica se voltou a acontecer
```

O núcleo funciona **sem conta, sem servidor e sem API paga**: a análise roda no
seu navegador e os dados ficam no seu dispositivo.

## Estado

**Fase 0 concluída** — fundação do repositório. Ainda não há tabuleiro nem
engine. Veja [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Começando

Requer Node 20.9+ e pnpm 12.

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

## Scripts

| Comando          | O que faz                              |
| ---------------- | -------------------------------------- |
| `pnpm dev`       | Servidor de desenvolvimento            |
| `pnpm build`     | Build de produção                      |
| `pnpm lint`      | ESLint                                 |
| `pnpm typecheck` | `tsc --noEmit`                         |
| `pnpm test`      | Vitest (unidade e componente)          |
| `pnpm format`    | Prettier (escreve)                     |
| `pnpm check`     | format:check + lint + typecheck + test |

## Documentação

| Arquivo                                | Conteúdo                                                  |
| -------------------------------------- | --------------------------------------------------------- |
| [`CLAUDE.md`](CLAUDE.md)               | Regras de arquitetura, stack aprovada, Definition of Done |
| [`docs/PRODUCT.md`](docs/PRODUCT.md)   | Comportamento do produto e superfícies                    |
| [`docs/PEDAGOGY.md`](docs/PEDAGOGY.md) | Regras de aprendizado                                     |
| [`docs/ROADMAP.md`](docs/ROADMAP.md)   | Fases 0 a 13 e backlog priorizado                         |
| [`docs/LICENSES.md`](docs/LICENSES.md) | Inventário de licenças e fontes de dados                  |
| [`docs/RESEARCH.md`](docs/RESEARCH.md) | Pesquisa, PRD e plano completo                            |
| [`docs/adr/`](docs/adr/)               | Decisões arquiteturais                                    |

## Estrutura

```
src/
  app/          rotas (App Router)
  components/   chess/ training/ analysis/ ui/
  domain/       TypeScript puro: skills, planning, puzzles, games, repertoire
  lib/          chess, engine, fsrs, importers, storage, a11y, design, legal
  workers/      Stockfish worker (Fase 2)
  content/      lições (Fase 10)
scripts/puzzles/  pipeline do dump Lichess (Fase 3)
tests/          unit/ e2e/ fixtures/
docs/           produto, pedagogia, licenças, ADRs
```

Regra que não se negocia: **domínio não depende de React**, **componentes não
falam com IndexedDB** e **nenhuma URL de terceiro fica espalhada em componente**.

## Licenças

O projeto é construído sobre software e dados abertos, e as obrigações de licença
moldam a arquitetura — em especial a GPL-3.0 do Stockfish, cujos artefatos ficam
isolados em `public/engine/stockfish/`. Detalhes em
[`docs/LICENSES.md`](docs/LICENSES.md) e na página `/licenses` do próprio app.
