---
name: lancezero-testing-release
description: Use when writing or reviewing LanceZero tests, CI, release gates, regression suites, Playwright flows, Vitest units, engine contract tests, RLS/security tests, accessibility tests, performance budgets, cross-user isolation tests, or deciding whether a feature is safe to ship.
version: 1.0.0
---

# LanceZero Testing and Release

## Test pyramid by boundary

### Pure domain — Vitest
Use for:
- chess transformations;
- planner;
- skill graph;
- error classification;
- FSRS adapter;
- deterministic selection.

### Adapter/contract tests
Use for:
- Stockfish provider;
- Lichess import;
- Opening Explorer;
- Tablebase;
- repositories;
- sync.

### E2E — Playwright
Use for:
- onboarding;
- puzzle solve;
- game import;
- review;
- login/profile;
- responsive interactions.

## Security suite

Maintain dedicated tests for:
- unauthenticated access;
- IDOR/BOLA;
- RLS;
- storage ownership;
- XSS payload handling;
- redirects;
- CSRF-sensitive routes;
- cache isolation;
- privileged operations.

## Alice/Bob invariant

The highest-value account test:

```text
Alice cannot read/write Bob.
Bob cannot read/write Alice.
```

Test through all exposed surfaces.

## Engine contracts

Do not assert exact `+1.37`.

Assert:
- valid result;
- legal PV;
- expected MultiPV shape;
- cancellation;
- stale-result rejection;
- timeout/restart behavior.

## Learning tests

Verify behavior, not only rendering:
- due cards prioritized;
- new concepts get guidance;
- review does not leak answer;
- same plan inputs + seed produce same plan;
- mistakes can create future training.

## Accessibility

Test:
- keyboard navigation;
- focus visibility;
- labels;
- non-color status;
- board interaction alternatives;
- mobile target sizing.

## Performance

Budgets should catch regressions:
- Stockfish loaded on demand;
- no engine on landing boot;
- large chess datasets not bundled into client;
- avoid unnecessary hydration;
- no repeated API fan-out.

## Release gate

Block release for:
- cross-user data exposure;
- auth bypass;
- RLS regression;
- secret detection;
- critical exploitable dependency;
- stored XSS;
- broken migration;
- corrupted local data migration.

## When not to use

Do not trigger for writing a single trivial test unless broader project release rules matter.
