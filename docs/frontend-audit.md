# Auditoria do frontend — baseline das fases 87–102

Data da auditoria: 2026-09-15. Este documento é o inventário da issue 87; as
imagens de referência são manuais e não são golden snapshots obrigatórios.

## Rotas reais

| Área      | Rota                              | Estado atual                                | Risco visual principal                                 |
| --------- | --------------------------------- | ------------------------------------------- | ------------------------------------------------------ |
| Hoje      | `/dashboard`                      | lista local-first com conclusão persistente | estados locais ainda usam mensagens inline diferentes  |
| Treino    | `/train`                          | hub pedagógico                              | hierarquia depende de CSS específico do hub            |
| Aberturas | `/aberturas`, `/aberturas/[slug]` | catálogo e curso                            | tabs e mini-board precisam do mesmo workspace          |
| Finais    | `/endgames`                       | currículo e treino                          | detalhe individual ainda não tem rota própria          |
| Cálculo   | `/calculate`                      | exercício guiado                            | painel e board não compartilham composição             |
| Partidas  | `/games`, `/games/[gameId]`       | importação e revisão                        | revisão de momentos precisa de timeline mais explícita |
| Progresso | `/progress`                       | forças, prioridades e retenção              | cards de estado ainda têm estilos próprios             |
| Conta     | `/account`                        | auth, sync, exportação e exclusão           | separar perfil, segurança e privacidade                |
| Ajustes   | `/settings`                       | preferências e backup                       | feedback de salvar precisa de primitive comum          |
| Segurança | `/licenses` e headers             | inventário e headers                        | manter regressão de CSP/RLS nos portões                |

## Inventário reutilizável

- Shell: `AppShell`, `SiteHeader`, `SiteBottomNav`, `ThemeToggle`.
- Xadrez: `ChessBoardView`, `GameViewer`, `MoveList`, `ChessWorkspace` em
  consolidação progressiva.
- Treino: `DailyPlanView`, `TreinoHub`, `ReviewSession`, `FeedbackBanner`.
- Conteúdo: `OpeningCatalog`, `OpeningCourse`, `EndgamesWorkbench`,
  `EndgameTrainer`.
- Primitives comuns: `PageContainer`, `PageHeader`, `SectionHeader`, `Card`,
  `StatusBadge`, `ModeLabel`, `ProgressIndicator`, `StatePanel`, `Tabs` e
  `FilterBar` em `src/components/ui/primitives.tsx`.

## Baseline manual

As quatro réguas obrigatórias são 360×800, 768×1024, 1280×800 e 1440×900.
Antes da fase 13, screenshots servem para comparação humana, não para bloquear
por pixel. O portão automatizado deve procurar overflow horizontal, clipping,
overlap, board ilegível e foco ausente.

## Dívidas encontradas

1. Vários componentes têm estados loading/empty/error próprios e precisam migrar
   para `StatePanel` sem perder o contexto pedagógico.
2. `MoveList` tem um `max-height` válido para desktop, mas precisa de uma região
   local rolável e alternativa de expansão em telas pequenas.
3. Alguns `white-space: nowrap` são adequados para controles curtos; títulos,
   feedback e comentários não podem herdá-lo.
4. Finais ainda precisam de uma página individual para cumprir a composição da
   issue 95.
5. QA visual precisa de screenshots e ARIA snapshots controlados por fixture.

## Evidência inicial

- `pnpm lint`, `pnpm typecheck`, `pnpm test` e `pnpm build` passam na baseline.
- O app já tem rotas públicas offline e teste E2E existente.
- Nenhuma mini-board chama engine ou explorer individualmente.
