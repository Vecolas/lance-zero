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
| 12   | Sync opcional                            | código pronto; falta provisionar o Supabase e validar o loop |
| 13   | Maia / sparring humanoide                | opcional, AGPL-3.0                                           |

## Backlog priorizado

A fase 12 está num estado que a tabela sozinha não conta, e vale dizer com todas
as letras: **o código do sync autenticado está implementado e testado** — rota de
sincronização, painel de conta, exportação e exclusão, quatro migrations com RLS —
e **nada disso está ligado em produção**. Sem `NEXT_PUBLIC_SUPABASE_URL` o cliente
devolve `null` e o app segue local-first, que é o princípio 9.

A consequência prática importa para a triagem: enquanto não houver projeto
Supabase provisionado, não existe conta, e não existe dado de conta para vazar. As
issues de segurança do sync (#26, #27, #28, #33, #34) travam a ATIVAÇÃO da fase
12, e não o produto de hoje — por isso elas saíram do P0, cuja definição logo
abaixo é "precisa existir para provar a ideia" e não inclui sync nem conta.

A exceção é a #30, de CSP: ela vale para o app publicado, independe de conta, e
continua P0. A política em produção é `Content-Security-Policy-Report-Only`, ou
seja, observa e não bloqueia.

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
