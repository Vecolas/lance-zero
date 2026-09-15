---
name: lancezero-project-architecture
description: Use when designing, refactoring, or implementing a LanceZero feature that changes module boundaries, persistence, sync, repositories, adapters, domain services, local-first behavior, or overall Next.js architecture. Also use when project documents conflict or a technical decision must be reconciled with the product roadmap.
version: 1.0.0
---

# LanceZero Project Architecture

## Goal

Preserve the product architecture while allowing the codebase to evolve.

## Source precedence

Before making a material decision, apply this order:

1. explicit current task / newest ADR;
2. security plan for auth, user data, storage, sessions and privileged operations;
3. visual identity guide for design;
4. product/PRD for product behavior and pedagogy;
5. existing `CLAUDE.md` for non-superseded implementation conventions;
6. current official docs for external dependency behavior.

If two sources materially disagree, surface the conflict before encoding both.

## Core invariants

- Keep the chess domain independent from React.
- Keep Stockfish behind an `EngineProvider` and off the main thread.
- Keep persistence behind repository interfaces.
- Keep external services behind adapters.
- Keep the daily-plan builder deterministic for identical input + seed.
- Keep core training usable without a paid API.
- Preserve local-first behavior even after accounts/sync are added.
- An account may enhance sync/profile; it must not become necessary for basic chess training.
- Avoid new dependencies unless they remove meaningful complexity or risk.

## Architecture layers

Prefer:

```text
UI
↓
application/use-cases
↓
domain
↓
ports/interfaces
↓
adapters
```

Examples of adapters:
- IndexedDB repository;
- Supabase sync repository;
- Stockfish Web Worker provider;
- Lichess importer;
- Opening Explorer provider;
- Tablebase provider.

Do not leak provider-specific response shapes into domain objects.

## Local-first + account model

Treat local data as a first-class data source.

For synced users:
- define explicit ownership;
- define merge/conflict behavior;
- never silently overwrite local progress;
- make sync retryable/idempotent;
- keep engine analysis local unless a feature explicitly requires server processing.

## Decision workflow

1. Read existing code around the change.
2. Identify current domain boundary and repository/adapter.
3. State invariants the feature must preserve.
4. Choose the smallest architecture that satisfies them.
5. Define data flow and failure modes.
6. Add/adjust tests at the boundary.
7. Update ADR if the change creates a durable architectural decision.

## When not to use

Do not trigger for:
- text-only copy changes;
- purely visual token tweaks;
- isolated unit-test edits;
- tasks fully owned by another LanceZero skill.

Use the specialized skill together with this one when the task crosses architecture boundaries.
