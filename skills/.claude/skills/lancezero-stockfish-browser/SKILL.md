---
name: lancezero-stockfish-browser
description: Use when implementing, debugging, optimizing, packaging, or testing Stockfish in LanceZero, including WASM, Web Workers, UCI handshake, MultiPV, WDL, cancellation, stale results, analysis budgets, browser threading, engine assets, GPL obligations, and Stockfish performance on Vercel.
version: 1.0.0
---

# LanceZero Stockfish Browser Engine

## MVP engine choice

Default to Stockfish 18 `lite single-threaded` unless an ADR explicitly changes this.

Reasons:
- small compared with full engine;
- avoids multi-thread cross-origin isolation complexity;
- still far stronger than target users;
- better startup/download UX.

## Worker boundary

Never run engine search on the main UI thread.

All access goes through an `EngineProvider`.

Required lifecycle:
1. create Worker;
2. send `uci`;
3. wait `uciok`;
4. configure options;
5. send `isready`;
6. wait `readyok`;
7. set position;
8. start search;
9. parse info;
10. resolve on bestmove or target condition;
11. support stop/dispose/restart.

## Concurrency

Stockfish is stateful.

Implement:
- serialized command queue or strict per-worker ownership;
- unique analysis IDs;
- stale message rejection;
- cancellation;
- timeout;
- worker restart on failure.

Never allow an old analysis response to overwrite a newer position.

## Analysis semantics

Prefer stable resource budgets such as:
- nodes;
- bounded depth;
- bounded time where UX needs it.

Do not write tests requiring exact centipawn output across engine versions/builds.

Test properties:
- legal PV;
- result arrives;
- MultiPV count constraints;
- cancellation;
- no stale overwrite.

## WDL

Do not present Stockfish WDL as literal human win probability for a 1100 player.

Use WDL primarily for:
- internal severity;
- comparison;
- explainable state transitions.

## Multi-thread

If multi-thread is introduced, verify browser cross-origin isolation requirements.

Shared memory generally requires secure context + COOP/COEP.

Do not enable global headers blindly: validate third-party assets/auth flows first.

## Loading

Load engine lazily.
Do not make initial landing/dashboard boot depend on WASM download.

Cache static engine assets aggressively when versioned.

## Licensing

Stockfish/stockfish.js are GPL-3.0.

Keep distributed engine assets isolated and ship:
- license;
- source/version pointer;
- exact build/version provenance.

Do not casually modify engine source.

## When not to use

Do not use for legal move rules—use `lancezero-chess-domain`.
Do not use for general Vercel config unless it directly affects WASM/Worker delivery.
