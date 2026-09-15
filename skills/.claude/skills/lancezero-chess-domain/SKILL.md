---
name: lancezero-chess-domain
description: Use when implementing chess rules, legal moves, FEN, PGN, SAN, UCI move conversion, game state, puzzle position reconstruction, move history, board coordinates, game import normalization, or pure TypeScript chess-domain code in LanceZero. Trigger for chess.js usage that is not engine evaluation.
version: 1.0.0
---

# LanceZero Chess Domain

## Boundary

The chess domain is pure TypeScript where practical.

It must not depend on:
- React;
- board UI;
- Stockfish process details;
- Vercel;
- Supabase.

`chess.js` is the rules/notation library, not the engine.

## Canonical forms

Use explicit types for:
- FEN;
- SAN;
- UCI;
- square;
- color;
- PGN.

Do not silently mix SAN and UCI strings.

At adapter boundaries, convert once and validate.

## chess.js responsibilities

Use for:
- legal move generation;
- move execution;
- FEN load/export;
- PGN parse/export;
- check/checkmate/stalemate/draw state.

Do not use it to estimate position quality.

## Puzzle reconstruction

For Lichess-style puzzle records, verify whether the public FEN describes the position before the opponent's setup move.

Tests must explicitly verify:
- side to move;
- setup move applied once;
- final puzzle side;
- promotion;
- castling;
- en passant when relevant.

## Parsing

Prefer strict parsing where format correctness matters, especially persisted/generated SAN.

Use permissive parsing only when intentionally accepting messy external inputs, then normalize to canonical representation.

## Domain invariants

- never mutate a game object shared across unrelated UI state;
- promotion must be explicit;
- preserve clocks/move number from FEN when they are semantically relevant;
- preserve PGN headers that matter for import provenance;
- do not infer rating/platform semantics from PGN text without validation.

## Error handling

Invalid chess input should become a typed domain error, not a generic UI crash.

## Testing

Include:
- starting position;
- legal/illegal move;
- checkmate;
- stalemate;
- castling rights;
- en passant;
- promotion;
- FEN roundtrip;
- PGN roundtrip;
- SAN/UCI conversion edge cases.

## When not to use

Do not use for Stockfish evaluation or browser Worker concerns; use `lancezero-stockfish-browser`.
Do not use for visual drag/drop behavior alone; use design/UI guidance.
