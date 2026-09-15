# Auditoria do frontend — baseline das fases 87–102

Data da auditoria: 2026-09-15. As imagens geradas pelo teste visual são referências manuais e não golden snapshots obrigatórios.

## Rotas e composição

| Área | Rotas | Composição entregue |
| --- | --- | --- |
| Hoje | `/dashboard` | lista local-first, conclusão persistente e estados visuais |
| Treino | `/train` | hub com continuar, praticar, revisar e cálculo |
| Aberturas | `/aberturas`, `/aberturas/[slug]` | catálogo, mini-tabuleiros, curso, aprender, treinar, planos e variações |
| Finais | `/endgames`, `/endgames/[slug]` | biblioteca, detalhe, posições treináveis e progresso |
| Cálculo | `/calculate` | exercício guiado com board + painel e etapas explícitas |
| Partidas | `/games`, `/games/[gameId]` | revisão humana, timeline de lances e análise secundária |
| Progresso | `/progress` | atividade, prioridades, retenção e tabela por habilidade |
| Conta | `/account` | autenticação, exportação, sincronização e exclusão |
| Ajustes | `/settings` | backup, orçamento e preferências de tabuleiro |

## Inventário reutilizável

- Shell: `AppShell`, `SiteHeader`, `SiteBottomNav`, `ThemeToggle`.
- Xadrez: `ChessBoardView`, `GameViewer`, `MoveList`, `ChessWorkspace`.
- Treino: `DailyPlanView`, `TreinoHub`, `ReviewSession`, `FeedbackBanner`.
- Conteúdo: `OpeningCatalog`, `OpeningCourse`, `EndgamesWorkbench`, `EndgameDetail`, `EndgameTrainer`.
- Primitives: `PageContainer`, `PageHeader`, `SectionHeader`, `Card`, `StatusBadge`, `ModeLabel`, `ProgressIndicator`, `StatePanel`, `Tabs` e `FilterBar` em `src/components/ui/primitives.tsx`.

## Réguas obrigatórias

O teste `tests/e2e/frontend-visual.spec.ts` percorre as rotas principais em 360×800, 768×1024 e 1440×900. Ele captura screenshots para comparação humana, verifica ausência de overflow horizontal e exige `main` e H1 visíveis. Os testes de acessibilidade existentes cobrem 200% de zoom, foco, landmarks, contraste e alvos de toque.

## Regras de layout

- Conteúdo longo cresce; `overflow`, `nowrap`, alturas máximas e posicionamento absoluto são permitidos apenas em regiões locais justificadas.
- Board é dominante em tarefas de xadrez. Em mobile, a ordem é board, ação, explicação e movelist; em desktop, board e painel usam duas colunas.
- Mini-tabuleiros são prévias estáticas e não carregam engine, tablebase ou explorer.
- Loading, empty, error e completed usam `StatePanel` quando a superfície tem dados assíncronos.
- Status combina texto e símbolo; completion nunca é apresentada como mastery.

## Pendências controladas

`MoveList`, tabelas, barras de progresso e navegação possuem rolagem local ou dimensionamento próprio. O próximo trabalho visual deve preservar essa regra e não introduzir truncamento em instruções, feedback ou comentários pedagógicos.
