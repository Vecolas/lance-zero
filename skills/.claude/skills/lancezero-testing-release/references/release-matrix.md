# Release Matrix

| Area | Minimum gate |
|---|---|
| Domain | unit tests |
| Stockfish | provider contract tests |
| Planner | deterministic tests |
| FSRS | scheduler adapter tests |
| Auth | login/session E2E |
| RLS | Alice/Bob DB tests |
| Storage | ownership tests |
| UI | critical Playwright flows |
| Accessibility | keyboard + automated audit |
| Security | secret/dependency scans |
| Production | build + migration + env verification |

## Suggested CI

```text
format/lint
typecheck
unit
integration
RLS/security
Playwright critical
dependency scan
secret scan
build
```
