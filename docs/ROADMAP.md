# ROADMAP — LanceZero

Uma fase por vez. Nenhuma fase começa sem instrução explícita. Cada fase vira uma
issue no GitHub com critérios de aceite verificáveis.

| Fase | Título                                   | Estado                                                       |
| ---- | ---------------------------------------- | ------------------------------------------------------------ |
| 0    | Fundação do repositório                  | ✅ concluída                                                 |
| 1    | Domínio do xadrez e tabuleiro            | ✅ concluída                                                 |
| 2    | Stockfish no Web Worker                  | ✅ concluída (contrato E2E com engine real coberto)          |
| 3    | Puzzles                                  | ✅ concluída                                                 |
| 4    | Persistência local + FSRS                | ✅ concluída                                                 |
| 5    | Skill graph + daily planner              | ✅ concluída                                                 |
| 6    | Importação e análise de partidas         | ✅ concluída (importação, revisão humana e passe 2)          |
| 7    | "Meus erros" e explicador determinístico | ✅ concluída (cards e planner realimentado)                  |
| 8    | Finais                                   | ✅ concluída (currículo, tablebase e FSRS)                   |
| 9    | Aberturas                                | ✅ concluída (ECO, repertório, explorer e FSRS)              |
| 10   | Diagnóstico e conteúdo                   | ✅ concluída (diagnóstico, primeira semana e lições)         |
| 11   | PWA, qualidade e beta                    | em andamento (shell e rotas públicas offline; beta pendente) |
| 12   | Sync opcional                            | depois de validar o loop                                     |
| 13   | Maia / sparring humanoide                | opcional, AGPL-3.0                                           |

## Backlog priorizado

O fluxo autenticado de sincronizaÃ§Ã£o da fase 12 jÃ¡ estÃ¡ implementado; a operaÃ§Ã£o
real do projeto Supabase continua sendo uma etapa de provisionamento externo.

**P0 — precisa existir para provar a ideia**
tabuleiro · Stockfish local · puzzles · persistência · FSRS · plano diário ·
importação PGN · análise de partidas · "erro → revisão futura" · mastery ·
identidade visual.

**P1 — transforma protótipo em plataforma**
importadores Lichess/Chess.com · finais · aberturas · diagnóstico · relatórios
semanais · PWA · biblioteca de lições.

**P2 — diferenciação avançada**
Maia · sparring adaptativo · "adivinhe o lance" em partidas-modelo · sync ·
editor de cursos · modelo de habilidade mais sofisticado.

## Definition of Done (global)

Uma entrega só está pronta quando:

- `pnpm typecheck` passa;
- `pnpm lint` passa;
- `pnpm test` passa;
- existem estados de carregamento, erro e vazio;
- funciona em 360px e em zoom de 200%;
- foco de teclado e foco visível foram checados;
- persistência foi checada, se aplicável;
- requisições externas têm timeout, cache e tratamento de erro;
- dependência nova está em `docs/LICENSES.md`;
- docs/ADR atualizados se comportamento ou arquitetura mudou.
