# Checklist de aceite — frontend 87–102

Este é o registro executável da entrega. Os testes listados são portões; as
imagens em `docs/frontend-baselines/` são referência humana.

| Fase | Evidência atual                                                                                             |
| ---- | ----------------------------------------------------------------------------------------------------------- |
| 87   | `docs/frontend-audit.md` + baselines 360×800, 768×1024, 1280×800 e 1440×900                                 |
| 88   | `src/components/ui/primitives.tsx`, wrappers de estado nomeados e `tests/unit/ui-primitives.test.tsx`       |
| 89   | `AppShell`/`PageContainer`, `PageHeader` nas rotas de produto e `SiteNav` com landmarks/foco                |
| 90   | `DailyPlanView`, cards independentes, conclusão persistente e testes E2E de Hoje                            |
| 91   | `TreinoHub` com Aprender, Praticar, Revisar e Diagnóstico explícitos                                        |
| 92   | `LicaoPlayer`, `PraticaDeHabilidade`, `ReviewSession` e `DiagnosticoWizard` com feedback/hints distintos    |
| 93   | `ChessWorkspace`, teste unitário, composição desktop/mobile e short-height CSS                              |
| 94   | `OpeningCatalog`/`OpeningCourse`, mini-boards estáticos, tabs e train sem engine bar                        |
| 95   | `/endgames/[slug]`, aliases `/finais`, objetivo persistente e E2E de tablebase/fallback                     |
| 96   | `ForcingDrill` em etapas candidatos → resposta → linha → avaliação, sem engine antes do processo            |
| 97   | `HumanReview` + `EngineReview`, momentos navegáveis, feedback e estado sem momentos                         |
| 98   | `ProgressView`, `AccountPanel`, `SettingsPanel`; perfil, segurança/privacidade e feedback de gravação       |
| 99   | `tests/e2e/a11y-reflow.spec.ts`, `frontend-visual.spec.ts` e testes ARIA; 360, 200%, short-height e teclado |
| 100  | `StatePanel`/fachadas nomeadas aplicados às superfícies assíncronas críticas                                |
| 101  | `frontend-visual.spec.ts` + `frontend-aria.spec.ts` e baselines revisáveis                                  |
| 102  | auditoria em `frontend-audit.md`, documentação de design/convenções, lazy engine e CSS morto removido       |

## Portões executados nesta entrega

```text
pnpm lint
pnpm typecheck
pnpm exec vitest run tests/unit/ui-primitives.test.tsx tests/unit/calculation-forcing.test.ts tests/unit/endgames-detalhe.test.tsx tests/unit/chess-workspace.test.tsx
pnpm exec playwright test tests/e2e/calculo.spec.ts --project=desktop --workers=1
pnpm exec playwright test tests/e2e/frontend-visual.spec.ts --project=desktop --workers=1
pnpm exec playwright test tests/e2e/frontend-visual.spec.ts --project=mobile --workers=1
pnpm exec playwright test tests/e2e/frontend-aria.spec.ts --project=desktop --workers=1
pnpm build
```

O checklist não substitui o `pnpm test` completo: a suíte completa de engine e
integrações deve ser executada no CI/release, com o número de workers definido
pela configuração do projeto.
